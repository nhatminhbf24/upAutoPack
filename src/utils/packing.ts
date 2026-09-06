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
 * Chấm điểm vị trí đặt ảnh trong thuật toán Guillotine Bin Packing:
 * 1. Ưu tiên thứ tự đọc từ trên xuống dưới, trái sang phải (rect.y, rect.x).
 * 2. Giảm thiểu tối đa chiều cao chiếm dụng (Bounding Height) để tiết kiệm giấy in.
 * 3. Đồng bộ chiều cao hàng (Row Coherence) và chiều xoay ảnh để đường cắt Guillotine thẳng tắp.
 */
function scorePlacement(
  rect: FreeRect,
  candW: number,
  candH: number,
  isRotated: boolean,
  pageItems: PlacedPhotoItem[],
  margin: number,
  gap: number,
  usableWidth: number,
  usableHeight: number
): number {
  // 1. Tọa độ không gian (hàng trên trước, mép trái trước)
  let score = rect.y * 100000 + rect.x * 1000;

  // 2. Chiều cao chiếm dụng: Chiều cao nhỏ hơn tốn ít giấy theo chiều dọc hơn
  score += candH * 15;

  // 3. Khớp và đồng bộ với các ảnh đã có trên trang
  if (pageItems.length > 0) {
    // 3.1. Nếu trong cùng một hàng (cùng mức y) đã có ảnh: Ưu tiên tuyệt đối cùng chiều cao
    const sameRowItems = pageItems.filter(
      (p) => Math.abs((p.y - margin) - rect.y) < 2
    );
    if (sameRowItems.length > 0) {
      if (Math.abs(candH - sameRowItems[0].h) < 0.5) {
        score -= 2000; // Khớp chuẩn hàng, đường cắt ngang thẳng 100%
      } else {
        score += 2000; // Khác chiều cao trong cùng một hàng sẽ làm gãy đường cắt
      }
    } else {
      // 3.2. Bắt đầu một hàng mới: Ưu tiên duy trì cùng chiều cao hàng với các hàng trước đó
      const lastItem = pageItems[pageItems.length - 1];
      if (Math.abs(candH - lastItem.h) < 0.5) {
        score -= 800; // Giữ nguyên độ cao hàng đồng nhất trên toàn trang
      }

      // 3.3. Đồng bộ tỷ lệ xoay trên toàn trang
      const rotatedCount = pageItems.filter((p) => p.isRotated).length;
      const unrotatedCount = pageItems.length - rotatedCount;
      if (rotatedCount > unrotatedCount && isRotated) {
        score -= 300; // Toàn trang đang theo chiều ngang thì tiếp tục ngang
      } else if (unrotatedCount > rotatedCount && !isRotated) {
        score -= 300; // Toàn trang đang theo chiều dọc thì tiếp tục dọc
      }
    }
  } else {
    // 4. Khi trang còn hoàn toàn trống (ảnh đầu tiên):
    // Đánh giá hướng nào chứa được nhiều ảnh nhất trên khổ giấy A4
    const cols = Math.floor((usableWidth + gap) / (candW + gap));
    const rows = Math.floor((usableHeight + gap) / (candH + gap));
    const capacity = cols * rows;
    score -= capacity * 250;
  }

  // 5. Phần dư chiều ngang trong ô trống
  const leftoverW = rect.w - candW;
  score += Math.max(0, leftoverW) * 0.5;

  // 6. Nếu cả 2 hướng ngang/dọc đều tối ưu như nhau, ưu tiên giữ nguyên chiều gốc (0°)
  if (isRotated) {
    score += 1.0;
  }

  return score;
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
  gap: number,
  allowRotation = false
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
      let bestRotated = false;
      let bestScore = Number.MAX_VALUE;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const canRotate = Boolean(
          allowRotation &&
          item.photo.shape === 'rect' &&
          Math.abs(item.w - item.h) > 0.5
        );

        for (let r = 0; r < freeRects.length; r++) {
          const rect = freeRects[r];
          // 1. Thử hướng chuẩn (0° - giữ nguyên chiều dọc/ngang)
          if (item.w <= rect.w && item.h <= rect.h) {
            const score = scorePlacement(
              rect,
              item.w,
              item.h,
              false,
              pageItems,
              margin,
              gap,
              usableWidth,
              usableHeight
            );

            if (score < bestScore) {
              bestScore = score;
              bestItemIndex = i;
              bestRectIndex = r;
              bestRotated = false;
            }
          }

          // 2. Thử hướng xoay 90° (hoán đổi w <-> h để lấp khoảng trống & đồng bộ hàng)
          if (canRotate && item.h <= rect.w && item.w <= rect.h) {
            const score = scorePlacement(
              rect,
              item.h,
              item.w,
              true,
              pageItems,
              margin,
              gap,
              usableWidth,
              usableHeight
            );

            if (score < bestScore) {
              bestScore = score;
              bestItemIndex = i;
              bestRectIndex = r;
              bestRotated = true;
            }
          }
        }
      }

      if (bestItemIndex !== -1 && bestRectIndex !== -1) {
        const [placedItem] = remaining.splice(bestItemIndex, 1);
        const freeRect = freeRects[bestRectIndex];
        const isRotated = bestRotated;
        const finalW = isRotated ? placedItem.h : placedItem.w;
        const finalH = isRotated ? placedItem.w : placedItem.h;

        pageItems.push({
          ...placedItem.photo,
          instanceIndex: placedItem.instanceIndex,
          x: margin + freeRect.x,
          y: margin + freeRect.y,
          w: finalW,
          h: finalH,
          isRotated,
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

/**
 * Maximal Rectangles (MaxRects) 2D Bin Packing
 * Thuật toán tối ưu hóa diện tích hàng đầu thế giới trong ngành in ấn và cắt tấm vật liệu.
 * Duy trì danh sách các hình chữ nhật tự do lớn nhất có thể (Maximal Free Rectangles),
 * cho phép lấp đầy tối đa mọi khe hở của khổ giấy A4 tương tự như trò chơi xếp hình Tetris.
 */
function packMaxRects(
  items: ItemToPack[],
  usableWidth: number,
  usableHeight: number,
  margin: number,
  gap: number,
  allowRotation = false,
  heuristic: 'BSSF' | 'BLSF' | 'BAF' | 'BOTTOM_LEFT' = 'BSSF'
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
      let bestScore1 = Number.MAX_VALUE;
      let bestScore2 = Number.MAX_VALUE;
      let bestX = 0;
      let bestY = 0;
      let bestW = 0;
      let bestH = 0;
      let bestRotated = false;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const canRotate = Boolean(
          allowRotation &&
          item.photo.shape === 'rect' &&
          Math.abs(item.w - item.h) > 0.5
        );

        // Thử cả 2 hướng: 0° (nguyên bản) và 90° (xoay lấp khoảng trống)
        const candidates = [{ w: item.w, h: item.h, rotated: false }];
        if (canRotate) {
          candidates.push({ w: item.h, h: item.w, rotated: true });
        }

        for (const cand of candidates) {
          for (let r = 0; r < freeRects.length; r++) {
            const rect = freeRects[r];
            if (cand.w <= rect.w && cand.h <= rect.h) {
              const leftoverW = rect.w - cand.w;
              const leftoverH = rect.h - cand.h;
              let score1 = 0;
              let score2 = 0;

              if (heuristic === 'BSSF') {
                // Best Short Side Fit: Ưu tiên ô khít cạnh ngắn nhất
                score1 = Math.min(leftoverW, leftoverH);
                score2 = Math.max(leftoverW, leftoverH);
              } else if (heuristic === 'BLSF') {
                // Best Long Side Fit: Ưu tiên ô khít cạnh dài nhất
                score1 = Math.max(leftoverW, leftoverH);
                score2 = Math.min(leftoverW, leftoverH);
              } else if (heuristic === 'BAF') {
                // Best Area Fit: Ưu tiên ô có diện tích thừa nhỏ nhất
                score1 = rect.w * rect.h - cand.w * cand.h;
                score2 = Math.min(leftoverW, leftoverH);
              } else {
                // Bottom-Left Fit: Ưu tiên dồn sát góc trên bên trái
                score1 = rect.y * 1000 + rect.x;
                score2 = Math.min(leftoverW, leftoverH);
              }

              // Ưu tiên vị trí từ trên xuống dưới, trái sang phải
              const positionPenalty = rect.y * 10000 + rect.x * 100;
              const rotationTieBreaker = cand.rotated ? 0.3 : 0;
              const totalScore1 = score1 + positionPenalty;
              const totalScore2 = score2 + rotationTieBreaker;

              if (
                totalScore1 < bestScore1 ||
                (totalScore1 === bestScore1 && totalScore2 < bestScore2)
              ) {
                bestScore1 = totalScore1;
                bestScore2 = totalScore2;
                bestItemIndex = i;
                bestX = rect.x;
                bestY = rect.y;
                bestW = cand.w;
                bestH = cand.h;
                bestRotated = cand.rotated;
              }
            }
          }
        }
      }

      if (bestItemIndex !== -1) {
        const [placedItem] = remaining.splice(bestItemIndex, 1);
        pageItems.push({
          ...placedItem.photo,
          instanceIndex: placedItem.instanceIndex,
          x: margin + bestX,
          y: margin + bestY,
          w: bestW,
          h: bestH,
          isRotated: bestRotated,
        });

        // Bounding box của ảnh đã đặt kèm khe hở giữa các ảnh
        const placedBox = {
          x: bestX,
          y: bestY,
          w: bestW + gap,
          h: bestH + gap,
        };

        // Phân tách tất cả các ô trống bị giao cắt thành các Maximal Free Rectangles mới
        const newFreeRects: FreeRect[] = [];
        for (let r = 0; r < freeRects.length; r++) {
          const f = freeRects[r];
          // Kiểm tra xem f có giao cắt với placedBox không
          if (
            placedBox.x >= f.x + f.w ||
            placedBox.x + placedBox.w <= f.x ||
            placedBox.y >= f.y + f.h ||
            placedBox.y + placedBox.h <= f.y
          ) {
            // Không giao cắt -> Giữ nguyên
            newFreeRects.push(f);
            continue;
          }

          // Có giao cắt: Cắt f thành tối đa 4 hình chữ nhật tự do lớn nhất
          // 1. Mảnh trên
          if (placedBox.y > f.y && placedBox.y < f.y + f.h) {
            newFreeRects.push({
              x: f.x,
              y: f.y,
              w: f.w,
              h: placedBox.y - f.y,
            });
          }
          // 2. Mảnh dưới
          if (placedBox.y + placedBox.h < f.y + f.h) {
            newFreeRects.push({
              x: f.x,
              y: placedBox.y + placedBox.h,
              w: f.w,
              h: (f.y + f.h) - (placedBox.y + placedBox.h),
            });
          }
          // 3. Mảnh trái
          if (placedBox.x > f.x && placedBox.x < f.x + f.w) {
            newFreeRects.push({
              x: f.x,
              y: f.y,
              w: placedBox.x - f.x,
              h: f.h,
            });
          }
          // 4. Mảnh phải
          if (placedBox.x + placedBox.w < f.x + f.w) {
            newFreeRects.push({
              x: placedBox.x + placedBox.w,
              y: f.y,
              w: (f.x + f.w) - (placedBox.x + placedBox.w),
              h: f.h,
            });
          }
        }

        // Loại bỏ ô quá nhỏ (< 4mm) và lọc bỏ các ô bị chứa hoàn toàn bên trong ô khác (Contained Rects)
        const validRects = newFreeRects.filter((r) => r.w >= 4 && r.h >= 4);
        const pruned: FreeRect[] = [];
        for (let i = 0; i < validRects.length; i++) {
          const a = validRects[i];
          let isContained = false;
          for (let j = 0; j < validRects.length; j++) {
            if (i === j) continue;
            const b = validRects[j];
            if (
              b.x <= a.x &&
              b.y <= a.y &&
              b.x + b.w >= a.x + a.w &&
              b.y + b.h >= a.y + a.h
            ) {
              isContained = true;
              break;
            }
          }
          if (!isContained) {
            pruned.push(a);
          }
        }

        freeRects = pruned;
        itemPlaced = true;
      }
    }

    if (pageItems.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        items: pageItems,
      });
    } else if (remaining.length > 0) {
      // Trường hợp ảnh kích thước lớn hơn cả khổ in A4
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

  return pages;
}

