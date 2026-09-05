import jsPDF from 'jspdf';
import { PackedPage, LayoutSettings } from '../types';
import { MM_TO_PX_300DPI, A4_WIDTH_MM, A4_HEIGHT_MM } from './packing';
import { loadImage } from './imageUtils';
import { renderTextTagOnCanvas } from './textTagUtils';

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

    // Freeform Text Tag / Thông tin mã đơn trên lề giấy A4
    renderTextTagOnCanvas(ctx, settings, page.pageNumber, pages.length, isLandscape);

    const bleedMm = settings.bleed && settings.bleed > 0 ? settings.bleed : 0;
    const bleedPx = Math.round(bleedMm * MM_TO_PX_300DPI);

    // Full Trim Guides: Kẻ đường gióng thước tràn 4 mép giấy A4 chuẩn xưởng
    const activeCutStyles =
      settings.cutStyles && settings.cutStyles.length > 0
        ? settings.cutStyles
        : settings.cutStyle
        ? [settings.cutStyle]
        : ['dashed'];
    const hasFullTrim = settings.cutLines && activeCutStyles.includes('full_trim_guides');

    if (hasFullTrim && page.items.length > 0) {
      const rawY: number[] = [];
      const rawX: number[] = [];
      page.items.forEach((it) => {
        const isSquare = it.shape === 'circle' || it.shape === 'heart';
        const diam = isSquare ? Math.min(it.w, it.h) : 0;
        const rx = isSquare ? it.x + (it.w - diam) / 2 : it.x;
        const ry = isSquare ? it.y + (it.h - diam) / 2 : it.y;
        const rw = isSquare ? diam : it.w;
        const rh = isSquare ? diam : it.h;
        rawY.push(ry, ry + rh);
        rawX.push(rx, rx + rw);
      });

      const fullTrimYList: number[] = [];
      const fullTrimXList: number[] = [];

      rawY.sort((a, b) => a - b).forEach((y) => {
        if (!fullTrimYList.some((existing) => Math.abs(existing - y) < 0.3)) {
          fullTrimYList.push(y);
        }
      });

      rawX.sort((a, b) => a - b).forEach((x) => {
        if (!fullTrimXList.some((existing) => Math.abs(existing - x) < 0.3)) {
          fullTrimXList.push(x);
        }
      });

      ctx.save();
      const tickLen = Math.round(5 * MM_TO_PX_300DPI);

      // Horizontal guides & edge ticks
      for (const yMm of fullTrimYList) {
        const py = Math.round(yMm * MM_TO_PX_300DPI);
        // Dashed hairline across entire width
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([16, 12]);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvasWidth, py);
        ctx.stroke();

        // Solid edge ticks on left and right borders
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(tickLen, py);
        ctx.moveTo(canvasWidth - tickLen, py);
        ctx.lineTo(canvasWidth, py);
        ctx.stroke();
      }

      // Vertical guides & edge ticks
      for (const xMm of fullTrimXList) {
        const px = Math.round(xMm * MM_TO_PX_300DPI);
        // Dashed hairline down entire height
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([16, 12]);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvasHeight);
        ctx.stroke();

        // Solid edge ticks on top and bottom borders
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, tickLen);
        ctx.moveTo(px, canvasHeight - tickLen);
        ctx.lineTo(px, canvasHeight);
        ctx.stroke();
      }
      ctx.restore();
    }

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

        // When Bleed is active, image is drawn expanded by bleedPx outwards
        const drawX = pxX - bleedPx;
        const drawY = pxY - bleedPx;
        const drawW = pxW + bleedPx * 2;
        const drawH = pxH + bleedPx * 2;

        // Clear background under image box so guideline doesn't show behind transparent edges
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX, drawY, drawW, drawH);

        // Apply Shape Clip with Bleed
        if (item.shape === 'circle') {
          ctx.beginPath();
          const diam = Math.min(pxW, pxH);
          ctx.arc(pxX + pxW / 2, pxY + pxH / 2, (diam + bleedPx * 2) / 2, 0, Math.PI * 2);
          ctx.clip();
        } else if (item.shape === 'heart') {
          ctx.translate(drawX, drawY);
          ctx.scale(drawW / 24, drawH / 24);
          const heartPath = new Path2D(
            'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          );
          ctx.clip(heartPath);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Draw Image with exact pixel crop (expanded for bleed if set)
        ctx.drawImage(
          img,
          item.cropX,
          item.cropY,
          actualCropW,
          actualCropH,
          drawX,
          drawY,
          drawW,
          drawH
        );

        ctx.restore();

        // Draw Cut lines / Corner marks at the EXACT finished boundary
        if (settings.cutLines) {
          ctx.save();
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1.5;

          const activeCutStyles =
            settings.cutStyles && settings.cutStyles.length > 0
              ? settings.cutStyles
              : settings.cutStyle
              ? [settings.cutStyle]
              : ['dashed'];

          const hasCornerMarks = activeCutStyles.includes('corner_marks');
          const hasSolid = activeCutStyles.includes('solid');
          const hasDashed = activeCutStyles.includes('dashed');

          if (hasCornerMarks) {
            // Chữ thập / Dấu góc tiêu chuẩn in ấn (Corner Crop Marks)
            ctx.setLineDash([]);
            const arm = Math.round(3.5 * MM_TO_PX_300DPI); // 3.5mm
            const gap = Math.round(1 * MM_TO_PX_300DPI); // 1mm khoảng hở ngoài thành phẩm

            // Top-Left
            ctx.beginPath();
            ctx.moveTo(pxX - gap, pxY);
            ctx.lineTo(pxX - gap - arm, pxY);
            ctx.moveTo(pxX, pxY - gap);
            ctx.lineTo(pxX, pxY - gap - arm);
            ctx.stroke();

            // Top-Right
            ctx.beginPath();
            ctx.moveTo(pxX + pxW + gap, pxY);
            ctx.lineTo(pxX + pxW + gap + arm, pxY);
            ctx.moveTo(pxX + pxW, pxY - gap);
            ctx.lineTo(pxX + pxW, pxY - gap - arm);
            ctx.stroke();

            // Bottom-Left
            ctx.beginPath();
            ctx.moveTo(pxX - gap, pxY + pxH);
            ctx.lineTo(pxX - gap - arm, pxY + pxH);
            ctx.moveTo(pxX, pxY + pxH + gap);
            ctx.lineTo(pxX, pxY + pxH + gap + arm);
            ctx.stroke();

            // Bottom-Right
            ctx.beginPath();
            ctx.moveTo(pxX + pxW + gap, pxY + pxH);
            ctx.lineTo(pxX + pxW + gap + arm, pxY + pxH);
            ctx.moveTo(pxX + pxW, pxY + pxH + gap);
            ctx.lineTo(pxX + pxW, pxY + pxH + gap + arm);
            ctx.stroke();
          }

          if (hasSolid || hasDashed) {
            if (hasSolid) {
              ctx.setLineDash([]);
            } else {
              ctx.setLineDash([12, 8]);
            }

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
