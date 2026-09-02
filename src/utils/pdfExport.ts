import jsPDF from 'jspdf';
import { PackedPage, LayoutSettings } from '../types';
import { MM_TO_PX_300DPI, A4_WIDTH_MM, A4_HEIGHT_MM } from './packing';
import { loadImage } from './imageUtils';

/**
 * Export Multi-Page High Quality PDF (300 DPI Rendering per A4 page)
 */
export async function exportPagesToPdf(
  pages: PackedPage[],
  settings: LayoutSettings,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (pages.length === 0) return;

  const isLandscape = settings.paperOrientation === 'landscape';
  const orientation = isLandscape ? 'landscape' : 'portrait';
  const pageW_mm = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const canvasWidth = Math.round(pageW_mm * MM_TO_PX_300DPI);
  const canvasHeight = Math.round(pageH_mm * MM_TO_PX_300DPI);

  // Initialize jsPDF instance with exact mm A4 dimensions
  const pdf = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    if (onProgress) {
      onProgress(pageIdx + 1, pages.length);
    }

    // Add page if not the first page
    if (pageIdx > 0) {
      pdf.addPage('a4', orientation);
    }

    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
      continue;
    }

    // Fill white paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (const item of page.items) {
      try {
        const img = await loadImage(item.originalSrc);
        const pxX = Math.round(item.x * MM_TO_PX_300DPI);
        const pxY = Math.round(item.y * MM_TO_PX_300DPI);
        const pxW = Math.round(item.w * MM_TO_PX_300DPI);
        const pxH = Math.round(item.h * MM_TO_PX_300DPI);

        const scale = item.scale || 1;
        const actualCropW = item.cropW / scale;
        const actualCropH = item.cropH / scale;

        ctx.save();

        // Apply Shape Clip
        if (item.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(pxX + pxW / 2, pxY + pxH / 2, Math.min(pxW, pxH) / 2, 0, Math.PI * 2);
          ctx.clip();
        } else if (item.shape === 'heart') {
          ctx.translate(pxX, pxY);
          ctx.scale(pxW / 24, pxH / 24);
          const heartPath = new Path2D(
            'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          );
          ctx.clip(heartPath);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Draw Image with exact pixel crop
        ctx.drawImage(
          img,
          item.cropX,
          item.cropY,
          actualCropW,
          actualCropH,
          pxX,
          pxY,
          pxW,
          pxH
        );

        ctx.restore();

        // Draw Cut lines
        if (settings.cutLines) {
          ctx.save();
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([12, 8]);

          if (item.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(pxX + pxW / 2, pxY + pxH / 2, Math.min(pxW, pxH) / 2, 0, Math.PI * 2);
            ctx.stroke();
          } else if (item.shape === 'heart') {
            ctx.translate(pxX, pxY);
            ctx.scale(pxW / 24, pxH / 24);
            const heartPath = new Path2D(
              'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
            );
            ctx.stroke(heartPath);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          } else {
            ctx.strokeRect(pxX, pxY, pxW, pxH);
          }
          ctx.restore();
        }
      } catch (e) {
        console.error('Error drawing image on canvas for PDF:', e);
      }
    }

    // High quality JPEG compression for PDF
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Add image to PDF spanning full page dimension
    pdf.addImage(jpegDataUrl, 'JPEG', 0, 0, pageW_mm, pageH_mm, undefined, 'FAST');

    // Free Canvas RAM
    canvas.width = 0;
    canvas.height = 0;
    canvas = null;

    // Small yield for Garbage Collection
    await new Promise((r) => setTimeout(r, 60));
  }

  // Save PDF file
  const fileName = `Bo_Anh_In_A4_${pages.length}_Trang_${Date.now()}.pdf`;
  pdf.save(fileName);
}
