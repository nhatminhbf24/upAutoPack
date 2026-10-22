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

    case 'photocard':
      return {
        type: 'photocard',
        frameColor: '#ffffff',
        textColor: '#1e293b',
        fontFamily: 'be_vietnam_pro',
        fontSizePt: 11,
        textAlign: 'center',
        textLine1: cleanName || 'Idol Photocard',
        textLine2: '',
        photocard: {
          borderRadiusMm: 3.5,
          borderMm: 0,
          bottomMm: 0,
          backDesign: 'symmetry',
        },
      };

    case 'spotify':
      return {
        type: 'spotify',
        frameColor: '#121212',
        textColor: '#ffffff',
        fontFamily: 'be_vietnam_pro',
        fontSizePt: 10,
        textAlign: 'left',
        textLine1: cleanName || 'Bài Hát Yêu Thích',
        textLine2: 'Nghệ Sĩ Thể Hiện',
        spotify: {
          borderMm: 4,
          songTitle: cleanName || 'Bài Hát Yêu Thích',
          artistName: 'Nghệ Sĩ Thể Hiện',
          duration: '03:45',
          currentTime: '01:28',
          progressPercent: 38,
          showSpotifyCode: true,
          theme: 'dark',
        },
      };

    case 'ticket':
      return {
        type: 'ticket',
        frameColor: '#ffffff',
        textColor: '#1e293b',
        fontFamily: 'be_vietnam_pro',
        fontSizePt: 9,
        textAlign: 'left',
        textLine1: 'PASSENGER TICKET / BOARDING PASS',
        textLine2: cleanName || 'NGUYEN VAN A',
        ticket: {
          passengerName: cleanName || 'NGUYEN VAN A',
          flight: 'VN-2026',
          from: 'HAN',
          to: 'SGN',
          gate: '08',
          seat: '12A',
          date: new Date().toLocaleDateString('vi-VN'),
          barcodeText: 'DAU-DAU-PRINT-2026',
          theme: 'airline_blue',
          notchCut: true,
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

    case 'photocard': {
      const border = config.photocard?.borderMm ?? 0;
      const bottom = config.photocard?.bottomMm ?? 0;
      const borderRadius = config.photocard?.borderRadiusMm ?? 3.5;
      const photoW = Math.max(10, targetWidthMm - border * 2);
      const photoH = Math.max(10, targetHeightMm - border * 2 - bottom);
      return {
        type: 'photocard',
        border,
        bottom,
        borderRadius,
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

    case 'spotify': {
      const border = config.spotify?.borderMm ?? 4;
      const photoW = Math.max(10, targetWidthMm - border * 2);
      const photoH = Math.min(photoW, Math.max(20, targetHeightMm * 0.55));
      const photoX = border;
      const photoY = border;
      const infoY = photoY + photoH;
      const infoH = Math.max(10, targetHeightMm - infoY - border);
      return {
        type: 'spotify',
        border,
        photoX,
        photoY,
        photoW,
        photoH,
        infoY,
        infoH,
      };
    }

    case 'ticket': {
      const border = 3;
      const headerH = 11;
      const photoW = Math.max(10, targetWidthMm - border * 2);
      const photoH = Math.max(20, targetHeightMm * 0.42);
      const photoX = border;
      const photoY = headerH;
      const stubDividerY = targetHeightMm * 0.74;
      return {
        type: 'ticket',
        border,
        headerH,
        photoX,
        photoY,
        photoW,
        photoH,
        stubDividerY,
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
 * Vẽ đường bao góc tròn (Rounded Rectangle Path) tương thích mọi trình duyệt
 */
export function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Vẽ thanh sóng âm Spotify Soundwave Code chân thực chuẩn phong cách Spotify
 */
export function drawSpotifySoundwave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  const barCount = 26;
  const gap = Math.max(1, w / (barCount * 2.8));
  const barW = Math.max(1.5, (w - (barCount - 1) * gap) / barCount);
  const pattern = [
    0.3, 0.65, 0.9, 0.45, 0.8, 1.0, 0.55, 0.85, 0.35, 0.75,
    0.95, 0.5, 0.85, 0.3, 0.7, 0.9, 0.4, 0.8, 1.0, 0.6,
    0.35, 0.75, 0.85, 0.45, 0.7, 0.4
  ];
  for (let i = 0; i < barCount; i++) {
    const barH = Math.max(3, h * (pattern[i % pattern.length] || 0.5));
    const bx = x + i * (barW + gap);
    const by = y + (h - barH) / 2;
    drawRoundedRectPath(ctx, bx, by, barW, barH, barW / 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Vẽ mã vạch Barcode sắc nét độ phân giải cao cho vé máy bay boarding pass
 */
export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  text?: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  const pattern = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 1, 2, 3, 2, 1, 4, 1, 3, 2, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2];
  const totalUnits = pattern.reduce((a, b) => a + b, 0);
  const unitW = w / totalUnits;
  let curX = x;
  let isBar = true;
  for (const p of pattern) {
    const barW = p * unitW;
    if (isBar) {
      ctx.fillRect(curX, y, barW, h);
    }
    curX += barW;
    isBar = !isBar;
  }
  if (text) {
    const textFontPx = Math.max(8, Math.round(h * 0.28));
    ctx.font = `600 ${textFontPx}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + w / 2, y + h + 2);
  }
  ctx.restore();
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

  // 6. Photocard (K-Pop Idol Photocard bo góc)
  if (config.type === 'photocard' && dims.type === 'photocard') {
    const rPx = (dims.borderRadius || 3.5) * pxPerMm;
    const borderPx = (dims.border || 0) * pxPerMm;
    const bottomPx = (dims.bottom || 0) * pxPerMm;

    const pxPhotoX = rect.x + borderPx;
    const pxPhotoY = rect.y + borderPx;
    const pxPhotoW = rect.w - borderPx * 2;
    const pxPhotoH = rect.h - borderPx * 2 - bottomPx;

    const innerRadius = Math.max(0, rPx - borderPx);

    // Vùng vẽ ảnh bo góc
    ctx.save();
    drawRoundedRectPath(ctx, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH, innerRadius);
    ctx.clip();

    const fitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.photoW, dims.photoH, photo);
    ctx.drawImage(img, fitCrop.cropX, fitCrop.cropY, fitCrop.cropW, fitCrop.cropH, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.restore();

    // Chân dưới ghi lời nhắn / tên idol (nếu có)
    const textLines = [config.textLine1, config.textLine2].filter(Boolean) as string[];
    if (bottomPx > 0 && textLines.length > 0) {
      ctx.save();
      const fontSizePx = Math.round((config.fontSizePt || 10) * (pxPerMm / 2.83465));
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

      const pxTextCenterY = rect.y + rect.h - bottomPx / 2;
      const lineHeightPx = fontSizePx * 1.3;

      if (textLines.length === 1) {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY);
      } else {
        ctx.fillText(textLines[0], pxTextX, pxTextCenterY - lineHeightPx * 0.5);
        ctx.fillText(textLines[1], pxTextX, pxTextCenterY + lineHeightPx * 0.5);
      }
      ctx.restore();
    }

    // Đường chỉ góc bo hướng dẫn cắt kéo (chỉ viền mờ 0.5px để khách dễ cắt bo tròn)
    ctx.save();
    ctx.strokeStyle = isDarkColor(config.frameColor) ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    drawRoundedRectPath(ctx, rect.x, rect.y, rect.w, rect.h, rPx);
    ctx.stroke();
    ctx.restore();

    return true;
  }

  // 7. Spotify Music Player
  if (config.type === 'spotify' && dims.type === 'spotify') {
    const isDark = config.spotify?.theme !== 'light';
    const bgColor = isDark ? '#121212' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const subTextColor = isDark ? '#a7a7a7' : '#64748b';
    const accentColor = '#1db954'; // Màu xanh lá biểu tượng Spotify

    // Nền card máy nghe nhạc
    ctx.save();
    ctx.fillStyle = config.frameColor && config.frameColor !== '#ffffff' ? config.frameColor : bgColor;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    const pxPhotoX = rect.x + dims.photoX * pxPerMm;
    const pxPhotoY = rect.y + dims.photoY * pxPerMm;
    const pxPhotoW = dims.photoW * pxPerMm;
    const pxPhotoH = dims.photoH * pxPerMm;

    // Album cover bo góc nhẹ 3mm
    const coverRadius = 3 * pxPerMm;
    ctx.save();
    drawRoundedRectPath(ctx, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH, coverRadius);
    ctx.clip();
    const fitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.photoW, dims.photoH, photo);
    ctx.drawImage(img, fitCrop.cropX, fitCrop.cropY, fitCrop.cropW, fitCrop.cropH, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.restore();

    let curY = pxPhotoY + pxPhotoH + 3 * pxPerMm;

    // Mã vạch sóng âm Spotify Code (nếu bật)
    if (config.spotify?.showSpotifyCode !== false) {
      const soundwaveH = Math.max(14, 5.5 * pxPerMm);
      drawSpotifySoundwave(ctx, pxPhotoX, curY, pxPhotoW, soundwaveH, isDark ? '#ffffff' : '#0f172a');
      curY += soundwaveH + 3.5 * pxPerMm;
    }

    // Tên bài hát & Tên ca sĩ
    const title = config.spotify?.songTitle || config.textLine1 || 'Bài Hát Yêu Thích';
    const artist = config.spotify?.artistName || config.textLine2 || 'Nghệ Sĩ Thể Hiện';

    ctx.save();
    const titleFontPx = Math.round(11 * (pxPerMm / 2.83465));
    ctx.font = `bold ${titleFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
    ctx.fillStyle = config.textColor || textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const truncatedTitle = truncateTextToWidth(ctx, title, pxPhotoW - 20);
    ctx.fillText(truncatedTitle, pxPhotoX, curY);

    curY += titleFontPx * 1.35;

    const artistFontPx = Math.round(8.5 * (pxPerMm / 2.83465));
    ctx.font = `500 ${artistFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
    ctx.fillStyle = subTextColor;
    const truncatedArtist = truncateTextToWidth(ctx, artist, pxPhotoW);
    ctx.fillText(truncatedArtist, pxPhotoX, curY);
    ctx.restore();

    curY += artistFontPx * 1.7;

    // Thanh tiến trình phát nhạc (Progress Bar)
    const barH = Math.max(2.5, 0.8 * pxPerMm);
    const progressPercent = Math.min(100, Math.max(0, config.spotify?.progressPercent ?? 38));
    const activeBarW = (pxPhotoW * progressPercent) / 100;

    ctx.save();
    // Track nền
    ctx.fillStyle = isDark ? '#3e3e3e' : '#e2e8f0';
    drawRoundedRectPath(ctx, pxPhotoX, curY, pxPhotoW, barH, barH / 2);
    ctx.fill();

    // Track đang phát
    ctx.fillStyle = isDark ? '#ffffff' : accentColor;
    drawRoundedRectPath(ctx, pxPhotoX, curY, activeBarW, barH, barH / 2);
    ctx.fill();

    // Nút tròn playhead
    const dotR = Math.max(3, 1.2 * pxPerMm);
    ctx.beginPath();
    ctx.arc(pxPhotoX + activeBarW, curY + barH / 2, dotR, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.fill();
    ctx.restore();

    curY += barH + 2 * pxPerMm;

    // Thời gian bài hát (vd: 01:28 / 03:45)
    const timeFontPx = Math.round(6.5 * (pxPerMm / 2.83465));
    ctx.save();
    ctx.font = `500 ${timeFontPx}px sans-serif`;
    ctx.fillStyle = subTextColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(config.spotify?.currentTime || '01:28', pxPhotoX, curY);

    ctx.textAlign = 'right';
    ctx.fillText(config.spotify?.duration || '03:45', pxPhotoX + pxPhotoW, curY);
    ctx.restore();

    curY += timeFontPx * 1.8;

    // Cụm nút điều khiển máy nghe nhạc (Shuffle, Prev, Play Circle, Next, Heart)
    const controlsY = curY + 2 * pxPerMm;
    const centerX = pxPhotoX + pxPhotoW / 2;
    const playCircleR = Math.max(8, 3.8 * pxPerMm);

    ctx.save();
    // Nút Play tròn to ở giữa
    ctx.beginPath();
    ctx.arc(centerX, controlsY + playCircleR, playCircleR, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.fill();

    // Tam giác Play bên trong nút tròn
    ctx.fillStyle = isDark ? '#121212' : '#ffffff';
    ctx.beginPath();
    const triSize = playCircleR * 0.7;
    ctx.moveTo(centerX - triSize * 0.35, controlsY + playCircleR - triSize * 0.6);
    ctx.lineTo(centerX + triSize * 0.65, controlsY + playCircleR);
    ctx.lineTo(centerX - triSize * 0.35, controlsY + playCircleR + triSize * 0.6);
    ctx.closePath();
    ctx.fill();

    // Nút Prev (⏮)
    const prevX = centerX - playCircleR * 2.2;
    ctx.fillStyle = config.textColor || textColor;
    ctx.beginPath();
    ctx.moveTo(prevX + 4, controlsY + playCircleR - 5);
    ctx.lineTo(prevX - 3, controlsY + playCircleR);
    ctx.lineTo(prevX + 4, controlsY + playCircleR + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(prevX - 6, controlsY + playCircleR - 5, 2, 10);

    // Nút Next (⏭)
    const nextX = centerX + playCircleR * 2.2;
    ctx.beginPath();
    ctx.moveTo(nextX - 4, controlsY + playCircleR - 5);
    ctx.lineTo(nextX + 3, controlsY + playCircleR);
    ctx.lineTo(nextX - 4, controlsY + playCircleR + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(nextX + 4, controlsY + playCircleR - 5, 2, 10);

    // Tim xanh hoặc trắng bên phải
    const heartX = pxPhotoX + pxPhotoW - 4;
    ctx.font = `${Math.round(8 * (pxPerMm / 2.83465))}px sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('💚', heartX, controlsY + playCircleR);

    ctx.restore();

    return true;
  }

  // 8. Boarding Pass / Vé máy bay Vintage
  if (config.type === 'ticket' && dims.type === 'ticket') {
    const theme = config.ticket?.theme || 'airline_blue';
    const isKraft = theme === 'vintage_kraft';
    const isDark = theme === 'airline_blue';

    const headerBg = isKraft ? '#78350f' : isDark ? '#0284c7' : '#1e293b';
    const cardBg = isKraft ? '#fef3c7' : '#ffffff';
    const textColor = isKraft ? '#451a03' : '#0f172a';
    const subTextColor = isKraft ? '#92400e' : '#64748b';

    // Đổ nền vé
    ctx.save();
    ctx.fillStyle = cardBg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    // 1. Dải Header "BOARDING PASS"
    const headerH = dims.headerH * pxPerMm;
    ctx.fillStyle = headerBg;
    ctx.fillRect(rect.x, rect.y, rect.w, headerH);

    ctx.fillStyle = '#ffffff';
    const headerFontPx = Math.round(7.5 * (pxPerMm / 2.83465));
    ctx.font = `bold ${headerFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈ BOARDING PASS', rect.x + 3 * pxPerMm, rect.y + headerH / 2);

    ctx.textAlign = 'right';
    ctx.font = `600 ${headerFontPx * 0.9}px monospace`;
    ctx.fillText(config.ticket?.flight || 'VN-2026', rect.x + rect.w - 3 * pxPerMm, rect.y + headerH / 2);
    ctx.restore();

    // 2. Vùng ảnh du lịch / ảnh kỷ niệm
    const pxPhotoX = rect.x + dims.photoX * pxPerMm;
    const pxPhotoY = rect.y + dims.photoY * pxPerMm;
    const pxPhotoW = dims.photoW * pxPerMm;
    const pxPhotoH = dims.photoH * pxPerMm;

    ctx.save();
    drawRoundedRectPath(ctx, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH, 2.5 * pxPerMm);
    ctx.clip();
    const fitCrop = calculateTemplateFitCrop(photo.imgWidth, photo.imgHeight, dims.photoW, dims.photoH, photo);
    ctx.drawImage(img, fitCrop.cropX, fitCrop.cropY, fitCrop.cropW, fitCrop.cropH, pxPhotoX, pxPhotoY, pxPhotoW, pxPhotoH);
    ctx.restore();

    // 3. Thông tin chuyến bay & Hành khách
    let infoY = pxPhotoY + pxPhotoH + 3 * pxPerMm;
    const passengerName = config.ticket?.passengerName || config.textLine2 || 'NGUYEN VAN A';
    const fromCode = config.ticket?.from || 'HAN';
    const toCode = config.ticket?.to || 'SGN';
    const gate = config.ticket?.gate || '08';
    const seat = config.ticket?.seat || '12A';
    const flightDate = config.ticket?.date || new Date().toLocaleDateString('vi-VN');

    ctx.save();
    // Route FROM ✈ TO
    const routeFontPx = Math.round(14 * (pxPerMm / 2.83465));
    ctx.font = `bold ${routeFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
    ctx.fillStyle = headerBg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fromCode, pxPhotoX, infoY);

    ctx.textAlign = 'center';
    ctx.font = `600 ${routeFontPx * 0.8}px sans-serif`;
    ctx.fillStyle = subTextColor;
    ctx.fillText('✈ ➔', pxPhotoX + pxPhotoW / 2, infoY + 2);

    ctx.textAlign = 'right';
    ctx.font = `bold ${routeFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
    ctx.fillStyle = headerBg;
    ctx.fillText(toCode, pxPhotoX + pxPhotoW, infoY);

    infoY += routeFontPx * 1.3;

    // Chi tiết Passenger Name
    const labelFontPx = Math.round(6 * (pxPerMm / 2.83465));
    const valFontPx = Math.round(8.5 * (pxPerMm / 2.83465));

    ctx.font = `600 ${labelFontPx}px sans-serif`;
    ctx.fillStyle = subTextColor;
    ctx.textAlign = 'left';
    ctx.fillText('PASSENGER NAME', pxPhotoX, infoY);

    infoY += labelFontPx * 1.3;

    ctx.font = `bold ${valFontPx}px ${getFontFamilyCss(config.fontFamily)}`;
    ctx.fillStyle = textColor;
    ctx.fillText(truncateTextToWidth(ctx, passengerName.toUpperCase(), pxPhotoW), pxPhotoX, infoY);

    infoY += valFontPx * 1.4;

    // Bảng nhỏ: GATE | SEAT | DATE
    const colW = pxPhotoW / 3;
    ctx.font = `600 ${labelFontPx}px sans-serif`;
    ctx.fillStyle = subTextColor;
    ctx.fillText('GATE', pxPhotoX, infoY);
    ctx.fillText('SEAT', pxPhotoX + colW, infoY);
    ctx.fillText('DATE', pxPhotoX + colW * 2, infoY);

    infoY += labelFontPx * 1.3;

    ctx.font = `bold ${valFontPx}px monospace`;
    ctx.fillStyle = textColor;
    ctx.fillText(gate, pxPhotoX, infoY);
    ctx.fillText(seat, pxPhotoX + colW, infoY);
    ctx.fillText(flightDate, pxPhotoX + colW * 2, infoY);

    ctx.restore();

    // 4. Đường cắt xé cuống vé (Perforated line) & Vết khuyết Notch bán nguyệt
    const stubY = rect.y + dims.stubDividerY * pxPerMm;

    ctx.save();
    // Đường nét đứt xé cuống vé
    ctx.strokeStyle = isKraft ? '#b45309' : '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4 * (pxPerMm / 3.77), 3 * (pxPerMm / 3.77)]);
    ctx.beginPath();
    ctx.moveTo(rect.x + (config.ticket?.notchCut !== false ? 3.5 * pxPerMm : 0), stubY);
    ctx.lineTo(rect.x + rect.w - (config.ticket?.notchCut !== false ? 3.5 * pxPerMm : 0), stubY);
    ctx.stroke();

    // Hai vết khuyết bán nguyệt (Notch) ở 2 bên mép
    if (config.ticket?.notchCut !== false) {
      const notchR = 2.8 * pxPerMm;
      ctx.fillStyle = '#ffffff'; // Nền giấy A4
      // Left notch
      ctx.beginPath();
      ctx.arc(rect.x, stubY, notchR, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.stroke();
      // Right notch
      ctx.beginPath();
      ctx.arc(rect.x + rect.w, stubY, notchR, Math.PI / 2, -Math.PI / 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 5. Phần cuống vé (Stub): Mã vạch Barcode
    const barcodeY = stubY + 3.5 * pxPerMm;
    const barcodeH = Math.max(16, rect.y + rect.h - barcodeY - 7 * pxPerMm);
    const barcodeW = pxPhotoW;

    drawBarcode(
      ctx,
      pxPhotoX,
      barcodeY,
      barcodeW,
      barcodeH,
      textColor,
      config.ticket?.barcodeText || 'DAU-DAU-PRINT-2026'
    );

    return true;
  }

  return false;
}
