import React, { useState, useRef } from 'react';
import { FreeformTextTag } from '../types';
import { formatTextTagContent } from '../utils/textTagUtils';

interface DraggableTextTagProps {
  tag: FreeformTextTag;
  pageNumber: number;
  totalPages: number;
  isLandscape: boolean;
  pageW_mm: number;
  pageH_mm: number;
  zoom?: number;
  pageRef?: React.RefObject<HTMLDivElement | null>;
  onUpdateTag?: (updates: Partial<FreeformTextTag>) => void;
  onRemoveTag?: () => void;
}

export const DraggableTextTag: React.FC<DraggableTextTagProps> = ({
  tag,
  pageNumber,
  totalPages,
  isLandscape,
  pageW_mm,
  pageH_mm,
  pageRef,
  onUpdateTag,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const tagRef = useRef<HTMLDivElement>(null);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX_mm: number;
    startY_mm: number;
    pxPerMmX: number;
    pxPerMmY: number;
    hasMoved: boolean;
  } | null>(null);

  const textContent = formatTextTagContent(tag, pageNumber, totalPages, isLandscape);

  // Nhấp đúp (2 lần) để tự động mở rộng và focus vào ô nhập ở cột công cụ
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('daudau_focus_page_tag', {
        detail: { pageNumber },
      })
    );
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onUpdateTag) return;

    e.preventDefault();
    e.stopPropagation();

    const pageEl = (pageRef?.current || (e.currentTarget.closest('.a4-page-sheet') as HTMLElement)) ?? null;
    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();
    const pxPerMmX = rect.width / pageW_mm;
    const pxPerMmY = rect.height / pageH_mm;

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX_mm: tag.xMm,
      startY_mm: tag.yMm,
      pxPerMmX,
      pxPerMmY,
      hasMoved: false,
    };

    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!dragStartRef.current) return;
      const { clientX, clientY, startX_mm, startY_mm, pxPerMmX, pxPerMmY } = dragStartRef.current;

      const diffX = Math.abs(moveEvent.clientX - clientX);
      const diffY = Math.abs(moveEvent.clientY - clientY);
      if (diffX > 2 || diffY > 2) {
        dragStartRef.current.hasMoved = true;
      }

      const deltaX_mm = (moveEvent.clientX - clientX) / pxPerMmX;
      const deltaY_mm = (moveEvent.clientY - clientY) / pxPerMmY;

      let newX = startX_mm + deltaX_mm;
      let newY = startY_mm + deltaY_mm;

      // Giới hạn trong trang A4
      newX = Math.max(1, Math.min(pageW_mm - 5, newX));
      newY = Math.max(1, Math.min(pageH_mm - 5, newY));

      onUpdateTag({
        xMm: Math.round(newX * 10) / 10,
        yMm: Math.round(newY * 10) / 10,
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={tagRef}
      id={`draggable-text-tag-p${pageNumber}`}
      data-text-tag-trigger="true"
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        left: `${tag.xMm}mm`,
        top: `${tag.yMm}mm`,
        transform: `rotate(${tag.rotation || 0}deg)`,
        transformOrigin: '0 0',
        fontSize: `${tag.fontSizePt || 8}pt`,
        color: tag.color || '#334155',
      }}
      className={`absolute z-40 select-none transition-shadow touch-none ${
        onUpdateTag ? 'cursor-move' : ''
      } ${
        isHovered || isDragging
          ? 'ring-2 ring-blue-500 bg-blue-50/90 rounded-sm px-1.5 py-0.5 shadow-sm'
          : 'px-1 py-0.5'
      }`}
      title="Bấm giữ chuột để kéo di chuyển vị trí. Nhấp đúp (2 lần) để sửa chữ bên cột công cụ."
    >
      {/* Nội dung dòng chữ */}
      <span className="font-sans font-semibold tracking-tight whitespace-nowrap leading-none block pointer-events-none">
        {textContent || `[Ghi chú Trang ${pageNumber}]`}
      </span>
    </div>
  );
};
