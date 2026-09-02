import { ImageAdjustments, DEFAULT_ADJUSTMENTS } from '../types';
import { applyAdjustmentsImageDataAsync } from '../workers/workerBridge';

/**
 * Fast pixel-level image adjustments execution on ImageData
 */
export function applyAdjustmentsToImageData(
  imgData: ImageData,
  adjustments: ImageAdjustments
): void {
  const data = imgData.data;
  const len = data.length;

  const {
    temperature,
    tint,
    brightness,
    contrast,
    highlights,
    shadows,
    whites,
    blacks,
    invert,
    vibrance,
    saturation,
  } = adjustments;

  // Pre-calculate factors to optimize loop performance
  const tempFactor = (temperature / 100) * 45; // Kelvin shift approx
  const tintFactor = (tint / 100) * 35; // Tint shift

  const brightOffset = (brightness / 100) * 70;

  // Contrast factor (-100 to 100)
  const cClamped = Math.max(-99, Math.min(99, contrast));
  const contrastFactor = (259 * (cClamped * 2.2 + 255)) / (255 * (259 - cClamped * 2.2));

  const hlFactor = (highlights / 100) * 60;
  const shFactor = (shadows / 100) * 60;
  const whFactor = (whites / 100) * 50;
  const blFactor = (blacks / 100) * 50;

  const vibFactor = vibrance / 100;
  const satFactor = 1 + saturation / 100;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Invert if requested
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // 2. White Balance (Temperature & Tint)
    if (tempFactor !== 0) {
      if (tempFactor > 0) {
        // Warmer: Boost Red, slightly boost Green, reduce Blue
        r += tempFactor * 1.0;
        g += tempFactor * 0.25;
        b -= tempFactor * 0.9;
      } else {
        // Cooler: Boost Blue, reduce Red
        r += tempFactor * 0.9;
        g -= tempFactor * 0.15;
        b -= tempFactor * 1.0;
      }
    }

    if (tintFactor !== 0) {
      if (tintFactor > 0) {
        // Magenta: Reduce green, slight red/blue boost
        r += tintFactor * 0.4;
        g -= tintFactor * 0.8;
        b += tintFactor * 0.4;
      } else {
        // Green: Boost green, reduce red/blue
        r += tintFactor * 0.4;
        g -= tintFactor * 0.8; // since tintFactor is negative, this adds green
        b += tintFactor * 0.4;
      }
    }

    // Calculate initial luminance (ITU-R BT.709)
    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // 3. Brightness & Contrast
    if (brightOffset !== 0) {
      r += brightOffset;
      g += brightOffset;
      b += brightOffset;
    }

    if (contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // Update luminance after brightness/contrast
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // 4. Highlights & Shadows
    if (hlFactor !== 0 && lum > 100) {
      // Weight increases as luminance approaches 255
      const weight = Math.pow((lum - 100) / 155, 1.3);
      const delta = hlFactor * weight;
      r += delta;
      g += delta;
      b += delta;
    }

    if (shFactor !== 0 && lum < 155) {
      // Weight increases as luminance approaches 0
      const weight = Math.pow((155 - lum) / 155, 1.3);
      const delta = shFactor * weight;
      r += delta;
      g += delta;
      b += delta;
    }

    // 5. Whites & Blacks
    if (whFactor !== 0 && lum > 160) {
      const weight = Math.pow((lum - 160) / 95, 1.5);
      const delta = whFactor * weight;
      r += delta;
      g += delta;
      b += delta;
    }

    if (blFactor !== 0 && lum < 95) {
      const weight = Math.pow((95 - lum) / 95, 1.5);
      const delta = blFactor * weight;
      r += delta;
      g += delta;
      b += delta;
    }

    // 6. Vibrance (boosts muted/low saturation colors more, protects skin tones)
    if (vibFactor !== 0) {
      const max = Math.max(r, Math.max(g, b));
      const min = Math.min(r, Math.min(g, b));
      const sat = (max - min) / (max || 1);
      const amt = (1 - sat) * vibFactor * 1.5;

      if (r !== max) r += (max - r) * amt;
      if (g !== max) g += (max - g) * amt;
      if (b !== max) b += (max - b) * amt;
    }

    // 7. Saturation (Uniform saturation scaling)
    if (satFactor !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * satFactor;
      g = gray + (g - gray) * satFactor;
      b = gray + (b - gray) * satFactor;
    }

    // Clamp values to [0, 255]
    data[i] = r > 255 ? 255 : r < 0 ? 0 : r;
    data[i + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
    data[i + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
  }
}

/**
 * Applies all adjustments to a base64 / blob image URL and returns a new DataURL
 */
export async function applyAdjustmentsToImage(
  imageSrc: string,
  adjustments: ImageAdjustments
): Promise<string> {
  // If all default, return source directly
  if (
    adjustments.temperature === 0 &&
    adjustments.tint === 0 &&
    adjustments.brightness === 0 &&
    adjustments.contrast === 0 &&
    adjustments.highlights === 0 &&
    adjustments.shadows === 0 &&
    adjustments.whites === 0 &&
    adjustments.blacks === 0 &&
    !adjustments.invert &&
    adjustments.vibrance === 0 &&
    adjustments.saturation === 0
  ) {
    return imageSrc;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      let canvas: HTMLCanvasElement | null = null;
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);

        // Offload pixel manipulation to Web Worker
        const processedData = await applyAdjustmentsImageDataAsync(imgData, adjustments);

        ctx.putImageData(processedData, 0, 0);
        const resultUrl = canvas.toDataURL('image/jpeg', 0.96);

        // Explicit canvas cleanup
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;

        resolve(resultUrl);
      } catch (e) {
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        reject(e);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
}

/**
 * Intelligent Auto-Adjust algorithm:
 * Analyzes image luminosity distribution, dynamic range, and color balance
 * to produce optimal, professional print-ready adjustments.
 */
export async function calculateAutoAdjustments(
  imageSrc: string
): Promise<ImageAdjustments> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Use downscaled canvas for fast histogram analysis
        const sampleSize = 180;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, sampleSize / Math.max(img.width, img.height));
        const w = Math.max(10, Math.floor(img.width * scale));
        const h = Math.max(10, Math.floor(img.height * scale));

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            ...DEFAULT_ADJUSTMENTS,
            contrast: 14,
            vibrance: 20,
            shadows: 10,
            whites: 6,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let totalLum = 0;
        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        const count = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalR += r;
          totalG += g;
          totalB += b;
          totalLum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        const avgLum = totalLum / count;
        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;

        // 1. Exposure & Brightness compensation
        let autoBrightness = 0;
        if (avgLum < 100) {
          // Underexposed image -> lift brightness
          autoBrightness = Math.round(Math.min(25, (115 - avgLum) * 0.35));
        } else if (avgLum > 180) {
          // Overexposed image -> reduce brightness slightly
          autoBrightness = Math.round(Math.max(-15, (170 - avgLum) * 0.25));
        }

        // 2. Contrast & Dynamic Range
        const autoContrast = 16;
        const autoShadows = avgLum < 120 ? 15 : 8;
        const autoHighlights = avgLum > 160 ? -12 : -5;
        const autoWhites = 8;
        const autoBlacks = -5;

        // 3. Color Temperature & Tint Auto-Neutralization
        let autoTemperature = 0;
        let autoTint = 0;

        const colorAvg = (avgR + avgG + avgB) / 3;
        const redExcess = avgR - colorAvg;
        const blueExcess = avgB - colorAvg;

        if (redExcess > 12 && redExcess > blueExcess) {
          // Too warm / yellow cast -> cool it down slightly
          autoTemperature = Math.round(-Math.min(18, redExcess * 0.6));
        } else if (blueExcess > 12 && blueExcess > redExcess) {
          // Too cool / blue cast -> warm it up
          autoTemperature = Math.round(Math.min(18, blueExcess * 0.6));
        }

        const greenExcess = avgG - colorAvg;
        if (greenExcess > 10) {
          // Green cast -> add subtle magenta tint
          autoTint = Math.round(Math.min(14, greenExcess * 0.5));
        } else if (greenExcess < -10) {
          // Magenta cast -> add subtle green tint
          autoTint = Math.round(-Math.min(14, Math.abs(greenExcess) * 0.5));
        }

        // 4. Color Vibrance & Saturation for vivid printing
        const autoVibrance = 20;
        const autoSaturation = 5;

        resolve({
          temperature: autoTemperature,
          tint: autoTint,
          brightness: autoBrightness,
          contrast: autoContrast,
          highlights: autoHighlights,
          shadows: autoShadows,
          whites: autoWhites,
          blacks: autoBlacks,
          invert: false,
          vibrance: autoVibrance,
          saturation: autoSaturation,
        });
      } catch {
        resolve({
          ...DEFAULT_ADJUSTMENTS,
          contrast: 15,
          vibrance: 20,
          shadows: 10,
          whites: 8,
        });
      }
    };
    img.onerror = () => resolve(DEFAULT_ADJUSTMENTS);
    img.src = imageSrc;
  });
}
