import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  RotateCw,
  RotateCcw,
  Copy,
  Check,
  Undo2,
  Loader2,
  Maximize2,
  Layers,
  Wand2,
  Plus,
  Download,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { PhotoItem, DEFAULT_ADJUSTMENTS, LayoutSettings } from '../types';
import { rotateImageBase64, calculateCrop, createOptimizedPreview, formatPhotoToPreset, getImageDimensions } from '../utils/imageUtils';
import { enhanceImageQuality, getRecommendedUpscaleFactor } from '../utils/imageEnhancer';
import { calculateAutoAdjustments, applyAdjustmentsToImage } from '../utils/imageAdjustmentEngine';
import { PageLayoutSettings } from './PageLayoutSettings';

interface BatchToolsSidebarProps {
  photos: PhotoItem[];
  onUpdatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  onBatchUpdatePhotos?: (photos: PhotoItem[]) => void;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  smartCrop: boolean;
  settings: LayoutSettings;
  onUpdateSettings: (updates: Partial<LayoutSettings>) => void;
  pageCount: number;
  onClonePage1AsBackside?: () => void;
  onResetFreeformPositions?: () => void;
  onExportAllPhotosZip?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

export const BatchToolsSidebar: React.FC<BatchToolsSidebarProps> = ({
  photos,
  onUpdatePhoto,
  onBatchUpdatePhotos,
  onToast,
  smartCrop,
  settings,
  onUpdateSettings,
  pageCount,
  onClonePage1AsBackside,
  onResetFreeformPositions,
  onExportAllPhotosZip,
  isCollapsed = false,
  onToggleCollapse,
  onClose,
}) => {
  const sidebarRef = useRef<HTMLElement>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [enhanceStrength, setEnhanceStrength] = useState<number>(50);

  // Tự động ẩn tab Thao tác hàng loạt khi click chuột ra ngoài hoặc ấn Esc
  useEffect(() => {
    if (isCollapsed) return;

    let timer: NodeJS.Timeout | null = null;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Không đóng nếu nhấp vào bên trong sidebar này
      if (sidebarRef.current && sidebarRef.current.contains(target)) {
        return;
      }

      // Không đóng nếu nhấp vào các modal / dialog nổi
      if (target.closest('[role="dialog"]') || target.closest('.fixed') || target.closest('#modal-root')) {
        return;
      }

      if (onClose) {
        onClose();
      } else if (onToggleCollapse) {
        onToggleCollapse();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
        else onToggleCollapse?.();
      }
    };

    // Delay 50ms để ngăn sự kiện click mở tab vô tình kích hoạt đóng ngay lập tức
    timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 50);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCollapsed, onClose, onToggleCollapse]);
  const [isEnhancingAll, setIsEnhancingAll] = useState<boolean>(false);
  const [isRevertingAll, setIsRevertingAll] = useState<boolean>(false);
  const [isAutoAdjustingAll, setIsAutoAdjustingAll] = useState<boolean>(false);
  const [isRevertingColorsAll, setIsRevertingColorsAll] = useState<boolean>(false);
  const [autoUpscaleDpi, setAutoUpscaleDpi] = useState<boolean>(true);

  // Lấy ảnh nguồn sạch chuẩn cho việc cân chỉnh màu (chống bóp méo, đảm bảo khớp đúng tỷ lệ/chiều của ảnh hiện tại)
  const getSafeBaseForAdjust = async (photo: PhotoItem): Promise<string> => {
    let candidate = photo.unadjustedSrc || photo.originalSrc;
    try {
      const dims = await getImageDimensions(candidate);
      const isCandidateLandscape = dims.width > dims.height;
      const isTargetLandscape = photo.imgWidth > photo.imgHeight;

      // Nếu ảnh nguồn bị ngược chiều với khung ảnh hiện tại (do ảnh ban đầu đã tự xoay 90° để khớp khung):
      // Xoay ảnh 90° để khớp tuyệt đối với imgWidth x imgHeight, ngăn chặn việc ảnh bị bóp méo
      if (isCandidateLandscape !== isTargetLandscape) {
        candidate = await rotateImageBase64(candidate, 90);
      }
    } catch (e) {
      console.warn('Could not verify dimensions of candidate', e);
    }
    return candidate;
  };

  // Batch Auto Adjust Colors (White balance, light & vibrancy)
  const handleAutoAdjustAll = async () => {
    if (photos.length === 0 || isAutoAdjustingAll) {
      if (photos.length === 0) onToast('error', 'Chưa có ảnh để cân chỉnh màu');
      return;
    }
    setIsAutoAdjustingAll(true);
    if (photos.length > 15) {
      onToast('info', `Đang cân màu ${photos.length} ảnh...`);
    }

    let count = 0;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const sourceForAdjust = await getSafeBaseForAdjust(photo);
        const autoAdj = await calculateAutoAdjustments(sourceForAdjust);
        const adjustedSrc = await applyAdjustmentsToImage(sourceForAdjust, autoAdj);
        const previewSrc = await createOptimizedPreview(adjustedSrc, 420, 0.82);

        onUpdatePhoto(photo.id, {
          originalSrc: adjustedSrc,
          previewSrc: previewSrc,
          unadjustedSrc: sourceForAdjust,
          adjustments: autoAdj,
        });
        count++;
      } catch (err) {
        console.error('Batch auto adjust error for', photo.id, err);
      }
      // Yield to main thread
      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setIsAutoAdjustingAll(false);
    onToast('success', `Đã cân màu ${count} ảnh`);
  };

  // Batch Revert Colors to Original (Khôi phục màu gốc TẤT CẢ)
  const handleRevertColorsAll = async () => {
    if (photos.length === 0 || isRevertingColorsAll) {
      if (photos.length === 0) onToast('error', 'Chưa có ảnh để khôi phục');
      return;
    }
    setIsRevertingColorsAll(true);

    let count = 0;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        let baseSource = photo.unadjustedSrc || photo.originalSrc;
        const dims = await getImageDimensions(baseSource);
        if ((dims.width > dims.height) !== (photo.imgWidth > photo.imgHeight)) {
          baseSource = await rotateImageBase64(baseSource, 90);
        }
        const previewSrc = await createOptimizedPreview(baseSource, 420, 0.82);

        onUpdatePhoto(photo.id, {
          originalSrc: baseSource,
          previewSrc: previewSrc,
          unadjustedSrc: undefined,
          adjustments: { ...DEFAULT_ADJUSTMENTS },
        });
        count++;
      } catch (err) {
        console.error('Batch revert color error for', photo.id, err);
      }
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setIsRevertingColorsAll(false);
    onToast('success', `Đã đặt lại màu cho ${count} ảnh`);
  };

  // Batch 1-Click Print Ready Preset Colors
  const handleApplyPresetColorsAll = async (presetType: 'studio_print' | 'portrait' | 'fix_red' | 'crisp') => {
    if (photos.length === 0 || isAutoAdjustingAll) {
      if (photos.length === 0) onToast('error', 'Chưa có ảnh để áp dụng');
      return;
    }
    setIsAutoAdjustingAll(true);
    const presetAdj =
      presetType === 'studio_print'
        ? { ...DEFAULT_ADJUSTMENTS, brightness: 12, contrast: 8, shadows: 15, whites: 5, highlights: -5, vibrance: 8 }
        : presetType === 'portrait'
        ? { ...DEFAULT_ADJUSTMENTS, brightness: 10, contrast: 4, temperature: 4, tint: 2, shadows: 12, vibrance: 10 }
        : presetType === 'fix_red'
        ? { ...DEFAULT_ADJUSTMENTS, tint: -12, temperature: -4, saturation: -6, brightness: 10, shadows: 14, contrast: 4, highlights: -4 }
        : { ...DEFAULT_ADJUSTMENTS, contrast: 12, highlights: 6, whites: 8, blacks: -8, vibrance: 12, saturation: 4 };

    const label =
      presetType === 'studio_print'
        ? 'Bù sáng in xưởng'
        : presetType === 'portrait'
        ? 'Tông da hồng hào'
        : presetType === 'fix_red'
        ? 'Fix đỏ máy in'
        : 'Trong trẻo sắc nét';

    if (photos.length > 20) {
      onToast('info', `Đang áp dụng màu "${label}"...`);
    }

    let count = 0;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const sourceForAdjust = await getSafeBaseForAdjust(photo);
        const adjustedSrc = await applyAdjustmentsToImage(sourceForAdjust, presetAdj);
        const previewSrc = await createOptimizedPreview(adjustedSrc, 420, 0.82);

        onUpdatePhoto(photo.id, {
          originalSrc: adjustedSrc,
          previewSrc: previewSrc,
          unadjustedSrc: sourceForAdjust,
          adjustments: presetAdj,
        });
        count++;
      } catch (err) {
        console.error('Batch preset color error for', photo.id, err);
      }
      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    setIsAutoAdjustingAll(false);
    onToast('success', `Đã áp dụng màu "${label}" (${count} ảnh)`);
  };

  // 1. Batch Quantity
  const handleApplyQuantityToAll = (qtyToApply?: number) => {
    if (photos.length === 0) {
      onToast('error', 'Chưa có ảnh để đổi số lượng');
      return;
    }
    const targetQty = Math.max(1, qtyToApply !== undefined ? qtyToApply : batchQuantity);
    photos.forEach((photo) => {
      onUpdatePhoto(photo.id, { qty: targetQty });
    });
    onToast('success', `Đã đặt ${targetQty} bản cho tất cả ảnh`);
  };

  const handleAdjustQuantityAll = (delta: number) => {
    if (photos.length === 0) return;
    photos.forEach((photo) => {
      const newQty = Math.max(1, (photo.qty || 1) + delta);
      onUpdatePhoto(photo.id, { qty: newQty });
    });
    onToast('info', `Đã ${delta > 0 ? 'tăng' : 'giảm'} 1 bản in`);
  };

  // 3. Batch Enhance All (Smart Sharpen, Contrast & Super-Resolution Upscale)
  const handleEnhanceAll = async () => {
    if (photos.length === 0 || isEnhancingAll) {
      if (photos.length === 0) onToast('error', 'Chưa có ảnh để làm nét');
      return;
    }
    setIsEnhancingAll(true);
    if (photos.length > 10) {
      onToast('info', `Đang làm nét ${photos.length} ảnh...`);
    }

    const sharpenVal = (enhanceStrength / 100) * 0.85 + 0.1;
    const contrastVal = (enhanceStrength / 100) * 0.16 + 0.04;

    let successCount = 0;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
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

        const factor = autoUpscaleDpi
          ? getRecommendedUpscaleFactor(rawW, rawH, photo.targetWidth, photo.targetHeight)
          : 1;

        const result = await enhanceImageQuality(sourceForEnhancing, {
          sharpenAmount: sharpenVal,
          contrastAmount: contrastVal,
          brightnessAmount: 0.04,
          vibranceAmount: 0.18,
          upscaleFactor: factor,
        });

        const previewSrc = await createOptimizedPreview(result.enhancedSrc, 420, 0.82);

        // Scale crop coordinates proportionally
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
        successCount++;
      } catch (e) {
        console.error('Enhance batch error for photo', photo.id, e);
      }
      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setIsEnhancingAll(false);
    onToast('success', `Đã làm nét & tăng DPI ${successCount} ảnh`);
  };

  // 4. Batch Revert All to Raw Original
  const handleRevertAllToOriginal = async () => {
    if (photos.length === 0) return;
    setIsRevertingAll(true);
    let revertCount = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.isEnhanced && photo.rawOriginalSrc) {
        let origW = photo.rawOriginalWidth || photo.imgWidth;
        let origH = photo.rawOriginalHeight || photo.imgHeight;
        let origSrc = photo.rawOriginalSrc;
        if ((origW > origH) !== (photo.imgWidth > photo.imgHeight)) {
          origSrc = await rotateImageBase64(photo.rawOriginalSrc, 90);
          origW = photo.rawOriginalHeight || photo.imgWidth;
          origH = photo.rawOriginalWidth || photo.imgHeight;
        }
        const origCrop = photo.rawOriginalCrop || {
          cropX: photo.cropX,
          cropY: photo.cropY,
          cropW: photo.cropW,
          cropH: photo.cropH,
        };
        const previewSrc = await createOptimizedPreview(origSrc, 420, 0.82);
        onUpdatePhoto(photo.id, {
          originalSrc: origSrc,
          previewSrc: previewSrc,
          unadjustedSrc: origSrc,
          isEnhanced: false,
          upscaleFactor: 1,
          imgWidth: origW,
          imgHeight: origH,
          cropX: origCrop.cropX,
          cropY: origCrop.cropY,
          cropW: origCrop.cropW,
          cropH: origCrop.cropH,
        });
        revertCount++;
      }
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setIsRevertingAll(false);
    if (revertCount > 0) {
      onToast('info', `Đã khôi phục ${revertCount} ảnh về gốc`);
    } else {
      onToast('info', 'Tất cả ảnh đang ở bản gốc');
    }
  };

  // 5. Batch Rotate All 90deg
  const handleRotateAll = async () => {
    if (photos.length === 0) {
      onToast('error', 'Chưa có ảnh để xoay');
      return;
    }
    if (photos.length > 20) {
      onToast('info', 'Đang xoay ảnh 90°...');
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
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

      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onToast('success', 'Đã xoay tất cả ảnh 90°');
  };

  const enhancedCount = photos.filter((p) => p.isEnhanced).length;

  return (
    <aside
      ref={sidebarRef}
      id="batch-tools-sidebar"
      className={`no-print transition-all duration-300 flex flex-col bg-slate-50/80 border-r border-slate-200/90 h-full overflow-hidden z-20 ${
        isCollapsed ? 'w-11 shrink-0' : 'w-76 shrink-0'
      }`}
    >
      {/* Header */}
      {isCollapsed ? (
        /* Header khi thu gọn: Nút mở rộng trên đỉnh */
        <div className="p-2 border-b border-slate-200/80 bg-white flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
            title="Bấm để mở rộng Thao tác hàng loạt"
          >
            <ChevronsRight className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      ) : (
        /* Header khi mở rộng */
        <div className="p-3 border-b border-slate-200/80 bg-white sticky top-0 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide truncate">
              Thao tác hàng loạt
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {photos.length > 0 && (
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-bold">
                {photos.length} ảnh
              </span>
            )}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Thu gọn bảng Thao tác hàng loạt"
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
          className="flex-1 flex flex-col items-center justify-between py-6 cursor-pointer hover:bg-blue-50/40 transition group select-none"
          title={`Bấm để mở rộng Thao tác hàng loạt (${photos.length} ảnh)`}
        >
          <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700 group-hover:scale-110 transition shadow-2xs">
            <Wand2 className="w-4 h-4" />
          </div>

          {/* Dải chữ chạy dọc theo thân cột */}
          <div
            style={{ writingMode: 'vertical-rl' }}
            className="text-[11px] font-extrabold uppercase tracking-widest text-slate-700 group-hover:text-blue-700 flex items-center gap-2 py-4 transition"
          >
            <span>Thao tác hàng loạt</span>
            {photos.length > 0 && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded-full shadow-2xs">
                {photos.length} ảnh
              </span>
            )}
          </div>

          <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-blue-600">
            Bố cục • Công cụ
          </span>
        </div>
      ) : (
        /* Scrollable Container */
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
          {/* CỤM 1: CÀI ĐẶT BỐ CỤC & LỀ IN TRANG (Được hoán đổi từ SettingsSidebar sang) */}
          <PageLayoutSettings
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            pageCount={pageCount}
            totalPhotos={photos.length}
            onClonePage1AsBackside={onClonePage1AsBackside}
            onResetFreeformPositions={onResetFreeformPositions}
            onToast={onToast}
          />

          {/* CỤM VIỀN HUY HIỆU BLUR & MÀU ĐƠN SẮC HÀNG LOẠT */}
          {photos.some((p) => p.badgeMode) && (
            <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200/80 shadow-sm hover:shadow-md space-y-2 transition-all duration-200 hover:border-rose-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-rose-950 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px] uppercase tracking-wide">VIỀN PHÔI HUY HIỆU</span>
                </div>
                <span className="text-[10px] text-rose-700 font-bold bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded">
                  {photos.filter((p) => p.badgeMode).length} phôi
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    photos.forEach((p) => {
                      if (p.badgeMode) onUpdatePhoto(p.id, { badgeBleedMode: 'blur_expand' });
                    });
                    onToast('success', 'Đã bật viền mờ Blur cho tất cả phôi huy hiệu');
                  }}
                  className="py-1.5 px-2 bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300 hover:border-rose-600 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 group"
                >
                  <Sparkles className="w-3 h-3 text-rose-600 group-hover:text-white transition-colors" />
                  <span>Nền mờ Blur</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    photos.forEach((p) => {
                      if (p.badgeMode) onUpdatePhoto(p.id, { badgeBleedMode: 'solid' });
                    });
                    onToast('info', 'Đã chuyển tất cả phôi huy hiệu sang Màu đơn sắc');
                  }}
                  className="py-1.5 px-2 bg-white hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                >
                  <span>Màu đơn sắc</span>
                </button>
              </div>
            </div>
          )}

          {/* CỤM 2: XOAY & ĐỊNH HƯỚNG (Pastel Indigo) - ĐƯỢC ĐƯA LÊN TRÊN SỐ LƯỢNG */}
          <div className="bg-indigo-50/70 rounded-xl p-3.5 border border-indigo-200/90 shadow-sm hover:shadow-md space-y-2 transition-all duration-200 hover:border-indigo-300">
            <button
              type="button"
              id="btn-rotate-all"
              onClick={handleRotateAll}
              disabled={photos.length === 0}
              className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold transition active:scale-95 border border-indigo-300 cursor-pointer shadow-2xs"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Xoay tất cả ảnh 90°</span>
            </button>
          </div>

          {/* CỤM 3: NHÂN BẢN HÀNG LOẠT (Pastel Emerald) */}
          <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200/90 shadow-sm hover:shadow-md space-y-2.5 transition-all duration-200 hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] uppercase tracking-wide">NHÂN BẢN HÀNG LOẠT</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.5 rounded">
                Bản sao
              </span>
            </div>

            {/* Stepper + Input + Apply Button */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-white rounded-lg p-0.5 border border-emerald-300">
                <button
                  type="button"
                  onClick={() => setBatchQuantity((q) => Math.max(1, q - 1))}
                  className="w-6 h-6 flex items-center justify-center rounded bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition text-xs"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 text-center text-xs font-bold text-emerald-950 bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setBatchQuantity((q) => q + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition text-xs"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                id="btn-apply-qty-all"
                onClick={() => handleApplyQuantityToAll()}
                disabled={photos.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 hover:border-emerald-600 disabled:opacity-50 px-2.5 py-2 rounded-lg text-xs font-bold shadow-2xs transition active:scale-95 whitespace-nowrap cursor-pointer group"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-700 group-hover:text-white transition-colors" />
                <span>Áp dụng tất cả</span>
              </button>
            </div>

            {/* Incremental Adjustment Buttons (+1 all / -1 all) */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleAdjustQuantityAll(-1)}
                disabled={photos.length === 0}
                className="flex items-center justify-center gap-1 bg-white hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-800 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer"
              >
                <span>-1 tất cả ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdjustQuantityAll(1)}
                disabled={photos.length === 0}
                className="flex items-center justify-center gap-1 bg-white hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-800 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer"
              >
                <span>+1 tất cả ảnh</span>
              </button>
            </div>
          </div>

          {/* CỤM 4: TỰ ĐỘNG CÂN CHỈNH MÀU SẮC & ÁNH SÁNG (Pastel Purple) */}
          <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-200/90 shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-auto-adjust-all"
                onClick={handleAutoAdjustAll}
                disabled={isAutoAdjustingAll || photos.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-100 hover:bg-purple-600 text-purple-900 hover:text-white border border-purple-300 hover:border-purple-600 disabled:opacity-50 px-3 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer group"
              >
                {isAutoAdjustingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600 group-hover:text-white" />
                    <span>Đang cân chỉnh {photos.length} ảnh...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                    <span>Cân chỉnh màu Tất Cả</span>
                  </>
                )}
              </button>

              {/* Nút icon xoay: Khôi phục màu gốc tất cả */}
              <button
                type="button"
                id="btn-revert-colors-all"
                onClick={handleRevertColorsAll}
                disabled={isRevertingColorsAll || photos.length === 0}
                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-purple-100 disabled:opacity-40 disabled:hover:bg-white text-purple-700 rounded-xl border border-purple-200 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                title="Khôi phục màu gốc tất cả"
              >
                {isRevertingColorsAll ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                )}
              </button>
            </div>

            {/* Quick 1-Click Batch Presets for Print Quality */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => handleApplyPresetColorsAll('studio_print')}
                disabled={isAutoAdjustingAll || photos.length === 0}
                className="px-1.5 py-1.5 rounded-lg bg-white hover:bg-purple-100 border border-purple-200 text-purple-900 text-[10px] font-bold transition shadow-2xs text-center cursor-pointer disabled:opacity-50"
                title="Bù sáng in xưởng hàng loạt: Sáng hơn + sâu bóng + tươi da"
              >
                Bù sáng in
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetColorsAll('portrait')}
                disabled={isAutoAdjustingAll || photos.length === 0}
                className="px-1.5 py-1.5 rounded-lg bg-white hover:bg-rose-100 border border-rose-200 text-rose-900 text-[10px] font-bold transition shadow-2xs text-center cursor-pointer disabled:opacity-50"
                title="Tông da hồng hào hàng loạt: Da mặt sáng tươi kỷ yếu / thần tượng"
              >
                Tông da tươi
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetColorsAll('fix_red')}
                disabled={isAutoAdjustingAll || photos.length === 0}
                className="px-1.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-bold transition shadow-2xs text-center cursor-pointer disabled:opacity-50"
                title="Fix đỏ hàng loạt: Khử ám đỏ/hồng cho máy in, cân bằng sắc da và bù sáng in chuẩn xác"
              >
                Fix đỏ
              </button>
            </div>
          </div>

          {/* CỤM 5: CHẤT LƯỢNG & ĐỘ NÉT (LÀM NÉT & PHỤC HỒI) (Pastel Amber) */}
          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/90 shadow-sm hover:shadow-md space-y-2.5 transition-all duration-200 hover:border-amber-300">
            {/* Main Enhance Button + Revert Icon Button on 1 row */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-enhance-all-hd"
                onClick={handleEnhanceAll}
                disabled={isEnhancingAll || photos.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-300 hover:border-amber-500 disabled:opacity-50 px-3 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer group"
              >
                {isEnhancingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 group-hover:text-white" />
                    <span>Đang tăng chất lượng {photos.length} ảnh...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
                    <span>Tăng chất lượng Tất Cả</span>
                  </>
                )}
              </button>

              {/* Nút icon xoay: Khôi phục ảnh gốc tất cả */}
              <button
                type="button"
                id="btn-revert-all-original"
                onClick={handleRevertAllToOriginal}
                disabled={isRevertingAll || photos.length === 0 || enhancedCount === 0}
                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-white text-amber-900 border border-amber-200 rounded-xl transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                title={enhancedCount > 0 ? `Khôi phục ảnh gốc (${enhancedCount} ảnh đã làm nét)` : 'Khôi phục ảnh gốc tất cả'}
              >
                {isRevertingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                )}
              </button>
            </div>

            {/* Sharpness & Quality Intensity Slider Box */}
            <div className="bg-white border border-amber-200 rounded-lg p-2.5 space-y-2 shadow-xs">
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 bg-amber-100/60 p-2 rounded-lg cursor-pointer select-none border border-amber-200/80">
                <input
                  type="checkbox"
                  checked={autoUpscaleDpi}
                  onChange={(e) => setAutoUpscaleDpi(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="text-amber-950 font-bold">Nâng DPI x2/x4 AI</strong> cho ảnh mờ
                </span>
              </label>

              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 pt-0.5">
                <span className="flex items-center gap-1 text-amber-900 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mức độ làm nét:</span>
                </span>
                <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                  {enhanceStrength}%
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={enhanceStrength}
                onChange={(e) => setEnhanceStrength(Number(e.target.value))}
                className="w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />

              <div className="flex justify-between text-[9px] text-amber-800/80 font-bold px-0.5">
                <span>Nhẹ (10%)</span>
                <span>Chuẩn (50%)</span>
                <span>Cực nét (100%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
