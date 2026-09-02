import { PhotoItem, LayoutSettings, PackedPage, PlacedPhotoItem } from '../types';

export const MM_TO_PX_300DPI = 300 / 25.4; // approx 11.811 px/mm for 300 DPI high-res print/export
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ItemToPack {
  photo: PhotoItem;
  instanceIndex: number;
  w: number;
  h: number;
  area: number;
}

/**
 * Standard shelf packing (xếp tuần tự tự nhiên theo thứ tự ảnh, giữ nguyên 100% kích thước)
 */
function packShelf(
  items: ItemToPack[],
  usableWidth: number,
  usableHeight: number,
  margin: number,
  gap: number
): PackedPage[] {
  const pages: PackedPage[] = [];
  let currentPageItems: PlacedPhotoItem[] = [];
  let currentX = 0;
  let currentY = 0;
  let shelfHeight = 0;

  for (const item of items) {
    if (currentX + item.w > usableWidth && currentX > 0) {
      currentX = 0;
      currentY += shelfHeight + gap;
      shelfHeight = 0;
    }

    if (currentY + item.h > usableHeight && currentPageItems.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        items: currentPageItems,
      });
      currentPageItems = [];
      currentX = 0;
      currentY = 0;
      shelfHeight = 0;
    }

    currentPageItems.push({
      ...item.photo,
      instanceIndex: item.instanceIndex,
      x: margin + currentX,
      y: margin + currentY,
      w: item.w,
      h: item.h,
    });

    currentX += item.w + gap;
    shelfHeight = Math.max(shelfHeight, item.h);
  }

  if (currentPageItems.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      items: currentPageItems,
    });
  }

  return pages;
}

/**
 * Guillotine 2D Bin Packing with Straight-Cut Priority (Shorter Axis Split Rule - SASR & Best Short Side Fit)
 * Tối ưu diện tích in và tạo ra các đường cắt thẳng tắp từ cạnh này sang cạnh kia của giấy (Guillotine Cuts),
 * giúp người dùng dễ dàng dùng dao rọc giấy/bàn cắt rọc thẳng 1 đường mà không bị góc ziczac.
 * GIỮ NGUYÊN 100% KÍCH THƯỚC W x H ĐÃ CÀI ĐẶT.
 */
