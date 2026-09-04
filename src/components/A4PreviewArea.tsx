import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
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
} from 'lucide-react';
import { PackedPage, LayoutSettings, PhotoItem, ShapeType, PlacedPhotoItem } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../utils/packing';
import { rotateImageBase64, calculateCrop, createOptimizedPreview } from '../utils/imageUtils';

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

  // Inter-item Drag & Drop Swap State
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState<string | null>(null);
  const [rotatingPhotoId, setRotatingPhotoId] = useState<string | null>(null);

  const handleRotateItem = async (photo: PlacedPhotoItem) => {
    if (rotatingPhotoId === photo.id) return;
    setRotatingPhotoId(photo.id);

    try {
      const rotatedSrc = await rotateImageBase64(photo.originalSrc, 90);
      const rawRotated = photo.rawOriginalSrc ? await rotateImageBase64(photo.rawOriginalSrc, 90) : undefined;
      const previewSrc = await createOptimizedPreview(rotatedSrc, 800, 0.85);
      const newWidth = photo.imgHeight;
      const newHeight = photo.imgWidth;
      const crop = calculateCrop(newWidth, newHeight, photo.targetWidth, photo.targetHeight, settings.smartCrop);

      onUpdatePhoto(photo.id, {
        originalSrc: rotatedSrc,
        previewSrc: previewSrc,
        rawOriginalSrc: rawRotated,
        imgWidth: newWidth,
        imgHeight: newHeight,
        cropX: crop.cropX,
        cropY: crop.cropY,
        cropW: crop.cropW,
        cropH: crop.cropH,
        scale: 1,
      });
    } catch (err) {
      console.error('Error rotating item in preview:', err);
    } finally {
      setRotatingPhotoId(null);
    }
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
    photo: PhotoItem
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
        } = panInfoRef.current;

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        const scale = p.scale || 1;
        const actualCropW = p.cropW / scale;
        const actualCropH = p.cropH / scale;

        // Direct manipulation mapping
        const pxScaleX = actualCropW / renderedWidth;
        const pxScaleY = actualCropH / renderedHeight;

        let newX = initialCropX - dx * pxScaleX;
        let newY = initialCropY - dy * pxScaleY;

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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition cursor-pointer"
              title="Quay về màn hình chọn 2 chức năng"
            >
              <span className="text-pink-600 font-black">🍓</span>
              <span>Đổi công cụ</span>
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
          </>
        )}

        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
          Thu phóng:
        </span>

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

        <span className="font-mono font-bold text-slate-800 w-10 text-right">{zoom}%</span>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Undo / Redo Buttons */}
        <div className="flex items-center gap-1 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
          <button
            type="button"
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            title="Hoàn tác (Ctrl + Z)"
          >
            <Undo2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Hoàn tác {historyCount > 0 ? `(${historyCount})` : ''}</span>
          </button>

          <button
            type="button"
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            title="Làm lại (Ctrl + Y)"
          >
            <Redo2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Làm lại</span>
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
          <span>Thước đo</span>
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
          <span>Lưới mm</span>
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
              <span>Hoàn tác / Làm lại thao tác gần nhất</span>
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
                  key={`page-${page.pageNumber}`}
                  id={`a4-page-${page.pageNumber}`}
                  className="a4-page-sheet relative bg-white shadow-xl rounded-xs border border-slate-300/60 overflow-hidden"
                  style={{
                    width: `${pageW_mm}mm`,
                    height: `${pageH_mm}mm`,
                  }}
                >
                  {/* Top Ruler Overlay (mm) */}
                  {showRuler && (
                    <div className="no-print absolute top-0 left-0 right-0 h-4 bg-amber-50/90 border-b border-amber-300/60 z-30 pointer-events-none flex text-[8px] font-mono text-amber-900 select-none overflow-hidden">
                      {Array.from({ length: Math.ceil(pageW_mm / 10) + 1 }).map((_, idx) => (
                        <div
                          key={`ruler-top-${idx}`}
                          className="relative border-r border-amber-300/70 shrink-0 flex items-end pl-0.5 pb-0.5"
                          style={{ width: '10mm', height: '100%' }}
                        >
                          {idx * 10 > 0 && <span>{idx * 10}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Left Ruler Overlay (mm) */}
                  {showRuler && (
                    <div className="no-print absolute top-0 left-0 bottom-0 w-4 bg-amber-50/90 border-r border-amber-300/60 z-30 pointer-events-none flex flex-col text-[8px] font-mono text-amber-900 select-none overflow-hidden">
                      {Array.from({ length: Math.ceil(pageH_mm / 10) + 1 }).map((_, idx) => (
                        <div
                          key={`ruler-left-${idx}`}
                          className="relative border-b border-amber-300/70 shrink-0 flex items-start pl-0.5 pt-0.5"
                          style={{ height: '10mm', width: '100%' }}
                        >
                          {idx * 10 > 0 && <span>{idx * 10}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grid mm Overlay */}
                  {showGrid && (
                    <div
                      className="no-print absolute inset-0 pointer-events-none z-10 opacity-30"
                      style={{
                        backgroundImage: `linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)`,
                        backgroundSize: '10mm 10mm',
                      }}
                    />
                  )}

                  {/* Page Status Badges (Hidden in Print) */}
                  <div className="no-print absolute top-2 right-3 z-30 pointer-events-none flex items-center gap-2">
                    {/* Efficiency Badge */}
                    <div
                      className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                        efficiency >= 80
                          ? 'bg-emerald-600/90'
                          : efficiency >= 50
                          ? 'bg-blue-600/90'
                          : 'bg-slate-800/80'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{efficiency}% diện tích</span>
                    </div>

                    {/* Page Number */}
                    <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Trang {page.pageNumber} / {pages.length} (A4 {isLandscape ? 'Ngang' : 'Dọc'})
                    </div>
                  </div>

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
                    const isDraggingThis = draggedPhotoId === item.id;
                    const isDragOverThis = dragOverPhotoId === item.id;

                    return (
                      <div
                        key={`placed-${item.id}-${item.instanceIndex}`}
                        id={`img-box-${item.id}-${item.instanceIndex}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => handleDragOver(e, item)}
                        onDragLeave={(e) => handleDragLeave(e, item)}
                        onDrop={(e) => handleDrop(e, item)}
                        onDragEnd={handleDragEnd}
                        onMouseDown={(e) => handlePhotoMouseDown(e, item)}
                        onDoubleClick={() => onOpenCropModal(item)}
                        title="Kéo thả để đổi vị trí ảnh • Kéo chuột trên ảnh để dịch tâm • Nhấp đúp để chỉnh chi tiết"
                        style={{
                          position: 'absolute',
                          left: `${renderX}mm`,
                          top: `${renderY}mm`,
                          width: `${renderW}mm`,
                          height: `${renderH}mm`,
                        }}
                        className={`overflow-hidden select-none cursor-grab active:cursor-grabbing group/box transition-all ${
                          isCircle ? 'shape-circle' : isHeart ? 'shape-heart' : ''
                        } ${settings.cutLines ? 'cut-lines-box' : ''} ${
                          isDraggingThis ? 'opacity-30 scale-95 ring-2 ring-blue-500' : ''
                        } ${
                          isDragOverThis
                            ? 'ring-4 ring-emerald-500 ring-offset-2 scale-105 z-30 shadow-lg'
                            : ''
                        }`}
                      >
                        {/* Image Content */}
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

                        {/* Drag & Reorder Grip Handle (Top Left, visible on hover) */}
                        <div
                          className="no-print drag-reorder-handle opacity-0 group-hover/box:opacity-100 transition-opacity absolute top-1 left-1 bg-slate-900/80 backdrop-blur-xs text-white p-1 rounded cursor-grab active:cursor-grabbing z-20 flex items-center shadow-xs"
                          title="Kéo biểu tượng này để đổi vị trí sang bức ảnh khác"
                        >
                          <GripHorizontal className="w-3 h-3 text-slate-200" />
                        </div>

                        {/* Quick Rotate Button (Top Right, visible on hover) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRotateItem(item);
                          }}
                          disabled={rotatingPhotoId === item.id}
                          className="no-print opacity-0 group-hover/box:opacity-100 transition-opacity absolute top-1 right-1 bg-slate-900/80 hover:bg-blue-600 backdrop-blur-xs text-white p-1 rounded cursor-pointer z-20 flex items-center shadow-xs disabled:opacity-50"
                          title="Xoay ảnh này 90°"
                        >
                          {rotatingPhotoId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                          ) : (
                            <RotateCw className="w-3 h-3 text-slate-200 hover:text-white" />
                          )}
                        </button>

                        {/* Hover Info Tag (Bottom Right, Hidden in Print) */}
                        <div className="no-print opacity-0 group-hover/box:opacity-100 transition-opacity absolute bottom-1 right-1 bg-black/65 backdrop-blur-xs text-white text-[9px] font-mono px-1 py-0.5 rounded pointer-events-none flex items-center gap-0.5 z-20">
                          <span>
                            {item.w / 10}x{item.h / 10}cm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
