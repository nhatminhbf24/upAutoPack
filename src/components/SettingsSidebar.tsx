import React, { useRef, useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Settings2,
  Scissors,
  FileImage,
  LayoutGrid,
  FileText,
  Save,
  FolderOpen,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize,
  FlipHorizontal,
  Tag,
  Crosshair,
  Ruler,
  Copy,
  Type,
  Clock,
  RotateCw,
  Plus,
} from 'lucide-react';
import { LayoutSettings, SizePreset, FreeformTextTag, CutMarkFeature, OrientationMode } from '../types';
import { Uploader } from './Uploader';
import { PhotoItem } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../utils/packing';
import { getDefaultTextTag, getEffectiveTextTagForPage } from '../utils/textTagUtils';

interface SettingsSidebarProps {
  settings: LayoutSettings;
  onUpdateSettings: (updates: Partial<LayoutSettings>) => void;
  pageCount: number;
  totalPhotos: number;
  onAddPhotos: (photos: PhotoItem[]) => void;
  onPrint: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  onExportPdf?: () => void;
  onExportProject?: () => void;
  onImportProject?: (file: File) => void;
  onClearAllPhotos?: () => void;
  isAutoSaved?: boolean;
  isExporting: boolean;
  exportProgress: { current: number; total: number } | null;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  activePreset: SizePreset;
  autoMatchOrientation: boolean;
  orientationMode?: OrientationMode;
  customPresets?: SizePreset[];
  onOpenPngSplitter?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClonePage1AsBackside?: () => void;
  onResetFreeformPositions?: () => void;
  photos?: PhotoItem[];
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  settings,
  onUpdateSettings,
  pageCount,
  totalPhotos,
  onAddPhotos,
  onPrint,
  onExport,
  onExportPdf,
  onExportProject,
  onImportProject,
  onClearAllPhotos,
  isAutoSaved = false,
  isExporting,
  exportProgress,
  onToast,
  activePreset,
  autoMatchOrientation,
  orientationMode,
  customPresets = [],
  onOpenPngSplitter,
  isCollapsed = false,
  onToggleCollapse,
  onClonePage1AsBackside,
  onResetFreeformPositions,
  photos = [],
}) => {
  const [isExportCollapsed, setIsExportCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('daudau_export_collapsed');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const exportPanelRef = useRef<HTMLDivElement>(null);

  // Tự động hạ xuống khi nhấp chuột ra ngoài vùng bảng xuất file & in ấn (cho gọn thanh công cụ)
  useEffect(() => {
    if (isExportCollapsed || isExporting) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        exportPanelRef.current &&
        !exportPanelRef.current.contains(event.target as Node)
      ) {
        setIsExportCollapsed(true);
        try {
          localStorage.setItem('daudau_export_collapsed', 'true');
        } catch (e) {
          console.warn(e);
        }
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isExportCollapsed, isExporting]);

  // Tự động mở lên khi đang xử lý xuất file
  useEffect(() => {
    if (isExporting) {
      setIsExportCollapsed(false);
    }
  }, [isExporting]);

  const handleToggleExportCollapsed = () => {
    setIsExportCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('daudau_export_collapsed', String(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

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

    // Lắng nghe sự kiện mousedown và touchstart để phản hồi tức thì
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
      // Tự động mở rộng khối công cụ nếu đang bị thu hẹp
      setIsTextTagSectionExpanded(true);

      // Tự động cuộn đến và focus vào ô nhập nội dung
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

  // Xóa toàn bộ ghi chú ở tất cả các trang
  const handleClearAllPageTags = () => {
    const nextPageTextTags: Record<number, FreeformTextTag> = {};
    for (let p = 1; p <= Math.max(1, pageCount); p++) {
      nextPageTextTags[p] = {
        ...currentPageTag,
        enabled: false,
      };
    }
    onUpdateSettings({
      pageTextTags: nextPageTextTags,
      textTag: { ...currentPageTag, enabled: false },
      printSlug: false,
    });
    onToast('info', 'Đã xóa ghi chú các trang');
  };

  return (
    <aside
      id="sidebar"
      className={`no-print transition-all duration-300 flex flex-col bg-white border-r border-slate-200/90 h-full overflow-hidden z-20 shadow-xs ${
        isCollapsed ? 'w-14 shrink-0' : 'w-80 shrink-0'
      }`}
    >
      {/* Brand Header */}
      <div className="px-3.5 py-3 border-b border-pink-100 bg-white sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="bg-gradient-to-tr from-pink-600 to-rose-600 p-2 rounded-xl text-white shadow-sm shadow-pink-500/20 shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 pr-0.5">
              <h1 className="text-[15px] font-black text-pink-700 leading-snug tracking-tight whitespace-nowrap">
                Dâu Dâu AutoPack
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10.5px] text-pink-600/85 font-semibold">Dàn trang in ảnh A4</p>
                {isAutoSaved && totalPhotos > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded text-[9.5px] font-medium animate-fadeIn">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đã tự lưu
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isCollapsed ? (
        <div className="flex-1 flex flex-col items-center py-4 gap-3 text-slate-400">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            title="Mở rộng bảng cài đặt"
          >
            <Settings2 className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      ) : (
        /* Main Settings Body */
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50">
          {/* Page Stats & Orientation (1 Compact Line) */}
          <div className="bg-sky-50/70 rounded-xl px-3 py-2 border border-sky-200/90 shadow-2xs flex items-center justify-between gap-2">
            <span className="bg-white text-sky-700 border border-sky-300 px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-2xs shrink-0">
              {pageCount} trang
            </span>

            <div className="flex bg-white p-0.5 rounded-lg text-xs font-semibold border border-sky-200">
              <button
                type="button"
                onClick={() => onUpdateSettings({ paperOrientation: 'portrait' })}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  settings.paperOrientation === 'portrait'
                    ? 'bg-sky-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-sky-900'
                }`}
              >
                Khổ Dọc
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ paperOrientation: 'landscape' })}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  settings.paperOrientation === 'landscape'
                    ? 'bg-sky-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-sky-900'
                }`}
              >
                Khổ Ngang
              </button>
            </div>
          </div>

          {/* 1. Uploader Box (Tải ảnh vào trang) (Pastel Rose) */}
          <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200/80 shadow-2xs">
            <Uploader
              onAddPhotos={onAddPhotos}
              onToast={onToast}
              activePreset={activePreset}
              orientationMode={orientationMode || settings.orientationMode}
              autoMatchOrientation={autoMatchOrientation}
              smartCrop={settings.smartCrop}
              customPresets={customPresets}
              onOpenPngSplitter={onOpenPngSplitter}
              onExportProject={onExportProject}
              onImportProject={onImportProject}
            />
          </div>

          {/* 2. General Settings (Cài đặt lề & khoảng cách) (Pastel Slate/Indigo) */}
          <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-200/80 shadow-2xs space-y-2.5">
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
              <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-50/60 transition select-none shadow-2xs">
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
                      // Nếu bật tự động sắp xếp, đảm bảo chuyển về chế độ Tự động để tránh đè ảnh
                      ...(checked ? { layoutMode: 'auto' } : {}),
                    });
                    if (checked) {
                      onResetFreeformPositions?.();
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              {/* Tùy chọn mở rộng: Xoay lấp khoảng trống */}
              {settings.autoNesting && (
                <label className="flex items-center justify-between p-2 ml-2 bg-emerald-50/90 rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-100/70 transition select-none shadow-2xs">
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-emerald-950">Xoay lấp khoảng trống</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowRotation)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onUpdateSettings({
                        allowRotation: checked,
                        // Tự động chuyển về auto và xóa vị trí kéo tay cũ
                        ...(checked ? { layoutMode: 'auto' } : {}),
                      });
                      if (checked) {
                        onResetFreeformPositions?.();
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                </label>
              )}
            </div>

            {/* 2. Đường cắt ảnh & Dấu góc chữ thập */}
            <div className="bg-white rounded-lg border border-slate-300 p-2.5 space-y-2 shadow-2xs">
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
                    // Bấm vào tính năng đang bật -> Tắt tính năng đó
                    next = next.filter((f) => f !== feat);
                  } else {
                    // Bấm vào tính năng đang tắt -> Bật tính năng đó
                    if (feat === 'solid') {
                      // Nét liền và Nét đứt là 2 kiểu viền ảnh, nếu chọn nét liền thì bỏ nét đứt
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
              className="bg-white rounded-lg border border-indigo-200 p-2.5 space-y-2 shadow-2xs"
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
            <div className="bg-white rounded-lg border border-purple-200 p-2.5 shadow-2xs space-y-2">
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
              className="bg-white rounded-lg border border-slate-300 p-2.5 shadow-2xs transition-all duration-300 space-y-2.5"
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

                  {/* Toggle switch for current page */}
                  <label className="flex items-center justify-between cursor-pointer select-none pt-1 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">
                      Bật ghi chú cho <span className="font-bold text-blue-700">Trang {effectiveSelectedPage}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={isCurrentPageTagEnabled}
                      onChange={(e) => handleToggleCurrentPageTag(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer shrink-0 ml-2"
                    />
                  </label>

                  {isCurrentPageTagEnabled ? (
                    <div className="space-y-2.5 pt-1.5 border-t border-slate-100">
                      {/* Nhập mã đơn / ghi chú của trang này */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Nội dung ghi chú Trang {effectiveSelectedPage}:
                        </label>
                        <input
                          id="input-tag-custom-text"
                          type="text"
                          placeholder="VD: #DH1024 - In giấy ảnh bóng..."
                          value={currentPageTag.text || ''}
                          onChange={(e) => handleUpdateCurrentPageTag({ text: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium transition-all"
                        />
                      </div>

                      {/* Tự động chèn ngày giờ & số trang */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1.5 rounded-md border border-slate-200/80">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={currentPageTag.includeDateTime}
                            onChange={(e) => handleUpdateCurrentPageTag({ includeDateTime: e.target.checked })}
                            className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer shrink-0"
                          />
                          <span className="text-[10.5px] font-medium text-slate-700 leading-tight">
                            Kèm ngày giờ
                          </span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={currentPageTag.includePageNumber}
                            onChange={(e) => handleUpdateCurrentPageTag({ includePageNumber: e.target.checked })}
                            className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer shrink-0"
                          />
                          <span className="text-[10.5px] font-medium text-slate-700 leading-tight">
                            Kèm số trang
                          </span>
                        </label>
                      </div>

                      {/* Góc xoay & Cỡ chữ */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Góc xoay */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Góc xoay:
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCurrentPageTag({ rotation: 0 })}
                              className={`py-1 px-1.5 rounded text-center text-[10px] font-bold transition cursor-pointer ${
                                (currentPageTag.rotation || 0) === 0
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              Ngang (0°)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCurrentPageTag({ rotation: 90 })}
                              className={`py-1 px-1.5 rounded text-center text-[10px] font-bold transition cursor-pointer ${
                                (currentPageTag.rotation || 0) === 90
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                              title="Xoay dọc chữ áp sát mép giấy A4"
                            >
                              Dọc (90°)
                            </button>
                          </div>
                        </div>

                        {/* Cỡ chữ */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Cỡ chữ:</span>
                            <span className="text-blue-700 font-bold">{currentPageTag.fontSizePt || 8} pt</span>
                          </div>
                          <input
                            type="range"
                            min={6}
                            max={16}
                            step={1}
                            value={currentPageTag.fontSizePt || 8}
                            onChange={(e) => handleUpdateCurrentPageTag({ fontSizePt: Number(e.target.value) })}
                            className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Vị trí đặt nhanh (Presets) */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Đặt nhanh vị trí Trang {effectiveSelectedPage}:
                        </div>
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

          {totalPhotos > 0 && onClearAllPhotos && (
            <div className="pt-0.5">
              <button
                type="button"
                id="btn-clear-project"
                onClick={onClearAllPhotos}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 py-1.5 rounded-xl transition cursor-pointer font-semibold border border-rose-200/80 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa làm mới toàn bộ</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Export & Print Action Footer (Có nút hạ xuống / mở lên để rút gọn) */}
      {!isCollapsed && (
        <div
          ref={exportPanelRef}
          className="border-t border-slate-200 bg-white sticky bottom-0 z-20 shadow-lg transition-all duration-200"
        >
          {isExportCollapsed ? (
            /* Trạng thái rút gọn (Hạ xuống) */
            <div className="p-2.5 px-3">
              <button
                type="button"
                id="btn-expand-export-panel"
                onClick={handleToggleExportCollapsed}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100/90 hover:to-rose-100/90 border border-pink-200/90 transition cursor-pointer group shadow-2xs"
                title="Bấm để mở bảng công cụ Xuất file & In ấn"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-gradient-to-tr from-pink-600 to-rose-600 text-white shadow-2xs group-hover:scale-105 transition shrink-0">
                    <Printer className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span>Xuất file & In ấn</span>
                      {totalPhotos > 0 && (
                        <span className="text-[10px] font-semibold bg-white text-pink-600 border border-pink-200 px-1.5 py-0.2 rounded-full shrink-0">
                          {pageCount} trang
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">PDF 300 DPI, In A4, PNG, JPG</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-pink-700 bg-white hover:bg-pink-50 border border-pink-200 px-2.5 py-1 rounded-lg transition shadow-2xs shrink-0 ml-1.5">
                  <span>Mở lên</span>
                  <ChevronUp className="w-3.5 h-3.5 text-pink-600 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </button>
            </div>
          ) : (
            /* Trạng thái mở rộng đầy đủ (Mở lên) */
            <div className="p-3.5 pt-2.5 space-y-2">
              {/* Header with Collapse Button (Nút hạ xuống) */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Printer className="w-3.5 h-3.5 text-pink-600" />
                  <span>Xuất file & In ấn</span>
                  {totalPhotos > 0 && (
                    <span className="text-[10.5px] font-semibold text-slate-500">
                      ({pageCount} trang)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  id="btn-collapse-export-panel"
                  onClick={handleToggleExportCollapsed}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-lg transition cursor-pointer border border-slate-200"
                  title="Hạ xuống để rút gọn bảng này"
                >
                  <span>Hạ xuống</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {isExporting && exportProgress && (
                <div className="text-[11px] text-pink-600 font-bold text-center pb-0.5 animate-pulse">
                  Đang xử lý trang {exportProgress.current} / {exportProgress.total}...
                </div>
              )}

              {/* Row 1: Print & Export PDF */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-print"
                  onClick={onPrint}
                  disabled={totalPhotos === 0 || isExporting}
                  className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition shadow-md shadow-pink-500/20 active:scale-95 cursor-pointer truncate"
                  title="In trực tiếp trang A4 (Ctrl+P)"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">In ngay (A4)</span>
                </button>

                {onExportPdf && (
                  <button
                    type="button"
                    id="btn-export-pdf"
                    onClick={onExportPdf}
                    disabled={totalPhotos === 0 || isExporting}
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition shadow-md shadow-red-500/20 active:scale-95 cursor-pointer truncate"
                    title={`Xuất file PDF in ấn chuẩn 300 DPI (${pageCount} trang)`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Xuất PDF</span>
                  </button>
                )}
              </div>

              {/* Row 2: Export PNG & Export JPG */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-export-png"
                  onClick={() => onExport('png')}
                  disabled={totalPhotos === 0 || isExporting}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs active:scale-95 cursor-pointer truncate"
                  title="Xuất file ảnh PNG chất lượng cao"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Xuất PNG</span>
                </button>
                <button
                  type="button"
                  id="btn-export-jpg"
                  onClick={() => onExport('jpeg')}
                  disabled={totalPhotos === 0 || isExporting}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs active:scale-95 cursor-pointer truncate"
                  title="Xuất file ảnh JPG tiết kiệm dung lượng"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Xuất JPG</span>
                </button>
              </div>

              {/* Print 100% Scale Calibration Tip */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-2.5 py-1.5 text-[10.5px] text-amber-900 leading-snug">
                <span className="font-bold text-amber-800">💡 Mẹo in:</span> Khổ giấy A4 , Lề: Không , Tỷ lệ: 100% (Mặc định) , Đồ họa nền.
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
