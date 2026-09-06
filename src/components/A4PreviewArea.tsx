import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Sparkles,
  Info,
  Move,
  Layers,
  Undo2,
  Redo2,
  GripHorizontal,
  Grid,
  Ruler,
  HelpCircle,
  CheckCircle2,
  Loader2,
  Tag,
  Plus,
  X,
} from 'lucide-react';
import { PackedPage, LayoutSettings, PhotoItem, ShapeType, PlacedPhotoItem, FreeformTextTag } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../utils/packing';
import { rotateImageBase64, calculateCrop, createOptimizedPreview } from '../utils/imageUtils';
import { getDefaultTextTag, getEffectiveTextTagForPage } from '../utils/textTagUtils';
import { DraggableTextTag } from './DraggableTextTag';
import { calculateAlignmentSnap, AlignmentGuideLine, SnapTarget } from '../utils/alignmentGuides';

interface A4PreviewAreaProps {
  pages: PackedPage[];
  settings: LayoutSettings;
  onUpdatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  onReorderPhotos?: (sourceId: string, targetId: string) => void;
  onOpenCropModal: (photo: PhotoItem) => void;
  totalPhotos: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  historyCount?: number;
  onBackToHub?: () => void;
  onUpdateSettings?: (updates: Partial<LayoutSettings>) => void;
  onUpdateFreeformPosition?: (photoId: string, instanceIndex: number, pos: { x: number; y: number; pageNumber?: number }) => void;
  onResetFreeformPositions?: () => void;
}

