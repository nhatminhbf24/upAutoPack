import { PhotoItem, TemplateConfig, PrintTemplateType, PhotostripSlot } from '../types';

/**
 * Khởi tạo cấu hình mặc định cho từng mẫu thiết kế
 */
export function createDefaultTemplateConfig(type: PrintTemplateType, photoName: string = ''): TemplateConfig {
  const cleanName = photoName ? photoName.replace(/\.[^/.]+$/, '').slice(0, 30) : 'daudau_print';

  switch (type) {
    case 'polaroid':
      return {
        type: 'polaroid',
        frameColor: '#ffffff',
        textColor: '#1e293b',
        fontFamily: 'handwriting',
        fontSizePt: 13,
        textAlign: 'center',
        textLine1: 'Sweet Memories',
        textLine2: '',
        polaroid: {
          borderMm: 3,
          bottomMm: 16,
        },
      };

    case 'instagram':
      return {
        type: 'instagram',
        frameColor: '#ffffff',
        textColor: '#0f172a',
        fontFamily: 'be_vietnam_pro',
        fontSizePt: 10,
        textAlign: 'left',
        textLine1: `${cleanName.toLowerCase().replace(/\s+/g, '_')} • khoảnh khắc đẹp ✨`,
        textLine2: '#love #memories #daudauprint',
        instagram: {
          username: cleanName.toLowerCase().replace(/\s+/g, '_') || 'daudau_print',
          avatarType: 'main',
          layoutMode: 'rect',
          showFollowBtn: true,
          showActions: true,
          liked: true,
          likesCount: '1,280 lượt thích',
          hasGradientRing: true,
        },
      };

    case 'photostrip':
      return {
        type: 'photostrip',
        frameColor: '#ffffff',
        textColor: '#334155',
        fontFamily: 'sans',
        fontSizePt: 11,
        textAlign: 'center',
        textLine1: 'PHOTOBOOTH MEMORIES',
        textLine2: new Date().toLocaleDateString('vi-VN'),
        photostrip: {
          slotCount: 4,
          borderMm: 3,
          gapMm: 2,
          bottomMm: 10,
          slots: [],
        },
      };

    case 'film':
      return {
        type: 'film',
        frameColor: '#0a0a0a',
        textColor: '#f8fafc',
        fontFamily: 'mono',
        fontSizePt: 9,
        textAlign: 'left',
        textLine1: '',
        textLine2: '',
        film: {
          frameNumber: '01',
          autoIncrement: true,
          sideText: 'FUJIFILM SUPERIA 400 • MEMORIES',
          filmStyle: 'classic_black',
        },
      };

    case 'bookmark':
      return {
        type: 'bookmark',
        frameColor: '#ffffff',
        textColor: '#1e293b',
        fontFamily: 'serif',
        fontSizePt: 12,
        textAlign: 'center',
        textLine1: 'Dành tặng trang sách yêu thích 📖',
        textLine2: 'Read with love & passion',
        bookmark: {
          borderMm: 3,
          photoHeightMm: 109.5,
          hasHolePunchGuide: true,
          fullBleed: false,
        },
      };

    default:
      return {
        type: 'none',
      };
  }
}

/**
 * Tính toán hình học chi tiết (mm) cho từng mẫu in
 */
