import React, { useRef, useState, useEffect } from 'react';
import {
  LayoutGrid,
  Scissors,
  Maximize,
  FlipHorizontal,
  Type,
  Ruler,
  Crosshair,
  Copy,
  Trash2,
  ChevronDown,
  RotateCw,
  Boxes,
  Layers,
  SplitSquareHorizontal,
} from 'lucide-react';
import { LayoutSettings, FreeformTextTag, CutMarkFeature } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../utils/packing';
import { getDefaultTextTag, getEffectiveTextTagForPage } from '../utils/textTagUtils';

export interface PageLayoutSettingsProps {
  settings: LayoutSettings;
  onUpdateSettings: (updates: Partial<LayoutSettings>) => void;
  pageCount: number;
  totalPhotos: number;
  onClonePage1AsBackside?: () => void;
  onResetFreeformPositions?: () => void;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const PageLayoutSettings: React.FC<PageLayoutSettingsProps> = ({
  settings,
  onUpdateSettings,
  pageCount,
  totalPhotos,
  onClonePage1AsBackside,
  onResetFreeformPositions,
  onToast,
}) => {
  const isLandscape = settings.paperOrientation === 'landscape';
  const pageW_mm = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const [selectedTagPage, setSelectedTagPage] = useState<number>(1);
  const effectiveSelectedPage = Math.min(Math.max(1, selectedTagPage), Math.max(1, pageCount));

  // Trạng thái mở rộng / thu hẹp của khối Ghi chú theo trang (Mặc định tự động thu hẹp)
  const [isTextTagSectionExpanded, setIsTextTagSectionExpanded] = useState<boolean>(false);
  const textTagCardRef = useRef<HTMLDivElement>(null);

  // Tự động thu gọn lại khi nhấp chuột ra ngoài
  useEffect(() => {
    if (!isTextTagSectionExpanded) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Không đóng nếu nhấp vào bên trong khối Ghi chú theo trang
      if (textTagCardRef.current && textTagCardRef.current.contains(target)) {
        return;
      }

      // Không đóng nếu nhấp vào các nút/tag kích hoạt mở ghi chú trên trang A4
      if (target.closest('[data-text-tag-trigger="true"]')) {
        return;
      }

      setIsTextTagSectionExpanded(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isTextTagSectionExpanded]);

  // Lắng nghe sự kiện nhấp đúp (2 lần) vào ghi chú trên trang A4 hoặc bấm thêm ghi chú
  useEffect(() => {
    const handleFocusPageTag = (e: Event) => {
      const customEvent = e as CustomEvent<{ pageNumber?: number }>;
      const targetPage = customEvent.detail?.pageNumber;
      if (typeof targetPage === 'number' && targetPage >= 1) {
        setSelectedTagPage(targetPage);
      }
      setIsTextTagSectionExpanded(true);

      setTimeout(() => {
        const card = document.getElementById('setting-freeform-text-tag-card');
        const input = document.getElementById('input-tag-custom-text') as HTMLInputElement | null;

        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          card.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/50');
          setTimeout(() => {
            card.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/50');
          }, 1200);
        }

        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    };

    window.addEventListener('daudau_focus_page_tag', handleFocusPageTag);
    return () => {
      window.removeEventListener('daudau_focus_page_tag', handleFocusPageTag);
    };
  }, []);

  // Kiểm tra tag của trang đang được chọn
  const currentPageTag =
    getEffectiveTextTagForPage(settings, effectiveSelectedPage, isLandscape) ||
    getDefaultTextTag(isLandscape, settings.margin);

  const isCurrentPageTagEnabled = Boolean(
    settings.pageTextTags !== undefined && settings.pageTextTags !== null
      ? settings.pageTextTags[effectiveSelectedPage]?.enabled
      : (settings.textTag?.enabled || settings.printSlug)
  );

  const pagesWithNotesCount =
    settings.pageTextTags !== undefined && settings.pageTextTags !== null
      ? Object.values(settings.pageTextTags).filter(
          (t): t is FreeformTextTag => Boolean(t && (t as FreeformTextTag).enabled)
        ).length
      : (settings.textTag?.enabled || settings.printSlug) ? pageCount : 0;

  const isBleedEnabled = Boolean(settings.bleed && settings.bleed > 0);
  const currentBleed = isBleedEnabled ? (settings.bleed as number) : 1;

  // Cập nhật tag của trang đang chọn
  const handleUpdateCurrentPageTag = (updates: Partial<FreeformTextTag>) => {
    const updated: FreeformTextTag = { ...currentPageTag, ...updates, enabled: true };
    const nextPageTextTags = { ...(settings.pageTextTags || {}) };
    nextPageTextTags[effectiveSelectedPage] = updated;

    onUpdateSettings({
      pageTextTags: nextPageTextTags,
      printSlug: true,
      textTag: updated,
      orderSlug: updated.text,
    });
  };

  // Bật/tắt ghi chú cho trang đang chọn
  const handleToggleCurrentPageTag = (enabled: boolean) => {
    const nextPageTextTags = { ...(settings.pageTextTags || {}) };
    if (enabled) {
      nextPageTextTags[effectiveSelectedPage] = {
        ...currentPageTag,
        enabled: true,
        text: currentPageTag.text || settings.textTag?.text || settings.orderSlug || `Ghi chú Trang ${effectiveSelectedPage}`,
      };
    } else {
      nextPageTextTags[effectiveSelectedPage] = {
        ...currentPageTag,
        enabled: false,
      };
    }
    const hasAnyActive = Object.values(nextPageTextTags).some(
      (t) => Boolean(t && (t as FreeformTextTag).enabled)
    );
    onUpdateSettings({
      pageTextTags: nextPageTextTags,
      printSlug: hasAnyActive,
      textTag: { ...(settings.textTag || currentPageTag), enabled: hasAnyActive },
    });
  };

  // Áp dụng tag của trang hiện tại cho toàn bộ các trang
  const handleApplyTagToAllPages = () => {
    const nextPageTextTags: Record<number, FreeformTextTag> = {};
    for (let p = 1; p <= Math.max(1, pageCount); p++) {
      nextPageTextTags[p] = {
        ...currentPageTag,
        enabled: true,
      };
    }
    onUpdateSettings({
      pageTextTags: nextPageTextTags,
      printSlug: true,
      textTag: { ...currentPageTag, enabled: true },
    });
    onToast('success', `Đã áp dụng ghi chú cho ${pageCount} trang`);
  };

  return (
    <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-200/80 shadow-sm hover:shadow-md transition-all duration-200 space-y-2.5">
      {/* Hàng Lề trang & Khoảng cách Ảnh */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-2xs flex items-center justify-between gap-1.5">
          <label className="text-xs text-indigo-900 font-bold tracking-tight whitespace-nowrap">
            Lề trang
          </label>
          <input
            type="number"
            min="0"
            max="50"
            value={settings.margin}
            onChange={(e) => onUpdateSettings({ margin: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-[34px] bg-indigo-50/40 border border-indigo-200 rounded-md py-0.5 text-xs font-bold text-center text-slate-800 outline-none focus:ring-1 focus:ring-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            title="Lề trang in (mm)"
          />
        </div>

        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-2xs flex items-center justify-between gap-1.5">
          <label className="text-xs text-indigo-900 font-bold tracking-tight whitespace-nowrap">
            Ảnh
          </label>
          <input
            type="number"
            min="0"
            max="50"
            value={settings.gap}
            onChange={(e) => onUpdateSettings({ gap: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-[34px] bg-indigo-50/40 border border-indigo-200 rounded-md py-0.5 text-xs font-bold text-center text-slate-800 outline-none focus:ring-1 focus:ring-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            title="Khoảng cách giữa các ảnh (mm)"
          />
        </div>
      </div>

      {/* 1. Tự động sắp xếp ảnh (Bin Packing) */}
      <div className="space-y-1.5">
        <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-50/60 transition-all duration-200 select-none shadow-xs hover:shadow-sm">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-950">Tự động sắp xếp ảnh</span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(settings.autoNesting)}
            onChange={(e) => {
              const checked = e.target.checked;
              onUpdateSettings({
                autoNesting: checked,
                ...(checked ? { layoutMode: 'auto' } : {}),
              });
              if (checked) {
                onResetFreeformPositions?.();
              }
            }}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
          />
        </label>

        {/* Tùy chọn mở rộng cho Tự động sắp xếp ảnh */}
        {settings.autoNesting && (
          <div className="p-2 ml-1 bg-emerald-50/90 rounded-lg border border-emerald-300 space-y-2 select-none shadow-2xs">
            {/* Chế độ thuật toán: Ép chặt Tetris vs Cắt thẳng Dao */}
            <div>
              <div className="text-[11px] font-bold text-emerald-950 mb-1 flex items-center justify-between">
                <span>Kiểu thuật toán:</span>
                <span className="text-[9.5px] text-emerald-700 font-semibold">
                  {settings.packingStrategy === 'guillotine' ? 'Đường xén thẳng' : 'Tiết kiệm giấy nhất'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ packingStrategy: 'maxrects', layoutMode: 'auto' });
                    onResetFreeformPositions?.();
                  }}
                  className={`py-1.5 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    settings.packingStrategy !== 'guillotine'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100/60'
                  }`}
                  title="Thuật toán MaxRects Tetris: Lấp kín mọi khe hở, tận dụng tối đa diện tích khổ giấy A4"
                >
                  <Boxes className="w-3.5 h-3.5 shrink-0" />
                  <span>Ép chặt (Tetris)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ packingStrategy: 'guillotine', layoutMode: 'auto' });
                    onResetFreeformPositions?.();
                  }}
                  className={`py-1.5 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    settings.packingStrategy === 'guillotine'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100/60'
                  }`}
                  title="Thuật toán Guillotine: Tạo các đường xén thẳng tắp từ mép này sang mép kia của giấy A4, cực kỳ dễ rọc dao"
                >
                  <SplitSquareHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>Cắt thẳng (Dao)</span>
                </button>
              </div>
            </div>

            {/* Xoay lấp khoảng trống */}
            <label className="flex items-center justify-between cursor-pointer pt-1.5 border-t border-emerald-200/80">
              <div className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-xs font-medium text-emerald-950">Xoay ảnh lấp khoảng trống</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.allowRotation)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onUpdateSettings({
                    allowRotation: checked,
                    ...(checked ? { layoutMode: 'auto' } : {}),
                  });
                  if (checked) {
                    onResetFreeformPositions?.();
                  }
                }}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer shrink-0"
              />
            </label>

            {/* Ghép cặp ảnh cùng cỡ (Smart Bundling) */}
            <label className="flex items-center justify-between cursor-pointer pt-1.5 border-t border-emerald-200/80">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-xs font-medium text-emerald-950">Ghép cặp ảnh cùng cỡ</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableSmartBundling !== false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onUpdateSettings({
                    enableSmartBundling: checked,
                    layoutMode: 'auto',
                  });
                  onResetFreeformPositions?.();
                }}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer shrink-0"
                title="Tự động gom nhóm các ảnh có chung kích thước cạnh vào cùng hàng/cột để tờ A4 vuông vức hơn"
              />
            </label>
          </div>
        )}
      </div>

      {/* 2. Đường cắt ảnh & Dấu góc chữ thập */}
      <div className="bg-white rounded-lg border border-slate-300 p-2.5 space-y-2 shadow-xs hover:shadow-sm transition-all duration-200">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800">Hiển thị đường xén ảnh</span>
          </div>
          <input
            type="checkbox"
            checked={settings.cutLines}
            onChange={(e) => onUpdateSettings({ cutLines: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {settings.cutLines && (() => {
          const activeCutStyles: CutMarkFeature[] =
            settings.cutStyles && settings.cutStyles.length > 0
              ? settings.cutStyles
              : settings.cutStyle
              ? [settings.cutStyle]
              : ['dashed'];

          const toggleFeature = (feat: CutMarkFeature) => {
            let next = [...activeCutStyles];
            if (next.includes(feat)) {
              next = next.filter((f) => f !== feat);
            } else {
              if (feat === 'solid') {
                next = next.filter((f) => f !== 'dashed');
              } else if (feat === 'dashed') {
                next = next.filter((f) => f !== 'solid');
              }
              next.push(feat);
            }
            onUpdateSettings({
              cutStyles: next,
              cutStyle: next[0] || 'dashed',
            });
          };

          return (
            <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-500 font-medium shrink-0">Kiểu:</span>
              <div className="grid grid-cols-2 gap-1 flex-1">
                <button
                  type="button"
                  onClick={() => toggleFeature('full_trim_guides')}
                  className={`py-1.5 px-1 rounded text-center font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activeCutStyles.includes('full_trim_guides')
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Đường gióng thước tràn mép giấy A4 (Full Trim Guides) - Vạch gióng ra tận biên giấy giúp đặt thước nhôm dài hoặc cắt bàn gạt thẳng tắp 100%"
                >
                  <Ruler className="w-3 h-3" />
                  <span>Gióng mép A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFeature('corner_marks')}
                  className={`py-1.5 px-1 rounded text-center font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activeCutStyles.includes('corner_marks')
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Dấu góc chữ thập chuẩn nhà in (Corner Crop Marks) - Không làm dính nét mực vào mép ảnh khi cắt"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Dấu góc</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFeature('dashed')}
                  className={`py-1.5 px-1 rounded text-center font-bold transition cursor-pointer ${
                    activeCutStyles.includes('dashed')
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Nét đứt mờ xung quanh viền ảnh"
                >
                  Nét đứt
                </button>
                <button
                  type="button"
                  onClick={() => toggleFeature('solid')}
                  className={`py-1.5 px-1 rounded text-center font-bold transition cursor-pointer ${
                    activeCutStyles.includes('solid')
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Nét liền mảnh xung quanh viền ảnh"
                >
                  Nét liền
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. Bù xén tràn lề (Bleed) */}
      <div
        id="setting-bleed-card"
        className="bg-white rounded-lg border border-indigo-200 p-2.5 space-y-2 shadow-xs hover:shadow-sm transition-all duration-200"
      >
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <Maximize className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 block leading-tight">
                Tràn lề bù xén (Bleed)
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                Mở rộng viền ảnh tránh lẹm trắng khi cắt
              </span>
            </div>
          </div>
          <input
            id="checkbox-bleed"
            type="checkbox"
            checked={isBleedEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              onUpdateSettings({ bleed: checked ? (settings.bleed && settings.bleed > 0 ? settings.bleed : 1) : 0 });
            }}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer shrink-0 ml-2"
          />
        </label>

        {isBleedEnabled && (
          <div id="bleed-dropdown-content" className="pt-2 border-t border-slate-100 space-y-2">
            {/* Nút chọn nhanh */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 1, label: '+1 mm', desc: 'Chuẩn in' },
                { value: 1.5, label: '+1.5 mm', desc: 'Vừa vặn' },
                { value: 2, label: '+2 mm', desc: 'Mép rộng' },
              ].map((item) => (
                <button
                  key={item.value}
                  id={`btn-bleed-preset-${item.value}`}
                  type="button"
                  onClick={() => onUpdateSettings({ bleed: item.value })}
                  className={`py-1.5 px-1 rounded-md text-center font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                    currentBleed === item.value
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100 border border-indigo-200/80'
                  }`}
                  title={`Tràn lề bù xén +${item.value}mm mỗi mép`}
                >
                  <span className="text-xs font-bold leading-tight">{item.label}</span>
                  <span
                    className={`text-[9px] font-medium leading-tight ${
                      currentBleed === item.value ? 'text-indigo-100' : 'text-indigo-600/80'
                    }`}
                  >
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Thanh kéo / Tùy chỉnh */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
              <span className="text-slate-600 font-medium shrink-0 text-[10.5px]">Tùy chỉnh:</span>
              <input
                id="range-bleed-custom"
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={currentBleed}
                onChange={(e) => onUpdateSettings({ bleed: parseFloat(e.target.value) || 1 })}
                className="flex-1 min-w-0 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono font-bold text-indigo-700 shrink-0 text-right whitespace-nowrap">
                +{currentBleed}mm
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. In 2 mặt đối xứng (Duplex Alignment) */}
      <div className="bg-white rounded-lg border border-purple-200 p-2.5 shadow-xs hover:shadow-sm transition-all duration-200 space-y-2">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <FlipHorizontal className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-purple-950 block leading-tight">In 2 mặt đối xứng</span>
              <span className="text-[10px] text-purple-700/80 block leading-tight">Lật gương trang chẵn để khớp mặt sau</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(settings.duplexMode)}
            onChange={(e) => onUpdateSettings({ duplexMode: e.target.checked })}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer shrink-0 ml-2"
          />
        </label>

        {/* Nút 1-Click: Nhân bản Trang 1 làm mặt sau (Chỉ hiện khi In 2 mặt đối xứng được bật) */}
        {Boolean(settings.duplexMode) && onClonePage1AsBackside && totalPhotos > 0 && (
          <button
            type="button"
            onClick={onClonePage1AsBackside}
            className="w-full py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 active:scale-[0.99] border border-purple-300 text-purple-900 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Sao chép toàn bộ ảnh của Trang 1 sang Trang 2 và tự động căn lật đối xứng từng milimet để in mặt sau"
          >
            <Copy className="w-3.5 h-3.5 text-purple-700" />
            <span>Nhân bản Trang 1 làm mặt sau</span>
          </button>
        )}
      </div>

      {/* 5. Thêm text tự do / Ghi chú riêng từng trang */}
      <div
        ref={textTagCardRef}
        id="setting-freeform-text-tag-card"
        className="bg-white rounded-lg border border-slate-300 p-2.5 shadow-xs hover:shadow-sm transition-all duration-200 space-y-2.5"
      >
        {/* Header: Nhấp vào toàn bộ thanh tiêu đề để thu hẹp hoặc mở rộng */}
        <div
          onClick={() => setIsTextTagSectionExpanded((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none -m-1 p-1 rounded-md hover:bg-slate-50 transition"
          title={isTextTagSectionExpanded ? 'Nhấp để thu hẹp' : 'Nhấp để mở rộng'}
        >
          <div className="flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 block leading-tight">Ghi chú theo trang</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Ghi chú độc lập từng trang in</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {pagesWithNotesCount}/{Math.max(1, pageCount)} trang
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isTextTagSectionExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Nội dung chi tiết - chỉ hiện khi mở rộng */}
        {isTextTagSectionExpanded && (
          <div className="space-y-2.5 pt-1.5 border-t border-slate-100">
            {/* Page Selection Tabs (khi có nhiều trang) */}
            {pageCount > 1 && (
              <div className="space-y-1">
                <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Chọn trang để cài đặt:
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  {Array.from({ length: pageCount }).map((_, idx) => {
                    const pNum = idx + 1;
                    const hasNote = Boolean(settings.pageTextTags?.[pNum]?.enabled);
                    const isSelected = effectiveSelectedPage === pNum;

                    return (
                      <button
                        key={`page-tab-${pNum}`}
                        type="button"
                        onClick={() => setSelectedTagPage(pNum)}
                        className={`px-2 py-1 rounded-md text-[10.5px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : hasNote
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>Trang {pNum}</span>
                        {hasNote && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bật/Tắt Ghi chú cho Trang hiện tại */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                Bật ghi chú Trang {effectiveSelectedPage}
              </span>
              <input
                id="checkbox-tag-page-active"
                type="checkbox"
                checked={isCurrentPageTagEnabled}
                onChange={(e) => handleToggleCurrentPageTag(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Nhập nội dung ghi chú & Cấu hình vị trí khi được Bật */}
            {isCurrentPageTagEnabled ? (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Nội dung ghi chú Trang {effectiveSelectedPage}:
                  </label>
                  <textarea
                    id="input-tag-custom-text"
                    rows={2}
                    value={currentPageTag.text || ''}
                    placeholder="VD: #DON123 - Anh Tuấn - In ngày 05/10"
                    onChange={(e) => handleUpdateCurrentPageTag({ text: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white resize-none"
                  />
                </div>

                {/* Cỡ chữ & Độ đậm */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9.5px] font-semibold text-slate-500 block mb-0.5">
                      Cỡ chữ (pt):
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="36"
                      value={currentPageTag.fontSizePt || 10}
                      onChange={(e) =>
                        handleUpdateCurrentPageTag({ fontSizePt: Math.max(6, parseInt(e.target.value) || 10) })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-xs font-bold text-center text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-semibold text-slate-500 block mb-0.5">
                      Độ đậm:
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentPageTag({ fontWeight: 'normal' })}
                        className={`flex-1 py-0.5 text-[10px] rounded font-medium transition cursor-pointer ${
                          currentPageTag.fontWeight !== 'bold'
                            ? 'bg-white font-bold text-slate-800 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Thường
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentPageTag({ fontWeight: 'bold' })}
                        className={`flex-1 py-0.5 text-[10px] rounded font-bold transition cursor-pointer ${
                          currentPageTag.fontWeight === 'bold'
                            ? 'bg-white text-blue-600 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Đậm
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vị trí nhanh trên trang */}
                <div>
                  <label className="text-[9.5px] font-semibold text-slate-500 block mb-1">
                    Đặt nhanh vị trí:
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateCurrentPageTag({
                          xMm: Math.max(4, settings.margin || 5),
                          yMm: Math.max(10, pageH_mm - 5.5),
                          rotation: 0,
                        })
                      }
                      className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px] font-bold text-center transition cursor-pointer"
                      title="Đặt ở chân trang dưới cùng"
                    >
                      Chân trang
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateCurrentPageTag({
                          xMm: Math.max(4, settings.margin || 5),
                          yMm: 4,
                          rotation: 0,
                        })
                      }
                      className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px] font-bold text-center transition cursor-pointer"
                      title="Đặt ở mép trên cùng"
                    >
                      Đầu trang
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateCurrentPageTag({
                          xMm: 3.5,
                          yMm: Math.max(10, pageH_mm - 8),
                          rotation: 90,
                        })
                      }
                      className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px] font-bold text-center transition cursor-pointer"
                      title="Xoay dọc chạy dọc theo mép lề trái"
                    >
                      Mép trái
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateCurrentPageTag({
                          xMm: pageW_mm - 3.5,
                          yMm: Math.max(10, pageH_mm - 8),
                          rotation: 90,
                        })
                      }
                      className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px] font-bold text-center transition cursor-pointer"
                      title="Xoay dọc chạy dọc theo mép lề phải"
                    >
                      Mép phải
                    </button>
                  </div>
                </div>

                {/* Nút tiện ích: Sao chép cho tất cả / Xóa ghi chú */}
                <div className="pt-1 flex items-center justify-between gap-1.5 border-t border-slate-100">
                  {pageCount > 1 && (
                    <button
                      type="button"
                      onClick={handleApplyTagToAllPages}
                      className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Sao chép ghi chú này sang tất cả các trang khác"
                    >
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Chép cho mọi trang</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleCurrentPageTag(false)}
                    className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ml-auto"
                    title="Xóa ghi chú khỏi trang này"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Xóa khỏi trang {effectiveSelectedPage}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[10.5px] text-slate-400 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                Trang {effectiveSelectedPage} chưa có ghi chú. Bật công tắc phía trên hoặc bấm nút{' '}
                <span className="font-semibold text-blue-600">+ Thêm ghi chú trang này</span> trên đỉnh tờ giấy ở bàn in.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