/**
 * Thuật toán ghép cặp thông minh (Smart Pairing / Proximity Clustering):
 * Sắp xếp các ảnh có chung kích thước cạnh hoặc cùng tỷ lệ khung hình đứng liền kề nhau
 * để thuật toán đặt chúng liên tiếp vào cùng hàng/cột, tránh xé vụn không gian.
 */
function sortItemsBySmartPairing(items: ItemToPack[]): ItemToPack[] {
  return [...items].sort((a, b) => {
    const minA = Math.min(a.w, a.h);
    const minB = Math.min(b.w, b.h);
    const maxA = Math.max(a.w, a.h);
    const maxB = Math.max(b.w, b.h);
    // Nhóm các ảnh có cùng cạnh ngắn
    if (Math.abs(minB - minA) > 1.5) {
      return minB - minA;
    }
    // Cùng cạnh dài
    if (Math.abs(maxB - maxA) > 1.5) {
      return maxB - maxA;
    }
    return b.area - a.area;
  });
}

/**
 * Trọng tài chấm điểm Đấu trường thuật toán (Multi-Heuristic Tournament Judge):
 * 1. Tiêu chí số 1: Ít số trang A4 nhất (Ví dụ: 1 trang luôn thắng 2 trang).
 * 2. Tiêu chí số 2: Chiều cao chiếm dụng (Bounding Height) ở trang cuối cùng thấp nhất -> Chừa nhiều giấy trắng nhất.
 * 3. Tiêu chí số 3: Tỷ lệ giữ nguyên chiều gốc của ảnh (nếu hòa số trang và hòa chiều cao).
 */
