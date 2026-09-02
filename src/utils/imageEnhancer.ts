// Image Enhancement Engine using Web Worker & HTML5 Canvas
// Optimizes low-res / Zalo compressed images for high-quality A4 printing:
// 1. Unsharp Masking (Sharpen edge details like eyes, text, contours)
// 2. Adaptive Contrast & Auto Levels (Brighten underexposed / flat compressed photos)
// 3. De-blocking / Subtle Edge-preserving Smooth (Reduces JPEG blockiness)
// 4. Print Color Boost (Subtle saturation & vibrance so ink print looks vivid)

import { enhanceImageDataAsync } from '../workers/workerBridge';

export interface EnhanceOptions {
  sharpenAmount?: number; // 0 to 1 (default ~0.45)
  contrastAmount?: number; // -1 to 1 (default ~0.12)
  brightnessAmount?: number; // -1 to 1 (default ~0.04)
  vibranceAmount?: number; // -1 to 1 (default ~0.15)
  denoiseAmount?: number; // 0 to 1 (default ~0.2)
}

export async function enhanceImageQuality(
  imageSrc: string,
  options: EnhanceOptions = {}
): Promise<{ enhancedSrc: string; originalWidth: number; originalHeight: number }> {
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

        // Draw original
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);

        // Offload pixel manipulation (contrast + unsharp convolution) to Web Worker
        const processedData = await enhanceImageDataAsync(imgData, options);

        ctx.putImageData(processedData, 0, 0);
        const enhancedSrc = canvas.toDataURL('image/jpeg', 0.96);

        // Explicit canvas cleanup
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;

        resolve({
          enhancedSrc,
          originalWidth: width,
          originalHeight: height,
        });
      } catch (err) {
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
}

// High performance 3x3 Sharpening kernel tailored for JPEG compression edge recovery
function applyFastSharpen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number
): ImageData {
  const srcImgData = ctx.getImageData(0, 0, w, h);
  const src = srcImgData.data;

  const outputImgData = ctx.createImageData(w, h);
  const dst = outputImgData.data;

  // 3x3 unsharp kernel: [0, -k, 0], [-k, 1+4k, -k], [0, -k, 0]
  const k = Math.min(1.2, Math.max(0.1, strength * 0.8));
  const center = 1 + 4 * k;

  for (let y = 0; y < h; y++) {
    const yTop = y > 0 ? (y - 1) * w * 4 : y * w * 4;
    const yMid = y * w * 4;
    const yBot = y < h - 1 ? (y + 1) * w * 4 : y * w * 4;

    for (let x = 0; x < w; x++) {
      const xLeft = x > 0 ? (x - 1) * 4 : x * 4;
      const xMid = x * 4;
      const xRight = x < w - 1 ? (x + 1) * 4 : x * 4;

      const idx = yMid + xMid;

      for (let c = 0; c < 3; c++) {
        const top = src[yTop + xMid + c];
        const left = src[yMid + xLeft + c];
        const mid = src[idx + c];
        const right = src[yMid + xRight + c];
        const bot = src[yBot + xMid + c];

        // Convolution
        const val = mid * center - (top + left + right + bot) * k;
        dst[idx + c] = val > 255 ? 255 : val < 0 ? 0 : val;
      }
      dst[idx + 3] = src[idx + 3]; // Alpha channel preserved
    }
  }

  return outputImgData;
}

// Calculate effective print DPI for a photo given its pixel dimensions and target mm size
export function calculatePrintDPI(
  pixelW: number,
  pixelH: number,
  targetMmW: number,
  targetMmH: number,
  cropScale = 1
): { dpi: number; quality: 'high' | 'good' | 'low'; label: string } {
  const inchesW = targetMmW / 25.4;
  const inchesH = targetMmH / 25.4;
  if (inchesW <= 0 || inchesH <= 0) {
    return { dpi: 300, quality: 'high', label: '300+ DPI' };
  }

  // Account for crop/zoom
  const effPixelW = pixelW / Math.max(1, cropScale);
  const effPixelH = pixelH / Math.max(1, cropScale);

  const dpiW = effPixelW / inchesW;
  const dpiH = effPixelH / inchesH;
  const effectiveDPI = Math.round(Math.min(dpiW, dpiH));

  if (effectiveDPI >= 250) {
    return { dpi: effectiveDPI, quality: 'high', label: `${effectiveDPI} DPI (Sắc nét)` };
  } else if (effectiveDPI >= 150) {
    return { dpi: effectiveDPI, quality: 'good', label: `${effectiveDPI} DPI (Đủ dùng)` };
  } else {
    return { dpi: effectiveDPI, quality: 'low', label: `${effectiveDPI} DPI (Mờ Zalo)` };
  }
}