export function getTemplateDimensions(
  targetWidthMm: number,
  targetHeightMm: number,
  config?: TemplateConfig
) {
  if (!config || config.type === 'none') {
    return {
      type: 'none',
      photoX: 0,
      photoY: 0,
      photoW: targetWidthMm,
      photoH: targetHeightMm,
    };
  }

  switch (config.type) {
    case 'polaroid': {
      const border = config.polaroid?.borderMm ?? 3;
      const bottom = config.polaroid?.bottomMm ?? 16;
      const photoW = Math.max(10, targetWidthMm - border * 2);
      const photoH = Math.max(10, targetHeightMm - border - bottom);
      return {
        type: 'polaroid',
        border,
        bottom,
        photoX: border,
        photoY: border,
        photoW,
        photoH,
        textX: border,
        textY: targetHeightMm - bottom,
        textW: photoW,
        textH: bottom,
      };
    }

    case 'instagram': {
      const headerH = 14; // mm
      const borderMm = config.instagram?.borderMm !== undefined
        ? config.instagram.borderMm
        : (targetWidthMm === 90 ? 4 : Math.max(2, (targetWidthMm * 4) / 90)); // mm
      const marginX = borderMm;
      const photoW = Math.max(10, targetWidthMm - marginX * 2); // mm
      const photoH = config.instagram?.layoutMode === 'square'
        ? photoW
        : targetHeightMm === 120
        ? 72
        : Math.min(photoW * (72 / 82), Math.max(20, targetHeightMm - headerH - 24)); // mm
      const photoX = (targetWidthMm - photoW) / 2;
      const photoY = headerH;
      const footerY = photoY + photoH;
      const footerH = Math.max(10, targetHeightMm - footerY);
      const avatarDiameter = Math.min(9.5, headerH - 3); // mm (nổi bật, chân thực chuẩn Instagram)
      return {
        type: 'instagram',
        headerH,
        borderMm,
        avatarDiameter,
        avatarX: marginX,
        avatarY: (headerH - avatarDiameter) / 2,
        photoX,
        photoY,
        photoW,
        photoH,
        footerY,
        footerH,
      };
    }

    case 'photostrip': {
      const slotCount = config.photostrip?.slotCount ?? 4;
      const border = config.photostrip?.borderMm ?? 3;
      const gap = config.photostrip?.gapMm ?? 2;
      const bottom = config.photostrip?.bottomMm ?? 10;
      const photoW = Math.max(10, targetWidthMm - border * 2);
      const totalAvailableH = targetHeightMm - border - bottom - (slotCount - 1) * gap;
      const slotH = Math.max(10, totalAvailableH / slotCount);

      const slots = [];
      for (let i = 0; i < slotCount; i++) {
        slots.push({
          index: i,
          x: border,
          y: border + i * (slotH + gap),
          w: photoW,
          h: slotH,
        });
      }

      return {
        type: 'photostrip',
        border,
        gap,
        bottom,
        slotCount,
        photoW,
        slotH,
        slots,
        textX: border,
        textY: targetHeightMm - bottom,
        textW: photoW,
        textH: bottom,
      };
    }

    case 'film': {
      const borderX = config.film?.borderMm ?? 4; // mm viền đục lỗ trái/phải
      const borderY = Math.max(2, Math.min(8, Math.round((borderX * 3) / 4))); // mm viền trên/dưới cân xứng
      const photoX = borderX;
      const photoY = borderY;
      const photoW = Math.max(10, targetWidthMm - borderX * 2);
      const photoH = Math.max(10, targetHeightMm - borderY * 2);
      return {
        type: 'film',
        borderX,
        borderY,
        photoX,
        photoY,
        photoW,
        photoH,
      };
    }

    case 'bookmark': {
      const border = config.bookmark?.borderMm ?? 3;
      const bottom = config.bookmark?.bottomMm ?? (targetHeightMm === 150 ? 37.5 : Math.max(15, targetHeightMm * 0.25));
      const photoH = config.bookmark?.photoHeightMm ?? Math.max(15, targetHeightMm - border - bottom);
      const photoW = Math.max(10, targetWidthMm - border * 2);
      const photoX = border;
      const photoY = border;
      const textY = photoY + photoH;
      const textH = Math.max(10, targetHeightMm - textY);
      return {
        type: 'bookmark',
        border,
        bottom,
        photoX,
        photoY,
        photoW,
        photoH,
        textX: border,
        textY,
        textW: photoW,
        textH,
        holeY: 4, // mm từ đỉnh
      };
    }

    default:
      return {
        type: 'none',
        photoX: 0,
        photoY: 0,
        photoW: targetWidthMm,
        photoH: targetHeightMm,
      };
  }
}

