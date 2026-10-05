import { SizePreset } from '../types';

export interface BadgeColorAnalysis {
  dominantColor: string;
  palette: string[];
}

export interface BadgeSpec {
  id: string;
  label: string;
  faceDiameter: number; // mm
  cutDiameter: number;  // mm
}

export const STANDARD_BADGE_SPECS: BadgeSpec[] = [
  { id: 'badge_44_to_55', label: 'Huy hiệu 4.4 cm (Khuôn 5.5 cm)', faceDiameter: 44, cutDiameter: 55 },
  { id: 'badge_58_to_70', label: 'Huy hiệu 5.8 cm (Khuôn 7.0 cm)', faceDiameter: 58, cutDiameter: 70 },
  { id: 'badge_100_to_115', label: 'Huy hiệu 10.0 cm (Khuôn 11.5 cm)', faceDiameter: 100, cutDiameter: 115 },
];

/**
 * Converts RGB components to a Hex color string #rrggbb
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates Euclidean color distance between two RGB colors
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) * 0.299 +
    Math.pow(g1 - g2, 2) * 0.587 +
    Math.pow(b1 - b2, 2) * 0.114
  );
}

/**
 * Smart content-aware algorithm to analyze customer badge artwork and extract the true dominant rim/background color & palette.
 * - Handles solid backgrounds (White, Black, Pastels, Vibrant colors) without arbitrary penalties.
 * - Automatically detects circular designs placed inside white/transparent square canvases (e.g. Canva exports).
 * - Handles transparent PNGs and full-bleed graphics accurately.
 * - Fallback is standard clean white (#ffffff), never arbitrary pink.
 */
