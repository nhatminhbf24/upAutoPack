import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  RotateCw,
  Crop,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Undo2,
  Loader2,
  Sliders,
  Ruler,
  ChevronDown,
  AlertTriangle,
  Zap,
  Check,
  SlidersHorizontal,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { PhotoItem, DEFAULT_SIZE_PRESETS, SizePreset } from '../types';
import { rotateImageBase64, calculateCrop, createOptimizedPreview } from '../utils/imageUtils';
import { detectBadgeBleedColors } from '../utils/badgeUtils';
import { enhanceImageQuality, calculatePrintDPI, getRecommendedUpscaleFactor } from '../utils/imageEnhancer';

interface ImageListSidebarProps {
  photos: PhotoItem[];
  selectedPhotoId?: string | null;
  onSelectPhoto?: (id: string | null) => void;
  onUpdatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  onRemovePhoto: (id: string) => void;
  onClearAll: () => void;
  onOpenCropModal: (photo: PhotoItem, initialTab?: 'size' | 'crop' | 'enhance' | 'adjust') => void;
  onOpenCustomSizeModal?: (photo?: PhotoItem) => void;
  customPresets?: SizePreset[];
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  smartCrop: boolean;
  onMovePhoto?: (fromIndex: number, toIndex: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ImageListSidebar: React.FC<ImageListSidebarProps> = ({
  photos,
  selectedPhotoId,
  onSelectPhoto,
  onUpdatePhoto,
  onRemovePhoto,
  onClearAll,
  onOpenCropModal,
  onOpenCustomSizeModal,
  customPresets = [],
  onToast,
  smartCrop,
  onMovePhoto,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [upscaleMenuId, setUpscaleMenuId] = useState<string | null>(null);

  // Hệ thống kéo thả thẻ Kanban: Thẻ nhấc nghiêng 3° + SIZED SLOT (ô trống bằng chiều cao thẻ)
  interface DragState {
    dragIndex: number;
    hoverIndex: number;
    cardHeight: number;
    cardWidth: number;
    photo: PhotoItem;
    offsetX: number;
    offsetY: number;
    pointerPos: { x: number; y: number };
  }

  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  dragStateRef.current = dragState;
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const handleCardPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
    photo: PhotoItem
  ) => {
    if (!onMovePhoto || photos.length <= 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, select, input, label, a, textarea')) {
      return;
    }

    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    // Đo tọa độ các thẻ ban đầu một lần duy nhất trước khi bắt đầu kéo
    // Mốc tọa độ này bất biến trong suốt quá trình kéo, loại bỏ 100% hiện tượng giật do DOM bị dạt
    const scrollContainer = listContainerRef.current;
    const rootNode: ParentNode = scrollContainer || document;
    const cardElements = Array.from(rootNode.querySelectorAll('[data-photo-item-index]')) as HTMLElement[];

    const initialMidpoints = cardElements
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          idx: parseInt(el.getAttribute('data-photo-item-index') || '0', 10),
          midY: r.top + r.height / 2,
        };
      })
      .sort((a, b) => a.midY - b.midY);