function packGuillotineStraightCut(
  items: ItemToPack[],
  usableWidth: number,
  usableHeight: number,
  margin: number,
  gap: number
): PackedPage[] {
  const remaining = [...items];
  const pages: PackedPage[] = [];

  while (remaining.length > 0) {
    const pageItems: PlacedPhotoItem[] = [];
    let freeRects: FreeRect[] = [{ x: 0, y: 0, w: usableWidth, h: usableHeight }];

    let itemPlaced = true;
    while (itemPlaced && remaining.length > 0) {
      itemPlaced = false;
      let bestItemIndex = -1;
      let bestRectIndex = -1;
      let bestScore = Number.MAX_VALUE;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];

        for (let r = 0; r < freeRects.length; r++) {
          const rect = freeRects[r];
          // Check if item fits in rect without rotation
          if (item.w <= rect.w && item.h <= rect.h) {
            const leftoverW = rect.w - item.w;
            const leftoverH = rect.h - item.h;
            const shortSideFit = Math.min(leftoverW, leftoverH);
            // Heuristic: Prefer top-left reading order + tightest fit
            const score = rect.y * 10000 + rect.x * 100 + shortSideFit;

            if (score < bestScore) {
              bestScore = score;
              bestItemIndex = i;
              bestRectIndex = r;
            }
          }
        }
      }

      if (bestItemIndex !== -1 && bestRectIndex !== -1) {
        const [placedItem] = remaining.splice(bestItemIndex, 1);
        const freeRect = freeRects[bestRectIndex];
        const finalW = placedItem.w;
        const finalH = placedItem.h;

        pageItems.push({
          ...placedItem.photo,
          instanceIndex: placedItem.instanceIndex,
          x: margin + freeRect.x,
          y: margin + freeRect.y,
          w: finalW,
          h: finalH,
        });

        // Split free rectangle using Guillotine Straight-Cut Rule (Shorter Axis Split)
        const occupiedW = finalW + gap;
        const occupiedH = finalH + gap;
        const wRem = freeRect.w - occupiedW;
        const hRem = freeRect.h - occupiedH;

        const newRects: FreeRect[] = [];

        // Remove the consumed free rect and replace with split pieces
        for (let r = 0; r < freeRects.length; r++) {
          if (r === bestRectIndex) {
            // Choose straight split axis based on shorter residual axis to maximize clean lines
            if (wRem <= hRem) {
              // Split horizontally across the width
              if (wRem > 0) {
                newRects.push({
                  x: freeRect.x + occupiedW,
                  y: freeRect.y,
                  w: wRem,
                  h: finalH,
                });
              }
              if (hRem > 0) {
                newRects.push({
                  x: freeRect.x,
                  y: freeRect.y + occupiedH,
                  w: freeRect.w,
                  h: hRem,
                });
              }
            } else {
              // Split vertically down the height
              if (wRem > 0) {
                newRects.push({
                  x: freeRect.x + occupiedW,
                  y: freeRect.y,
                  w: wRem,
                  h: freeRect.h,
                });
              }
              if (hRem > 0) {
                newRects.push({
                  x: freeRect.x,
                  y: freeRect.y + occupiedH,
                  w: finalW,
                  h: hRem,
                });
              }
            }
          } else {
            // Keep other unaffected free rects
            newRects.push(freeRects[r]);
          }
        }

        // Clean up redundant / tiny / enclosed rects (min 5mm to be usable)
        freeRects = newRects.filter((r) => r.w >= 5 && r.h >= 5);
        itemPlaced = true;
      }
    }

    if (pageItems.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        items: pageItems,
      });
    } else {
      // Safety fallback: if an item is larger than the page, place it alone
      if (remaining.length > 0) {
        const item = remaining.shift()!;
        pages.push({
          pageNumber: pages.length + 1,
          items: [
            {
              ...item.photo,
              instanceIndex: item.instanceIndex,
              x: margin,
              y: margin,
              w: Math.min(item.w, usableWidth),
              h: Math.min(item.h, usableHeight),
            },
          ],
        });
      }
    }
  }

  return pages;
}

export function packImagesToPages(
  photos: PhotoItem[],
  settings: LayoutSettings
): PackedPage[] {
  if (photos.length === 0) return [];

  const isLandscape = settings.paperOrientation === 'landscape';
  const pageWidth = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageHeight = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const margin = Math.max(0, settings.margin);
  const gap = Math.max(0, settings.gap);

  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  if (usableWidth <= 0 || usableHeight <= 0) return [];

  // Expand photos by quantity
  const itemsToPack: ItemToPack[] = [];

  photos.forEach((photo) => {
    const qty = Math.max(1, photo.qty || 1);
    for (let i = 0; i < qty; i++) {
      const w = photo.targetWidth;
      const h = photo.targetHeight;
      itemsToPack.push({
        photo,
        w,
        h,
        area: w * h,
        instanceIndex: i,
      });
    }
  });

  // Khi bật Nesting: Dùng thuật toán Guillotine Bin Packing ưu tiên đường cắt thẳng & diện tích tối đa
  if (settings.autoNesting === true) {
    // Sắp xếp giảm dần theo diện tích và kích thước lớn để tối ưu lấp đầy
    itemsToPack.sort((a, b) => b.area - a.area || Math.max(b.w, b.h) - Math.max(a.w, a.h));
    return packGuillotineStraightCut(itemsToPack, usableWidth, usableHeight, margin, gap);
  }

  // Mặc định: Xếp tuần tự tự nhiên (Standard Shelf Packing) theo thứ tự ảnh
  return packShelf(itemsToPack, usableWidth, usableHeight, margin, gap);
}
