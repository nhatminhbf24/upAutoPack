import React, { useState } from 'react';
import { Maximize2, Ruler, Loader2, Check } from 'lucide-react';
import { PhotoItem, SizePreset, DEFAULT_SIZE_PRESETS, OrientationMode } from '../types';
import { formatPhotoToPreset, getShortPresetLabel } from '../utils/imageUtils';

export interface SizePresetSelectorProps {
  activePresetId: string;
  onChangeActivePresetId: (id: string) => void;
  photos: PhotoItem[];
  onUpdatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  onBatchUpdatePhotos?: (photos: PhotoItem[]) => void;
  orientationMode?: OrientationMode;
  onChangeOrientationMode?: (mode: OrientationMode) => void;
  autoMatchOrientation?: boolean;
  customPresets?: SizePreset[];
  onOpenCustomSizeModal?: () => void;
  smartCrop: boolean;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const SizePresetSelector: React.FC<SizePresetSelectorProps> = ({
  activePresetId,
  onChangeActivePresetId,
  photos,
  onUpdatePhoto,
  onBatchUpdatePhotos,
  orientationMode,
  onChangeOrientationMode,
  autoMatchOrientation,
  customPresets = [],
  onOpenCustomSizeModal,
  smartCrop,
  onToast,
}) => {
  const [isApplyingSizeAll, setIsApplyingSizeAll] = useState<boolean>(false);

  const allPresets = [...customPresets, ...DEFAULT_SIZE_PRESETS];
  const defaultCategories = Array.from(new Set(DEFAULT_SIZE_PRESETS.map((p) => p.category)));

  // 1. Áp dụng kích cỡ & hướng in cho tất cả ảnh
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

    // Điều chỉnh hướng nếu ép buộc
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

  return (
    <div className="bg-sky-50/80 rounded-xl p-3 border border-sky-200/90 shadow-sm hover:shadow-md space-y-2 transition-all duration-200 hover:border-sky-300">
      {/* Dòng 1 : Text: "KÍCH THƯỚC" - nút: "Tùy chỉnh" */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sky-950 font-extrabold">
          <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-800">KÍCH THƯỚC</span>
        </div>
        {onOpenCustomSizeModal && (
          <button
            type="button"
            onClick={onOpenCustomSizeModal}
            className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-white hover:bg-sky-100 border border-sky-300/80 px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer shadow-2xs"
            title="Nhập kích thước in tùy chỉnh"
          >
            <Ruler className="w-3 h-3 text-sky-600" />
            <span>Tùy chỉnh</span>
          </button>
        )}
      </div>

      {/* Dòng 2: chọn danh sách kích thước */}
      <select
        value={activePresetId}
        onChange={(e) => {
          if (e.target.value === '__custom_new__') {
            if (onOpenCustomSizeModal) onOpenCustomSizeModal();
            return;
          }
          onChangeActivePresetId(e.target.value);
        }}
        className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition cursor-pointer shadow-2xs"
      >
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

      {/* Dòng 3: nút "Áp dụng cho tất cả" */}
      <button
        type="button"
        id="btn-apply-size-all"
        onClick={() => handleApplyPresetToAll()}
        disabled={photos.length === 0 || isApplyingSizeAll}
        className="group w-full flex items-center justify-center gap-1.5 bg-blue-100 hover:bg-blue-600 disabled:opacity-50 text-blue-800 hover:text-white border border-blue-300 hover:border-blue-600 px-3 py-2 rounded-xl text-xs font-bold shadow-2xs hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
      >
        {isApplyingSizeAll ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang đồng bộ kích thước & xoay...</span>
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />
            <span>Áp dụng cho tất cả</span>
          </>
        )}
      </button>

      {/* 3 nút radio bên dưới */}
      <div className="space-y-1 pt-0.5">
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
  );
};
