import React, { useState } from 'react';
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
  Ruler,
  Plus,
  Scissors,
} from 'lucide-react';
import { PhotoItem, DEFAULT_SIZE_PRESETS, DEFAULT_ADJUSTMENTS, SizePreset, OrientationMode } from '../types';
import { rotateImageBase64, calculateCrop, createOptimizedPreview, getOrientedDimensions, formatPhotoToPreset, getShortPresetLabel } from '../utils/imageUtils';
import { enhanceImageQuality, getRecommendedUpscaleFactor } from '../utils/imageEnhancer';
import { calculateAutoAdjustments, applyAdjustmentsToImage } from '../utils/imageAdjustmentEngine';

interface BatchToolsSidebarProps {
  photos: PhotoItem[];
  onUpdatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  onBatchUpdatePhotos?: (photos: PhotoItem[]) => void;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  smartCrop: boolean;
  activePresetId: string;
  onChangeActivePresetId: (id: string) => void;
  orientationMode?: OrientationMode;
  onChangeOrientationMode?: (mode: OrientationMode) => void;
  autoMatchOrientation?: boolean;
  onToggleAutoMatchOrientation?: (enabled: boolean) => void;
  customPresets?: SizePreset[];
  onOpenCustomSizeModal?: () => void;
  onOpenPngSplitter?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const BatchToolsSidebar: React.FC<BatchToolsSidebarProps> = ({
  photos,
  onUpdatePhoto,
  onBatchUpdatePhotos,
  onToast,
  smartCrop,
  activePresetId,
  onChangeActivePresetId,
  orientationMode,
  onChangeOrientationMode,
  autoMatchOrientation,
  onToggleAutoMatchOrientation,
  customPresets = [],
  onOpenCustomSizeModal,
  onOpenPngSplitter,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [enhanceStrength, setEnhanceStrength] = useState<number>(50);
  const [isApplyingSizeAll, setIsApplyingSizeAll] = useState<boolean>(false);
  const [isEnhancingAll, setIsEnhancingAll] = useState<boolean>(false);
  const [isRevertingAll, setIsRevertingAll] = useState<boolean>(false);
  const [isAutoAdjustingAll, setIsAutoAdjustingAll] = useState<boolean>(false);
  const [isRevertingColorsAll, setIsRevertingColorsAll] = useState<boolean>(false);
  const [autoUpscaleDpi, setAutoUpscaleDpi] = useState<boolean>(true);

  const allPresets = [...customPresets, ...DEFAULT_SIZE_PRESETS];
  // Group presets by category
  const defaultCategories = Array.from(new Set(DEFAULT_SIZE_PRESETS.map((p) => p.category)));

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
        const sourceForAdjust = photo.rawOriginalSrc || photo.originalSrc;
        const autoAdj = await calculateAutoAdjustments(sourceForAdjust);
        const adjustedSrc = await applyAdjustmentsToImage(sourceForAdjust, autoAdj);
        const previewSrc = await createOptimizedPreview(adjustedSrc, 800, 0.85);

        onUpdatePhoto(photo.id, {
          originalSrc: adjustedSrc,
          previewSrc: previewSrc,
          rawOriginalSrc: sourceForAdjust,
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
      const originalSource = photo.rawOriginalSrc || photo.originalSrc;
      let previewSrc = photo.previewSrc;
      if (photo.rawOriginalSrc) {
        previewSrc = await createOptimizedPreview(originalSource, 800, 0.85);
      }
      onUpdatePhoto(photo.id, {
        originalSrc: originalSource,
        previewSrc: previewSrc,
        adjustments: { ...DEFAULT_ADJUSTMENTS },
      });
      count++;
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setIsRevertingColorsAll(false);
    onToast('success', `Đã đặt lại màu cho ${count} ảnh`);
  };

  // Batch 1-Click Print Ready Preset Colors
  const handleApplyPresetColorsAll = async (presetType: 'studio_print' | 'portrait' | 'crisp') => {
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
        : { ...DEFAULT_ADJUSTMENTS, contrast: 12, highlights: 6, whites: 8, blacks: -8, vibrance: 12, saturation: 4 };

    const label =
      presetType === 'studio_print'
        ? 'Bù sáng in xưởng'
        : presetType === 'portrait'
        ? 'Tông da hồng hào'
        : 'Trong trẻo sắc nét';

    if (photos.length > 20) {
      onToast('info', `Đang áp dụng màu "${label}"...`);
    }

    let count = 0;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const sourceForAdjust = photo.rawOriginalSrc || photo.originalSrc;
        const adjustedSrc = await applyAdjustmentsToImage(sourceForAdjust, presetAdj);
        const previewSrc = await createOptimizedPreview(adjustedSrc, 800, 0.85);

        onUpdatePhoto(photo.id, {
          originalSrc: adjustedSrc,
          previewSrc: previewSrc,
          rawOriginalSrc: sourceForAdjust,
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

  // 1. Batch Size Preset Change & Auto-Rotate
  const handleApplyPresetToAll = async (
    presetOverride?: SizePreset,
    forceOrientation?: 'auto' | 'portrait' | 'landscape',
    modeOverride?: OrientationMode
  ) => {
    if (photos.length === 0 || isApplyingSizeAll) {
      if (photos.length === 0) onToast('error', 'Chưa có ảnh để áp dụng cỡ');
      return;
    }
    const preset = presetOverride || allPresets.find((p) => p.id === activePresetId) || DEFAULT_SIZE_PRESETS[0];
    if (!preset) return;

    setIsApplyingSizeAll(true);

    const currentMode: OrientationMode =
      modeOverride ||
      orientationMode ||
      (autoMatchOrientation ? 'auto_match' : 'rotate_to_fit');

    // Adjust target preset orientation if explicitly forced
    let effectivePreset: SizePreset = { ...preset };
    if (forceOrientation === 'portrait') {
      effectivePreset = {
        ...preset,
        width: Math.min(preset.width, preset.height),
        height: Math.max(preset.width, preset.height),
      };
    } else if (forceOrientation === 'landscape') {
      effectivePreset = {
        ...preset,
        width: Math.max(preset.width, preset.height),
        height: Math.min(preset.width, preset.height),
      };
    }

    if (photos.length > 30) {
      onToast('info', `Đang xử lý ${photos.length} ảnh...`);
    }

    let rotatedCount = 0;
    let portraitCount = 0;
    let landscapeCount = 0;
    const updatedPhotos: PhotoItem[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const res = await formatPhotoToPreset(
          photo,
          effectivePreset,
          currentMode,
          smartCrop
        );
        if (res.didRotate) {
          rotatedCount++;
        }
        if (res.photo.targetHeight >= res.photo.targetWidth) {
          portraitCount++;
        } else {
          landscapeCount++;
        }
        updatedPhotos.push(res.photo);
      } catch (err) {
        console.error('Error formatting photo to preset:', err);
        updatedPhotos.push(photo);
      }

      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (onBatchUpdatePhotos) {
      onBatchUpdatePhotos(updatedPhotos);
    } else {
      updatedPhotos.forEach((p) => {
        onUpdatePhoto(p.id, p);
      });
    }

    setIsApplyingSizeAll(false);

    const shortLabel = getShortPresetLabel(effectivePreset.label);
    onToast('success', `Đã đổi ${photos.length} ảnh sang khổ ${shortLabel}`);
  };

  const handleSelectOrientationMode = async (newMode: OrientationMode) => {
    if (onChangeOrientationMode) {
      onChangeOrientationMode(newMode);
    }
    if (photos.length > 0) {
      await handleApplyPresetToAll(undefined, undefined, newMode);
    }
  };

  // 2. Batch Quantity
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
        const sourceForEnhancing = photo.rawOriginalSrc || photo.originalSrc;
        const rawW = photo.rawOriginalWidth || photo.imgWidth;
        const rawH = photo.rawOriginalHeight || photo.imgHeight;
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

        const previewSrc = await createOptimizedPreview(result.enhancedSrc, 800, 0.85);

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
        const origW = photo.rawOriginalWidth || photo.imgWidth;
        const origH = photo.rawOriginalHeight || photo.imgHeight;
        const origCrop = photo.rawOriginalCrop || {
          cropX: photo.cropX,
          cropY: photo.cropY,
          cropW: photo.cropW,
          cropH: photo.cropH,
        };
        const previewSrc = await createOptimizedPreview(photo.rawOriginalSrc, 800, 0.85);
        onUpdatePhoto(photo.id, {
          originalSrc: photo.rawOriginalSrc,
          previewSrc: previewSrc,
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
      const previewSrc = await createOptimizedPreview(rotatedSrc, 800, 0.85);
      const newWidth = photo.imgHeight;
      const newHeight = photo.imgWidth;
      const crop = calculateCrop(newWidth, newHeight, photo.targetWidth, photo.targetHeight, smartCrop);

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

      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onToast('success', 'Đã xoay tất cả ảnh 90°');
  };

  const enhancedCount = photos.filter((p) => p.isEnhanced).length;

  return (
    <aside
      id="batch-tools-sidebar"
      className={`no-print transition-all duration-300 flex flex-col bg-slate-50/80 border-r border-slate-200/90 h-full overflow-hidden z-20 ${
        isCollapsed ? 'w-12 shrink-0' : 'w-76 shrink-0'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200/80 bg-white sticky top-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide truncate">
              Thao tác hàng loạt
            </h2>
          )}
        </div>
        {!isCollapsed && photos.length > 0 && (
          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-bold">
            {photos.length} ảnh
          </span>
        )}
      </div>

      {isCollapsed ? (
        <div className="flex-1 flex flex-col items-center py-4 gap-3 text-slate-400">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Mở rộng bảng Thao tác hàng loạt"
          >
            <Wand2 className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      ) : (
        /* Scrollable Container */
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
          {/* CỤM 1: ĐỒNG BỘ KÍCH THƯỚC (Pastel Sky) */}
          <div className="bg-sky-50/80 rounded-xl p-3.5 border border-sky-200/90 shadow-2xs space-y-2.5 transition hover:border-sky-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-950 font-bold">
                <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-[11px] uppercase tracking-wide">Đồng bộ kích thước:</span>
              </div>
              <span className="text-[10px] text-sky-700 font-semibold bg-sky-100/80 border border-sky-200 px-1.5 py-0.5 rounded">
                Khổ in
              </span>
            </div>

            <div className="space-y-1.5">
              <select
                value={activePresetId}
                onChange={(e) => {
                  if (e.target.value === '__custom_new__') {
                    if (onOpenCustomSizeModal) onOpenCustomSizeModal();
                    return;
                  }
                  onChangeActivePresetId(e.target.value);
                }}
                className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition"
              >
                <option value="__custom_new__" className="font-bold text-pink-600">
                  ➕ Nhập kích thước tùy chỉnh...
                </option>

                {customPresets.length > 0 && (
                  <optgroup label="⭐ Kích thước tùy chỉnh của bạn">
                    {customPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                )}

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
                  onClick={onOpenCustomSizeModal}
                  className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5 text-pink-600" />
                  <span>+ Nhập kích thước tùy chỉnh</span>
                </button>
              )}

              {/* Vibrant Blue/Indigo Action Button - ĐƯA LÊN TRÊN ĐỊNH HƯỚNG KHUÔN */}
              <button
                type="button"
                id="btn-apply-size-all"
                onClick={() => handleApplyPresetToAll()}
                disabled={photos.length === 0 || isApplyingSizeAll}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition active:scale-95 cursor-pointer mt-1"
              >
                {isApplyingSizeAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Đang đồng bộ kích thước & xoay...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Áp dụng kích thước cho tất cả</span>
                  </>
                )}
              </button>

              {/* Tùy chọn định hướng khuôn in */}
              <div className="space-y-1 pt-1">
                {/* 1. Ép đúng khuôn - Tự xoay ảnh */}
                  <label
                    onClick={() => handleSelectOrientationMode('rotate_to_fit')}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition cursor-pointer select-none text-[11px] font-semibold ${
                      (orientationMode === 'rotate_to_fit' || (!orientationMode && !autoMatchOrientation))
                        ? 'bg-blue-50/95 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-400/40'
                        : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orientationMode"
                      checked={orientationMode === 'rotate_to_fit' || (!orientationMode && !autoMatchOrientation)}
                      onChange={() => handleSelectOrientationMode('rotate_to_fit')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="truncate">Ép đúng khuôn - Tự xoay ảnh</span>
                  </label>

                  {/* 2. Ép đúng khuôn - Không xoay ảnh */}
                  <label
                    onClick={() => handleSelectOrientationMode('fixed_crop')}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition cursor-pointer select-none text-[11px] font-semibold ${
                      orientationMode === 'fixed_crop'
                        ? 'bg-blue-50/95 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-400/40'
                        : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orientationMode"
                      checked={orientationMode === 'fixed_crop'}
                      onChange={() => handleSelectOrientationMode('fixed_crop')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="truncate">Ép đúng khuôn - Không xoay ảnh</span>
                  </label>

                  {/* 3. Xoay khuôn theo chiều ảnh */}
                  <label
                    onClick={() => handleSelectOrientationMode('auto_match')}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition cursor-pointer select-none text-[11px] font-semibold ${
                      (orientationMode === 'auto_match' || (!orientationMode && autoMatchOrientation))
                        ? 'bg-blue-50/95 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-400/40'
                        : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orientationMode"
                      checked={orientationMode === 'auto_match' || (!orientationMode && autoMatchOrientation)}
                      onChange={() => handleSelectOrientationMode('auto_match')}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="truncate">Xoay khuôn theo chiều ảnh</span>
                  </label>
                </div>
              </div>
            </div>

          {/* CỤM 2: XOAY & ĐỊNH HƯỚNG (Pastel Indigo) - ĐƯỢC ĐƯA LÊN TRÊN SỐ LƯỢNG */}
          <div className="bg-indigo-50/70 rounded-xl p-3.5 border border-indigo-200/90 shadow-2xs space-y-2 transition hover:border-indigo-300">
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
          <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200/90 shadow-2xs space-y-2.5 transition hover:border-emerald-300">
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
                className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2.5 py-2 rounded-lg text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
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
          <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-200/90 shadow-2xs transition hover:border-purple-300">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-auto-adjust-all"
                onClick={handleAutoAdjustAll}
                disabled={isAutoAdjustingAll || photos.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 disabled:opacity-50 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-purple-500/20 transition active:scale-95 cursor-pointer"
              >
                {isAutoAdjustingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Đang cân chỉnh {photos.length} ảnh...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-purple-200" />
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
                onClick={() => handleApplyPresetColorsAll('crisp')}
                disabled={isAutoAdjustingAll || photos.length === 0}
                className="px-1.5 py-1.5 rounded-lg bg-white hover:bg-sky-100 border border-sky-200 text-sky-900 text-[10px] font-bold transition shadow-2xs text-center cursor-pointer disabled:opacity-50"
                title="Trong trẻo hàng loạt: Khử đục, tương phản trong suốt"
              >
                Trong trẻo
              </button>
            </div>
          </div>

          {/* CỤM 5: CHẤT LƯỢNG & ĐỘ NÉT (LÀM NÉT & PHỤC HỒI) (Pastel Amber) */}
          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/90 shadow-2xs space-y-2.5 transition hover:border-amber-300">
            {/* Main Enhance Button + Revert Icon Button on 1 row */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-enhance-all-hd"
                onClick={handleEnhanceAll}
                disabled={isEnhancingAll || photos.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 transition active:scale-95 cursor-pointer"
              >
                {isEnhancingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Đang tăng chất lượng {photos.length} ảnh...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
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
            <div className="bg-white border border-amber-200 rounded-lg p-2.5 space-y-2">
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
