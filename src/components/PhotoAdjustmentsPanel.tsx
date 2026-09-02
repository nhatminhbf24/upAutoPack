import React from 'react';
import {
  Sparkles,
  Lightbulb,
  Sun,
  Palette,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { ImageAdjustments, DEFAULT_ADJUSTMENTS } from '../types';

interface PhotoAdjustmentsPanelProps {
  adjustments: ImageAdjustments;
  onChange: (adjustments: ImageAdjustments) => void;
  onAutoAdjust: () => void;
  isAutoAdjusting?: boolean;
}

export const PhotoAdjustmentsPanel: React.FC<PhotoAdjustmentsPanelProps> = ({
  adjustments,
  onChange,
  onAutoAdjust,
  isAutoAdjusting = false,
}) => {
  const updateField = (field: keyof ImageAdjustments, value: number | boolean) => {
    onChange({
      ...adjustments,
      [field]: value,
    });
  };

  const handleResetAll = () => {
    onChange({ ...DEFAULT_ADJUSTMENTS });
  };

  // Helper slider row component matching screenshot style
  const renderSlider = (
    label: string,
    field: keyof ImageAdjustments,
    min = -100,
    max = 100,
    customTrackStyle?: React.CSSProperties
  ) => {
    const val = (adjustments[field] as number) ?? 0;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
          <label htmlFor={`slider-${field}`} className="cursor-pointer select-none">
            {label}
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <input
              id={`slider-${field}`}
              type="range"
              min={min}
              max={max}
              step="1"
              value={val}
              onChange={(e) => updateField(field, parseInt(e.target.value) || 0)}
              style={customTrackStyle}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
            />
          </div>
          {/* Number Input Box with rounded border matching screenshot */}
          <input
            type="number"
            min={min}
            max={max}
            value={val}
            onChange={(e) => {
              const parsed = parseInt(e.target.value);
              updateField(field, isNaN(parsed) ? 0 : Math.max(min, Math.min(max, parsed)));
            }}
            onDoubleClick={() => updateField(field, 0)}
            title="Nhấp đúp để đặt lại về 0"
            className="w-12 text-center text-xs font-medium py-1 px-1 rounded-xl border border-slate-300/80 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-purple-400 focus:border-purple-500 outline-none"
          />
        </div>
      </div>
    );
  };

  const hasChanges = Object.keys(adjustments).some((k) => {
    const key = k as keyof ImageAdjustments;
    return adjustments[key] !== DEFAULT_ADJUSTMENTS[key];
  });

  return (
    <div className="flex flex-col gap-5 p-1 text-slate-800 select-none">
      {/* 1. Auto-adjust Button (Tự động cân chỉnh) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAutoAdjust}
          disabled={isAutoAdjusting}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-xs tracking-wide shadow-md shadow-purple-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
        >
          <Sparkles className={`w-4 h-4 text-purple-200 ${isAutoAdjusting ? 'animate-spin' : ''}`} />
          <span>{isAutoAdjusting ? 'Đang phân tích...' : 'Tự động cân chỉnh'}</span>
        </button>

        {hasChanges && (
          <button
            type="button"
            onClick={handleResetAll}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-2xs"
            title="Đặt lại tất cả thông số về 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. White balance (Cân bằng trắng) */}
      <div className="space-y-3 bg-white/60 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Cân bằng trắng</span>
        </div>

        <div className="space-y-3 pl-1">
          {/* Temperature (Nhiệt độ màu) */}
          {renderSlider('Nhiệt độ màu (Temperature)', 'temperature', -100, 100, {
            background: 'linear-gradient(to right, #60a5fa 0%, #f1f5f9 50%, #f59e0b 100%)',
          })}

          {/* Tint (Sắc thái) */}
          {renderSlider('Sắc thái (Tint)', 'tint', -100, 100, {
            background: 'linear-gradient(to right, #4ade80 0%, #f1f5f9 50%, #e879f9 100%)',
          })}
        </div>
      </div>

      {/* 3. Light (Ánh sáng) */}
      <div className="space-y-3 bg-white/60 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Sun className="w-4 h-4 text-amber-600" />
          <span>Ánh sáng</span>
        </div>

        <div className="space-y-3 pl-1">
          {renderSlider('Độ sáng (Brightness)', 'brightness')}
          {renderSlider('Độ tương phản (Contrast)', 'contrast')}
          {renderSlider('Vùng sáng (Highlights)', 'highlights')}
          {renderSlider('Vùng tối (Shadows)', 'shadows')}
          {renderSlider('Điểm trắng (Whites)', 'whites')}
          {renderSlider('Điểm đen (Blacks)', 'blacks')}
        </div>
      </div>

      {/* 4. Color (Màu sắc) + Invert toggle */}
      <div className="space-y-3 bg-white/60 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Palette className="w-4 h-4 text-indigo-500" />
            <span>Màu sắc</span>
          </div>

          {/* Invert Toggle Switch */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-semibold text-slate-600">Đảo màu</span>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={adjustments.invert}
                onChange={(e) => updateField('invert', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </label>
        </div>

        <div className="space-y-3 pl-1">
          {renderSlider('Độ rực màu (Vibrance)', 'vibrance')}
          {renderSlider('Độ bão hòa (Saturation)', 'saturation')}
        </div>
      </div>
    </div>
  );
};