export interface FitCropCoords {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

/**
 * Tính toán vùng crop nguồn (cropX, cropY, cropW, cropH) trên ảnh gốc sao cho:
 * Tỷ lệ aspect ratio của vùng crop khớp CHÍNH XÁC 100% với tỷ lệ khung ảnh mục tiêu (slotW / slotH).
 * Điều này triệt tiêu hoàn toàn hiện tượng bóp méo, kéo dãn (squash/stretch) ảnh.
 */
export function calculateTemplateFitCrop(
  imgW: number,
  imgH: number,
  targetSlotW: number,
  targetSlotH: number,
  baseCrop?: {
    cropX?: number;
    cropY?: number;
    cropW?: number;
    cropH?: number;
    scale?: number;
  }
): FitCropCoords {
  const safeImgW = Math.max(1, imgW || 100);
  const safeImgH = Math.max(1, imgH || 100);
  const slotRatio = Math.max(0.01, (targetSlotW || 10) / Math.max(0.01, targetSlotH || 10));
  const imgRatio = safeImgW / safeImgH;

  // 1. Tỷ lệ unscaled lý tưởng để phủ kín khung slot mà không làm biến dạng (Cover fit)
  let idealW: number;
  let idealH: number;

  if (imgRatio > slotRatio) {
    // Ảnh bè ngang hơn khung slot -> giữ trọn chiều cao, cắt bớt 2 bên
    idealH = safeImgH;
    idealW = idealH * slotRatio;
  } else {
    // Ảnh cao hơn khung slot -> giữ trọn chiều rộng, cắt bớt trên dưới
    idealW = safeImgW;
    idealH = idealW / slotRatio;
  }

  // 2. Thu phóng theo scale
  const scale = Math.max(1, baseCrop?.scale || 1);
  const fitW = Math.max(1, idealW / scale);
  const fitH = Math.max(1, idealH / scale);

  // 3. Tính tâm dịch chuyển (Center mapping)
  let normCenterX = 0.5;
  let normCenterY = 0.5;

  if (baseCrop && typeof baseCrop.cropX === 'number' && typeof baseCrop.cropY === 'number') {
    const prevW = (baseCrop.cropW || safeImgW) / (baseCrop.scale || 1);
    const prevH = (baseCrop.cropH || safeImgH) / (baseCrop.scale || 1);
    normCenterX = Math.max(0, Math.min(1, (baseCrop.cropX + prevW / 2) / safeImgW));
    normCenterY = Math.max(0, Math.min(1, (baseCrop.cropY + prevH / 2) / safeImgH));
  }

  let fitX = normCenterX * safeImgW - fitW / 2;
  let fitY = normCenterY * safeImgH - fitH / 2;

  fitX = Math.max(0, Math.min(fitX, safeImgW - fitW));
  fitY = Math.max(0, Math.min(fitY, safeImgH - fitH));

  return {
    cropX: fitX,
    cropY: fitY,
    cropW: fitW,
    cropH: fitH,
  };
}

import { resolveFontFamilyCss } from './fontConstants';

/**
 * Trả về font CSS hợp lệ dựa trên cấu hình (hỗ trợ 11 phông tiếng Việt chuyên nghiệp)
 */
export function getFontFamilyCss(family?: string): string {
  return resolveFontFamilyCss(family);
}

/**
 * Kiểm tra xem một màu hex có phải là tông màu tối không (để tự động đảo màu chữ/icon sang màu sáng)
 */
export function isDarkColor(color?: string): boolean {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (['#000', '#000000', '#0a0a0a', '#0f172a', '#18181b', '#27272a', '#3f2c22'].includes(c)) return true;
  if (c.startsWith('#') && c.length === 7) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 130;
  }
  return false;
}

/**
 * Cắt ngắn chuỗi văn bản kèm dấu ba chấm (...) nếu vượt quá chiều rộng cho phép trên Canvas
 */
export function truncateTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + '...').width > maxW) {
    str = str.slice(0, -1);
  }
  return str.length > 0 ? str + '...' : '';
}

/**
 * Vẽ mẫu in lên Canvas 2D độ phân giải cao (dùng cho xuất PDF 300 DPI hoặc xuất ảnh đơn lẻ)
 */