export async function detectBadgeBleedColors(imageSrc: string): Promise<BadgeColorAnalysis> {
  const fallbackWhite = '#ffffff';
  const defaultPalette = ['#ffffff', '#f8fafc', '#f1f5f9', '#000000', '#fbcfe8', '#bfdbfe'];

  if (!imageSrc) {
    return { dominantColor: fallbackWhite, palette: defaultPalette };
  }

  return new Promise<BadgeColorAnalysis>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const sampleSize = 200;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve({ dominantColor: fallbackWhite, palette: defaultPalette });
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        const getPixel = (x: number, y: number) => {
          const clampedX = Math.max(0, Math.min(sampleSize - 1, x));
          const clampedY = Math.max(0, Math.min(sampleSize - 1, y));
          const idx = (clampedY * sampleSize + clampedX) * 4;
          return {
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
            a: data[idx + 3],
          };
        };

        // Step 1: Analyze 4 corners (is canvas transparent or solid white / black / colored)
        const corners = [
          getPixel(2, 2),
          getPixel(sampleSize - 3, 2),
          getPixel(2, sampleSize - 3),
          getPixel(sampleSize - 3, sampleSize - 3),
        ];

        let transparentCorners = 0;
        let whiteCorners = 0;
        let blackCorners = 0;

        for (const c of corners) {
          if (c.a < 35) {
            transparentCorners++;
          } else if (c.r > 240 && c.g > 240 && c.b > 240) {
            whiteCorners++;
          } else if (c.r < 18 && c.g < 18 && c.b < 18) {
            blackCorners++;
          }
        }

        const isTransparentCanvas = transparentCorners >= 2;
        const isWhiteSquareCanvas = !isTransparentCanvas && whiteCorners >= 3;
        const isBlackSquareCanvas = !isTransparentCanvas && blackCorners >= 3;

        const sampledBorderPixels: Array<{ r: number; g: number; b: number }> = [];

        // Helper: Sample circular ring at radius fraction
        const sampleCircleRing = (radiusFraction: number) => {
          const ringPixels: Array<{ r: number; g: number; b: number }> = [];
          const cx = sampleSize / 2;
          const cy = sampleSize / 2;
          const rDist = (sampleSize / 2) * radiusFraction;

          for (let angle = 0; angle < 360; angle += 2) {
            const rad = (angle * Math.PI) / 180;
            const px = Math.round(cx + Math.cos(rad) * rDist);
            const py = Math.round(cy + Math.sin(rad) * rDist);
            const p = getPixel(px, py);
            if (p.a >= 40) {
              ringPixels.push({ r: p.r, g: p.g, b: p.b });
            }
          }
          return ringPixels;
        };

        if (isTransparentCanvas) {
          // Case A: Transparent PNG
          // Cast radial rays from center outward to find the outer perimeter of opaque graphics
          const cx = sampleSize / 2;
          const cy = sampleSize / 2;
          const maxR = (sampleSize / 2) - 2;

          for (let angle = 0; angle < 360; angle += 3) {
            const rad = (angle * Math.PI) / 180;
            // Scan from outside in to find first opaque pixel
            for (let dist = maxR; dist >= 10; dist -= 2) {
              const px = Math.round(cx + Math.cos(rad) * dist);
              const py = Math.round(cy + Math.sin(rad) * dist);
              const p = getPixel(px, py);
              if (p.a > 80) {
                sampledBorderPixels.push({ r: p.r, g: p.g, b: p.b });
                break;
              }
            }
          }
        } else if (isWhiteSquareCanvas || isBlackSquareCanvas) {
          // Case B: Canvas corners are all White (or Black)
          // Many users upload a circular badge exported onto a white canvas (e.g. Canva)
          // Check if there is a distinct non-white / non-black circular design at r ~ 42% - 47%
          const ringPixels = sampleCircleRing(0.45);

          // Check if ring pixels differ from corner color
          const isCornerMatching = (p: { r: number; g: number; b: number }) => {
            if (isWhiteSquareCanvas) return p.r > 238 && p.g > 238 && p.b > 238;
            if (isBlackSquareCanvas) return p.r < 22 && p.g < 22 && p.b < 22;
            return false;
          };

          const nonCornerRingPixels = ringPixels.filter((p) => !isCornerMatching(p));

          if (nonCornerRingPixels.length > ringPixels.length * 0.4) {
            // There is indeed an inner circular graphic with its own rim color!
            sampledBorderPixels.push(...nonCornerRingPixels);
          } else {
            // Entire image/background is white (or black)
            sampledBorderPixels.push(...ringPixels);
            // Also sample image borders
            for (let i = 0; i < sampleSize; i += 4) {
              sampledBorderPixels.push(getPixel(i, 2));
              sampledBorderPixels.push(getPixel(i, sampleSize - 3));
              sampledBorderPixels.push(getPixel(2, i));
              sampledBorderPixels.push(getPixel(sampleSize - 3, i));
            }
          }
        } else {
          // Case C: Standard opaque image with colored background or full-bleed photo
          // 1. Sample 4 outer border edges (depth 2 to 6 px)
          for (let step = 2; step <= 6; step += 2) {
            for (let i = 0; i < sampleSize; i += 3) {
              sampledBorderPixels.push(getPixel(i, step));
              sampledBorderPixels.push(getPixel(i, sampleSize - 1 - step));
              sampledBorderPixels.push(getPixel(step, i));
              sampledBorderPixels.push(getPixel(sampleSize - 1 - step, i));
            }
          }

          // 2. Also sample circular perimeter ring at r ~ 45% - 48%
          const ringSamples = sampleCircleRing(0.46);
          sampledBorderPixels.push(...ringSamples);
        }

        if (sampledBorderPixels.length === 0) {
          resolve({ dominantColor: fallbackWhite, palette: defaultPalette });
          return;
        }

        // Step 2: Quantize colors into buckets of step 12
        const buckets: Map<string, { count: number; sumR: number; sumG: number; sumB: number }> = new Map();

        for (const p of sampledBorderPixels) {
          const qr = Math.floor(p.r / 12) * 12;
          const qg = Math.floor(p.g / 12) * 12;
          const qb = Math.floor(p.b / 12) * 12;
          const key = `${qr}_${qg}_${qb}`;

          const existing = buckets.get(key);
          if (existing) {
            existing.count++;
            existing.sumR += p.r;
            existing.sumG += p.g;
            existing.sumB += p.b;
          } else {
            buckets.set(key, { count: 1, sumR: p.r, sumG: p.g, sumB: p.b });
          }
        }

        // Step 3: Sort buckets by true frequency (highest count wins)
        const sortedBuckets = Array.from(buckets.values()).sort((a, b) => b.count - a.count);

        if (sortedBuckets.length === 0) {
          resolve({ dominantColor: fallbackWhite, palette: defaultPalette });
          return;
        }

        const dominant = sortedBuckets[0];
        const dominantHex = rgbToHex(
          dominant.sumR / dominant.count,
          dominant.sumG / dominant.count,
          dominant.sumB / dominant.count
        );

        // Step 4: Build rich palette of distinct colors (Euclidean color distance >= 24)
        const paletteCandidates: string[] = [dominantHex];
        const pickedRgb: Array<{ r: number; g: number; b: number }> = [
          {
            r: dominant.sumR / dominant.count,
            g: dominant.sumG / dominant.count,
            b: dominant.sumB / dominant.count,
          },
        ];

        for (let i = 1; i < sortedBuckets.length && paletteCandidates.length < 5; i++) {
          const cand = sortedBuckets[i];
          const avgR = cand.sumR / cand.count;
          const avgG = cand.sumG / cand.count;
          const avgB = cand.sumB / cand.count;
          const candHex = rgbToHex(avgR, avgG, avgB);

          const isDistinct = pickedRgb.every(
            (p) => colorDistance(p.r, p.g, p.b, avgR, avgG, avgB) >= 24
          );

          if (isDistinct) {
            paletteCandidates.push(candHex);
            pickedRgb.push({ r: avgR, g: avgG, b: avgB });
          }
        }

        // Clean neutral fallbacks to guarantee 5+ palette choices
        const aestheticFallbacks = ['#ffffff', '#000000', '#fbcfe8', '#bfdbfe', '#fef08a', '#bbf7d0'];
        for (const col of aestheticFallbacks) {
          if (paletteCandidates.length >= 6) break;
          if (!paletteCandidates.some((c) => c.toLowerCase() === col.toLowerCase())) {
            paletteCandidates.push(col);
          }
        }

        resolve({
          dominantColor: dominantHex,
          palette: paletteCandidates,
        });
      } catch (err) {
        console.warn('Error analyzing badge background colors:', err);
        resolve({ dominantColor: fallbackWhite, palette: defaultPalette });
      }
    };

    img.onerror = () => {
      resolve({ dominantColor: fallbackWhite, palette: defaultPalette });
    };

    img.src = imageSrc;
  });
}