function evaluatePackedLayout(
  pages: PackedPage[],
  margin: number
): number {
  if (pages.length === 0) return Number.MAX_VALUE;

  const pageCount = pages.length;
  let score = pageCount * 10000000; // Trọng số số trang

  const lastPage = pages[pages.length - 1];
  let maxBottom = 0;
  let unrotatedCount = 0;
  let totalItems = 0;

  for (const page of pages) {
    for (const item of page.items) {
      totalItems++;
      if (!item.isRotated) unrotatedCount++;
    }
  }

  for (const item of lastPage.items) {
    const bottom = (item.y - margin) + item.h;
    if (bottom > maxBottom) {
      maxBottom = bottom;
    }
  }

  // Trọng số chiều cao chiếm dụng ở trang cuối (càng thấp càng tốt)
  score += maxBottom * 10000;

  // Thưởng điểm cho phương án giữ nguyên chiều gốc ảnh
  const unrotatedRatio = totalItems > 0 ? unrotatedCount / totalItems : 1;
  score -= unrotatedRatio * 100;

  return score;
}

/**
 * Đấu trường thuật toán đa chiến lược (Multi-Heuristic Tournament):
 * Chạy song song nhiều biến thể sắp xếp và đóng gói (MaxRects BSSF, BAF, BL, Guillotine SASR, Smart Pairing)
 * trong 1-3 mili-giây, sau đó chọn ra phương án TỐI ƯU TUYỆT ĐỐI (ít trang nhất, tiết kiệm giấy nhất).
 */
