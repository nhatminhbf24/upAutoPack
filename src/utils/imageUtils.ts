import JSZip from 'jszip';
import { PhotoItem, PackedPage, LayoutSettings, SizePreset, OrientationMode, ShapeType } from '../types';
import { MM_TO_PX_300DPI, A4_WIDTH_MM, A4_HEIGHT_MM } from './packing';
import { renderTextTagOnCanvas } from './textTagUtils';
import { detectBadgeBleedColors } from './badgeUtils';

export function getShortPresetLabel(label: string): string {
  if (!label) return '';
  return label.replace(/\s*\([^)]*\)/g, '').trim();
}

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
 * Creates a lightweight, optimized display proxy image (maxDim default 420px, compressed WebP/JPEG)
 * to prevent DOM, GPU VRAM, and canvas memory lag when working with dozens of 800+ DPI high-res photos.
 * Reduces GPU texture footprint by ~75% while maintaining retina-crisp sharpness on A4 sheets.
 */
export async function createOptimizedPreview(
  src: string,
  maxDimension = 420,
  quality = 0.82
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

    const isPng = src.startsWith('data:image/png') || src.includes('.png');
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', isPng ? undefined : { alpha: false });
    if (!ctx) return src;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
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

    const isPng = src.startsWith('data:image/png') || src.includes('.png');
    return isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.95);
  } catch (err) {
    console.error('Error rotating image:', err);
    return src;
  }
}

/**
 * Crops a defined sub-rectangle from a base64 or URL image and returns a new base64 image with its new dimensions.
 */