export function renderTemplateOnCanvas(
  ctx: CanvasRenderingContext2D,
  photo: PhotoItem,
  img: HTMLImageElement | HTMLCanvasElement,
  rect: { x: number; y: number; w: number; h: number },
  pxPerMm: number,
  options?: {
    frameIndex?: number;
    avatarImg?: HTMLImageElement | HTMLCanvasElement;
    slotImgs?: Record<number, HTMLImageElement | HTMLCanvasElement>;
  }
) {
  const config = photo.templateConfig;
  if (!config || config.type === 'none') return false;

  const dims = getTemplateDimensions(photo.targetWidth, photo.targetHeight, config);

  // 1. Vẽ nền khung
  const frameColor = config.frameColor || (config.type === 'film' ? '#0a0a0a' : '#ffffff');
  ctx.fillStyle = frameColor;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // 2. Vẽ theo từng mẫu cụ thể
  if (config.type === 'polaroid' && dims.type === 'polaroid') {
    const pxPhotoX = rect.x + dims.photoX * pxPerMm;
    const pxPhotoY = rect.y + dims.photoY * pxPerMm;
    const pxPhotoW = dims.photoW * pxPerMm;
    const pxPhotoH = dims.photoH * pxPerMm;

    const fitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.photoW, dims.photoH, photo);

    // Vùng ảnh
    ctx.save();
    ctx.beginPath();
    ctx.rect(pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.clip();
    ctx.drawImage(img, fitCrop.cropX, fitCrop.cropY, fitCrop.cropW, fitCrop.cropH, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.restore();

    // Chân dưới ghi lời nhắn
    const textLines = [config.textLine1, config.textLine2].filter(Boolean) as string[];
    if (textLines.length > 0) {
      ctx.save();
      const fontSizePx = Math.round((config.fontSizePt || 12) * (pxPerMm / 2.83465));
      ctx.font = `600 ${fontSizePx}px ${getFontFamilyCss(config.fontFamily)}`;
      ctx.fillStyle = config.textColor || (isDarkColor(config.frameColor) ? '#f8fafc' : '#1e293b');
      ctx.textAlign = config.textAlign || 'center';
      ctx.textBaseline = 'middle';

      const pxTextX =
        config.textAlign === 'left'
          ? pxPhotoX + 2 * pxPerMm
          : config.textAlign === 'right'
          ? pxPhotoX + pxPhotoW - 2 * pxPerMm
          : pxPhotoX + pxPhotoW / 2;

      const pxTextCenterY = rect.y + (photo.targetHeight - dims.bottom / 2) * pxPerMm;
      const lineHeightPx = fontSizePx * 1.35;

      if (textLines.length === 1) {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY);
      } else {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY - lineHeightPx * 0.5);
        ctx.fillText(textLines[1], pxTextX, pxTextCenterY + lineHeightPx * 0.5);
      }
      ctx.restore();
    }
    return true;
  }

  if (config.type === 'instagram' && dims.type === 'instagram') {
    const isDark = isDarkColor(config.frameColor);
    const defaultTextColor = isDark ? '#f8fafc' : '#0f172a';
    const pxPhotoX = rect.x + dims.photoX * pxPerMm;
    const pxPhotoY = rect.y + dims.photoY * pxPerMm;
    const pxPhotoW = dims.photoW * pxPerMm;
    const pxPhotoH = dims.photoH * pxPerMm;

    // Header: Avatar, Username, Follow button, Dots
    const avatarR = (dims.avatarDiameter * pxPerMm) / 2;
    const insetPx = 1.2 * pxPerMm; // Căn thụt lề 1.2mm chuẩn Instagram card để avatar, icons và text luôn nằm gọn gàng bên trong
    const avatarCenterX = pxPhotoX + insetPx + avatarR;
    const avatarCenterY = rect.y + (dims.avatarY + dims.avatarDiameter / 2) * pxPerMm;

    // Vòng Story gradient Instagram (nếu bật)
    if (config.instagram?.hasGradientRing !== false) {
      ctx.save();
      const grad = ctx.createLinearGradient(
        avatarCenterX - avatarR,
        avatarCenterY + avatarR,
        avatarCenterX + avatarR,
        avatarCenterY - avatarR
      );
      grad.addColorStop(0, '#f09433');
      grad.addColorStop(0.25, '#e6683c');
      grad.addColorStop(0.5, '#dc2743');
      grad.addColorStop(0.75, '#cc2366');
      grad.addColorStop(1, '#bc1888');

      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarR + 0.7 * pxPerMm, 0, Math.PI * 2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2 * (pxPerMm / 3.77);
      ctx.stroke();

      // Vòng trắng ngăn cách
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarR + 0.3 * pxPerMm, 0, Math.PI * 2);
      ctx.strokeStyle = config.frameColor || '#ffffff';
      ctx.lineWidth = 0.8 * (pxPerMm / 3.77);
      ctx.stroke();
      ctx.restore();
    }

    // Vẽ Avatar tròn
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    if (config.instagram?.avatarType === 'custom' && options?.avatarImg) {
      ctx.drawImage(options.avatarImg, avatarCenterX - avatarR, avatarCenterY - avatarR, avatarR * 2, avatarR * 2);
    } else if (config.instagram?.avatarType === 'initial') {
      const initial = (config.instagram?.username || 'D').charAt(0).toUpperCase();
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(avatarCenterX - avatarR, avatarCenterY - avatarR, avatarR * 2, avatarR * 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(avatarR * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, avatarCenterX, avatarCenterY);
    } else {
      const avatarFitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.avatarDiameter, dims.avatarDiameter, photo);
      ctx.drawImage(img, avatarFitCrop.cropX, avatarFitCrop.cropY, avatarFitCrop.cropW, avatarFitCrop.cropH, avatarCenterX - avatarR, avatarCenterY - avatarR, avatarR * 2, avatarR * 2);
    }
    ctx.restore();

    // Viền nhẹ cho avatar nếu không có gradient ring
    if (config.instagram?.hasGradientRing === false) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Tên tài khoản & Nút Follow
    ctx.save();
    const usernameFontPx = Math.round(9.5 * (pxPerMm / 2.83465));
    ctx.font = `bold ${usernameFontPx}px sans-serif`;
    ctx.fillStyle = config.textColor || defaultTextColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textStartX = avatarCenterX + avatarR + 3 * pxPerMm;
    const usernameText = config.instagram?.username || 'daudau_print';
    ctx.fillText(usernameText, textStartX, avatarCenterY);
    const usernameW = ctx.measureText(usernameText).width;

    if (config.instagram?.showFollowBtn) {
      const followX = textStartX + usernameW + 2.5 * pxPerMm;
      const followW = 14 * pxPerMm;
      const followH = 4.8 * pxPerMm;
      const followY = avatarCenterY - followH / 2;

      ctx.fillStyle = isDark ? 'rgba(37, 99, 235, 0.25)' : '#eff6ff';
      ctx.beginPath();
      ctx.roundRect(followX, followY, followW, followH, 1.5 * pxPerMm);
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.5)' : '#bfdbfe';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = isDark ? '#60a5fa' : '#2563eb';
      ctx.font = `bold ${Math.round(7 * (pxPerMm / 2.83465))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Theo dõi', followX + followW / 2, avatarCenterY);
    }

    // Dấu 3 chấm ở góc phải
    const dotsRightX = pxPhotoX + pxPhotoW - insetPx - 2 * (pxPerMm / 3.77);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    for (let d = -1; d <= 1; d++) {
      ctx.beginPath();
      ctx.arc(dotsRightX + d * 2.5 * (pxPerMm / 3.77), avatarCenterY, 1.2 * (pxPerMm / 3.77), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Vùng ảnh chính
    const mainFitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.photoW, dims.photoH, photo);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.clip();
    ctx.drawImage(img, mainFitCrop.cropX, mainFitCrop.cropY, mainFitCrop.cropW, mainFitCrop.cropH, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.restore();

    // Footer: Cụm Icons lớn chân thực (Heart, Comment, Share, Bookmark) & Lời nhắn
    const footerStartY = rect.y + dims.footerY * pxPerMm;
    const iconSizePx = Math.round(6.8 * pxPerMm); // Kích thước icon lớn chuẩn Instagram
    const iconBaseY = footerStartY + 2.5 * pxPerMm;
    const hScale = iconSizePx / 24;
    const footerStartX = pxPhotoX + insetPx;
    const footerEndX = pxPhotoX + pxPhotoW - insetPx;

    if (config.instagram?.showActions !== false) {
      // 1. Vẽ Heart
      const heartX = footerStartX;
      ctx.save();
      ctx.translate(heartX, iconBaseY);
      ctx.scale(hScale, hScale);
      const heartPath = new Path2D(
        'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
      );
      if (config.instagram?.liked) {
        ctx.fillStyle = '#ff3040';
        ctx.fill(heartPath);
      } else {
        ctx.strokeStyle = config.textColor || defaultTextColor;
        ctx.lineWidth = 2;
        ctx.stroke(heartPath);
      }
      ctx.restore();

      // 2. Vẽ Comment bubble
      const commentX = footerStartX + iconSizePx + 3.8 * pxPerMm;
      ctx.save();
      ctx.translate(commentX, iconBaseY);
      ctx.scale(hScale, hScale);
      const commentPath = new Path2D(
        'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'
      );
      ctx.strokeStyle = config.textColor || defaultTextColor;
      ctx.lineWidth = 2;
      ctx.stroke(commentPath);
      ctx.restore();

      // 3. Vẽ Share / Paper plane
      const sendX = commentX + iconSizePx + 3.8 * pxPerMm;
      ctx.save();
      ctx.translate(sendX, iconBaseY);
      ctx.scale(hScale, hScale);
      const sendPath = new Path2D(
        'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'
      );
      ctx.strokeStyle = config.textColor || defaultTextColor;
      ctx.lineWidth = 2;
      ctx.stroke(sendPath);
      ctx.restore();

      // 4. Vẽ 3 chấm Carousel ở giữa
      const centerDotsX = rect.x + (photo.targetWidth / 2) * pxPerMm;
      const centerDotsY = iconBaseY + iconSizePx / 2;
      ctx.save();
      [-1, 0, 1].forEach((d) => {
        ctx.beginPath();
        ctx.arc(centerDotsX + d * 2.8 * (pxPerMm / 3.77), centerDotsY, 1.0 * (pxPerMm / 3.77), 0, Math.PI * 2);
        ctx.fillStyle = d === -1 ? '#2563eb' : (isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(100, 116, 139, 0.45)');
        ctx.fill();
      });
      ctx.restore();

      // 5. Vẽ Bookmark ribbon ở góc phải
      const bookmarkX = footerEndX - iconSizePx;
      ctx.save();
      ctx.translate(bookmarkX, iconBaseY);
      ctx.scale(hScale, hScale);
      const bookmarkPath = new Path2D(
        'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'
      );
      ctx.strokeStyle = config.textColor || defaultTextColor;
      ctx.lineWidth = 2;
      ctx.stroke(bookmarkPath);
      ctx.restore();
    }

    // Số lượt thích (Likes)
    const likesText = config.instagram?.likesCount || '1,280 lượt thích';
    const likesY = iconBaseY + iconSizePx + 2.5 * pxPerMm;
    ctx.save();
    const likesFontPx = Math.round(9 * (pxPerMm / 2.83465));
    ctx.font = `bold ${likesFontPx}px sans-serif`;
    ctx.fillStyle = config.textColor || defaultTextColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(likesText, footerStartX, likesY);
    ctx.restore();

    // Lời nhắn / Caption tối đa 2 dòng
    const textLines = [config.textLine1, config.textLine2].filter(Boolean) as string[];
    if (textLines.length > 0) {
      ctx.save();
      const captionFontPx = Math.round((config.fontSizePt || 9.5) * (pxPerMm / 2.83465));
      ctx.fillStyle = config.textColor || defaultTextColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const textStartY = likesY + likesFontPx + 2.0 * pxPerMm;
      const lineHeightPx = captionFontPx * 1.35;
      const footerAvailableW = footerEndX - footerStartX;

      // Dòng 1: Username in đậm + nội dung
      if (textLines[0]) {
        ctx.font = `bold ${captionFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
        const uPrefix = `${config.instagram?.username || 'daudau_print'} `;
        ctx.fillText(uPrefix, footerStartX, textStartY);
        const uW = ctx.measureText(uPrefix).width;

        ctx.font = `500 ${captionFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
        const truncatedLine1 = truncateTextToWidth(ctx, textLines[0], Math.max(10, footerAvailableW - uW));
        ctx.fillText(truncatedLine1, footerStartX + uW, textStartY);
      }

      // Dòng 2: hashtag / ngày tháng
      if (textLines[1]) {
        ctx.font = `500 ${captionFontPx * 0.9}px ${getFontFamilyCss(config.fontFamily)}`;
        ctx.fillStyle = isDark ? '#60a5fa' : '#1e40af'; // Màu xanh hashtag Instagram
        const truncatedLine2 = truncateTextToWidth(ctx, textLines[1], footerAvailableW);
        ctx.fillText(truncatedLine2, footerStartX, textStartY + lineHeightPx);
      }
      ctx.restore();
    }
    return true;
  }

  if (config.type === 'photostrip' && dims.type === 'photostrip') {
    // Vẽ các ô ảnh trong dải
    dims.slots.forEach((slot, idx) => {
      const pxX = rect.x + slot.x * pxPerMm;
      const pxY = rect.y + slot.y * pxPerMm;
      const pxW = slot.w * pxPerMm;
      const pxH = slot.h * pxPerMm;

      const slotConfig = config.photostrip?.slots?.[idx];
      const slotImg = options?.slotImgs?.[idx] || img;
      const slotImgEl = options?.slotImgs?.[idx] as HTMLImageElement | undefined;
      const slotW = (slotImgEl ? slotImgEl.naturalWidth || slotImgEl.width : slotConfig?.imgWidth) || photo.imgWidth;
      const slotH = (slotImgEl ? slotImgEl.naturalHeight || slotImgEl.height : slotConfig?.imgHeight) || photo.imgHeight;

      const slotFitCrop = calculateTemplateFitCrop(slotW, slotH, slot.w, slot.h, slotConfig || photo);

      ctx.save();
      ctx.beginPath();
      ctx.rect(pxX, pxY, pxW, pxH);
      ctx.clip();
      ctx.drawImage(slotImg, slotFitCrop.cropX, slotFitCrop.cropY, slotFitCrop.cropW, slotFitCrop.cropH, pxX, pxY, pxW, pxH);
      ctx.restore();
    });

    // Lời nhắn chân dải
    const textLines = [config.textLine1, config.textLine2].filter(Boolean) as string[];
    if (textLines.length > 0) {
      ctx.save();
      const fontSizePx = Math.round((config.fontSizePt || 10) * (pxPerMm / 2.83465));
      ctx.font = `bold ${fontSizePx}px ${getFontFamilyCss(config.fontFamily)}`;
      ctx.fillStyle = config.textColor || '#334155';
      ctx.textAlign = config.textAlign || 'center';
      ctx.textBaseline = 'middle';

      const pxTextX = rect.x + (photo.targetWidth / 2) * pxPerMm;
      const pxTextCenterY = rect.y + (photo.targetHeight - dims.bottom / 2) * pxPerMm;
      const lineHeightPx = fontSizePx * 1.35;

      if (textLines.length === 1) {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY);
      } else {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY - lineHeightPx * 0.45);
        ctx.fillText(textLines[1], pxTextX, pxTextCenterY + lineHeightPx * 0.45);
      }
      ctx.restore();
    }
    return true;
  }

  if (config.type === 'film' && dims.type === 'film') {
    const pxPhotoX = rect.x + dims.photoX * pxPerMm;
    const pxPhotoY = rect.y + dims.photoY * pxPerMm;
    const pxPhotoW = dims.photoW * pxPerMm;
    const pxPhotoH = dims.photoH * pxPerMm;

    const fitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.photoW, dims.photoH, photo);

    // Vùng ảnh
    ctx.save();
    ctx.beginPath();
    ctx.rect(pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.clip();
    ctx.drawImage(img, fitCrop.cropX, fitCrop.cropY, fitCrop.cropW, fitCrop.cropH, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.restore();

    // Chữ kỷ niệm chạy dọc mép trái (nếu có nội dung)
    const sideText = config.film?.sideText !== undefined ? config.film.sideText : 'FUJIFILM SUPERIA 400 • MEMORIES';
    if (sideText && sideText.trim()) {
      ctx.save();
      ctx.translate(rect.x + (dims.borderX / 2) * pxPerMm, rect.y + rect.h / 2);
      ctx.rotate(-Math.PI / 2);
      const sideFontPx = Math.round(7.5 * (pxPerMm / 2.83465));
      ctx.font = `600 ${sideFontPx}px ${getFontFamilyCss(config.fontFamily || 'mono')}`;
      ctx.fillStyle = '#f59e0b'; // Màu vàng ấm chuẩn film cổ điển
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sideText, 0, 0);
      ctx.restore();
    }

    // Số khung "01", "02" ở góc dưới bên phải
    let frameNumStr = config.film?.frameNumber || '01';
    if (config.film?.autoIncrement && typeof options?.frameIndex === 'number') {
      frameNumStr = String(options.frameIndex + 1).padStart(2, '0');
    }

    ctx.save();
    const frameFontPx = Math.round(9 * (pxPerMm / 2.83465));
    ctx.font = `bold ${frameFontPx}px monospace`;
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(frameNumStr, rect.x + rect.w - 2.5 * pxPerMm, rect.y + rect.h - 1.5 * pxPerMm);
    ctx.restore();

    return true;
  }

  if (config.type === 'bookmark' && dims.type === 'bookmark') {
    const pxPhotoX = rect.x + dims.photoX * pxPerMm;
    const pxPhotoY = rect.y + dims.photoY * pxPerMm;
    const pxPhotoW = dims.photoW * pxPerMm;
    const pxPhotoH = dims.photoH * pxPerMm;

    const fitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.photoW, dims.photoH, photo);

    // Vùng ảnh
    ctx.save();
    ctx.beginPath();
    ctx.rect(pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.clip();
    ctx.drawImage(img, fitCrop.cropX, fitCrop.cropY, fitCrop.cropW, fitCrop.cropH, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.restore();

    // Dấu vị trí đục lỗ xỏ dây ở trên cùng (nếu bật)
    if (config.bookmark?.hasHolePunchGuide) {
      const holeX = rect.x + (photo.targetWidth / 2) * pxPerMm;
      const holeY = rect.y + dims.holeY * pxPerMm;
      const holeR = 1.8 * pxPerMm; // Ø 3.6mm
      const isDark = isDarkColor(config.frameColor);

      ctx.save();
      ctx.beginPath();
      ctx.arc(holeX, holeY, holeR, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();

      // Tâm định vị
      ctx.beginPath();
      ctx.arc(holeX, holeY, 0.8 * (pxPerMm / 3.77), 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.6)';
      ctx.fill();
      ctx.restore();
    }

    // Lời nhắn chân thẻ
    const textLines = [config.textLine1, config.textLine2].filter(Boolean) as string[];
    if (textLines.length > 0) {
      ctx.save();
      const fontSizePx = Math.round((config.fontSizePt || 11) * (pxPerMm / 2.83465));
      ctx.font = `italic 600 ${fontSizePx}px ${getFontFamilyCss(config.fontFamily)}`;
      ctx.fillStyle = config.textColor || (isDarkColor(config.frameColor) ? '#f8fafc' : '#1e293b');
      ctx.textAlign = config.textAlign || 'center';
      ctx.textBaseline = 'middle';

      const pxTextX =
        config.textAlign === 'left'
          ? pxPhotoX + 2 * pxPerMm
          : config.textAlign === 'right'
          ? pxPhotoX + pxPhotoW - 2 * pxPerMm
          : pxPhotoX + pxPhotoW / 2;

      const pxTextCenterY = rect.y + (dims.textY + dims.textH / 2) * pxPerMm;
      const lineHeightPx = fontSizePx * 1.35;

      if (textLines.length === 1) {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY);
      } else {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY - lineHeightPx * 0.5);
        ctx.fillText(textLines[1], pxTextX, pxTextCenterY + lineHeightPx * 0.5);
      }
      ctx.restore();
    }
    return true;
  }

  return false;
}