export const A4PreviewArea: React.FC<A4PreviewAreaProps> = ({
  pages,
  settings,
  onUpdatePhoto,
  onReorderPhotos,
  onOpenCropModal,
  totalPhotos,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  historyCount = 0,
  onBackToHub,
  onUpdateSettings,
  onUpdateFreeformPosition,
  onResetFreeformPositions,
}) => {
  const [zoom, setZoom] = useState<number>(70); // Percentage: 30% to 150%
  const [showRuler, setShowRuler] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isLandscape = settings.paperOrientation === 'landscape';
  const pageW_mm = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const isTagEnabled = Boolean(settings.textTag?.enabled || settings.printSlug);
  const activeTextTag: FreeformTextTag = settings.textTag || {
    enabled: isTagEnabled,
    text: settings.orderSlug || '',
    includeDateTime: true,
    includePageNumber: true,
    fontSizePt: 8,
    rotation: 0,
    xMm: Math.max(4, settings.margin || 5),
    yMm: (settings.slugPosition || 'bottom') === 'top' ? 4 : Math.max(10, pageH_mm - 5.5),
    color: '#334155',
  };

  const handleUpdateTextTag = (updates: Partial<FreeformTextTag>) => {
    if (!onUpdateSettings) return;
    const current = settings.textTag || activeTextTag;
    const updated: FreeformTextTag = { ...current, ...updates, enabled: true };
    onUpdateSettings({ textTag: updated, printSlug: true });
  };

  // Cập nhật nhãn ghi chú cho từng trang độc lập (vị trí, nội dung, cỡ chữ riêng)
  const handleUpdatePageTag = (pageNumber: number, updates: Partial<FreeformTextTag>) => {
    if (!onUpdateSettings) return;
    const currentTag =
      getEffectiveTextTagForPage(settings, pageNumber, isLandscape) ||
      getDefaultTextTag(isLandscape, settings.margin);
    const updatedTag: FreeformTextTag = { ...currentTag, ...updates, enabled: true };
    const nextPageTextTags = { ...(settings.pageTextTags || {}) };
    nextPageTextTags[pageNumber] = updatedTag;

    onUpdateSettings({
      pageTextTags: nextPageTextTags,
      printSlug: true,
    });
  };

  // Thêm mới ghi chú riêng cho trang cụ thể
  const handleAddPageTag = (pageNumber: number) => {
    if (!onUpdateSettings) return;
    const defaultTag = getDefaultTextTag(isLandscape, settings.margin);
    const nextPageTextTags = { ...(settings.pageTextTags || {}) };
    nextPageTextTags[pageNumber] = {
      ...defaultTag,
      enabled: true,
      text: settings.textTag?.text || settings.orderSlug || `Ghi chú Trang ${pageNumber}`,
      xMm: Math.max(4, settings.margin || 5),
      yMm: Math.max(10, pageH_mm - 5.5),
    };

    onUpdateSettings({
      pageTextTags: nextPageTextTags,
      printSlug: true,
      textTag: { ...defaultTag, enabled: true },
    });

    // Mở rộng khối công cụ và focus vào ô nhập
    window.dispatchEvent(
      new CustomEvent('daudau_focus_page_tag', {
        detail: { pageNumber },
      })
    );
  };

  // Xóa ghi chú khỏi trang cụ thể
  const handleRemovePageTag = (pageNumber: number) => {
    if (!onUpdateSettings) return;
    const nextPageTextTags = { ...(settings.pageTextTags || {}) };
    nextPageTextTags[pageNumber] = {
      ...(nextPageTextTags[pageNumber] || getDefaultTextTag(isLandscape, settings.margin)),
      enabled: false,
    };
    const hasAnyActive = Object.values(nextPageTextTags).some(
      (t) => Boolean(t && (t as FreeformTextTag).enabled)
    );
    onUpdateSettings({
      pageTextTags: nextPageTextTags,
      printSlug: hasAnyActive,
      textTag: { ...(settings.textTag || getDefaultTextTag(isLandscape, settings.margin)), enabled: hasAnyActive },
    });
  };

  // Inter-item Drag & Drop Swap State
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState<string | null>(null);

  // Chế độ Di chuyển tự do & Tự động gióng nam châm (Smart Alignment & Snapping)
  const isFreeformMode = settings.layoutMode === 'freeform';
  const [freeDraggingItem, setFreeDraggingItem] = useState<{
    id: string;
    instanceIndex: number;
    pageNumber: number;
    currentX: number;
    currentY: number;
    w: number;
    h: number;
  } | null>(null);
  const [activeGuides, setActiveGuides] = useState<AlignmentGuideLine[]>([]);

  const [rotatingPhotoId, setRotatingPhotoId] = useState<string | null>(null);

  // Xoay cả Khung và Ảnh 90° (Dọc ↔ Ngang): Khung và ảnh cùng quay đồng bộ, giữ nguyên 100% nội dung ảnh
  const handleRotateFrame = async (photo: PlacedPhotoItem | PhotoItem) => {
    if (rotatingPhotoId === photo.id) return;
    setRotatingPhotoId(photo.id);

    try {
      // 1. Xoay pixel ảnh gốc và preview 90°
      const rotatedSrc = await rotateImageBase64(photo.originalSrc, 90);
      const previewSrc = photo.previewSrc
        ? await rotateImageBase64(photo.previewSrc, 90)
        : await createOptimizedPreview(rotatedSrc, 800, 0.85);
      const rawRotated = photo.rawOriginalSrc
        ? await rotateImageBase64(photo.rawOriginalSrc, 90)
        : undefined;

      // 2. Kích thước pixel ảnh mới sau khi xoay 90°
      const newImgWidth = photo.imgHeight;
      const newImgHeight = photo.imgWidth;

      // 3. Kích thước khung in mới (Hoán đổi Rộng ↔ Dài)
      const newTargetWidth = photo.targetHeight;
      const newTargetHeight = photo.targetWidth;

      // 4. Chuyển đổi vùng cúp ảnh tương ứng theo góc quay 90° thuận chiều kim đồng hồ
      // Điểm (x, y) trên ảnh WxH sang ảnh mới HxW sẽ thành (H - (y + cropH), x)
      const newCropW = photo.cropH;
      const newCropH = photo.cropW;
      const newCropX = Math.max(
        0,
        Math.min(newImgWidth - newCropW, photo.imgHeight - (photo.cropY + photo.cropH))
      );
      const newCropY = Math.max(
        0,
        Math.min(newImgHeight - newCropH, photo.cropX)
      );

      // 5. Nếu đang ở chế độ Di chuyển tự do và ảnh đã có tọa độ tự do, xoay quanh tâm ảnh
      let updatedFreePositions = photo.freePositions;
      if (updatedFreePositions) {
        const nextFree: Record<number, { x: number; y: number; pageNumber?: number }> = {};
        for (const [idxStr, pos] of Object.entries(updatedFreePositions)) {
          const idx = Number(idxStr);
          // Giữ tâm của ảnh ở nguyên vị trí cũ trên mặt giấy A4
          const oldW = photo.targetWidth;
          const oldH = photo.targetHeight;
          const centerX = pos.x + oldW / 2;
          const centerY = pos.y + oldH / 2;
          const nextX = Math.max(0, Math.min(pageW_mm - newTargetWidth, centerX - newTargetWidth / 2));
          const nextY = Math.max(0, Math.min(pageH_mm - newTargetHeight, centerY - newTargetHeight / 2));
          nextFree[idx] = {
            ...pos,
            x: Math.round(nextX * 100) / 100,
            y: Math.round(nextY * 100) / 100,
          };
        }
        updatedFreePositions = nextFree;
      }

      onUpdatePhoto(photo.id, {
        originalSrc: rotatedSrc,
        previewSrc: previewSrc,
        rawOriginalSrc: rawRotated,
        imgWidth: newImgWidth,
        imgHeight: newImgHeight,
        targetWidth: newTargetWidth,
        targetHeight: newTargetHeight,
        cropX: newCropX,
        cropY: newCropY,
        cropW: newCropW,
        cropH: newCropH,
        scale: photo.scale || 1,
        rotation: ((photo.rotation || 0) + 90) % 360,
        freePositions: updatedFreePositions,
      });
    } catch (err) {
      console.error('Error rotating frame and image:', err);
    } finally {
      setRotatingPhotoId(null);
    }
  };

  // Kéo thả di chuyển tự do trên trang A4 kèm tự động gióng nam châm (3mm)
  const handleFreeformMouseDown = (
    e: React.MouseEvent,
    item: PlacedPhotoItem,
    pageNumber: number
  ) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.no-drag')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const pageElement = document.getElementById(`a4-page-${pageNumber}`);
    if (!pageElement) return;

    const pageRect = pageElement.getBoundingClientRect();
    const pxToMmX = pageW_mm / pageRect.width;
    const pxToMmY = pageH_mm / pageRect.height;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startItemX = item.x;
    const startItemY = item.y;

    const targetPage = pages.find((p) => p.pageNumber === pageNumber);
    const otherItems: SnapTarget[] = (targetPage ? targetPage.items : [])
      .filter((it) => !(it.id === item.id && it.instanceIndex === item.instanceIndex))
      .map((it) => {
        const isSquare = it.shape === 'circle' || it.shape === 'heart';
        const diam = isSquare ? Math.min(it.w, it.h) : 0;
        return {
          id: it.id,
          instanceIndex: it.instanceIndex,
          x: isSquare ? it.x + (it.w - diam) / 2 : it.x,
          y: isSquare ? it.y + (it.h - diam) / 2 : it.y,
          w: isSquare ? diam : it.w,
          h: isSquare ? diam : it.h,
        };
      });

    const isSquareShape = item.shape === 'circle' || item.shape === 'heart';
    const diam = isSquareShape ? Math.min(item.w, item.h) : 0;
    const itemW = isSquareShape ? diam : item.w;
    const itemH = isSquareShape ? diam : item.h;

    setFreeDraggingItem({
      id: item.id,
      instanceIndex: item.instanceIndex,
      pageNumber,
      currentX: startItemX,
      currentY: startItemY,
      w: itemW,
      h: itemH,
    });

    let latestSnappedX = startItemX;
    let latestSnappedY = startItemY;
    let rafId: number | null = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;

        const deltaPxX = moveEvent.clientX - startClientX;
        const deltaPxY = moveEvent.clientY - startClientY;

        const rawX = startItemX + deltaPxX * pxToMmX;
        const rawY = startItemY + deltaPxY * pxToMmY;

        // Tự động gióng với các ảnh xung quanh và lề trang A4 với lực hút nam châm 3mm
        const snapResult = calculateAlignmentSnap(
          { x: rawX, y: rawY, w: itemW, h: itemH },
          otherItems,
          pageW_mm,
          pageH_mm,
          settings.margin,
          settings.gap,
          3.0 // 3mm magnetic snapping
        );

        latestSnappedX = snapResult.x;
        latestSnappedY = snapResult.y;

        setFreeDraggingItem((prev) =>
          prev ? { ...prev, currentX: snapResult.x, currentY: snapResult.y } : null
        );
        setActiveGuides(snapResult.guides);
      });
    };

    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      setFreeDraggingItem(null);
      setActiveGuides([]);

      if (onUpdateFreeformPosition) {
        onUpdateFreeformPosition(item.id, item.instanceIndex, {
          x: latestSnappedX,
          y: latestSnappedY,
          pageNumber,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // In-Page Interactive Cropping / Pan State
  const [panningPhotoId, setPanningPhotoId] = useState<string | null>(null);
  const panInfoRef = useRef<{
    photo: PhotoItem;
    startX: number;
    startY: number;
    initialCropX: number;
    initialCropY: number;
    renderedWidth: number;
    renderedHeight: number;
    isRotated?: boolean;
  } | null>(null);

  // Calculate paper efficiency
  const calculateEfficiency = (page: PackedPage) => {
    const totalItemArea = page.items.reduce((acc, it) => acc + it.w * it.h, 0);
    const usableArea = (pageW_mm - settings.margin * 2) * (pageH_mm - settings.margin * 2);
    if (usableArea <= 0) return 0;
    return Math.min(100, Math.round((totalItemArea / usableArea) * 100));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 1. Drag & Drop Reorder Handlers (HTML5 Drag & Drop)
  const handleDragStart = (e: React.DragEvent, item: PlacedPhotoItem) => {
    e.stopPropagation();
    setDraggedPhotoId(item.id);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetItem: PlacedPhotoItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPhotoId && draggedPhotoId !== targetItem.id) {
      e.dataTransfer.dropEffect = 'move';
      if (dragOverPhotoId !== targetItem.id) {
        setDragOverPhotoId(targetItem.id);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetItem: PlacedPhotoItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverPhotoId === targetItem.id) {
      setDragOverPhotoId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetItem: PlacedPhotoItem) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedPhotoId || e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetItem.id && onReorderPhotos) {
      onReorderPhotos(sourceId, targetItem.id);
    }
    setDraggedPhotoId(null);
    setDragOverPhotoId(null);
  };

  const handleDragEnd = () => {
    setDraggedPhotoId(null);
    setDragOverPhotoId(null);
  };

  // 3. In-box photo pan / framing adjustment (Mousedown on image body)
  const handlePhotoMouseDown = (
    e: React.MouseEvent,
    photo: PlacedPhotoItem
  ) => {
    // Only drag on primary mouse button
    if (e.button !== 0) return;
    // Don't pan if clicking the reorder handle
    if ((e.target as HTMLElement).closest('.drag-reorder-handle')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();

    setPanningPhotoId(photo.id);
    panInfoRef.current = {
      photo,
      startX: e.clientX,
      startY: e.clientY,
      initialCropX: photo.cropX,
      initialCropY: photo.cropY,
      renderedWidth: rect.width || 100,
      renderedHeight: rect.height || 100,
      isRotated: Boolean(photo.isRotated),
    };

    let rafId: number | null = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!panInfoRef.current) return;
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!panInfoRef.current) return;
        const {
          photo: p,
          startX,
          startY,
          initialCropX,
          initialCropY,
          renderedWidth,
          renderedHeight,
          isRotated,
        } = panInfoRef.current;

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        const scale = p.scale || 1;
        const actualCropW = p.cropW / scale;
        const actualCropH = p.cropH / scale;

        // When rotated 90 deg clockwise, width and height of outer container are swapped
        const unrotRenderedW = isRotated ? renderedHeight : renderedWidth;
        const unrotRenderedH = isRotated ? renderedWidth : renderedHeight;

        // Direct manipulation mapping
        const pxScaleX = actualCropW / unrotRenderedW;
        const pxScaleY = actualCropH / unrotRenderedH;

        // When rotated 90 deg clockwise:
        // dragging right on screen (dx > 0) moves down in photo coords (dy)
        // dragging down on screen (dy > 0) moves left in photo coords (-dx)
        const effectiveDx = isRotated ? dy : dx;
        const effectiveDy = isRotated ? -dx : dy;

        let newX = initialCropX - effectiveDx * pxScaleX;
        let newY = initialCropY - effectiveDy * pxScaleY;

        newX = Math.max(0, Math.min(newX, p.imgWidth - actualCropW));
        newY = Math.max(0, Math.min(newY, p.imgHeight - actualCropH));

        onUpdatePhoto(p.id, { cropX: newX, cropY: newY });
      });
    };

    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setPanningPhotoId(null);
      panInfoRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      id="preview-area"
      ref={containerRef}
      className="flex-1 flex flex-col items-center bg-slate-200/90 overflow-y-auto h-full relative"
    >
      {/* Enforce 100% exact A4 paper dimensions and 0 margin in print dialog */}
      <style>{`
        @media print {
          @page {
            size: ${pageW_mm}mm ${pageH_mm}mm !important;
            margin: 0mm !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar */}
      <div
        id="preview-topbar"
        className="no-print sticky top-3 z-30 flex items-center flex-wrap justify-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200/90 text-xs text-slate-700"
      >
        {onBackToHub && (
          <>
            <button
              type="button"
              id="btn-preview-back-hub"
              onClick={onBackToHub}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition cursor-pointer"
              title="ToolKit"
            >
              ToolKit
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
          </>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(30, z - 10))}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="30"
            max="150"
            step="5"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-20 accent-blue-600 cursor-pointer"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="btn-toggle-zoom"
            onClick={() => setZoom((z) => (z === 100 ? 70 : 100))}
            className="font-mono font-bold text-slate-800 text-[11px] px-1 py-0.5 hover:bg-slate-100 active:scale-95 rounded transition cursor-pointer select-none"
            title="Nhấp để chuyển đổi 100% / 70%"
          >
            {zoom}%
          </button>
        </div>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Undo / Redo Buttons */}
        <div className="flex items-center gap-1 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
          <button
            type="button"
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            title="Undo (Ctrl + Z)"
          >
            <Undo2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Undo {historyCount > 0 ? `(${historyCount})` : ''}</span>
          </button>

          <button
            type="button"
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            title="Redo (Ctrl + Y)"
          >
            <Redo2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Redo</span>
          </button>
        </div>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Chế độ sắp xếp: Tự động ghép khít vs Di chuyển tự do */}
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200 shadow-2xs">
          <button
            type="button"
            id="btn-mode-auto"
            onClick={() => {
              onUpdateSettings?.({ layoutMode: 'auto' });
              onResetFreeformPositions?.();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              !isFreeformMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Chế độ tự động sắp xếp ảnh tối ưu giấy in"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tự động</span>
          </button>

          <button
            type="button"
            id="btn-mode-freeform"
            onClick={() => onUpdateSettings?.({ layoutMode: 'freeform' })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              isFreeformMode
                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Bật chế độ di chuyển ảnh tự do trên trang A4 kèm tự động gióng và hút nam châm"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Tự do</span>
            {isFreeformMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            )}
          </button>
        </div>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Ruler & Grid Toggles */}
        <button
          type="button"
          onClick={() => setShowRuler(!showRuler)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
            showRuler
              ? 'bg-amber-100/80 border-amber-300 text-amber-800'
              : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
          }`}
          title="Bật/tắt thước đo milimet (mm)"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Thước</span>
        </button>

        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
            showGrid
              ? 'bg-blue-100/80 border-blue-300 text-blue-800'
              : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
          }`}
          title="Bật/tắt lưới căn lề mm"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Lưới</span>
        </button>

        {/* Fullscreen Zen Mode */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Chế độ toàn màn hình Zen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Shortcuts Help */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 border border-blue-200 transition cursor-pointer"
          title="Phím tắt & mẹo thao tác"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Shortcuts & Tips Modal Drawer */}
      {showHelp && (
        <div className="no-print absolute top-16 right-4 z-40 bg-white/98 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 w-80 text-xs text-slate-700 space-y-2.5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Mẹo & Phím tắt nhanh
            </span>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-2 text-[11px] text-slate-600">
            <li className="flex items-start gap-2">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 shrink-0">
                Ctrl + Z / Y
              </span>
              <span>Undo / Redo thao tác gần nhất</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 shrink-0">
                Ctrl + V
              </span>
              <span>Dán ảnh trực tiếp từ Zalo/Clipboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 shrink-0">
                Ctrl + S
              </span>
              <span>Lưu dự án .daudau đóng gói mang đi (USB/Zalo/Tiệm in)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 shrink-0">
                Ctrl + P
              </span>
              <span>Mở hộp thoại in ấn tiêu chuẩn A4</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 shrink-0">
                Kéo ảnh
              </span>
              <span>Kéo rê ảnh trên trang A4 để chỉnh tâm; kéo biểu tượng ⠿ để hoán đổi chỗ</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 shrink-0">
                Nhấp đúp
              </span>
              <span>Nhấp đúp ảnh trên trang để mở bộ lọc màu & cắt góc chi tiết</span>
            </li>
          </ul>
        </div>
      )}

      {/* Pages Container with Zoom scaling */}
      <div className="print-area-wrapper flex flex-col items-center w-full py-6 pb-24">
        {pages.length === 0 ? (
          <div className="no-print mt-20 p-8 max-w-md text-center bg-white rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Trang in A4 trống</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tải ảnh lên hoặc bấm &quot;Thử ngay với ảnh mẫu&quot; ở cột bên trái để công cụ tự động xếp ảnh
              vào trang A4 theo thuật toán tối ưu diện tích.
            </p>
          </div>
        ) : (
          <div
            id="pages-container"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
            className="flex flex-col items-center gap-8 transition-transform duration-75"
          >
            {pages.map((page) => {
              const efficiency = calculateEfficiency(page);

              return (
                <div
                  key={`page-wrapper-${page.pageNumber}`}
                  className="page-wrapper flex flex-col items-center"
                >
                  {/* Page Status Badges Header (Được dịch lên trên đỉnh, nằm ngoài tờ giấy A4 để không bao giờ che khuất chi tiết ảnh) */}
                  <div
                    className="no-print w-full flex items-center justify-between gap-2 pb-2 px-1 select-none"
                    style={{ width: `${pageW_mm}mm` }}
                  >
                    {/* Per-page Text Tag Control / Ghi chú riêng từng trang */}
                    {(() => {
                      const pageTag = getEffectiveTextTagForPage(settings, page.pageNumber, isLandscape);
                      const hasTag = Boolean(pageTag && pageTag.enabled);

                      return (
                        <div className="flex items-center gap-2 pointer-events-auto">
                          {hasTag ? (
                            <div className="flex items-center gap-1.5 bg-blue-50/95 border border-blue-200 text-blue-800 text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-xs">
                              <button
                                type="button"
                                data-text-tag-trigger="true"
                                onClick={() => {
                                  window.dispatchEvent(
                                    new CustomEvent('daudau_focus_page_tag', {
                                      detail: { pageNumber: page.pageNumber },
                                    })
                                  );
                                }}
                                className="flex items-center gap-1.5 hover:underline cursor-pointer"
                                title="Bấm để mở cài đặt và sửa ghi chú này"
                              >
                                <Tag className="w-3.5 h-3.5 text-blue-600" />
                                <span
                                  className="max-w-[180px] sm:max-w-[260px] truncate"
                                  title={pageTag?.text || `Ghi chú Trang ${page.pageNumber}`}
                                >
                                  {pageTag?.text ? `[${pageTag.text}]` : `Ghi chú Trang ${page.pageNumber}`}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePageTag(page.pageNumber)}
                                className="p-0.5 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Xóa ghi chú khỏi trang này"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-text-tag-trigger="true"
                              onClick={() => handleAddPageTag(page.pageNumber)}
                              className="flex items-center gap-1.5 bg-white/95 hover:bg-blue-50 border border-slate-300 hover:border-blue-400 text-slate-700 hover:text-blue-700 text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-xs transition cursor-pointer"
                              title={`Bấm để thêm ghi chú/mã đơn riêng cho Trang ${page.pageNumber}`}
                            >
                              <Plus className="w-3.5 h-3.5 text-blue-600" />
                              <span>Thêm ghi chú trang này</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2 pointer-events-none">
                      {/* Duplex Indicator Badge if enabled */}
                      {settings.duplexMode && (
                        <div className="bg-purple-700/95 text-white text-[13px] font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
                          <span>{page.pageNumber % 2 === 0 ? 'Mặt Sau (Lật đối xứng)' : 'Mặt Trước'}</span>
                        </div>
                      )}

                      {/* Efficiency Badge */}
                      <div
                        className={`text-white text-[13px] font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 ${
                          efficiency >= 80
                            ? 'bg-emerald-600/95'
                            : efficiency >= 50
                            ? 'bg-blue-600/95'
                            : 'bg-slate-800/90'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{efficiency}% diện tích</span>
                      </div>

                      {/* Page Number */}
                      <div className="bg-slate-900/90 backdrop-blur-xs text-white text-[13px] font-bold px-3 py-1 rounded-full shadow-xs">
                        Trang {page.pageNumber} / {pages.length} (A4 {isLandscape ? 'Ngang' : 'Dọc'})
                      </div>
                    </div>
                  </div>

                  <div
                    key={`page-${page.pageNumber}`}
                    id={`a4-page-${page.pageNumber}`}
                    className="a4-page-sheet relative bg-white shadow-xl rounded-xs ring-1 ring-slate-300/60 overflow-hidden"
                    style={{
                      width: `${pageW_mm}mm`,
                      height: `${pageH_mm}mm`,
                    }}
                  >
                  {/* Top-Left Ruler Origin Corner */}
                  {showRuler && (
                    <div
                      className="no-print absolute top-0 left-0 bg-amber-100/95 border-r border-b border-amber-300/80 z-40 flex items-center justify-center text-[7px] font-mono font-black text-amber-900 select-none pointer-events-none"
                      style={{ width: '4.5mm', height: '4.5mm' }}
                    >
                      mm
                    </div>
                  )}

                  {/* Top Ruler Overlay (mm) - Vector SVG đồng bộ 100% tọa độ mm với lưới */}
                  {showRuler && (
                    <div
                      className="no-print absolute top-0 left-0 right-0 bg-amber-50/95 border-b border-amber-300/80 z-30 pointer-events-none select-none overflow-hidden"
                      style={{ height: '4.5mm' }}
                    >
                      <svg
                        className="w-full h-full block"
                        viewBox={`0 0 ${pageW_mm} 4.5`}
                        preserveAspectRatio="none"
                      >
                        {Array.from({ length: Math.floor(pageW_mm) }).map((_, i) => {
                          const x = i + 1;
                          if (x >= pageW_mm) return null;
                          const is10mm = x % 10 === 0;
                          const is5mm = x % 5 === 0;
                          const y1 = is10mm ? 0 : is5mm ? 1.8 : 2.8;
                          return (
                            <g key={`ruler-top-${x}`}>
                              <line
                                x1={x}
                                y1={y1}
                                x2={x}
                                y2={4.5}
                                stroke={is10mm ? '#b45309' : '#d97706'}
                                strokeWidth={is10mm ? 0.28 : 0.15}
                                opacity={is10mm ? 0.9 : is5mm ? 0.6 : 0.35}
                              />
                              {is10mm && (
                                <text
                                  x={x + 0.6}
                                  y={3.2}
                                  fontSize="2.1"
                                  fill="#78350f"
                                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                  fontWeight="bold"
                                >
                                  {x}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}

                  {/* Left Ruler Overlay (mm) - Vector SVG đồng bộ 100% tọa độ mm với lưới */}
                  {showRuler && (
                    <div
                      className="no-print absolute top-0 left-0 bottom-0 bg-amber-50/95 border-r border-amber-300/80 z-30 pointer-events-none select-none overflow-hidden"
                      style={{ width: '4.5mm' }}
                    >
                      <svg
                        className="w-full h-full block"
                        viewBox={`0 0 4.5 ${pageH_mm}`}
                        preserveAspectRatio="none"
                      >
                        {Array.from({ length: Math.floor(pageH_mm) }).map((_, i) => {
                          const y = i + 1;
                          if (y >= pageH_mm) return null;
                          const is10mm = y % 10 === 0;
                          const is5mm = y % 5 === 0;
                          const x1 = is10mm ? 0 : is5mm ? 1.8 : 2.8;
                          return (
                            <g key={`ruler-left-${y}`}>
                              <line
                                x1={x1}
                                y1={y}
                                x2={4.5}
                                y2={y}
                                stroke={is10mm ? '#b45309' : '#d97706'}
                                strokeWidth={is10mm ? 0.28 : 0.15}
                                opacity={is10mm ? 0.9 : is5mm ? 0.6 : 0.35}
                              />
                              {is10mm && (
                                <text
                                  x={0.5}
                                  y={y + 2.5}
                                  fontSize="2.0"
                                  fill="#78350f"
                                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                  fontWeight="bold"
                                >
                                  {y}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}

                  {/* Grid mm Overlay - Vector SVG chuẩn xác 100% tọa độ với thước */}
                  {showGrid && (
                    <svg
                      className="no-print absolute inset-0 w-full h-full pointer-events-none z-10"
                      viewBox={`0 0 ${pageW_mm} ${pageH_mm}`}
                      style={{ width: `${pageW_mm}mm`, height: `${pageH_mm}mm` }}
                    >
                      {/* Vertical grid lines every 10mm */}
                      {Array.from({ length: Math.floor(pageW_mm / 10) }).map((_, i) => {
                        const x = (i + 1) * 10;
                        if (x >= pageW_mm) return null;
                        return (
                          <line
                            key={`grid-v-${x}`}
                            x1={x}
                            y1={0}
                            x2={x}
                            y2={pageH_mm}
                            stroke="#3b82f6"
                            strokeWidth="0.2"
                            opacity="0.35"
                          />
                        );
                      })}
                      {/* Horizontal grid lines every 10mm */}
                      {Array.from({ length: Math.floor(pageH_mm / 10) }).map((_, i) => {
                        const y = (i + 1) * 10;
                        if (y >= pageH_mm) return null;
                        return (
                          <line
                            key={`grid-h-${y}`}
                            x1={0}
                            y1={y}
                            x2={pageW_mm}
                            y2={y}
                            stroke="#3b82f6"
                            strokeWidth="0.2"
                            opacity="0.35"
                          />
                        );
                      })}
                    </svg>
                  )}

                  {/* Freeform Text Tag / In thông tin mã đơn lề giấy riêng từng trang (Kéo thả, xoay, chỉnh cỡ, sửa nội dung độc lập) */}
                  {(() => {
                    const pageTag = getEffectiveTextTagForPage(settings, page.pageNumber, isLandscape);
                    if (!pageTag || !pageTag.enabled) return null;
                    return (
                      <DraggableTextTag
                        key={`tag-p${page.pageNumber}-${pageTag.xMm}-${pageTag.yMm}-${pageTag.rotation}`}
                        tag={pageTag}
                        pageNumber={page.pageNumber}
                        totalPages={pages.length}
                        isLandscape={isLandscape}
                        pageW_mm={pageW_mm}
                        pageH_mm={pageH_mm}
                        zoom={zoom}
                        onUpdateTag={
                          onUpdateSettings
                            ? (updates) => handleUpdatePageTag(page.pageNumber, updates)
                            : undefined
                        }
                        onRemoveTag={
                          onUpdateSettings ? () => handleRemovePageTag(page.pageNumber) : undefined
                        }
                      />
                    );
                  })()}

                  {/* Printable Margin Guideline (Subtle dashed, hidden in print) */}
                  <div
                    className="no-print absolute border border-blue-200/40 pointer-events-none z-10"
                    style={{
                      left: `${settings.margin}mm`,
                      top: `${settings.margin}mm`,
                      width: `${pageW_mm - settings.margin * 2}mm`,
                      height: `${pageH_mm - settings.margin * 2}mm`,
                    }}
                  />

                  {/* Full Trim Guides (Đường gióng thước tràn ra tận 4 mép giấy A4) */}
                  {(() => {
                    const activeCutStyles =
                      settings.cutStyles && settings.cutStyles.length > 0
                        ? settings.cutStyles
                        : settings.cutStyle
                        ? [settings.cutStyle]
                        : ['dashed'];
                    const isFullTrimGuides = settings.cutLines && activeCutStyles.includes('full_trim_guides');
                    if (!isFullTrimGuides || page.items.length === 0) return null;

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

                    return (
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                        style={{ overflow: 'visible' }}
                      >
                        {/* Horizontal Trim Guides */}
                        {fullTrimYList.map((y, idx) => (
                          <React.Fragment key={`trim-y-${idx}`}>
                            {/* Đường gióng nét đứt mờ xuyên suốt từ mép trái sang mép phải */}
                            <line
                              x1="0"
                              y1={`${y}mm`}
                              x2={`${pageW_mm}mm`}
                              y2={`${y}mm`}
                              stroke="#cbd5e1"
                              strokeWidth="0.35"
                              strokeDasharray="4 3"
                            />
                            {/* Vạch tick mảnh ở mép trái (5mm) */}
                            <line
                              x1="0"
                              y1={`${y}mm`}
                              x2="5mm"
                              y2={`${y}mm`}
                              stroke="#64748b"
                              strokeWidth="0.6"
                            />
                            {/* Vạch tick mảnh ở mép phải (5mm) */}
                            <line
                              x1={`${pageW_mm - 5}mm`}
                              y1={`${y}mm`}
                              x2={`${pageW_mm}mm`}
                              y2={`${y}mm`}
                              stroke="#64748b"
                              strokeWidth="0.6"
                            />
                          </React.Fragment>
                        ))}

                        {/* Vertical Trim Guides */}
                        {fullTrimXList.map((x, idx) => (
                          <React.Fragment key={`trim-x-${idx}`}>
                            {/* Đường gióng nét đứt mờ xuyên suốt từ mép trên xuống mép dưới */}
                            <line
                              x1={`${x}mm`}
                              y1="0"
                              x2={`${x}mm`}
                              y2={`${pageH_mm}mm`}
                              stroke="#cbd5e1"
                              strokeWidth="0.35"
                              strokeDasharray="4 3"
                            />
                            {/* Vạch tick mảnh ở mép trên (5mm) */}
                            <line
                              x1={`${x}mm`}
                              y1="0"
                              x2={`${x}mm`}
                              y2="5mm"
                              stroke="#64748b"
                              strokeWidth="0.6"
                            />
                            {/* Vạch tick mảnh ở mép dưới (5mm) */}
                            <line
                              x1={`${x}mm`}
                              y1={`${pageH_mm - 5}mm`}
                              x2={`${x}mm`}
                              y2={`${pageH_mm}mm`}
                              stroke="#64748b"
                              strokeWidth="0.6"
                            />
                          </React.Fragment>
                        ))}
                      </svg>
                    );
                  })()}

                  {/* Smart Alignment Guides Overlay (Visible during freeform dragging) */}
                  {isFreeformMode && freeDraggingItem && freeDraggingItem.pageNumber === page.pageNumber && activeGuides.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
                      <svg
                        className="w-full h-full overflow-visible"
                        viewBox={`0 0 ${pageW_mm} ${pageH_mm}`}
                      >
                        {activeGuides.map((guide) => {
                          const isVert = guide.type === 'vertical';
                          const guideColor = guide.isCenter ? '#0284c7' : '#ec4899';
                          return (
                            <g key={guide.id}>
                              {/* Đường vạch gióng xuyên trang mờ nhẹ */}
                              <line
                                x1={isVert ? guide.pos : 0}
                                y1={isVert ? 0 : guide.pos}
                                x2={isVert ? guide.pos : pageW_mm}
                                y2={isVert ? pageH_mm : guide.pos}
                                stroke={guideColor}
                                strokeWidth="0.15"
                                strokeDasharray="1.5 1.5"
                                opacity="0.4"
                              />
                              {/* Vạch gióng nam châm chính xác nối giữa các ảnh */}
                              <line
                                x1={isVert ? guide.pos : guide.start}
                                y1={isVert ? guide.start : guide.pos}
                                x2={isVert ? guide.pos : guide.end}
                                y2={isVert ? guide.end : guide.pos}
                                stroke={guideColor}
                                strokeWidth="0.4"
                              />
                              {/* Điểm neo hai đầu vạch gióng */}
                              <circle
                                cx={isVert ? guide.pos : guide.start}
                                cy={isVert ? guide.start : guide.pos}
                                r="0.5"
                                fill={guideColor}
                              />
                              <circle
                                cx={isVert ? guide.pos : guide.end}
                                cy={isVert ? guide.end : guide.pos}
                                r="0.5"
                                fill={guideColor}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Huy hiệu thông báo điểm gióng (Mép, Tâm, Lề, Gap...) */}
                      {activeGuides.map((guide) => {
                        const isVert = guide.type === 'vertical';
                        const leftPos = isVert ? `${guide.pos}mm` : `${(guide.start + guide.end) / 2}mm`;
                        const topPos = isVert ? `${(guide.start + guide.end) / 2}mm` : `${guide.pos}mm`;
                        return (
                          <div
                            key={`badge-${guide.id}`}
                            className="absolute -translate-x-1/2 -translate-y-1/2 px-1 py-0.5 rounded text-[7.5px] leading-none font-semibold text-white shadow-xs backdrop-blur-xs whitespace-nowrap flex items-center gap-0.5 z-50 pointer-events-none"
                            style={{
                              left: leftPos,
                              top: topPos,
                              backgroundColor: guide.isCenter ? 'rgba(2, 132, 199, 0.95)' : 'rgba(236, 72, 153, 0.95)',
                            }}
                          >
                            <span>{guide.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Placed Photo Items */}
                  {page.items.map((item) => {
                    const actualCropW = item.cropW / (item.scale || 1);
                    const actualCropH = item.cropH / (item.scale || 1);
                    const percentW = (item.imgWidth / actualCropW) * 100;
                    const percentH = (item.imgHeight / actualCropH) * 100;
                    const percentX = (-item.cropX / actualCropW) * 100;
                    const percentY = (-item.cropY / actualCropH) * 100;

                    const isCircle = item.shape === 'circle';
                    const isHeart = item.shape === 'heart';
                    const isSquareShape = isCircle || isHeart;
                    const diam = isSquareShape ? Math.min(item.w, item.h) : 0;
                    const renderW = isSquareShape ? diam : item.w;
                    const renderH = isSquareShape ? diam : item.h;
                    const renderX = isSquareShape ? item.x + (item.w - diam) / 2 : item.x;
                    const renderY = isSquareShape ? item.y + (item.h - diam) / 2 : item.y;

                    const isFreeDraggingThis =
                      Boolean(freeDraggingItem) &&
                      freeDraggingItem?.id === item.id &&
                      freeDraggingItem?.instanceIndex === item.instanceIndex;

                    const currentItemX = isFreeDraggingThis && freeDraggingItem ? freeDraggingItem.currentX : renderX;
                    const currentItemY = isFreeDraggingThis && freeDraggingItem ? freeDraggingItem.currentY : renderY;

                    const isDraggingThis = draggedPhotoId === item.id;
                    const isDragOverThis = dragOverPhotoId === item.id;

                    const activeCutStyles =
                      settings.cutStyles && settings.cutStyles.length > 0
                        ? settings.cutStyles
                        : settings.cutStyle
                        ? [settings.cutStyle]
                        : ['dashed'];
                    const isCornerMarks = settings.cutLines && activeCutStyles.includes('corner_marks');
                    const isSolidCut = settings.cutLines && activeCutStyles.includes('solid');
                    const isDashedCut = settings.cutLines && activeCutStyles.includes('dashed');

                    return (
                      <React.Fragment key={`frag-${item.id}-${item.instanceIndex}`}>
                        {/* Corner Crop Marks for Precision Cutting (SVG Overlay) */}
                        {isCornerMarks && (
                          <div
                            className="pointer-events-none absolute z-20"
                            style={{
                              left: `${currentItemX - 4}mm`,
                              top: `${currentItemY - 4}mm`,
                              width: `${renderW + 8}mm`,
                              height: `${renderH + 8}mm`,
                            }}
                          >
                            <svg className="w-full h-full" style={{ overflow: 'visible' }}>
                              {/* Top-Left */}
                              <line x1="0" y1="4mm" x2="3mm" y2="4mm" stroke="#64748b" strokeWidth="0.8" />
                              <line x1="4mm" y1="0" x2="4mm" y2="3mm" stroke="#64748b" strokeWidth="0.8" />
                              {/* Top-Right */}
                              <line x1="calc(100% - 3mm)" y1="4mm" x2="100%" y2="4mm" stroke="#64748b" strokeWidth="0.8" />
                              <line x1="calc(100% - 4mm)" y1="0" x2="calc(100% - 4mm)" y2="3mm" stroke="#64748b" strokeWidth="0.8" />
                              {/* Bottom-Left */}
                              <line x1="0" y1="calc(100% - 4mm)" x2="3mm" y2="calc(100% - 4mm)" stroke="#64748b" strokeWidth="0.8" />
                              <line x1="4mm" y1="calc(100% - 3mm)" x2="4mm" y2="100%" stroke="#64748b" strokeWidth="0.8" />
                              {/* Bottom-Right */}
                              <line x1="calc(100% - 3mm)" y1="calc(100% - 4mm)" x2="100%" y2="calc(100% - 4mm)" stroke="#64748b" strokeWidth="0.8" />
                              <line x1="calc(100% - 4mm)" y1="calc(100% - 3mm)" x2="calc(100% - 4mm)" y2="100%" stroke="#64748b" strokeWidth="0.8" />
                            </svg>
                          </div>
                        )}

                        <div
                          id={`img-box-${item.id}-${item.instanceIndex}`}
                          draggable={!isFreeformMode}
                          onDragStart={(e) => !isFreeformMode && handleDragStart(e, item)}
                          onDragOver={(e) => !isFreeformMode && handleDragOver(e, item)}
                          onDragLeave={(e) => !isFreeformMode && handleDragLeave(e, item)}
                          onDrop={(e) => !isFreeformMode && handleDrop(e, item)}
                          onDragEnd={!isFreeformMode ? handleDragEnd : undefined}
                          onMouseDown={(e) =>
                            isFreeformMode
                              ? handleFreeformMouseDown(e, item, page.pageNumber)
                              : handlePhotoMouseDown(e, item)
                          }
                          onDoubleClick={() => onOpenCropModal(item)}
                          title={
                            isFreeformMode
                              ? 'Nhấp giữ và kéo ảnh tự do trên trang A4 • Tự động gióng & hút nam châm 3mm • Nhấp đúp để chỉnh chi tiết'
                              : 'Kéo thả để đổi vị trí ảnh • Kéo chuột trên ảnh để dịch tâm • Nhấp đúp để chỉnh chi tiết'
                          }
                          style={{
                            position: 'absolute',
                            left: `${currentItemX}mm`,
                            top: `${currentItemY}mm`,
                            width: `${renderW}mm`,
                            height: `${renderH}mm`,
                          }}
                          className={`bg-white z-20 overflow-hidden select-none group/box ${
                            isFreeDraggingThis
                              ? 'z-50 shadow-2xl cursor-grabbing opacity-95'
                              : isFreeformMode
                              ? 'cursor-move transition-shadow'
                              : 'cursor-grab active:cursor-grabbing transition-all'
                          } ${isCircle ? 'shape-circle' : isHeart ? 'shape-heart' : ''} ${
                            isDashedCut ? 'cut-lines-box' : isSolidCut ? 'outline outline-1 outline-slate-400' : ''
                          } ${!isFreeformMode && isDraggingThis ? 'opacity-30 scale-95 ring-2 ring-blue-500' : ''} ${
                            !isFreeformMode && isDragOverThis
                              ? 'ring-4 ring-emerald-500 ring-offset-2 scale-105 z-30 shadow-lg'
                              : ''
                          }`}
                        >
                        {/* Image Content */}
                        {item.isRotated ? (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              width: `${renderH}mm`,
                              height: `${renderW}mm`,
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%) rotate(90deg)',
                              transformOrigin: 'center center',
                              overflow: 'hidden',
                            }}
                          >
                            <img
                              src={item.previewSrc || item.originalSrc}
                              alt={item.name}
                              draggable={false}
                              decoding="async"
                              className="absolute max-w-none pointer-events-none transition-none"
                              style={{
                                width: `${percentW}%`,
                                height: `${percentH}%`,
                                left: `${percentX}%`,
                                top: `${percentY}%`,
                              }}
                            />
                          </div>
                        ) : (
                          <img
                            src={item.previewSrc || item.originalSrc}
                            alt={item.name}
                            draggable={false}
                            decoding="async"
                            className="absolute max-w-none pointer-events-none transition-none"
                            style={{
                              width: `${percentW}%`,
                              height: `${percentH}%`,
                              left: `${percentX}%`,
                              top: `${percentY}%`,
                            }}
                          />
                        )}

                        {/* 90° Auto-Rotated Badge (Visible when not hovered, disappears on hover) */}
                        {item.isRotated && (
                          <div
                            className="no-print opacity-90 group-hover/box:opacity-0 transition-opacity absolute top-1.5 right-1.5 bg-emerald-700/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-emerald-500/40 pointer-events-none flex items-center gap-0.5 z-10"
                            title="Ảnh được tự động xoay 90° để tối ưu ghép khít khoảng trống giấy in"
                          >
                            <RotateCw className="w-2.5 h-2.5" />
                            <span>90°</span>
                          </div>
                        )}

                        {/* Drag & Reorder Grip Handle (Top Left, visible on hover) */}
                        <div
                          className="no-print drag-reorder-handle opacity-0 group-hover/box:opacity-100 transition-opacity absolute top-1.5 left-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xs text-white p-1.5 rounded-md cursor-grab active:cursor-grabbing z-20 flex items-center shadow-md border border-slate-700/60"
                          title={
                            isFreeformMode
                              ? 'Kéo thả ảnh tự do trên trang A4 (Tự động gióng & hút nam châm)'
                              : 'Kéo biểu tượng này để đổi vị trí sang bức ảnh khác'
                          }
                        >
                          {isFreeformMode ? (
                            <Move className="w-4 h-4 text-indigo-300" />
                          ) : (
                            <GripHorizontal className="w-4 h-4 text-slate-200" />
                          )}
                        </div>

                        {/* Quick Rotate Frame & Image Button (Top Right, visible on hover) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRotateFrame(item);
                          }}
                          disabled={rotatingPhotoId === item.id}
                          className="no-print opacity-0 group-hover/box:opacity-100 transition-opacity absolute top-1.5 right-1.5 bg-slate-900/90 hover:bg-blue-600 backdrop-blur-xs text-white p-1.5 rounded-md cursor-pointer z-20 flex items-center shadow-md border border-slate-700/60 active:scale-95 transition-all disabled:opacity-50"
                          title={`Xoay cả khung và ảnh 90° (Dọc ↔ Ngang): Giữ nguyên trọn vẹn ảnh, chuyển thành ${item.targetHeight / 10}x${item.targetWidth / 10}cm`}
                        >
                          {rotatingPhotoId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <RotateCw className="w-4 h-4 text-slate-200 hover:text-white" />
                          )}
                        </button>

                        {/* Hover Info Tag (Bottom Right, Hidden in Print) */}
                        <div className="no-print opacity-0 group-hover/box:opacity-100 transition-opacity absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md pointer-events-none flex items-center gap-1 z-20 shadow-xs border border-white/10">
                          <span>
                            {item.isRotated
                              ? `${item.targetWidth / 10}x${item.targetHeight / 10}cm (Xoay 90°)`
                              : `${item.w / 10}x${item.h / 10}cm`}
                          </span>
                        </div>

                        {/* Viền nhận diện BÊN TRONG lòng ảnh (Inset Border) - Không phình mép ra ngoài, vạch thước và mép ảnh khớp chuẩn 100% */}
                        <div
                          className={`no-print pointer-events-none absolute inset-0 z-15 transition-all duration-150 ${
                            isFreeDraggingThis
                              ? 'border-2 border-indigo-500 shadow-inner'
                              : isFreeformMode
                              ? 'opacity-0 group-hover/box:opacity-100 border-2 border-indigo-400/90'
                              : 'opacity-0 group-hover/box:opacity-100 border border-blue-400/80'
                          }`}
                        />
                      </div>
                    </React.Fragment>
                  );
                })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