    let hasStartedDrag = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!hasStartedDrag && dist > 5) {
        hasStartedDrag = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }

      if (hasStartedDrag) {
        // Tự động cuộn danh sách khi rê sát mép trên/dưới
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          if (moveEvent.clientY < containerRect.top + 45) {
            scrollContainer.scrollTop -= 6;
          } else if (moveEvent.clientY > containerRect.bottom - 45) {
            scrollContainer.scrollTop += 6;
          }
        }

        // Xác định vị trí mục tiêu tuyệt đối chuẩn xác dựa trên danh sách mốc tọa độ cố định
        let targetIdx = initialMidpoints.length - 1;
        for (let i = 0; i < initialMidpoints.length; i++) {
          if (moveEvent.clientY < initialMidpoints[i].midY) {
            targetIdx = i;
            break;
          }
        }

        targetIdx = Math.max(0, Math.min(photos.length - 1, targetIdx));

        setDragState({
          dragIndex: index,
          hoverIndex: targetIdx,
          cardHeight: rect.height,
          cardWidth: rect.width,
          photo,
          offsetX,
          offsetY,
          pointerPos: { x: moveEvent.clientX, y: moveEvent.clientY },
        });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      const current = dragStateRef.current;
      if (hasStartedDrag && current) {
        if (current.dragIndex !== current.hoverIndex && onMovePhoto) {
          onMovePhoto(current.dragIndex, current.hoverIndex);
        }
        setDragState(null);
      } else {
        onSelectPhoto?.(photo.id);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Tạo danh sách hiển thị với SIZED SLOT (ô trống kích thước bằng thẻ thật) tại vị trí hover
  const displayItems = useMemo(() => {
    if (!dragState) {
      return photos.map((p, i) => ({ type: 'card' as const, photo: p, index: i }));
    }

    const itemsWithoutDragged = photos
      .map((p, i) => ({ photo: p, index: i }))
      .filter((item) => item.index !== dragState.dragIndex);

    const result: Array<
      | { type: 'card'; photo: PhotoItem; index: number }
      | { type: 'placeholder'; height: number; dragIndex: number; targetIndex: number }
    > = [];

    const insertIdx = Math.max(0, Math.min(itemsWithoutDragged.length, dragState.hoverIndex));

    for (let i = 0; i <= itemsWithoutDragged.length; i++) {
      if (i === insertIdx) {
        result.push({
          type: 'placeholder',
          height: dragState.cardHeight,
          dragIndex: dragState.dragIndex,
          targetIndex: insertIdx,
        });
      }
      if (i < itemsWithoutDragged.length) {
        result.push({
          type: 'card',
          photo: itemsWithoutDragged[i].photo,
          index: itemsWithoutDragged[i].index,
        });
      }
    }

    return result;
  }, [photos, dragState]);

  // Tự động cuộn đến ảnh tương ứng khi người dùng nhấp chọn trên trang A4
  useEffect(() => {
    if (!selectedPhotoId) return;
    const cardEl = document.getElementById(`photo-card-${selectedPhotoId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPhotoId]);

  // Tự động đóng menu DPI / Upscale khi nhấp chuột ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!upscaleMenuId) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`[data-upscale-container="${upscaleMenuId}"]`)) {
        setUpscaleMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUpscaleMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [upscaleMenuId]);

  const totalCopies = photos.reduce((acc, p) => acc + (p.qty || 1), 0);

  // Combine standard and custom presets
  const allPresets = [...customPresets, ...DEFAULT_SIZE_PRESETS];

  // Enhance / Super-Res Upscale / Revert single image
  const handleEnhanceSingle = async (photo: PhotoItem, chosenFactor?: 1 | 2 | 4) => {
    if (enhancingId) return;
    setEnhancingId(photo.id);
    setUpscaleMenuId(null);

    try {
      if (photo.isEnhanced && !chosenFactor) {
        // Revert to raw original
        let origW = photo.rawOriginalWidth || photo.imgWidth;
        let origH = photo.rawOriginalHeight || photo.imgHeight;
        const origCrop = photo.rawOriginalCrop || {
          cropX: photo.cropX,
          cropY: photo.cropY,
          cropW: photo.cropW,
          cropH: photo.cropH,
        };
        let rawSrc = photo.rawOriginalSrc || photo.originalSrc;
        if ((origW > origH) !== (photo.imgWidth > photo.imgHeight)) {
          rawSrc = await rotateImageBase64(rawSrc, 90);
          origW = photo.rawOriginalHeight || photo.imgWidth;
          origH = photo.rawOriginalWidth || photo.imgHeight;
        }
        const previewSrc = await createOptimizedPreview(rawSrc, 420, 0.82);

        onUpdatePhoto(photo.id, {
          originalSrc: rawSrc,
          previewSrc: previewSrc,
          unadjustedSrc: rawSrc,
          isEnhanced: false,
          upscaleFactor: 1,
          imgWidth: origW,
          imgHeight: origH,
          cropX: origCrop.cropX,
          cropY: origCrop.cropY,
          cropW: origCrop.cropW,
          cropH: origCrop.cropH,
        });
        onToast('info', 'Đã khôi phục ảnh gốc');
      } else {
        // Base source and raw metrics
        let sourceForEnhancing = photo.rawOriginalSrc || photo.originalSrc;
        let rawW = photo.rawOriginalWidth || photo.imgWidth;
        let rawH = photo.rawOriginalHeight || photo.imgHeight;
        if ((rawW > rawH) !== (photo.imgWidth > photo.imgHeight)) {
          sourceForEnhancing = photo.originalSrc;
          rawW = photo.imgWidth;
          rawH = photo.imgHeight;
        }
        const rawCrop = photo.rawOriginalCrop || {
          cropX: photo.cropX,
          cropY: photo.cropY,
          cropW: photo.cropW,
          cropH: photo.cropH,
        };

        // Determine factor (or auto-calculate recommended factor to achieve print-safe DPI)
        const factor: 1 | 2 | 4 = chosenFactor ?? getRecommendedUpscaleFactor(
          rawW,
          rawH,
          photo.targetWidth,
          photo.targetHeight
        );

        const result = await enhanceImageQuality(sourceForEnhancing, {
          sharpenAmount: factor >= 4 ? 0.72 : factor === 2 ? 0.62 : 0.52,
          contrastAmount: 0.12,
          brightnessAmount: 0.03,
          vibranceAmount: 0.16,
          upscaleFactor: factor,
        });

        const previewSrc = await createOptimizedPreview(result.enhancedSrc, 420, 0.82);

        // Scale crop coordinates to new dimensions proportionally
        const newCropX = Math.round(rawCrop.cropX * factor);
        const newCropY = Math.round(rawCrop.cropY * factor);
        const newCropW = Math.round(rawCrop.cropW * factor);
        const newCropH = Math.round(rawCrop.cropH * factor);

        onUpdatePhoto(photo.id, {
          originalSrc: result.enhancedSrc,
          previewSrc: previewSrc,
          rawOriginalSrc: sourceForEnhancing,
          rawOriginalWidth: rawW,
          rawOriginalHeight: rawH,
          rawOriginalCrop: rawCrop,
          unadjustedSrc: result.enhancedSrc,
          isEnhanced: true,
          upscaleFactor: factor,
          imgWidth: result.newWidth,
          imgHeight: result.newHeight,
          cropX: newCropX,
          cropY: newCropY,
          cropW: newCropW,
          cropH: newCropH,
        });

        if (factor > 1) {
          const newDpiInfo = calculatePrintDPI(result.newWidth, result.newHeight, photo.targetWidth, photo.targetHeight, photo.scale || 1);
          onToast('success', `Đã nâng độ phân giải AI ${factor}x (${newDpiInfo.label})`);
        } else {
          onToast('success', 'Đã làm nét ảnh');
        }
      }
    } catch (err) {
      console.error(err);
      onToast('error', 'Không thể xử lý ảnh này');
    } finally {
      setEnhancingId(null);
    }
  };

  const handleRotateSingle = async (photo: PhotoItem) => {
    if (rotatingId === photo.id) return;
    setRotatingId(photo.id);

    try {
      const rotatedSrc = await rotateImageBase64(photo.originalSrc, 90);
      const rawRotated = photo.rawOriginalSrc ? await rotateImageBase64(photo.rawOriginalSrc, 90) : undefined;
      const unadjustedRotated = photo.unadjustedSrc ? await rotateImageBase64(photo.unadjustedSrc, 90) : undefined;
      const previewSrc = await createOptimizedPreview(rotatedSrc, 420, 0.82);
      const newWidth = photo.imgHeight;
      const newHeight = photo.imgWidth;
      const crop = calculateCrop(newWidth, newHeight, photo.targetWidth, photo.targetHeight, smartCrop);

      onUpdatePhoto(photo.id, {
        originalSrc: rotatedSrc,
        previewSrc: previewSrc,
        rawOriginalSrc: rawRotated,
        rawOriginalWidth: photo.rawOriginalHeight,
        rawOriginalHeight: photo.rawOriginalWidth,
        unadjustedSrc: unadjustedRotated,
        imgWidth: newWidth,
        imgHeight: newHeight,
        cropX: crop.cropX,
        cropY: crop.cropY,
        cropW: crop.cropW,
        cropH: crop.cropH,
        scale: 1,
      });
      onToast('success', 'Đã xoay ảnh 90°');
    } catch (err) {
      console.error('Error rotating single photo:', err);
      onToast('error', 'Không thể xoay ảnh');
    } finally {
      setRotatingId(null);
    }
  };

  const handleSizePresetChange = async (photo: PhotoItem, presetId: string) => {
    if (presetId === '__custom_new__') {
      if (onOpenCustomSizeModal) {
        onOpenCustomSizeModal(photo);
      }
      return;
    }

    const preset = allPresets.find((p) => p.id === presetId);
    if (!preset) return;

    const isBadge = Boolean(preset.isBadgePreset);
    let badgeBleedColor = photo.badgeBleedColor;
    let badgeBleedPalette = photo.badgeBleedPalette;

    if (isBadge) {
      try {
        const analysis = await detectBadgeBleedColors(photo.originalSrc);
        badgeBleedColor = analysis.dominantColor;
        badgeBleedPalette = analysis.palette;
      } catch (e) {
        badgeBleedColor = badgeBleedColor || '#ffffff';
      }
    }

    const crop = calculateCrop(photo.imgWidth, photo.imgHeight, preset.width, preset.height, smartCrop);
    onUpdatePhoto(photo.id, {
      targetWidth: preset.width,
      targetHeight: preset.height,
      shape: preset.shape,
      cropX: crop.cropX,
      cropY: crop.cropY,
      cropW: crop.cropW,
      cropH: crop.cropH,
      scale: 1,
      badgeMode: isBadge,
      badgeFaceDiameter: isBadge ? (preset.badgeFaceDiameter || 44) : undefined,
      badgeBleedColor: isBadge ? (badgeBleedColor || '#ffffff') : undefined,
      badgeBleedPalette: isBadge ? badgeBleedPalette : undefined,
      badgeGuideLines: false,
      badgeBleedMode: isBadge ? (photo.badgeBleedMode || 'solid') : undefined,
    });
  };

  const handleRescanPhotoBleedColor = async (photo: PhotoItem) => {
    try {
      const analysis = await detectBadgeBleedColors(photo.originalSrc);
      onUpdatePhoto(photo.id, {
        badgeBleedColor: analysis.dominantColor,
        badgeBleedPalette: analysis.palette,
      });
      onToast('success', `Đã nhận diện màu nền: ${analysis.dominantColor.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      onToast('error', 'Không thể nhận diện màu nền');
    }
  };

  // Group default presets by category
  const defaultCategories = Array.from(new Set(DEFAULT_SIZE_PRESETS.map((p) => p.category)));

  return (
    <aside
      id="list-sidebar"
      className={`no-print transition-all duration-300 flex flex-col bg-slate-50/80 border-r border-slate-200/90 h-full overflow-hidden z-20 ${
        isCollapsed ? 'w-11 shrink-0' : 'w-[335px] shrink-0'
      }`}
    >
      {/* Sidebar Header */}
      {isCollapsed ? (
        /* Header khi thu gọn: Nút mở rộng trên đỉnh */
        <div className="p-2 border-b border-slate-200/80 bg-white flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            title="Bấm để mở rộng Danh sách ảnh"
          >
            <ChevronsRight className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      ) : (
        /* Header khi mở rộng */
        <div className="p-3 border-b border-slate-200/80 bg-white sticky top-0 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wide truncate">
              Danh sách ({photos.length})
            </span>
            {photos.length > 0 && (
              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold shrink-0">
                {totalCopies} bản
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {photos.length > 0 && (
              <button
                id="btn-clear-all"
                type="button"
                onClick={onClearAll}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition cursor-pointer"
              >
                Xóa hết
              </button>
            )}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Thu gọn danh sách ảnh"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {isCollapsed ? (
        /* Thân cột khi thu gọn: Tiêu đề chạy dọc theo cột (như hình mẫu Kanban) */
        <div
          onClick={onToggleCollapse}
          className="flex-1 flex flex-col items-center justify-between py-6 cursor-pointer hover:bg-emerald-50/40 transition group select-none"
          title={`Bấm để mở rộng Danh sách (${photos.length} ảnh • ${totalCopies} bản in)`}
        >
          <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-700 group-hover:scale-110 transition shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>

          {/* Dải chữ chạy dọc theo thân cột */}
          <div
            style={{ writingMode: 'vertical-rl' }}
            className="text-[11px] font-extrabold uppercase tracking-widest text-slate-700 group-hover:text-emerald-700 flex items-center gap-2 py-4 transition"
          >
            <span>Danh sách ảnh</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full shadow-2xs">
              {photos.length} ảnh • {totalCopies} bản
            </span>
          </div>

          <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-emerald-600">
            #{photos.length}
          </span>
        </div>
      ) : (
        /* Sidebar Content */
        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Empty State */}
          {photos.length === 0 ? (
            <div className="text-center py-16 px-4 border-2 border-dashed border-emerald-200/80 rounded-xl bg-emerald-50/30 space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100/60 flex items-center justify-center mx-auto text-emerald-600">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-700">Chưa có ảnh nào</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tải ảnh từ khung bên trái hoặc dán (Ctrl+V) để bắt đầu dàn trang A4.
              </p>
            </div>
          ) : (
            /* Image Cards List */
            <div className="space-y-2.5">
              {displayItems.map((item) => {
                if (item.type === 'placeholder') {
                  return (
                    <div
                      key={`placeholder-slot-${item.targetIndex}`}
                      style={{ minHeight: item.height || 140 }}
                      className="w-full border-2 border-dashed border-emerald-500 bg-emerald-50/60 rounded-xl flex flex-col items-center justify-center gap-2 text-emerald-700 transition-all select-none animate-pulse shadow-inner p-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-emerald-800">
                          Vị trí đặt ảnh #{item.dragIndex + 1}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">
                          (Vị trí #{item.targetIndex + 1} trên trang in)
                        </div>
                      </div>
                    </div>
                  );
                }

                const { photo, index } = item;
                const isConfirmingDelete = confirmDeleteId === photo.id;
                const currentPresetId = `${photo.targetWidth}x${photo.targetHeight}_${photo.shape}`;
                const matchedPreset = allPresets.find(
                  (p) => p.width === photo.targetWidth && p.height === photo.targetHeight && p.shape === photo.shape
                );

                const dpiInfo = calculatePrintDPI(
                  photo.imgWidth,
                  photo.imgHeight,
                  photo.targetWidth,
                  photo.targetHeight,
                  photo.scale || 1
                );

                const isSelected = selectedPhotoId === photo.id;

                return (
                  <div
                    key={photo.id}
                    data-photo-item-index={index}
                    id={`photo-card-${photo.id}`}
                    onPointerDown={(e) => handleCardPointerDown(e, index, photo)}
                    className={`bg-white border rounded-xl p-3 shadow-2xs hover:shadow-xs transition-all group flex flex-col gap-2.5 cursor-grab active:cursor-grabbing relative select-none ${
                      isConfirmingDelete
                        ? 'border-rose-400 ring-2 ring-rose-200/80 bg-rose-50/15'
                        : isSelected
                        ? 'border-orange-500 ring-2 ring-orange-400/90 bg-orange-50/25 shadow-md scale-[1.01]'
                        : photo.isEnhanced
                        ? 'border-amber-300 ring-1 ring-amber-100/80 bg-amber-50/20'
                        : 'border-slate-200/90 hover:border-blue-300'
                    }`}
                  >
                    {/* Top: Thumbnail & Size Selector (Đã bỏ cột 6 dấu chấm, thumbnail to rõ nét 64px) */}
                    <div className="flex items-center gap-2.5">
                      {/* Thumbnail with Shape Mask Preview (To rõ nét w-16 h-16 = 64px) */}
                      <div className="relative shrink-0">
                        {/* Nhãn đánh số ảnh góc phía trên bên trái ngoài vùng viền ảnh */}
                        <span
                          className={`absolute -top-2 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-md text-[11px] font-bold font-mono flex items-center justify-center shadow-xs border z-20 select-none leading-none transition-all duration-150 ${
                            isSelected
                              ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/20'
                              : 'bg-black/75 hover:bg-orange-500 group-hover:bg-orange-500 text-white border-white/20 hover:border-orange-400 group-hover:border-orange-400'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-xs">
                          {photo.badgeMode && photo.badgeFaceDiameter ? (
                            /* Preview phôi huy hiệu có viền (Solid hoặc Blur mở rộng) */
                            <div
                              className="w-full h-full rounded-full relative overflow-hidden flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  photo.badgeBleedMode !== 'blur_expand'
                                    ? photo.badgeBleedColor || '#ffffff'
                                    : '#f8fafc',
                              }}
                            >
                              {/* Lớp nền mờ Blur mở rộng */}
                              {photo.badgeBleedMode === 'blur_expand' && (
                                <div
                                  className="absolute inset-0 bg-cover bg-center scale-150 filter blur-[2.5px] brightness-95"
                                  style={{
                                    backgroundImage: `url(${photo.previewSrc || photo.originalSrc})`,
                                  }}
                                />
                              )}
                              {/* Mặt chính diện sắc nét */}
                              <div
                                className="rounded-full overflow-hidden relative shadow-xs"
                                style={{
                                  width: `${Math.min(100, (photo.badgeFaceDiameter / (photo.targetWidth || 55)) * 100)}%`,
                                  height: `${Math.min(100, (photo.badgeFaceDiameter / (photo.targetHeight || 55)) * 100)}%`,
                                }}
                              >
                                <div
                                  className="w-full h-full bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url(${photo.previewSrc || photo.originalSrc})`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`w-full h-full bg-cover bg-center ${
                                photo.shape === 'circle'
                                  ? 'shape-circle'
                                  : photo.shape === 'heart'
                                  ? 'shape-heart'
                                  : 'rounded-lg'
                              }`}
                              style={{ backgroundImage: `url(${photo.previewSrc || photo.originalSrc})` }}
                            />
                          )}
                          {photo.isEnhanced && (
                            <span
                              className="absolute bottom-1 right-1 bg-amber-500 text-white px-1 py-0.5 rounded shadow-xs flex items-center gap-0.5 text-[8px] font-bold z-10"
                              title={`Đã tối ưu ${photo.upscaleFactor && photo.upscaleFactor > 1 ? `AI ${photo.upscaleFactor}x (DPI x${photo.upscaleFactor})` : 'HD'}`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              {photo.upscaleFactor && photo.upscaleFactor > 1 && (
                                <span>{photo.upscaleFactor}x</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Size Select & DPI Quality Badge */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-[11px] font-bold text-slate-800 truncate" title={photo.name}>
                            {photo.name}
                          </div>

                          {/* Interactive DPI Badge with Upscale Menu */}
                          <div className="relative shrink-0" data-upscale-container={photo.id}>
                            <button
                              type="button"
                              onClick={() => setUpscaleMenuId(upscaleMenuId === photo.id ? null : photo.id)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 transition cursor-pointer hover:shadow-xs ${
                                dpiInfo.quality === 'high'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : dpiInfo.quality === 'good'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-300 ring-2 ring-rose-200/50 hover:bg-rose-100'
                              }`}
                              title="Bấm để tăng độ phân giải / DPI bằng AI"
                            >
                              {photo.upscaleFactor && photo.upscaleFactor > 1 && (
                                <span className="bg-amber-400 text-amber-950 px-1 py-0.2 rounded text-[8px] font-black">
                                  {photo.upscaleFactor}x
                                </span>
                              )}
                              <span>{dpiInfo.label}</span>
                              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                            </button>

                            {/* Dropdown Menu for DPI / Upscale */}
                            {upscaleMenuId === photo.id && (
                              <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 shadow-xl rounded-xl p-2 w-60 text-left">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
                                  Nâng độ phân giải DPI
                                </div>
                                <div className="space-y-1 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-50 text-slate-700 hover:text-amber-900 flex items-center justify-between gap-2 transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      <span className="whitespace-nowrap font-semibold">Tự động tối ưu</span>
                                    </span>
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                                      Khuyên dùng
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo, 2)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-900 flex items-center justify-between transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Phóng to x2 (DPI ×2)</span>
                                    </span>
                                    {photo.upscaleFactor === 2 && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo, 4)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-50 text-slate-700 hover:text-purple-900 flex items-center justify-between transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                      <span>Phóng to x4 Siêu nét</span>
                                    </span>
                                    {photo.upscaleFactor === 4 && <Check className="w-3.5 h-3.5 text-purple-600" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo, 1)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center justify-between transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Chỉ làm nét HD (1x)</span>
                                    </span>
                                    {photo.isEnhanced && photo.upscaleFactor === 1 && (
                                      <Check className="w-3.5 h-3.5 text-slate-600" />
                                    )}
                                  </button>

                                  {photo.isEnhanced && (
                                    <button
                                      type="button"
                                      onClick={() => handleEnhanceSingle(photo)}
                                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-1.5 transition font-medium border-t border-slate-100 mt-1 pt-1.5 cursor-pointer"
                                    >
                                      <Undo2 className="w-3.5 h-3.5" />
                                      <span>Khôi phục ảnh gốc</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <select
                            value={matchedPreset ? matchedPreset.id : currentPresetId}
                            onChange={(e) => handleSizePresetChange(photo, e.target.value)}
                            className="w-full text-xs font-semibold border border-slate-200 bg-slate-50/80 rounded-lg p-1.5 text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition"
                          >
                            <option value="__custom_new__" className="font-bold text-pink-600">
                              ➕ Nhập kích thước tùy chỉnh...
                            </option>

                            {/* Custom Presets Group */}
                            {customPresets.length > 0 && (
                              <optgroup label="⭐ Kích thước tùy chỉnh của bạn">
                                {customPresets.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            {/* If photo has an ad-hoc dimension not in any preset */}
                            {!matchedPreset && (
                              <optgroup label="📐 Kích thước hiện tại của ảnh">
                                <option value={currentPresetId}>
                                  Tùy chỉnh: {(photo.targetWidth / 10).toFixed(1)} x {(photo.targetHeight / 10).toFixed(1)} cm ({photo.shape})
                                </option>
                              </optgroup>
                            )}

                            {/* Standard presets grouped by category */}
                            {defaultCategories.map((cat) => (
                              <optgroup key={cat} label={cat}>
                                {DEFAULT_SIZE_PRESETS.filter((p) => p.category === cat).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          {onOpenCustomSizeModal && (
                            <button
                              type="button"
                              onClick={() => onOpenCustomSizeModal(photo)}
                              className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg border border-pink-200 transition shrink-0 cursor-pointer"
                              title="Nhập kích thước tùy chỉnh cho ảnh này"
                            >
                              <Ruler className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* 🏅 Phôi Huy hiệu: Gộp gọn trên 1 dòng duy nhất, từ trái qua phải: Blur -> Auto -> 4 màu gợi ý -> vạch ngăn cách -> Màu lựa chọn */}
                        {photo.badgeMode && (
                          <div
                            onDragStart={(e) => e.stopPropagation()}
                            className="flex items-center justify-between bg-rose-50/60 border border-rose-200/70 rounded-lg px-2 py-1 text-[11px] gap-1"
                          >
                            {/* 0. Nút chế độ Viền Mờ (Blur Expand): Chỉ để chữ Blur không icon */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextMode = photo.badgeBleedMode === 'blur_expand' ? 'solid' : 'blur_expand';
                                onUpdatePhoto(photo.id, { badgeBleedMode: nextMode });
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center justify-center cursor-pointer shrink-0 shadow-2xs ${
                                photo.badgeBleedMode === 'blur_expand'
                                  ? 'bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300 hover:border-rose-600 scale-105'
                                  : 'bg-white hover:bg-rose-100 text-slate-600 hover:text-rose-800 border border-slate-200'
                              }`}
                              title="Bật/Tắt hiệu ứng làm mờ nền ảnh gốc mở rộng tràn viền (Blurred Bleed)"
                            >
                              Blur
                            </button>

                            {/* 1. Nút "Auto" màu */}
                            <button
                              type="button"
                              onClick={() => {
                                handleRescanPhotoBleedColor(photo);
                                onUpdatePhoto(photo.id, { badgeBleedMode: 'solid' });
                              }}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                                photo.badgeBleedMode !== 'blur_expand'
                                  ? 'bg-white hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-rose-200'
                                  : 'opacity-50 hover:opacity-100 bg-white text-slate-500 border border-slate-200'
                              }`}
                              title="Tự động bốc màu đơn sắc từ viền ảnh"
                            >
                              Auto
                            </button>

                            {/* 2. 4 màu gợi ý */}
                            <div className={`flex items-center gap-1 shrink-0 ${photo.badgeBleedMode === 'blur_expand' ? 'opacity-40 hover:opacity-100 transition-opacity' : ''}`}>
                              {((photo.badgeBleedPalette && photo.badgeBleedPalette.length > 0)
                                ? photo.badgeBleedPalette
                                : ['#ffffff', '#f8fafc', '#f1f5f9', '#000000']
                              ).slice(0, 4).map((col, cIdx) => (
                                <button
                                  key={`swatch-${photo.id}-${cIdx}`}
                                  type="button"
                                  onClick={() => onUpdatePhoto(photo.id, { badgeBleedColor: col, badgeBleedMode: 'solid' })}
                                  style={{ backgroundColor: col }}
                                  className={`w-3.5 h-3.5 rounded-full border transition cursor-pointer shrink-0 ${
                                    photo.badgeBleedMode !== 'blur_expand' && (photo.badgeBleedColor || '').toLowerCase() === col.toLowerCase()
                                      ? 'border-slate-800 ring-2 ring-rose-300 scale-110'
                                      : 'border-white hover:scale-110'
                                  }`}
                                  title={`Chọn màu đơn sắc ${col}`}
                                />
                              ))}
                            </div>

                            {/* 3. Dấu gạch đứng tạo sự tách biệt */}
                            <div className="w-[1px] h-3.5 bg-rose-200 mx-0.5 shrink-0" aria-hidden="true" />

                            {/* 4. Màu lựa chọn (không hiển thị mã màu) */}
                            <label
                              className={`relative flex items-center justify-center cursor-pointer shrink-0 ${photo.badgeBleedMode === 'blur_expand' ? 'opacity-40 hover:opacity-100 transition-opacity' : ''}`}
                              title={`Màu đang chọn: ${photo.badgeBleedColor || '#ffffff'} (Nhấn để tùy chỉnh màu)`}
                            >
                              <input
                                type="color"
                                value={photo.badgeBleedColor || '#ffffff'}
                                onChange={(e) => onUpdatePhoto(photo.id, { badgeBleedColor: e.target.value, badgeBleedMode: 'solid' })}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                              />
                              <span
                                className="w-4 h-4 rounded-full border-2 border-white ring-1.5 ring-rose-400 shadow-2xs block transition-transform hover:scale-110 active:scale-95"
                                style={{ backgroundColor: photo.badgeBleedColor || '#ffffff' }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Quantity & Controls */}
                    <div
                      onDragStart={(e) => e.stopPropagation()}
                      className="flex items-center justify-between bg-slate-50/90 p-1.5 rounded-lg border border-slate-200/80"
                    >
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdatePhoto(photo.id, { qty: Math.max(1, (photo.qty || 1) - 1) })}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={photo.qty || 1}
                          onChange={(e) =>
                            onUpdatePhoto(photo.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })
                          }
                          className="w-8 h-6 text-center text-xs font-bold bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdatePhoto(photo.id, { qty: (photo.qty || 1) + 1 })}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* 1 Nút Chỉnh sửa duy nhất mở popup chỉnh ảnh (cắt cúp, chỉnh màu, làm nét, kích thước...) */}
                        <button
                          type="button"
                          onClick={() => onOpenCropModal(photo)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 transition shadow-2xs cursor-pointer text-xs font-bold active:scale-95"
                          title="Mở popup chỉnh sửa ảnh (cắt cúp, chỉnh màu, làm nét, kích thước...)"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                          <span>Chỉnh sửa</span>
                        </button>

                        {/* Rotate 90° */}
                        <button
                          type="button"
                          onClick={() => handleRotateSingle(photo)}
                          disabled={rotatingId === photo.id}
                          className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Xoay ảnh 90°"
                        >
                          {rotatingId === photo.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete button (Toggle Confirmation) */}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : photo.id)}
                          className={`p-1.5 rounded-md border transition cursor-pointer ${
                            isConfirmingDelete
                              ? 'bg-rose-100 border-rose-300 text-rose-700 shadow-2xs'
                              : 'bg-white border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                          }`}
                          title={isConfirmingDelete ? 'Hủy xóa ảnh' : 'Xóa ảnh này'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Delete Confirmation Row */}
                    {isConfirmingDelete && (
                      <div className="flex items-center justify-between gap-1.5 p-2 bg-rose-50/95 border border-rose-200 rounded-lg text-xs animate-in fade-in duration-150 shadow-2xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="text-[11px] font-bold text-rose-800 truncate">
                            Xóa ảnh #{index + 1}?
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition shadow-2xs cursor-pointer"
                          >
                            Trở lại
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onRemovePhoto(photo.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-md transition shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xác nhận xóa</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Thẻ đang được nhấc kéo: LIFTED: scale 1.03 · +8 px shadow · 3° tilt · in hand (hình 2) */}
      {dragState &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: dragState.pointerPos.x - dragState.offsetX,
              top: dragState.pointerPos.y - dragState.offsetY,
              width: dragState.cardWidth,
              pointerEvents: 'none',
              zIndex: 99999,
              transform: 'scale(1.03) rotate(3deg)',
              boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.25), 0 10px 15px -5px rgba(0, 0, 0, 0.15)',
              transformOrigin: 'center center',
            }}
            className="bg-white border-2 border-emerald-500 rounded-xl p-3 ring-4 ring-emerald-400/25 opacity-95 flex flex-col gap-2.5 transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <span className="absolute -top-2 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-md text-[11px] font-bold font-mono flex items-center justify-center shadow-xs border border-orange-400 bg-orange-500 text-white z-20 select-none leading-none">
                  {dragState.dragIndex + 1}
                </span>
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-xs">
                  <div
                    className={`w-full h-full bg-cover bg-center ${
                      dragState.photo.shape === 'circle'
                        ? 'shape-circle'
                        : dragState.photo.shape === 'heart'
                        ? 'shape-heart'
                        : 'rounded-lg'
                    }`}
                    style={{
                      backgroundImage: `url(${dragState.photo.previewSrc || dragState.photo.originalSrc})`,
                    }}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-[12px] font-bold text-slate-800 truncate">
                  {dragState.photo.name}
                </div>
                <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block shadow-2xs">
                  Di chuyển đến vị trí #{dragState.hoverIndex + 1}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
};