function packWithTournament(
  items: ItemToPack[],
  usableWidth: number,
  usableHeight: number,
  margin: number,
  gap: number,
  preferredStrategy: 'maxrects' | 'guillotine' = 'maxrects',
  allowRotation = false,
  enableSmartBundling = true
): PackedPage[] {
  // Chuẩn bị các biến thể sắp xếp danh sách ảnh
  const sortAreaDesc = [...items].sort(
    (a, b) => b.area - a.area || Math.max(b.w, b.h) - Math.max(a.w, a.h)
  );
  const sortMaxSideDesc = [...items].sort(
    (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.area - a.area
  );
  const sortHeightDesc = [...items].sort(
    (a, b) => b.h - a.h || b.w - a.w
  );
  const sortWidthDesc = [...items].sort(
    (a, b) => b.w - a.w || b.h - a.h
  );
  const sortPairing = enableSmartBundling ? sortItemsBySmartPairing(items) : sortAreaDesc;

  const candidateOutputs: PackedPage[][] = [];

  if (preferredStrategy === 'guillotine') {
    // Chế độ Cắt thẳng: Ưu tiên các biến thể của Guillotine Straight-Cut
    candidateOutputs.push(packGuillotineStraightCut(sortAreaDesc, usableWidth, usableHeight, margin, gap, allowRotation));
    candidateOutputs.push(packGuillotineStraightCut(sortMaxSideDesc, usableWidth, usableHeight, margin, gap, allowRotation));
    candidateOutputs.push(packGuillotineStraightCut(sortPairing, usableWidth, usableHeight, margin, gap, allowRotation));
    candidateOutputs.push(packGuillotineStraightCut(sortHeightDesc, usableWidth, usableHeight, margin, gap, allowRotation));
  } else {
    // Chế độ Ép chặt siêu tiết kiệm (MaxRects): Thử nghiệm các bộ phối hợp MaxRects và Guillotine
    candidateOutputs.push(packMaxRects(sortAreaDesc, usableWidth, usableHeight, margin, gap, allowRotation, 'BSSF'));
    candidateOutputs.push(packMaxRects(sortPairing, usableWidth, usableHeight, margin, gap, allowRotation, 'BSSF'));
    candidateOutputs.push(packMaxRects(sortMaxSideDesc, usableWidth, usableHeight, margin, gap, allowRotation, 'BAF'));
    candidateOutputs.push(packMaxRects(sortAreaDesc, usableWidth, usableHeight, margin, gap, allowRotation, 'BOTTOM_LEFT'));
    candidateOutputs.push(packMaxRects(sortWidthDesc, usableWidth, usableHeight, margin, gap, allowRotation, 'BSSF'));
    // Vẫn đưa Guillotine vào giải đấu vì nhiều trường hợp lưới ảnh đều thì Guillotine lại rất vuông vắn
    candidateOutputs.push(packGuillotineStraightCut(sortPairing, usableWidth, usableHeight, margin, gap, allowRotation));
    candidateOutputs.push(packGuillotineStraightCut(sortAreaDesc, usableWidth, usableHeight, margin, gap, allowRotation));
  }

  // Trọng tài chấm điểm và chọn phương án VÔ ĐỊCH
  let bestPages = candidateOutputs[0];
  let bestScore = evaluatePackedLayout(bestPages, margin);

  for (let i = 1; i < candidateOutputs.length; i++) {
    const pages = candidateOutputs[i];
    if (pages.length === 0) continue;
    const score = evaluatePackedLayout(pages, margin);
    if (score < bestScore) {
      bestScore = score;
      bestPages = pages;
    }
  }

  return bestPages;
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

  // Mở rộng ảnh theo số lượng bản in (Quantity)
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

  let packedPages: PackedPage[];
  const isFreeform = settings.layoutMode === 'freeform';

  if (!isFreeform && settings.autoNesting === true) {
    // Sử dụng Đấu trường thuật toán đa chiến lược (Multi-Heuristic Tournament)
    packedPages = packWithTournament(
      itemsToPack,
      usableWidth,
      usableHeight,
      margin,
      gap,
      settings.packingStrategy || 'maxrects',
      Boolean(settings.allowRotation),
      settings.enableSmartBundling !== false
    );
  } else {
    // Mặc định hoặc chế độ kéo thả tự do: Xếp tuần tự tự nhiên (Standard Shelf Packing)
    packedPages = packShelf(itemsToPack, usableWidth, usableHeight, margin, gap);
  }

  // Khi ở chế độ Di chuyển tự do (freeform), áp dụng tọa độ tự do đã lưu do người dùng kéo thả
  if (isFreeform) {
    packedPages = packedPages.map((page) => ({
      ...page,
      items: page.items.map((it) => {
        const customPos = it.freePositions?.[it.instanceIndex];
        if (customPos) {
          return {
            ...it,
            x: customPos.x,
            y: customPos.y,
          };
        }
        return it;
      }),
    }));
  }

  // Chế độ in 2 mặt (Duplex Alignment): Trang chẵn (2, 4, 6...) lật trục X để khớp chính xác mặt sau
  if (settings.duplexMode === true) {
    return packedPages.map((page) => {
      if (page.pageNumber % 2 === 0) {
        return {
          ...page,
          items: page.items.map((item) => ({
            ...item,
            x: Math.round((pageWidth - (item.x + item.w)) * 100) / 100,
          })),
        };
      }
      return page;
    });
  }

  return packedPages;
}
