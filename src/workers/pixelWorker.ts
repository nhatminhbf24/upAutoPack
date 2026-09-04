import { ImageAdjustments } from '../types';

export interface EnhanceOptions {
  sharpenAmount?: number;
  contrastAmount?: number;
  brightnessAmount?: number;
  vibranceAmount?: number;
  denoiseAmount?: number;
  upscaleFactor?: 1 | 2 | 4;
}

export type WorkerRequest =
  | {
      id: number;
      type: 'ENHANCE';
      buffer: ArrayBuffer;
      width: number;
      height: number;
      options: EnhanceOptions;
    }
  | {
      id: number;
      type: 'SUPER_RES';
      buffer: ArrayBuffer;
      width: number;
      height: number;
      upscaleFactor: 1 | 2 | 4;
      options: EnhanceOptions;
    }
  | {
      id: number;
      type: 'ADJUST';
      buffer: ArrayBuffer;
      width: number;
      height: number;
      adjustments: ImageAdjustments;
    };

export type WorkerResponse =
  | {
      id: number;
      type: 'SUCCESS';
      buffer: ArrayBuffer;
    }
  | {
      id: number;
      type: 'ERROR';
      error: string;
    };

// Web Worker context
const ctx: Worker = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === 'ENHANCE') {
      const { buffer, width, height, options } = req;
      const data = new Uint8ClampedArray(buffer);

      const sharpen = options.sharpenAmount ?? 0.48;
      const contrast = options.contrastAmount ?? 0.12;
      const brightness = options.brightnessAmount ?? 0.04;
      const vibrance = options.vibranceAmount ?? 0.16;

      // Pass 1: Contrast, Brightness & Vibrance
      const contrastFactor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
      const brightAdd = brightness * 255;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness & Contrast
        r = contrastFactor * (r + brightAdd - 128) + 128;
        g = contrastFactor * (g + brightAdd - 128) + 128;
        b = contrastFactor * (b + brightAdd - 128) + 128;

        // Vibrance
        const max = Math.max(r, Math.max(g, b));
        const avg = (r + g + b) / 3;
        const sat = (max - avg) / (max || 1);
        const amt = (1 - sat) * vibrance;

        if (r !== max) r += (max - r) * amt;
        if (g !== max) g += (max - g) * amt;
        if (b !== max) b += (max - b) * amt;

        data[i] = r > 255 ? 255 : r < 0 ? 0 : r;
        data[i + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
        data[i + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
      }

      // Pass 2: Fast 3x3 Unsharp Mask Convolution Kernel
      if (sharpen > 0 && width > 10 && height > 10) {
        const k = Math.min(1.2, Math.max(0.1, sharpen * 0.8));
        const center = 1 + 4 * k;
        const srcCopy = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
          const yTop = y > 0 ? (y - 1) * width * 4 : y * width * 4;
          const yMid = y * width * 4;
          const yBot = y < height - 1 ? (y + 1) * width * 4 : y * width * 4;

          for (let x = 0; x < width; x++) {
            const xLeft = x > 0 ? (x - 1) * 4 : x * 4;
            const xMid = x * 4;
            const xRight = x < width - 1 ? (x + 1) * 4 : x * 4;

            const idx = yMid + xMid;

            for (let c = 0; c < 3; c++) {
              const top = srcCopy[yTop + xMid + c];
              const left = srcCopy[yMid + xLeft + c];
              const mid = srcCopy[idx + c];
              const right = srcCopy[yMid + xRight + c];
              const bot = srcCopy[yBot + xMid + c];

              const val = mid * center - (top + left + right + bot) * k;
              data[idx + c] = val > 255 ? 255 : val < 0 ? 0 : val;
            }
          }
        }
      }

      // Transfer back buffer
      ctx.postMessage(
        {
          id: req.id,
          type: 'SUCCESS',
          buffer: data.buffer,
        },
        [data.buffer]
      );
    } else if (req.type === 'SUPER_RES') {
      const { buffer, width, height, upscaleFactor, options } = req;
      const data = new Uint8ClampedArray(buffer);
      const len = data.length;

      const sharpen = options.sharpenAmount ?? (upscaleFactor >= 4 ? 0.75 : 0.62);
      const contrast = options.contrastAmount ?? 0.12;
      const brightness = options.brightnessAmount ?? 0.03;
      const vibrance = options.vibranceAmount ?? 0.16;

      // Pass 1: Contrast, Brightness & Vibrance
      const contrastFactor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
      const brightAdd = brightness * 255;

      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness & Contrast
        r = contrastFactor * (r + brightAdd - 128) + 128;
        g = contrastFactor * (g + brightAdd - 128) + 128;
        b = contrastFactor * (b + brightAdd - 128) + 128;

        // Vibrance
        const max = Math.max(r, Math.max(g, b));
        const avg = (r + g + b) / 3;
        const sat = (max - avg) / (max || 1);
        const amt = (1 - sat) * vibrance;

        if (r !== max) r += (max - r) * amt;
        if (g !== max) g += (max - g) * amt;
        if (b !== max) b += (max - b) * amt;

        data[i] = r > 255 ? 255 : r < 0 ? 0 : r;
        data[i + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
        data[i + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
      }

      // Pass 2: Edge-Directed Super-Resolution Reconstruction & De-blocking
      if (width > 4 && height > 4) {
        const srcCopy = new Uint8ClampedArray(data);
        const stride = width * 4;

        // Edge sharpening multiplier
        const sharpK = Math.min(1.4, Math.max(0.3, sharpen * (upscaleFactor >= 4 ? 1.2 : 0.95)));

        for (let y = 1; y < height - 1; y++) {
          const yPrev = (y - 1) * stride;
          const yCurr = y * stride;
          const yNext = (y + 1) * stride;

          for (let x = 1; x < width - 1; x++) {
            const xPrev = (x - 1) * 4;
            const xCurr = x * 4;
            const xNext = (x + 1) * 4;

            const idx = yCurr + xCurr;

            // Calculate luminance for Sobel edge detection
            const lTL = 0.299 * srcCopy[yPrev + xPrev] + 0.587 * srcCopy[yPrev + xPrev + 1] + 0.114 * srcCopy[yPrev + xPrev + 2];
            const lTC = 0.299 * srcCopy[yPrev + xCurr] + 0.587 * srcCopy[yPrev + xCurr + 1] + 0.114 * srcCopy[yPrev + xCurr + 2];
            const lTR = 0.299 * srcCopy[yPrev + xNext] + 0.587 * srcCopy[yPrev + xNext + 1] + 0.114 * srcCopy[yPrev + xNext + 2];

            const lML = 0.299 * srcCopy[yCurr + xPrev] + 0.587 * srcCopy[yCurr + xPrev + 1] + 0.114 * srcCopy[yCurr + xPrev + 2];
            const lMC = 0.299 * srcCopy[idx] + 0.587 * srcCopy[idx + 1] + 0.114 * srcCopy[idx + 2];
            const lMR = 0.299 * srcCopy[yCurr + xNext] + 0.587 * srcCopy[yCurr + xNext + 1] + 0.114 * srcCopy[yCurr + xNext + 2];

            const lBL = 0.299 * srcCopy[yNext + xPrev] + 0.587 * srcCopy[yNext + xPrev + 1] + 0.114 * srcCopy[yNext + xPrev + 2];
            const lBC = 0.299 * srcCopy[yNext + xCurr] + 0.587 * srcCopy[yNext + xCurr + 1] + 0.114 * srcCopy[yNext + xCurr + 2];
            const lBR = 0.299 * srcCopy[yNext + xNext] + 0.587 * srcCopy[yNext + xNext + 1] + 0.114 * srcCopy[yNext + xNext + 2];

            // Sobel Gradient Magnitude
            const gx = (lTR + 2 * lMR + lBR) - (lTL + 2 * lML + lBL);
            const gy = (lBL + 2 * lBC + lBR) - (lTL + 2 * lTC + lTR);
            const grad = (Math.abs(gx) + Math.abs(gy)) * 0.125;

            if (grad > 12) {
              // High detail / Edge area: apply edge-directed sharpening to recover crisp boundaries
              for (let c = 0; c < 3; c++) {
                const center = srcCopy[idx + c];
                const top = srcCopy[yPrev + xCurr + c];
                const bottom = srcCopy[yNext + xCurr + c];
                const left = srcCopy[yCurr + xPrev + c];
                const right = srcCopy[yCurr + xNext + c];

                const avgNeigh = (top + bottom + left + right) * 0.25;
                const highFreq = center - avgNeigh;
                const val = center + highFreq * sharpK;

                // Clamp to prevent oversaturation / halos
                const minNeigh = Math.min(top, bottom, left, right, center) - 4;
                const maxNeigh = Math.max(top, bottom, left, right, center) + 4;
                const clamped = Math.max(Math.max(0, minNeigh), Math.min(Math.min(255, maxNeigh), val));

                data[idx + c] = clamped;
              }
            } else if (grad < 5) {
              // Smooth / Flat area (skin, plain backdrop): apply subtle de-blocking to remove JPEG noise
              for (let c = 0; c < 3; c++) {
                const center = srcCopy[idx + c];
                const top = srcCopy[yPrev + xCurr + c];
                const bottom = srcCopy[yNext + xCurr + c];
                const left = srcCopy[yCurr + xPrev + c];
                const right = srcCopy[yCurr + xNext + c];

                const smoothVal = center * 0.5 + (top + bottom + left + right) * 0.125;
                data[idx + c] = Math.round(smoothVal);
              }
            }
          }
        }
      }

      ctx.postMessage(
        {
          id: req.id,
          type: 'SUCCESS',
          buffer: data.buffer,
        },
        [data.buffer]
      );
    } else if (req.type === 'ADJUST') {
      const { buffer, adjustments } = req;
      const data = new Uint8ClampedArray(buffer);
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

      const tempFactor = (temperature / 100) * 45;
      const tintFactor = (tint / 100) * 35;
      const brightOffset = (brightness / 100) * 70;

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

        if (invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        if (tempFactor !== 0) {
          if (tempFactor > 0) {
            r += tempFactor * 1.0;
            g += tempFactor * 0.25;
            b -= tempFactor * 0.9;
          } else {
            r += tempFactor * 0.9;
            g -= tempFactor * 0.15;
            b -= tempFactor * 1.0;
          }
        }

        if (tintFactor !== 0) {
          if (tintFactor > 0) {
            r += tintFactor * 0.4;
            g -= tintFactor * 0.8;
            b += tintFactor * 0.4;
          } else {
            r += tintFactor * 0.4;
            g -= tintFactor * 0.8;
            b += tintFactor * 0.4;
          }
        }

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

        let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (hlFactor !== 0 && lum > 100) {
          const weight = Math.pow((lum - 100) / 155, 1.3);
          const delta = hlFactor * weight;
          r += delta;
          g += delta;
          b += delta;
        }

        if (shFactor !== 0 && lum < 155) {
          const weight = Math.pow((155 - lum) / 155, 1.3);
          const delta = shFactor * weight;
          r += delta;
          g += delta;
          b += delta;
        }

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

        if (vibFactor !== 0) {
          const max = Math.max(r, Math.max(g, b));
          const min = Math.min(r, Math.min(g, b));
          const sat = (max - min) / (max || 1);
          const amt = (1 - sat) * vibFactor * 1.5;

          if (r !== max) r += (max - r) * amt;
          if (g !== max) g += (max - g) * amt;
          if (b !== max) b += (max - b) * amt;
        }

        if (satFactor !== 1) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * satFactor;
          g = gray + (g - gray) * satFactor;
          b = gray + (b - gray) * satFactor;
        }

        data[i] = r > 255 ? 255 : r < 0 ? 0 : r;
        data[i + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
        data[i + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
      }

      ctx.postMessage(
        {
          id: req.id,
          type: 'SUCCESS',
          buffer: data.buffer,
        },
        [data.buffer]
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    ctx.postMessage({
      id: req.id,
      type: 'ERROR',
      error: errorMsg,
    });
  }
};
