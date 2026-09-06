import { PlacedPhotoItem } from '../types';

export interface AlignmentGuideLine {
  id: string;
  type: 'vertical' | 'horizontal';
  pos: number; // in mm
  start: number; // in mm
  end: number; // in mm
  label: string;
  isCenter?: boolean;
}

export interface SnapTarget {
  id: string;
  instanceIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: AlignmentGuideLine[];
  hasSnappedX: boolean;
  hasSnappedY: boolean;
}

const DEFAULT_SNAP_THRESHOLD_MM = 3.0; // Khoảng cách hút nam châm (3mm)

/**
 * Tính toán tự động gióng và nhảy đến vị trí gióng (Magnetic Snapping & Smart Guides)
 * Gióng với các ảnh khác xung quanh (mép, tâm, khoảng cách gap) và lề trang in A4.
 */
export function calculateAlignmentSnap(
  current: { x: number; y: number; w: number; h: number },
  others: SnapTarget[],
  pageW: number,
  pageH: number,
  margin: number,
  gap: number,
  threshold = DEFAULT_SNAP_THRESHOLD_MM
): SnapResult {
  let snappedX = current.x;
  let snappedY = current.y;
  let minDiffX = threshold;
  let minDiffY = threshold;
  const guides: AlignmentGuideLine[] = [];

  const curW = current.w;
  const curH = current.h;

  // -------------------------------------------------------------
  // 1. Gióng theo trục X (Đường kẻ dọc)
  // -------------------------------------------------------------
  interface XMatchCandidate {
    targetX: number; // Tọa độ X của đường gióng (mm)
    newCurX: number; // Tọa độ x mới của ảnh kéo
    diff: number;
    start: number;
    end: number;
    label: string;
    isCenter?: boolean;
  }

  const xCandidates: XMatchCandidate[] = [];

  // A. Gióng với lề và tâm trang A4
  const pageXPoints = [
    { pos: margin, label: `Lề trái ${margin}mm`, curAlign: 'left' },
    { pos: pageW / 2, label: 'Trục giữa trang A4', curAlign: 'center', isCenter: true },
    { pos: pageW - margin, label: `Lề phải ${margin}mm`, curAlign: 'right' },
  ];

  for (const pt of pageXPoints) {
    let prospectiveCurX = snappedX;
    if (pt.curAlign === 'left') prospectiveCurX = pt.pos;
    else if (pt.curAlign === 'center') prospectiveCurX = pt.pos - curW / 2;
    else if (pt.curAlign === 'right') prospectiveCurX = pt.pos - curW;

    const diff = Math.abs(current.x - prospectiveCurX);
    if (diff <= threshold) {
      xCandidates.push({
        targetX: pt.pos,
        newCurX: prospectiveCurX,
        diff,
        start: 0,
        end: pageH,
        label: pt.label,
        isCenter: pt.isCenter,
      });
    }
  }

  // B. Gióng với các ảnh khác xung quanh trên cùng trang
  for (const o of others) {
    const oLeft = o.x;
    const oCenter = o.x + o.w / 2;
    const oRight = o.x + o.w;

    const yStart = Math.min(current.y, o.y) - 5;
    const yEnd = Math.max(current.y + curH, o.y + o.h) + 5;

    // 1. Mép trái ảnh này gióng mép trái ảnh kia
    {
      const diff = Math.abs(current.x - oLeft);
      if (diff <= threshold) {
        xCandidates.push({
          targetX: oLeft,
          newCurX: oLeft,
          diff,
          start: yStart,
          end: yEnd,
          label: 'Gióng mép trái',
        });
      }
    }

    // 2. Mép phải ảnh này gióng mép phải ảnh kia
    {
      const newX = oRight - curW;
      const diff = Math.abs(current.x - newX);
      if (diff <= threshold) {
        xCandidates.push({
          targetX: oRight,
          newCurX: newX,
          diff,
          start: yStart,
          end: yEnd,
          label: 'Gióng mép phải',
        });
      }
    }

    // 3. Tâm dọc ảnh này gióng tâm dọc ảnh kia
    {
      const newX = oCenter - curW / 2;
      const diff = Math.abs(current.x - newX);
      if (diff <= threshold) {
        xCandidates.push({
          targetX: oCenter,
          newCurX: newX,
          diff,
          start: yStart,
          end: yEnd,
          label: 'Gióng tâm dọc',
          isCenter: true,
        });
      }
    }

    // 4. Mép trái ảnh này gióng mép phải ảnh kia (Chạm mép)
    {
      const diff = Math.abs(current.x - oRight);
      if (diff <= threshold) {
        xCandidates.push({
          targetX: oRight,
          newCurX: oRight,
          diff,
          start: yStart,
          end: yEnd,
          label: 'Chạm mép phải',
        });
      }
    }

    // 5. Mép phải ảnh này gióng mép trái ảnh kia (Chạm mép)
    {
      const newX = oLeft - curW;
      const diff = Math.abs(current.x - newX);
      if (diff <= threshold) {
        xCandidates.push({
          targetX: oLeft,
          newCurX: newX,
          diff,
          start: yStart,
          end: yEnd,
          label: 'Chạm mép trái',
        });
      }
    }

    // 6. Khoảng cách khe hở chuẩn (gap mm)
    if (gap > 0) {
      // Bên phải ảnh kia + gap
      const newXRightGap = oRight + gap;
      const diffRightGap = Math.abs(current.x - newXRightGap);
      if (diffRightGap <= threshold) {
        xCandidates.push({
          targetX: newXRightGap,
          newCurX: newXRightGap,
          diff: diffRightGap,
          start: yStart,
          end: yEnd,
          label: `Khoảng cách ${gap}mm`,
        });
      }

      // Bên trái ảnh kia - gap
      const newXLeftGap = oLeft - gap - curW;
      const diffLeftGap = Math.abs(current.x - newXLeftGap);
      if (diffLeftGap <= threshold) {
        xCandidates.push({
          targetX: oLeft - gap,
          newCurX: newXLeftGap,
          diff: diffLeftGap,
          start: yStart,
          end: yEnd,
          label: `Khoảng cách ${gap}mm`,
        });
      }
    }
  }

  // Chọn ứng viên X tốt nhất (khoảng cách sai lệch nhỏ nhất)
  let bestXCandidate: XMatchCandidate | null = null;
  for (const cand of xCandidates) {
    if (cand.diff < minDiffX) {
      minDiffX = cand.diff;
      bestXCandidate = cand;
    }
  }

  let hasSnappedX = false;
  if (bestXCandidate) {
    snappedX = Math.round(bestXCandidate.newCurX * 100) / 100;
    hasSnappedX = true;
    guides.push({
      id: `guide-x-${bestXCandidate.targetX}`,
      type: 'vertical',
      pos: bestXCandidate.targetX,
      start: Math.max(0, bestXCandidate.start),
      end: Math.min(pageH, bestXCandidate.end),
      label: bestXCandidate.label,
      isCenter: bestXCandidate.isCenter,
    });
  }

  // -------------------------------------------------------------
  // 2. Gióng theo trục Y (Đường kẻ ngang)
  // -------------------------------------------------------------
  interface YMatchCandidate {
    targetY: number; // Tọa độ Y của đường gióng (mm)
    newCurY: number; // Tọa độ Y mới của ảnh kéo
    diff: number;
    start: number;
    end: number;
    label: string;
    isCenter?: boolean;
  }

  const yCandidates: YMatchCandidate[] = [];

  // A. Gióng với lề và tâm trang A4
  const pageYPoints = [
    { pos: margin, label: `Lề trên ${margin}mm`, curAlign: 'top' },
    { pos: pageH / 2, label: 'Trục giữa trang A4', curAlign: 'center', isCenter: true },
    { pos: pageH - margin, label: `Lề dưới ${margin}mm`, curAlign: 'bottom' },
  ];

  for (const pt of pageYPoints) {
    let prospectiveCurY = snappedY;
    if (pt.curAlign === 'top') prospectiveCurY = pt.pos;
    else if (pt.curAlign === 'center') prospectiveCurY = pt.pos - curH / 2;
    else if (pt.curAlign === 'bottom') prospectiveCurY = pt.pos - curH;

    const diff = Math.abs(current.y - prospectiveCurY);
    if (diff <= threshold) {
      yCandidates.push({
        targetY: pt.pos,
        newCurY: prospectiveCurY,
        diff,
        start: 0,
        end: pageW,
        label: pt.label,
        isCenter: pt.isCenter,
      });
    }
  }

  // B. Gióng với các ảnh khác xung quanh trên cùng trang
  for (const o of others) {
    const oTop = o.y;
    const oCenter = o.y + o.h / 2;
    const oBottom = o.y + o.h;

    const xStart = Math.min(snappedX, o.x) - 5;
    const xEnd = Math.max(snappedX + curW, o.x + o.w) + 5;

    // 1. Mép trên gióng mép trên
    {
      const diff = Math.abs(current.y - oTop);
      if (diff <= threshold) {
        yCandidates.push({
          targetY: oTop,
          newCurY: oTop,
          diff,
          start: xStart,
          end: xEnd,
          label: 'Gióng mép trên',
        });
      }
    }

    // 2. Mép dưới gióng mép dưới
    {
      const newY = oBottom - curH;
      const diff = Math.abs(current.y - newY);
      if (diff <= threshold) {
        yCandidates.push({
          targetY: oBottom,
          newCurY: newY,
          diff,
          start: xStart,
          end: xEnd,
          label: 'Gióng mép dưới',
        });
      }
    }

    // 3. Tâm ngang gióng tâm ngang
    {
      const newY = oCenter - curH / 2;
      const diff = Math.abs(current.y - newY);
      if (diff <= threshold) {
        yCandidates.push({
          targetY: oCenter,
          newCurY: newY,
          diff,
          start: xStart,
          end: xEnd,
          label: 'Gióng tâm ngang',
          isCenter: true,
        });
      }
    }

    // 4. Mép trên chạm mép dưới
    {
      const diff = Math.abs(current.y - oBottom);
      if (diff <= threshold) {
        yCandidates.push({
          targetY: oBottom,
          newCurY: oBottom,
          diff,
          start: xStart,
          end: xEnd,
          label: 'Chạm mép dưới',
        });
      }
    }

    // 5. Mép dưới chạm mép trên
    {
      const newY = oTop - curH;
      const diff = Math.abs(current.y - newY);
      if (diff <= threshold) {
        yCandidates.push({
          targetY: oTop,
          newCurY: newY,
          diff,
          start: xStart,
          end: xEnd,
          label: 'Chạm mép trên',
        });
      }
    }

    // 6. Khoảng cách khe hở chuẩn (gap mm)
    if (gap > 0) {
      // Bên dưới ảnh kia + gap
      const newYBottomGap = oBottom + gap;
      const diffBottomGap = Math.abs(current.y - newYBottomGap);
      if (diffBottomGap <= threshold) {
        yCandidates.push({
          targetY: newYBottomGap,
          newCurY: newYBottomGap,
          diff: diffBottomGap,
          start: xStart,
          end: xEnd,
          label: `Khoảng cách ${gap}mm`,
        });
      }

      // Bên trên ảnh kia - gap
      const newYTopGap = oTop - gap - curH;
      const diffTopGap = Math.abs(current.y - newYTopGap);
      if (diffTopGap <= threshold) {
        yCandidates.push({
          targetY: oTop - gap,
          newCurY: newYTopGap,
          diff: diffTopGap,
          start: xStart,
          end: xEnd,
          label: `Khoảng cách ${gap}mm`,
        });
      }
    }
  }

  // Chọn ứng viên Y tốt nhất
  let bestYCandidate: YMatchCandidate | null = null;
  for (const cand of yCandidates) {
    if (cand.diff < minDiffY) {
      minDiffY = cand.diff;
      bestYCandidate = cand;
    }
  }

  let hasSnappedY = false;
  if (bestYCandidate) {
    snappedY = Math.round(bestYCandidate.newCurY * 100) / 100;
    hasSnappedY = true;
    guides.push({
      id: `guide-y-${bestYCandidate.targetY}`,
      type: 'horizontal',
      pos: bestYCandidate.targetY,
      start: Math.max(0, bestYCandidate.start),
      end: Math.min(pageW, bestYCandidate.end),
      label: bestYCandidate.label,
      isCenter: bestYCandidate.isCenter,
    });
  }

  // Giới hạn trong khổ giấy A4
  snappedX = Math.max(0, Math.min(snappedX, pageW - curW));
  snappedY = Math.max(0, Math.min(snappedY, pageH - curH));

  return {
    x: snappedX,
    y: snappedY,
    guides,
    hasSnappedX,
    hasSnappedY,
  };
}
