import React, { useRef } from 'react';
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
  Maximize,
  FlipHorizontal,
  Tag,
  Crosshair,
  Ruler,
  Copy,
} from 'lucide-react';
import { LayoutSettings, SizePreset } from '../types';
import { Uploader } from './Uploader';
import { PhotoItem } from '../types';

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
  customPresets?: SizePreset[];
  onOpenPngSplitter?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClonePage1AsBackside?: () => void;
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
  customPresets = [],
  onOpenPngSplitter,
  isCollapsed = false,
  onToggleCollapse,
  onClonePage1AsBackside,
  photos = [],
}) => {
  const projectInputRef = useRef<HTMLInputElement | null>(null);

  // Thống kê các nhãn mã đơn đã gán trên các ảnh
  const orderTagsSummary = React.useMemo(() => {
    if (!photos || photos.length === 0) return [];
    const tagMap = new Map<string, number>();
    photos.forEach((p) => {
      const tag = p.orderTag?.trim();
      if (tag) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + (p.qty || 1));
      }
    });
    return Array.from(tagMap.entries()).map(([tag, count]) => ({ tag, count }));
  }, [photos]);

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportProject) {
      onImportProject(file);
    }
    if (e.target) {
      e.target.value = '';
    }
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
          <div className="bg-rose-50/60 rounded-xl p-3.5 border border-rose-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-1.5 text-rose-950 font-bold">
              <FileImage className="w-4 h-4 text-rose-600" />
              <h2 className="text-xs uppercase tracking-wide">Tải ảnh vào trang</h2>
            </div>

            <Uploader
              onAddPhotos={onAddPhotos}
              onToast={onToast}
              activePreset={activePreset}
              autoMatchOrientation={autoMatchOrientation}
              smartCrop={settings.smartCrop}
              customPresets={customPresets}
              onOpenPngSplitter={onOpenPngSplitter}
            />
          </div>

          {/* 2. General Settings (Cài đặt lề & khoảng cách) (Pastel Slate/Indigo) */}
          <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-200/80 shadow-2xs space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-indigo-200 shadow-2xs">
                <label className="block text-[10px] text-indigo-900 font-bold uppercase mb-1">
                  Lề trang (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={settings.margin}
                  onChange={(e) => onUpdateSettings({ margin: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full bg-indigo-50/30 border border-indigo-200 rounded-md px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-200 shadow-2xs">
                <label className="block text-[10px] text-indigo-900 font-bold uppercase mb-1">
                  K.Cách ảnh (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={settings.gap}
                  onChange={(e) => onUpdateSettings({ gap: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full bg-indigo-50/30 border border-indigo-200 rounded-md px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* 1. Tự động sắp xếp ảnh */}
            <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-50/60 transition select-none shadow-2xs">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-950">Tự động sắp xếp ảnh</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.autoNesting)}
                onChange={(e) => onUpdateSettings({ autoNesting: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </label>

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

              {settings.cutLines && (
                <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-500 font-medium shrink-0">Kiểu:</span>
                  <div className="grid grid-cols-2 gap-1 flex-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ cutStyle: 'full_trim_guides' })}
                      className={`py-1.5 px-1 rounded text-center font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        settings.cutStyle === 'full_trim_guides'
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
                      onClick={() => onUpdateSettings({ cutStyle: 'corner_marks' })}
                      className={`py-1.5 px-1 rounded text-center font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        (settings.cutStyle || 'dashed') === 'corner_marks'
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
                      onClick={() => onUpdateSettings({ cutStyle: 'dashed' })}
                      className={`py-1.5 px-1 rounded text-center font-bold transition cursor-pointer ${
                        (settings.cutStyle || 'dashed') === 'dashed'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Nét đứt mờ xung quanh"
                    >
                      Nét đứt
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ cutStyle: 'solid' })}
                      className={`py-1.5 px-1 rounded text-center font-bold transition cursor-pointer ${
                        settings.cutStyle === 'solid'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Nét liền mảnh"
                    >
                      Nét liền
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Bù xén tràn lề (Bleed) */}
            <div className="bg-white rounded-lg border border-indigo-200 p-2.5 shadow-2xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Maximize className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block leading-tight">Tràn lề bù xén (Bleed)</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">Tránh lộ viền trắng khi cắt</span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-indigo-50/60 p-0.5 rounded-md border border-indigo-200 text-xs font-bold">
                {[0, 1, 2].map((mm) => (
                  <button
                    key={mm}
                    type="button"
                    onClick={() => onUpdateSettings({ bleed: mm })}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      (settings.bleed || 0) === mm
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-indigo-900 hover:bg-indigo-100'
                    }`}
                  >
                    {mm === 0 ? '0' : `+${mm}mm`}
                  </button>
                ))}
              </div>
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

              {/* Nút 1-Click: Nhân bản Trang 1 làm mặt sau */}
              {onClonePage1AsBackside && totalPhotos > 0 && (
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

            {/* 5. In mã đơn hàng ở lề giấy A4 (Order Slug Header/Footer) */}
            <div className="bg-white rounded-lg border border-slate-300 p-2.5 space-y-2.5 shadow-2xs">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">In mã đơn ở lề giấy</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">Tránh lẫn lộn xấp in của khách</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.printSlug)}
                  onChange={(e) => onUpdateSettings({ printSlug: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer shrink-0 ml-2"
                />
              </label>

              {settings.printSlug && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  {/* Vị trí in: Chân trang (Rộng rãi) vs Đầu trang */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Vị trí in lề giấy:</span>
                      <span className="text-emerald-700 font-bold">
                        {(settings.slugPosition || 'bottom') === 'bottom' ? 'Chân trang rộng nhất' : 'Đầu trang'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ slugPosition: 'bottom' })}
                        className={`py-1 px-2 rounded-md text-center text-[10.5px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                          (settings.slugPosition || 'bottom') === 'bottom'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Chân trang A4 là nơi giấy thừa rộng rãi nhất, không sợ bị đè lên ảnh"
                      >
                        <span>Chân trang</span>
                        <span className="text-[9px] opacity-85 font-normal">(Khuyên dùng)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ slugPosition: 'top' })}
                        className={`py-1 px-2 rounded-md text-center text-[10.5px] font-bold transition cursor-pointer ${
                          settings.slugPosition === 'top'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="In ở lề mép trên cùng của trang"
                      >
                        <span>Đầu trang</span>
                      </button>
                    </div>
                  </div>

                  {/* Nhập mã đơn / tên khách */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Nhập tên khách / Mã đơn (vd: #DH1024 - Khách Hà)"
                      value={settings.orderSlug || ''}
                      onChange={(e) => onUpdateSettings({ orderSlug: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-400 font-medium"
                    />

                    {/* Gợi ý nhanh từ các nhãn đơn đã gán trên ảnh */}
                    {orderTagsSummary.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[9.5px] text-slate-400 font-medium">Đơn trên ảnh:</span>
                        {orderTagsSummary.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const current = settings.orderSlug?.trim() || '';
                              const addition = `${item.tag} (${item.count} ảnh)`;
                              if (!current) {
                                onUpdateSettings({ orderSlug: addition });
                              } else if (!current.includes(item.tag)) {
                                onUpdateSettings({ orderSlug: `${current} | ${addition}` });
                              }
                            }}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 text-[9.5px] font-bold transition cursor-pointer flex items-center gap-1"
                            title="Bấm để chèn nhanh đơn này vào thông tin lề giấy"
                          >
                            <span>{item.tag}</span>
                            <span className="text-purple-400">({item.count})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tùy chọn In mã đơn mini ngoài mép xén (Micro Trim Slug) */}
                  <label className="flex items-start gap-2 p-1.5 bg-purple-50/70 border border-purple-200/80 rounded-md cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.printMicroSlugs)}
                      onChange={(e) => onUpdateSettings({ printMicroSlugs: e.target.checked })}
                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer mt-0.5 shrink-0"
                    />
                    <div>
                      <span className="text-[11px] font-bold text-purple-950 block leading-tight">
                        In mã đơn mini ngoài mép xén
                      </span>
                      <span className="text-[9.5px] text-purple-700 leading-tight block mt-0.5">
                        Chữ 5pt nằm ngoài đường cắt. Xén dao xong sẽ rụng mất giấy thừa, thợ nhìn biết ngay ảnh của ai.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 3. Dự án & Tệp tin (.daudau session) */}
          <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-200/90 shadow-2xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-export-daudau"
                onClick={onExportProject}
                disabled={totalPhotos === 0 || isExporting}
                className="flex items-center justify-center gap-1.5 bg-white hover:bg-amber-100/70 disabled:opacity-50 text-amber-950 border border-amber-300 font-bold py-2 px-2 rounded-xl text-xs transition shadow-2xs cursor-pointer active:scale-95"
                title="Xuất file dự án (.daudau) lưu sang USB hoặc gửi cho người khác"
              >
                <Save className="w-3.5 h-3.5 text-amber-700" />
                <span>Lưu .daudau</span>
              </button>

              <button
                type="button"
                id="btn-import-daudau"
                onClick={() => projectInputRef.current?.click()}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 bg-white hover:bg-amber-100/70 disabled:opacity-50 text-amber-950 border border-amber-300 font-bold py-2 px-2 rounded-xl text-xs transition shadow-2xs cursor-pointer active:scale-95"
                title="Mở file dự án (.daudau hoặc .zip) để nạp lại toàn bộ trạng thái"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>Mở dự án</span>
              </button>
            </div>

            {/* Hidden file input for .daudau */}
            <input
              type="file"
              ref={projectInputRef}
              accept=".daudau,.zip"
              className="hidden"
              onChange={handleProjectFileChange}
            />

            {totalPhotos > 0 && onClearAllPhotos && (
              <button
                type="button"
                id="btn-clear-project"
                onClick={onClearAllPhotos}
                className="w-full flex items-center justify-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50/70 py-1 rounded-lg transition cursor-pointer font-semibold border border-transparent hover:border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa làm mới toàn bộ</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Export & Print Action Footer */}
      {!isCollapsed && (
        <div className="p-3.5 border-t border-slate-200 bg-white space-y-2 sticky bottom-0 z-20 shadow-lg">
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
    </aside>
  );
};
