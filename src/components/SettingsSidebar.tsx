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
} from 'lucide-react';
import { LayoutSettings, ShapeType, SizePreset } from '../types';
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
  defaultSize: { width: number; height: number; shape: ShapeType };
  customPresets?: SizePreset[];
  onOpenPngSplitter?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  defaultSize,
  customPresets = [],
  onOpenPngSplitter,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const projectInputRef = useRef<HTMLInputElement | null>(null);

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
              defaultSize={defaultSize}
              smartCrop={settings.smartCrop}
              customPresets={customPresets}
              onOpenPngSplitter={onOpenPngSplitter}
            />
          </div>

          {/* 2. General Settings (Cài đặt lề & khoảng cách) (Pastel Slate/Indigo) */}
          <div className="bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs uppercase tracking-wide">Cài đặt lề & khoảng cách</h2>
            </div>

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

            {/* 1. Tối ưu ghép khít */}
            <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-50/60 transition select-none shadow-2xs">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-950">Tối ưu ghép khít (Nesting)</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.autoNesting)}
                onChange={(e) => onUpdateSettings({ autoNesting: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            {/* 2. Nét đứt dọc giấy */}
            <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50 transition select-none shadow-2xs">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">Nét đứt đường cắt ảnh</span>
              </div>
              <input
                type="checkbox"
                checked={settings.cutLines}
                onChange={(e) => onUpdateSettings({ cutLines: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </label>
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
                <span className="truncate">Xuất PDF ({pageCount} tr)</span>
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
        </div>
      )}
    </aside>
  );
};
