import React from 'react';
import { Type } from 'lucide-react';
import { PRINT_FONT_OPTIONS } from '../utils/fontConstants';

interface FontSelectorProps {
  value?: string;
  onChange: (fontId: string) => void;
  label?: string;
  className?: string;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  value = 'be_vietnam_pro',
  onChange,
  label = 'Kiểu phông chữ:',
  className = '',
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
          <Type className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs font-medium px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white shadow-2xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
      >
        <optgroup label="✨ Chuẩn Việt Nam & Hiện Đại (Modern Sans)">
          {PRINT_FONT_OPTIONS.filter((f) => f.category === 'sans').map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.familyCss }}>
              {f.name}
            </option>
          ))}
        </optgroup>

        <optgroup label="🌸 Bo Tròn Thân Thiện (Rounded)">
          {PRINT_FONT_OPTIONS.filter((f) => f.category === 'rounded').map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.familyCss }}>
              {f.name}
            </option>
          ))}
        </optgroup>

        <optgroup label="✍️ Viết Tay Cảm Xúc (Handwriting)">
          {PRINT_FONT_OPTIONS.filter((f) => f.category === 'handwriting').map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.familyCss }}>
              {f.name}
            </option>
          ))}
        </optgroup>

        <optgroup label="💌 Thư Pháp & Lãng Mạn (Calligraphy & Script)">
          {PRINT_FONT_OPTIONS.filter((f) => f.category === 'calligraphy').map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.familyCss }}>
              {f.name}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
};