export async function cropImageToCanvas(
  src: string,
  cropArea: { x: number; y: number; w: number; h: number }
): Promise<{ croppedSrc: string; width: number; height: number }> {
  try {
    const img = await loadImage(src);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    // Clamp coordinates safely within source image bounds
    const sx = Math.max(0, Math.min(Math.round(cropArea.x), naturalW - 1));
    const sy = Math.max(0, Math.min(Math.round(cropArea.y), naturalH - 1));
    const sw = Math.max(1, Math.min(Math.round(cropArea.w), naturalW - sx));
    const sh = Math.max(1, Math.min(Math.round(cropArea.h), naturalH - sy));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;

    const isPng = src.startsWith('data:image/png') || src.includes('.png');
    const ctx = canvas.getContext('2d', isPng ? undefined : { alpha: false });
    if (!ctx) throw new Error('Failed to get canvas 2d context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedSrc = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.95);
    return {
      croppedSrc,
      width: sw,
      height: sh,
    };
  } catch (err) {
    console.error('Error cropping image:', err);
    throw err;
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

/**
 * Automatically adjusts target dimensions to match the image orientation:
 * - If image is Landscape (width > height) and target is Portrait (height > width):
 *   swaps target dimensions to Landscape (e.g. 30x80 -> 80x30).
 * - If image is Portrait (height > width) and target is Landscape (width > height):
 *   swaps target dimensions to Portrait (e.g. 80x30 -> 30x80).
 * - For square images or circular/heart shapes: keeps original target dimensions.
 */
export function getOrientedDimensions(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number,
  autoOrient = true,
  shape: string = 'rect'
): { targetWidth: number; targetHeight: number; wasSwapped: boolean } {
  if (!autoOrient || shape === 'circle' || shape === 'heart' || targetWidth === targetHeight) {
    return { targetWidth, targetHeight, wasSwapped: false };
  }

  const isImgLandscape = imgWidth > imgHeight;
  const isImgPortrait = imgHeight > imgWidth;
  const isTargetLandscape = targetWidth > targetHeight;
  const isTargetPortrait = targetHeight > targetWidth;

  if (isImgLandscape && isTargetPortrait) {
    // Image is wide, target is tall -> switch to wide target
    return {
      targetWidth: Math.max(targetWidth, targetHeight),
      targetHeight: Math.min(targetWidth, targetHeight),
      wasSwapped: true,
    };
  }

  if (isImgPortrait && isTargetLandscape) {
    // Image is tall, target is wide -> switch to tall target
    return {
      targetWidth: Math.min(targetWidth, targetHeight),
      targetHeight: Math.max(targetWidth, targetHeight),
      wasSwapped: true,
    };
  }

  return { targetWidth, targetHeight, wasSwapped: false };
}

/**
 * Applies a size preset and orientation mode to a photo item:
 * 1. 'rotate_to_fit' (Ép đúng cỡ & Tự xoay ảnh):
 *    - Frame size is strictly preset.width x preset.height.
 *    - If photo orientation mismatches the frame orientation (e.g. horizontal photo in vertical 5x7 frame),
 *      the image is rotated 90° clockwise so it fits the frame perfectly without cropping the sides!
 * 2. 'auto_match' (Khớp chiều theo ảnh):
 *    - Frame size adapts to photo: horizontal photo gets horizontal frame (7x5), vertical photo gets vertical frame (5x7).
 *    - Image is restored to original unrotated angle (0°).
 * 3. 'fixed_crop' (Cố định khổ - Cắt cúp):
 *    - Frame size is strictly preset.width x preset.height.
 *    - Image is restored to original unrotated angle (0°); centered crop is calculated.
 */
export async function formatPhotoToPreset(
  photo: PhotoItem,
  preset: SizePreset,
  orientationMode: OrientationMode = 'rotate_to_fit',
  smartCrop = false
): Promise<{ photo: PhotoItem; didRotate: boolean }> {
  let targetW = preset.width;
  let targetH = preset.height;
  const targetShape: ShapeType = preset.shape;

  // 1. Identify if this photo was previously auto-rotated by rotate_to_fit
  const wasAutoRotated =
    photo.autoRotateAngle === 90 ||
    (photo.rotation === 90 && Boolean(photo.rawOriginalWidth) && photo.rawOriginalWidth === photo.imgHeight);

  // 2. Identify the unrotated base dimensions
  let baseW = photo.unrotatedWidth || photo.rawOriginalWidth;
  let baseH = photo.unrotatedHeight || photo.rawOriginalHeight;
  if (!baseW || !baseH) {
    if (wasAutoRotated) {
      baseW = photo.imgHeight;
      baseH = photo.imgWidth;
    } else {
      baseW = photo.imgWidth;
      baseH = photo.imgHeight;
    }
  }

  // 3. Identify the unrotated base image sources
  let baseSrc = photo.unrotatedOriginalSrc;
  let basePreview = photo.unrotatedPreviewSrc;

  if (!baseSrc) {
    if (wasAutoRotated) {
      // If photo was rotated, rawOriginalSrc is unrotated
      baseSrc = photo.rawOriginalSrc || photo.originalSrc;
      basePreview = photo.rawOriginalSrc
        ? await createOptimizedPreview(photo.rawOriginalSrc, 420, 0.82)
        : photo.previewSrc;
    } else {
      baseSrc = photo.originalSrc;
      basePreview = photo.previewSrc;
    }
  }
  if (!basePreview) {
    basePreview = baseSrc;
  }

  let finalSrc = baseSrc;
  let finalPreview = basePreview;
  let finalW = baseW;
  let finalH = baseH;
  let autoRotateAngle = 0;
  let didRotate = false;
  let cachedRotatedOriginal = photo.rotatedOriginalSrc;
  let cachedRotatedPreview = photo.rotatedPreviewSrc;

  if (targetShape === 'rect' && preset.width !== preset.height) {
    const isPresetPortrait = preset.height > preset.width;
    const isPresetLandscape = preset.width > preset.height;
    const isBaseLandscape = baseW > baseH;
    const isBasePortrait = baseH > baseW;

    if (orientationMode === 'rotate_to_fit') {
      const needsRotate = (isPresetPortrait && isBaseLandscape) || (isPresetLandscape && isBasePortrait);
      if (needsRotate) {
        if (!cachedRotatedOriginal) {
          cachedRotatedOriginal = await rotateImageBase64(baseSrc, 90);
          cachedRotatedPreview = basePreview
            ? await rotateImageBase64(basePreview, 90)
            : await createOptimizedPreview(cachedRotatedOriginal, 420, 0.82);
        }
        finalSrc = cachedRotatedOriginal;
        finalPreview = cachedRotatedPreview || cachedRotatedOriginal;
        finalW = baseH;
        finalH = baseW;
        autoRotateAngle = 90;
        didRotate = true;
      } else {
        finalSrc = baseSrc;
        finalPreview = basePreview;
        finalW = baseW;
        finalH = baseH;
        autoRotateAngle = 0;
      }
      targetW = preset.width;
      targetH = preset.height;
    } else if (orientationMode === 'auto_match') {
      // Revert to unrotated image!
      finalSrc = baseSrc;
      finalPreview = basePreview;
      finalW = baseW;
      finalH = baseH;
      autoRotateAngle = 0;

      const oriented = getOrientedDimensions(baseW, baseH, preset.width, preset.height, true, targetShape);
      targetW = oriented.targetWidth;
      targetH = oriented.targetHeight;
    } else {
      // 'fixed_crop'
      // Revert to unrotated image!
      finalSrc = baseSrc;
      finalPreview = basePreview;
      finalW = baseW;
      finalH = baseH;
      autoRotateAngle = 0;

      targetW = preset.width;
      targetH = preset.height;
    }
  }

  const crop = calculateCrop(finalW, finalH, targetW, targetH, smartCrop);

  const isBadge = Boolean(preset.isBadgePreset);
  let badgeBleedColor = photo.badgeBleedColor;
  let badgeBleedPalette = photo.badgeBleedPalette;

  if (isBadge && (!badgeBleedColor || badgeBleedColor.toLowerCase() === '#ffb6c1' || !photo.badgeMode)) {
    try {
      const analysis = await detectBadgeBleedColors(finalSrc);
      badgeBleedColor = analysis.dominantColor;
      badgeBleedPalette = analysis.palette;
    } catch (e) {
      console.warn('Could not auto detect bleed color for badge', e);
      badgeBleedColor = badgeBleedColor || '#ffffff';
    }
  }

  return {
    photo: {
      ...photo,
      originalSrc: finalSrc,
      previewSrc: finalPreview,
      unadjustedSrc: finalSrc,
      rawOriginalSrc: photo.isEnhanced ? photo.rawOriginalSrc : finalSrc,
      rawOriginalWidth: photo.isEnhanced ? photo.rawOriginalWidth : finalW,
      rawOriginalHeight: photo.isEnhanced ? photo.rawOriginalHeight : finalH,
      rawOriginalCrop: photo.isEnhanced
        ? photo.rawOriginalCrop
        : { cropX: crop.cropX, cropY: crop.cropY, cropW: crop.cropW, cropH: crop.cropH },
      unrotatedOriginalSrc: baseSrc,
      unrotatedPreviewSrc: basePreview,
      unrotatedWidth: baseW,
      unrotatedHeight: baseH,
      rotatedOriginalSrc: cachedRotatedOriginal,
      rotatedPreviewSrc: cachedRotatedPreview,
      autoRotateAngle,
      imgWidth: finalW,
      imgHeight: finalH,
      targetWidth: targetW,
      targetHeight: targetH,
      shape: targetShape,
      cropX: crop.cropX,
      cropY: crop.cropY,
      cropW: crop.cropW,
      cropH: crop.cropH,
      scale: 1,
      rotation: autoRotateAngle,
      badgeMode: isBadge,
      badgeFaceDiameter: isBadge ? (preset.badgeFaceDiameter || 43) : undefined,
      badgeBleedColor: isBadge ? (badgeBleedColor || '#ffffff') : undefined,
      badgeBleedPalette: isBadge ? badgeBleedPalette : undefined,
      badgeGuideLines: false,
      badgeBleedMode: isBadge ? (photo.badgeBleedMode || 'solid') : undefined,
    },
    didRotate,
  };
}

export async function exportPagesToImage(
  pages: PackedPage[],
  settings: LayoutSettings,
  format: 'png' | 'jpeg' | 'png-transparent' = 'png',
  onProgress?: (current: number, total: number) => void,
  options?: { transparentBackground?: boolean }
): Promise<void> {
  if (pages.length === 0) return;

  const isTransparent = format === 'png-transparent' || Boolean(options?.transparentBackground);
  const isLandscape = settings.paperOrientation === 'landscape';
  const pageW_mm = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const canvasWidth = Math.round(pageW_mm * MM_TO_PX_300DPI);
  const canvasHeight = Math.round(pageH_mm * MM_TO_PX_300DPI);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (onProgress) onProgress(pageIdx + 1, pages.length);

    const page = pages[pageIdx];
    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { alpha: isTransparent || format === 'png' });
    if (!ctx) {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
      continue;
    }

    // Only fill white background if NOT transparent
    if (!isTransparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Freeform Text Tag / Thông tin mã đơn
    renderTextTagOnCanvas(ctx, settings, page.pageNumber, pages.length, isLandscape);

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

        if (item.shape === 'circle' && item.badgeMode && item.badgeFaceDiameter) {
          // 🏅 Phôi huy hiệu cài áo chuyên dụng (Badge Pin)
          const diam = Math.min(pxW, pxH);
          const centerX = pxX + pxW / 2;
          const centerY = pxY + pxH / 2;
          const cutRadius = diam / 2;

          // 1. Cắt viền tròn khuôn cắt dập (Cut diameter, vd 5.5cm)
          ctx.beginPath();
          ctx.arc(centerX, centerY, cutRadius, 0, Math.PI * 2);
          ctx.clip();

          // 2. Đổ màu nền đồng bộ viền bọc mép (Bleed margin, vd màu nền tự động)
          ctx.fillStyle = item.badgeBleedColor || '#ffffff';
          ctx.fillRect(centerX - cutRadius, centerY - cutRadius, diam, diam);

          // 3. Đường kính mặt chính diện huy hiệu (Face diameter, vd 4.4cm)
          const faceRatio = Math.min(1, item.badgeFaceDiameter / (item.targetWidth || 55));
          const faceDiam = diam * faceRatio;
          const faceRadius = faceDiam / 2;

          // Vẽ ảnh khách centered trong mặt trước 4.4cm
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(
            img,
            item.cropX,
            item.cropY,
            actualCropW,
            actualCropH,
            centerX - faceRadius,
            centerY - faceRadius,
            faceDiam,
            faceDiam
          );
          ctx.restore();
        } else {
          // Khung thông thường (Chữ nhật, Tròn thường, Trái tim)
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
        }

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
    const typeLabel = isTransparent ? '_TachNen' : '';
    link.download = `InAnh_A4${typeLabel}${pageSuffix}_${Date.now()}.${ext}`;
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

/**
 * Xuất 1 ảnh đơn lẻ định dạng PNG chuẩn 300 DPI với nền trong suốt (tách nền theo khuôn)
 */
export async function exportSinglePhotoAsPng(
  photo: PhotoItem,
  transparent: boolean = true
): Promise<void> {
  const targetW_mm = photo.targetWidth || (photo.imgWidth / MM_TO_PX_300DPI);
  const targetH_mm = photo.targetHeight || (photo.imgHeight / MM_TO_PX_300DPI);

  const canvasW = Math.max(120, Math.round(targetW_mm * MM_TO_PX_300DPI));
  const canvasH = Math.max(120, Math.round(targetH_mm * MM_TO_PX_300DPI));

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { alpha: transparent });
  if (!ctx) return;

  if (!transparent) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  try {
    const img = await loadImage(photo.originalSrc);

    ctx.save();

    if (photo.shape === 'circle' && photo.badgeMode && photo.badgeFaceDiameter) {
      // 🏅 Huy hiệu chuyên dụng (Badge Pin)
      const diam = Math.min(canvasW, canvasH);
      const centerX = canvasW / 2;
      const centerY = canvasH / 2;
      const cutRadius = diam / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, cutRadius, 0, Math.PI * 2);
      ctx.clip();

      // Đổ nền viền bọc (Bleed)
      ctx.fillStyle = photo.badgeBleedColor || '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const faceRatio = Math.min(1, photo.badgeFaceDiameter / (photo.targetWidth || 55));
      const faceDiam = diam * faceRatio;
      const faceRadius = faceDiam / 2;

      const scale = photo.scale || 1;
      const cropX = photo.cropX ?? 0;
      const cropY = photo.cropY ?? 0;
      const actualCropW = (photo.cropW ?? photo.imgWidth) / scale;
      const actualCropH = (photo.cropH ?? photo.imgHeight) / scale;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        img,
        cropX,
        cropY,
        actualCropW,
        actualCropH,
        centerX - faceRadius,
        centerY - faceRadius,
        faceDiam,
        faceDiam
      );
      ctx.restore();
    } else {
      // Apply Shape Clip
      if (photo.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(canvasW / 2, canvasH / 2, Math.min(canvasW, canvasH) / 2, 0, Math.PI * 2);
        ctx.clip();
      } else if (photo.shape === 'heart') {
        ctx.scale(canvasW / 24, canvasH / 24);
        const heartPath = new Path2D(
          'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
        );
        ctx.clip(heartPath);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      const scale = photo.scale || 1;
      const cropX = photo.cropX ?? 0;
      const cropY = photo.cropY ?? 0;
      const actualCropW = (photo.cropW ?? photo.imgWidth) / scale;
      const actualCropH = (photo.cropH ?? photo.imgHeight) / scale;

      ctx.drawImage(
        img,
        cropX,
        cropY,
        actualCropW,
        actualCropH,
        0,
        0,
        canvasW,
        canvasH
      );
    }

    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png', 0.98);
    const link = document.createElement('a');
    const baseName = (photo.name || 'anh').replace(/\.[^/.]+$/, '').trim();
    const shapeLabel = photo.shape !== 'rect' ? `_${photo.shape}` : '';
    link.download = `${baseName}${shapeLabel}_tach_nen_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Error exporting single photo as PNG:', err);
    throw err;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Đóng gói toàn bộ danh sách ảnh con thành file ZIP định dạng PNG tách nền
 */
export async function exportAllPhotosAsZip(
  photos: PhotoItem[],
  zipName: string = 'bo_anh_da_tach_nen.zip',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (photos.length === 0) return;

  const zip = new JSZip();
  const folderName = zipName.replace(/\.zip$/i, '');
  const folder = zip.folder(folderName) || zip;

  for (let i = 0; i < photos.length; i++) {
    onProgress?.(i + 1, photos.length);
    const photo = photos[i];

    const targetW_mm = photo.targetWidth || (photo.imgWidth / MM_TO_PX_300DPI);
    const targetH_mm = photo.targetHeight || (photo.imgHeight / MM_TO_PX_300DPI);
    const canvasW = Math.max(120, Math.round(targetW_mm * MM_TO_PX_300DPI));
    const canvasH = Math.max(120, Math.round(targetH_mm * MM_TO_PX_300DPI));

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    try {
      const img = await loadImage(photo.originalSrc);
      ctx.save();

      if (photo.shape === 'circle' && photo.badgeMode && photo.badgeFaceDiameter) {
        // 🏅 Huy hiệu chuyên dụng (Badge Pin)
        const diam = Math.min(canvasW, canvasH);
        const centerX = canvasW / 2;
        const centerY = canvasH / 2;
        const cutRadius = diam / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, cutRadius, 0, Math.PI * 2);
        ctx.clip();

        // Đổ nền viền bọc (Bleed)
        ctx.fillStyle = photo.badgeBleedColor || '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);

        const faceRatio = Math.min(1, photo.badgeFaceDiameter / (photo.targetWidth || 55));
        const faceDiam = diam * faceRatio;
        const faceRadius = faceDiam / 2;

        const scale = photo.scale || 1;
        const cropX = photo.cropX ?? 0;
        const cropY = photo.cropY ?? 0;
        const actualCropW = (photo.cropW ?? photo.imgWidth) / scale;
        const actualCropH = (photo.cropH ?? photo.imgHeight) / scale;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          img,
          cropX,
          cropY,
          actualCropW,
          actualCropH,
          centerX - faceRadius,
          centerY - faceRadius,
          faceDiam,
          faceDiam
        );
        ctx.restore();
      } else {
        if (photo.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(canvasW / 2, canvasH / 2, Math.min(canvasW, canvasH) / 2, 0, Math.PI * 2);
          ctx.clip();
        } else if (photo.shape === 'heart') {
          ctx.scale(canvasW / 24, canvasH / 24);
          const heartPath = new Path2D(
            'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          );
          ctx.clip(heartPath);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        const scale = photo.scale || 1;
        const cropX = photo.cropX ?? 0;
        const cropY = photo.cropY ?? 0;
        const actualCropW = (photo.cropW ?? photo.imgWidth) / scale;
        const actualCropH = (photo.cropH ?? photo.imgHeight) / scale;

        ctx.drawImage(img, cropX, cropY, actualCropW, actualCropH, 0, 0, canvasW, canvasH);
      }

      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const baseName = (photo.name || `anh_${i + 1}`).replace(/\.[^/.]+$/, '').trim();
        const shapeLabel = photo.shape !== 'rect' ? `_${photo.shape}` : '';
        folder.file(`${String(i + 1).padStart(2, '0')}_${baseName}${shapeLabel}_tach_nen.png`, blob);
      }
    } catch (e) {
      console.error('Error exporting photo to zip', e);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }

    if (i % 2 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
    
    // Render Freeform Text Tag / Mã đơn ở lề trang A4
    renderTextTagOnCanvas(ctx, settings, page.pageNumber, pages.length, isLandscape);

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
