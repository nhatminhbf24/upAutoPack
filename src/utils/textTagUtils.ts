import { FreeformTextTag, LayoutSettings } from '../types';
import { MM_TO_PX_300DPI, A4_WIDTH_MM, A4_HEIGHT_MM } from './packing';

/**
 * Returns default configuration for freeform text tag
 */
export function getDefaultTextTag(isLandscape: boolean, margin: number = 5): FreeformTextTag {
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;
  return {
    enabled: false,
    text: '',
    includeDateTime: true,
    includePageNumber: true,
    fontSizePt: 8,
    rotation: 0,
    xMm: Math.max(4, margin),
    yMm: Math.max(10, pageH_mm - 5.5),
    color: '#334155',
  };
}

/**
 * Formats the full string to display based on text, timestamp, and page numbers
 */
export function formatTextTagContent(
  tag: FreeformTextTag,
  pageNumber: number,
  totalPages: number,
  isLandscape: boolean
): string {
  const parts: string[] = [];

  const trimmedText = tag.text?.trim();
  if (trimmedText) {
    parts.push(`[${trimmedText}]`);
  }

  if (tag.includeDateTime) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    parts.push(`${hours}:${minutes} ${day}/${month}/${year}`);
  }

  if (tag.includePageNumber) {
    parts.push(`Trang ${pageNumber}/${totalPages} (A4 ${isLandscape ? 'Ngang' : 'Dọc'})`);
  }

  if (parts.length === 0) {
    return `Trang ${pageNumber}/${totalPages}`;
  }

  return parts.join(' • ');
}

/**
 * Lấy cấu hình nhãn ghi chú cho một trang cụ thể:
 * - Ưu tiên hàng đầu: Nhãn riêng biệt của trang đó (settings.pageTextTags[pageNumber])
 * - Nếu người dùng đã dùng chế độ từng trang (settings.pageTextTags có ít nhất 1 trang được gán):
 *   Trang nào không có trong pageTextTags hoặc enabled: false thì sẽ không có nhãn.
 * - Ngược lại, nếu chưa dùng pageTextTags mà có settings.textTag (chế độ mẫu chung) và enabled = true:
 *   Áp dụng nhãn chung đó.
 */
export function getEffectiveTextTagForPage(
  settings: LayoutSettings,
  pageNumber: number,
  isLandscape: boolean
): FreeformTextTag | null {
  // 1. Kiểm tra cấu hình riêng của từng trang (Chế độ quản lý theo trang)
  if (settings.pageTextTags !== undefined && settings.pageTextTags !== null) {
    const pageSpecificTag = settings.pageTextTags[pageNumber];
    if (pageSpecificTag) {
      return pageSpecificTag.enabled ? pageSpecificTag : null;
    }
    // Trang không có trong danh sách pageTextTags thì hoàn toàn không có ghi chú
    return null;
  }

  // 2. Chế độ tương thích cũ (chỉ khi settings.pageTextTags chưa từng được gán)
  if (settings.textTag !== undefined && settings.textTag !== null) {
    return settings.textTag.enabled ? settings.textTag : null;
  }

  // 3. Fallback cho printSlug cũ (chỉ khi cả pageTextTags và textTag đều chưa từng gán)
  if (settings.printSlug) {
    const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;
    return {
      enabled: true,
      text: settings.orderSlug || '',
      includeDateTime: true,
      includePageNumber: true,
      fontSizePt: 8,
      rotation: 0,
      xMm: Math.max(4, settings.margin || 5),
      yMm: Math.max(10, pageH_mm - 5.5),
      color: '#334155',
    };
  }

  return null;
}

/**
 * Renders the freeform text tag directly on a 300 DPI canvas (for PDF and image export)
 */
export function renderTextTagOnCanvas(
  ctx: CanvasRenderingContext2D,
  settings: LayoutSettings,
  pageNumber: number,
  totalPages: number,
  isLandscape: boolean
): void {
  const tag = getEffectiveTextTagForPage(settings, pageNumber, isLandscape);
  if (!tag || !tag.enabled) return;

  const textToRender = formatTextTagContent(tag, pageNumber, totalPages, isLandscape);
  if (!textToRender) return;

  ctx.save();
  const xPx = Math.round(tag.xMm * MM_TO_PX_300DPI);
  const yPx = Math.round(tag.yMm * MM_TO_PX_300DPI);

  ctx.translate(xPx, yPx);
  ctx.rotate(((tag.rotation || 0) * Math.PI) / 180);

  // 1 pt = 1/72 inch. At 300 DPI: fontSizePx = fontSizePt * (300 / 72) = fontSizePt * 4.1667
  const fontSizePx = Math.max(16, Math.round((tag.fontSizePt || 8) * (300 / 72)));
  ctx.font = `bold ${fontSizePx}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = tag.color || '#334155';
  ctx.textBaseline = 'top';

  ctx.fillText(textToRender, 0, 0);
  ctx.restore();
}
