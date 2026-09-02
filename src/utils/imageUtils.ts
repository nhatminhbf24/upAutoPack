import JSZip from 'jszip';
import { PhotoItem, PackedPage, LayoutSettings } from '../types';
import { MM_TO_PX_300DPI, A4_WIDTH_MM, A4_HEIGHT_MM } from './packing';

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as Data URL'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  try {
    const img = await loadImage(src);
    return {
      width: img.naturalWidth || img.width || 800,
      height: img.naturalHeight || img.height || 600,
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return { width: 800, height: 600 };
  }
}

/**
 * Creates a lightweight, optimized preview image (maxDim around 800px, compressed WebP/JPEG)
 * to prevent DOM and GPU memory lag when working with dozens of 20MB+ high-res photos.
 */
export async function createOptimizedPreview(
  src: string,
  maxDimension = 800,
  quality = 0.85
): Promise<string> {
  try {
    const img = await loadImage(src);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // If image is already smaller than maxDimension, return directly to avoid re-compression
    if (w <= maxDimension && h <= maxDimension) {
      return src;
    }

    const scale = Math.min(1, maxDimension / Math.max(w, h));
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return src;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Prefer webp for smaller memory footprint, fallback to jpeg
    return canvas.toDataURL('image/jpeg', quality);
  } catch (e) {
    console.warn('Failed to create optimized preview, falling back to original', e);
    return src;
  }
}

export async function rotateImageBase64(src: string, angle = 90): Promise<string> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    if (angle === 90 || angle === 270) {
      canvas.width = img.naturalHeight || img.height;
      canvas.height = img.naturalWidth || img.width;
    } else {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    return canvas.toDataURL('image/jpeg', 0.95);
  } catch (err) {
    console.error('Error rotating image:', err);
    return src;
  }
}

export function calculateCrop(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number,
  smartCrop = false
): { cropX: number; cropY: number; cropW: number; cropH: number } {
  const targetRatio = targetWidth / targetHeight;
  const imgRatio = imgWidth / imgHeight;

  let cropW = imgWidth;
  let cropH = imgHeight;

  if (imgRatio > targetRatio) {
    // Image is wider than target ratio: crop left & right
    cropH = imgHeight;
    cropW = imgHeight * targetRatio;
  } else {
    // Image is taller than target ratio: crop top & bottom
    cropW = imgWidth;
    cropH = imgWidth / targetRatio;
  }

  let cropX = (imgWidth - cropW) / 2;
  let cropY = (imgHeight - cropH) / 2;

  if (smartCrop) {
    // Slight bias towards top-center (rule of thirds / portrait composition)
    cropY = Math.max(0, (imgHeight - cropH) * 0.35);
  }

  cropX = Math.max(0, Math.min(cropX, imgWidth - cropW));
  cropY = Math.max(0, Math.min(cropY, imgHeight - cropH));

  return { cropX, cropY, cropW, cropH };
}

export async function exportPagesToImage(
  pages: PackedPage[],
  settings: LayoutSettings,
  format: 'png' | 'jpeg',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (pages.length === 0) return;

  const isLandscape = settings.paperOrientation === 'landscape';
  const pageW_mm = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const canvasWidth = Math.round(pageW_mm * MM_TO_PX_300DPI);
  const canvasHeight = Math.round(pageH_mm * MM_TO_PX_300DPI);
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (onProgress) onProgress(pageIdx + 1, pages.length);

    const page = pages[pageIdx];
    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { alpha: format === 'png' });
    if (!ctx) {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
      continue;
    }

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (const item of page.items) {
      const pxX = item.x * MM_TO_PX_300DPI;
      const pxY = item.y * MM_TO_PX_300DPI;
      const pxW = item.w * MM_TO_PX_300DPI;
      const pxH = item.h * MM_TO_PX_300DPI;

      const actualCropW = item.cropW / (item.scale || 1);
      const actualCropH = item.cropH / (item.scale || 1);

      try {
        const img = await loadImage(item.originalSrc);

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

        // Draw Image
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
        console.error('Error drawing image on canvas:', e);
      }
    }

    // Trigger download
    const dataUrl = canvas.toDataURL(mimeType, 0.98);
    const link = document.createElement('a');
    const pageSuffix = pages.length > 1 ? `_Trang${page.pageNumber}` : '';
    link.download = `InAnh_A4${pageSuffix}_${Date.now()}.${ext}`;
    link.href = dataUrl;
    link.click();

    // Explicit GPU Canvas Memory disposal
    canvas.width = 0;
    canvas.height = 0;
    canvas = null;

    // Yield control to let GC reclaim memory and browser process download queue
    if (pages.length > 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

export async function exportPagesToZip(
  pages: PackedPage[],
  settings: LayoutSettings,
  format: 'png' | 'jpeg' = 'png',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (pages.length === 0) return;

  const zip = new JSZip();
  const isLandscape = settings.paperOrientation === 'landscape';
  const pageW_mm = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const canvasWidth = Math.round(pageW_mm * MM_TO_PX_300DPI);
  const canvasHeight = Math.round(pageH_mm * MM_TO_PX_300DPI);

  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    if (onProgress) {
      onProgress(pageIdx + 1, pages.length);
    }

    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { alpha: format === 'png' });
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

        // Draw Image
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
        console.error('Error drawing image on canvas for zip:', e);
      }
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas!.toBlob(resolve, mimeType, 0.98)
    );

    if (blob) {
      const pageNumberStr = String(page.pageNumber).padStart(2, '0');
      zip.file(`InAnh_A4_Trang_${pageNumberStr}.${ext}`, blob);
    }

    // Explicit GPU Canvas Memory disposal per page
    canvas.width = 0;
    canvas.height = 0;
    canvas = null;

    // Small yield for memory collection
    await new Promise((r) => setTimeout(r, 60));
  }

  const zipContent = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const blobUrl = URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.download = `Bo_Anh_In_A4_${pages.length}_Trang_${Date.now()}.zip`;
  link.href = blobUrl;
  link.click();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}
