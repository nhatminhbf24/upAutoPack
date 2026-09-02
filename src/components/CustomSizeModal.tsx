import React, { useState, useEffect } from 'react';
import {
  X,
  Ruler,
  Check,
  Plus,
  Trash2,
  Square,
  Circle,
  Heart,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';
import { SizePreset, ShapeType, PhotoItem } from '../types';

interface CustomSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPhoto?: PhotoItem | null;
  customPresets: SizePreset[];
  onSaveCustomPreset: (preset: SizePreset) => void;
  onRemoveCustomPreset: (id: string) => void;
  onApplyPresetToPhoto?: (photoId: string, preset: SizePreset) => void;
  onApplyPresetToAll?: (preset: SizePreset) => void;
}

export const CustomSizeModal: React.FC<CustomSizeModalProps> = ({
  isOpen,
  onClose,
  targetPhoto,
  customPresets,
  onSaveCustomPreset,
  onRemoveCustomPreset,
  onApplyPresetToPhoto,
  onApplyPresetToAll,
}) => {
  if (!isOpen) return null;

  // Unit: 'cm' or 'mm'
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm');

  // Values in currently selected unit
  const [widthInput, setWidthInput] = useState<string>(
    targetPhoto
      ? unit === 'cm'
        ? (targetPhoto.targetWidth / 10).toFixed(1).replace('.0', '')
        : String(targetPhoto.targetWidth)
      : '4.7'
  );
  const [heightInput, setHeightInput] = useState<string>(
    targetPhoto
      ? unit === 'cm'
        ? (targetPhoto.targetHeight / 10).toFixed(1).replace('.0', '')
        : String(targetPhoto.targetHeight)
      : '6.6'
  );
  const [shape, setShape] = useState<ShapeType>(targetPhoto ? targetPhoto.shape : 'rect');
  const [labelInput, setLabelInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');

  // Convert inputs to mm numbers
  const numWidth = parseFloat(widthInput.replace(',', '.')) || 0;
  const numHeight = parseFloat(heightInput.replace(',', '.')) || 0;

  const widthMm = unit === 'cm' ? Math.round(numWidth * 10) : Math.round(numWidth);
  const heightMm = unit === 'cm' ? Math.round(numHeight * 10) : Math.round(numHeight);

  // Sync height if circle or heart
  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    if (shape === 'circle' || shape === 'heart') {
      setHeightInput(val);
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    if (shape === 'circle' || shape === 'heart') {
      setWidthInput(val);
    }
  };

  const handleShapeChange = (newShape: ShapeType) => {
    setShape(newShape);
    if (newShape === 'circle' || newShape === 'heart') {
      setHeightInput(widthInput);
    }
  };

  const handleUnitToggle = (newUnit: 'cm' | 'mm') => {
    if (newUnit === unit) return;
    if (newUnit === 'mm') {
      // from cm to mm
      const wMm = numWidth * 10;
      const hMm = numHeight * 10;
      setWidthInput(String(Math.round(wMm)));
      setHeightInput(String(Math.round(hMm)));
    } else {
      // from mm to cm
      const wCm = (numWidth / 10).toFixed(1).replace('.0', '');
      const hCm = (numHeight / 10).toFixed(1).replace('.0', '');
      setWidthInput(wCm);
      setHeightInput(hCm);
    }
    setUnit(newUnit);
  };

  const getEffectiveLabel = () => {
    if (labelInput.trim()) return labelInput.trim();
    const wCm = (widthMm / 10).toFixed(1).replace('.0', '');
    const hCm = (heightMm / 10).toFixed(1).replace('.0', '');
    if (shape === 'circle') return `Hình tròn ${wCm} cm (${wCm} x ${hCm} cm)`;
    if (shape === 'heart') return `Trái tim ${wCm} x ${hCm} cm`;
    if (widthMm === heightMm) return `Vuông ${wCm} x ${hCm} cm`;
    return `Tùy chỉnh ${wCm} x ${hCm} cm`;
  };

  const createPresetObject = (): SizePreset => {
    const validW = Math.max(10, Math.min(297, widthMm || 50));
    const validH = Math.max(10, Math.min(420, heightMm || 50));
    const id = `custom_${validW}x${validH}_${shape}_${Date.now().toString(36)}`;
    return {
      id,
      label: getEffectiveLabel(),
      category: '⭐ Kích thước tùy chỉnh',
      width: validW,
      height: validH,
      shape,
      isCustom: true,
    };
  };

  // Actions
  const handleSaveToPresets = () => {
    if (widthMm < 5 || heightMm < 5) return;
    const preset = createPresetObject();
    onSaveCustomPreset(preset);
    setActiveTab('saved');
  };

  const handleApplySingle = (presetToApply?: SizePreset) => {
    const preset = presetToApply || createPresetObject();
    if (!presetToApply) {
      onSaveCustomPreset(preset);
    }
    if (targetPhoto && onApplyPresetToPhoto) {
      onApplyPresetToPhoto(targetPhoto.id, preset);
    }
    onClose();
  };

  const handleApplyAll = (presetToApply?: SizePreset) => {
    const preset = presetToApply || createPresetObject();
    if (!presetToApply) {
      onSaveCustomPreset(preset);
    }
    if (onApplyPresetToAll) {
      onApplyPresetToAll(preset);
    }
    onClose();
  };

  // Preview Aspect Ratio calculation
  const maxBoxSize = 130;
  const safeW = Math.max(1, widthMm);
  const safeH = Math.max(1, heightMm);
  const aspect = safeW / safeH;
  let boxW = maxBoxSize;
  let boxH = maxBoxSize;
  if (aspect >= 1) {
    boxW = maxBoxSize;
    boxH = Math.max(24, Math.round(maxBoxSize / aspect));
  } else {
    boxH = maxBoxSize;
    boxW = Math.max(24, Math.round(maxBoxSize * aspect));
  }

  return (
    <div
      id="custom-size-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="custom-size-modal-content"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 border-b border-pink-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-pink-600 to-rose-600 rounded-xl text-white shadow-xs">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Nhập kích thước tùy chỉnh</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Tự thêm bất kỳ kích thước in nào theo yêu cầu của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-lg transition"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-pink-600 text-pink-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo kích thước mới</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'border-pink-600 text-pink-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mẫu đã lưu ({customPresets.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'create' ? (
            <div className="space-y-4">
              {/* Unit & Shape Selection */}
              <div className="grid grid-cols-2 gap-3">
                {/* Đơn vị */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Đơn vị đo
                  </label>
                  <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleUnitToggle('cm')}
                      className={`py-1.5 rounded-md transition ${
                        unit === 'cm' ? 'bg-white text-pink-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Centimet (cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitToggle('mm')}
                      className={`py-1.5 rounded-md transition ${
                        unit === 'mm' ? 'bg-white text-pink-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Milimet (mm)
                    </button>
                  </div>
                </div>

                {/* Hình dạng */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Hình dạng
                  </label>
                  <div className="grid grid-cols-3 p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleShapeChange('rect')}
                      className={`py-1.5 flex items-center justify-center gap-1 rounded-md transition ${
                        shape === 'rect' ? 'bg-white text-pink-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Chữ nhật / Vuông"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Chữ nhật</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShapeChange('circle')}
                      className={`py-1.5 flex items-center justify-center gap-1 rounded-md transition ${
                        shape === 'circle' ? 'bg-white text-pink-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Hình tròn"
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span>Tròn</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShapeChange('heart')}
                      className={`py-1.5 flex items-center justify-center gap-1 rounded-md transition ${
                        shape === 'heart' ? 'bg-white text-pink-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Hình trái tim"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>Tim</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dimensions Inputs + Live Visual Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                {/* Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {shape === 'circle' ? `Đường kính (${unit})` : `Chiều rộng (${unit})`}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={widthInput}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        placeholder={unit === 'cm' ? '4.7' : '47'}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        {unit}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {shape === 'circle' ? `Đường kính dọc (${unit})` : `Chiều cao (${unit})`}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={heightInput}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        disabled={shape === 'circle' || shape === 'heart'}
                        placeholder={unit === 'cm' ? '6.6' : '66'}
                        className={`w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none ${
                          shape === 'circle' || shape === 'heart' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                        }`}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        {unit}
                      </span>
                    </div>
                  </div>
                </div>

                  {/* Live Preview Box */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs h-full min-h-[160px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                      Xem trước tỷ lệ thực
                    </span>
                    <div className="flex items-center justify-center w-[130px] h-[130px] bg-slate-50/60 rounded border border-dashed border-slate-200 p-1">
                      {shape === 'heart' ? (
                        <div
                          style={{
                            width: `${boxW}px`,
                            height: `${boxH}px`,
                          }}
                          className="relative flex items-center justify-center transition-all duration-150"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-full h-full drop-shadow-xs"
                            fill="rgba(253, 242, 248, 0.95)"
                            stroke="#ec4899"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          >
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-pink-700 font-bold text-[11px] pt-0.5 pointer-events-none">
                            {(widthMm / 10).toFixed(1)} x {(heightMm / 10).toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: `${boxW}px`,
                            height: `${boxH}px`,
                            borderRadius: shape === 'circle' ? '9999px' : '4px',
                          }}
                          className="flex items-center justify-center border-2 border-pink-500 bg-pink-100/60 text-pink-700 font-bold text-[11px] shadow-xs transition-all duration-150"
                        >
                          <span>
                            {(widthMm / 10).toFixed(1)} x {(heightMm / 10).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-center text-[10px] font-semibold text-slate-500">
                      {widthMm} mm × {heightMm} mm
                    </div>
                  </div>
              </div>

              {/* Tên gợi nhớ */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Tên nhãn gợi nhớ <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder={`Ví dụ: ${getEffectiveLabel()}`}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                {targetPhoto && (
                  <button
                    type="button"
                    onClick={() => handleApplySingle()}
                    className="w-full sm:flex-1 py-2.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Áp dụng cho ảnh này</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleApplyAll()}
                  className={`w-full sm:flex-1 py-2.5 px-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    !targetPhoto ? 'sm:flex-2' : ''
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Áp dụng cho TẤT CẢ</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToPresets}
                  className="w-full sm:w-auto py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Lưu vào danh sách mẫu để chọn nhanh sau này"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lưu mẫu</span>
                </button>
              </div>
            </div>
          ) : (
            /* Saved Custom Presets List */
            <div className="space-y-3">
              {customPresets.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-500">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">Chưa có kích thước tự tạo nào</div>
                  <p className="text-[11px] text-slate-400">
                    Chuyển sang tab "Tạo kích thước mới" để thêm các kích thước theo ý muốn.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-pink-300 transition shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
                          {preset.shape === 'circle' ? (
                            <Circle className="w-4 h-4" />
                          ) : preset.shape === 'heart' ? (
                            <Heart className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{preset.label}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {(preset.width / 10).toFixed(1)} x {(preset.height / 10).toFixed(1)} cm (
                            {preset.width} x {preset.height} mm)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {targetPhoto && (
                          <button
                            type="button"
                            onClick={() => handleApplySingle(preset)}
                            className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Dùng cho ảnh này
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApplyAll(preset)}
                          className="px-2.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer"
                        >
                          Dùng cho tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveCustomPreset(preset.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa kích thước này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-pink-600" />
            <span>Kích thước tự tạo sẽ được lưu lại trong danh sách mẫu của bạn.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
