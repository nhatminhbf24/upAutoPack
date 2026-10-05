import React, { useRef, useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Settings2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  FolderArchive,
} from 'lucide-react';
import { LayoutSettings, SizePreset, OrientationMode, PhotoItem } from '../types';
import { Uploader } from './Uploader';
import { SizePresetSelector } from './SizePresetSelector';

interface SettingsSidebarProps {
  settings: LayoutSettings;
  onUpdateSettings: (updates: Partial<LayoutSettings>) => void;
  pageCount: number;
  totalPhotos: number;
  onAddPhotos: (photos: PhotoItem[]) => void;
  onPrint: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  onExportTransparentPng?: () => void;
  onExportAllPhotosZip?: () => void;
  onExportPdf?: () => void;
  onExportProject?: () => void;
  onImportProject?: (file: File) => void;
  onClearAllPhotos?: () => void;
  isAutoSaved?: boolean;
  isExporting: boolean;
  exportProgress: { current: number; total: number } | null;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  activePreset: SizePreset;
  activePresetId: string;
  onChangeActivePresetId: (id: string) => void;
  autoMatchOrientation: boolean;
  orientationMode?: OrientationMode;
  onChangeOrientationMode?: (mode: OrientationMode) => void;
  customPresets?: SizePreset[];
  onOpenCustomSizeModal?: () => void;
  onUpdatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  onBatchUpdatePhotos?: (photos: PhotoItem[]) => void;
  smartCrop: boolean;
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
  onExportTransparentPng,
  onExportAllPhotosZip,
  onExportPdf,
  onExportProject,
  onImportProject,
  onClearAllPhotos,
  isAutoSaved = false,
  isExporting,
  exportProgress,
  onToast,
  activePreset,
  activePresetId,
  onChangeActivePresetId,
  autoMatchOrientation,
  orientationMode,
  onChangeOrientationMode,
  customPresets = [],
  onOpenCustomSizeModal,
  onUpdatePhoto,
  onBatchUpdatePhotos,
  smartCrop,
  onOpenPngSplitter,
  isCollapsed = false,
  onToggleCollapse,
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

          {/* 1. Uploader Box (Tải ảnh vào trang) (Pastel Green) */}
          <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-200/80 shadow-2xs transition-all duration-200">
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

          {/* 2. CỤM KÍCH THƯỚC (Được hoán đổi từ cột Thao tác hàng loạt sang theo yêu cầu) */}
          <SizePresetSelector
            activePresetId={activePresetId}
            onChangeActivePresetId={onChangeActivePresetId}
            photos={photos}
            onUpdatePhoto={onUpdatePhoto}
            onBatchUpdatePhotos={onBatchUpdatePhotos}
            orientationMode={orientationMode || settings.orientationMode}
            onChangeOrientationMode={onChangeOrientationMode}
            autoMatchOrientation={autoMatchOrientation}
            customPresets={customPresets}
            onOpenCustomSizeModal={onOpenCustomSizeModal}
            smartCrop={smartCrop}
            onToast={onToast}
          />

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
                className="w-full flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100/90 hover:to-rose-100/90 border border-pink-200/90 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md"
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

              {/* Row 2: Export PNG (White paper) & Export JPG */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-export-png"
                  onClick={() => onExport('png')}
                  disabled={totalPhotos === 0 || isExporting}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs active:scale-95 cursor-pointer truncate"
                  title="Xuất file ảnh PNG chất lượng cao có nền trắng giấy in"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Xuất PNG (Nền trắng)</span>
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

              {/* Row 3: Tải PNG Tách Nền (Trong suốt) */}
              <div className="pt-0.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-export-png-transparent"
                    onClick={() => onExportTransparentPng?.()}
                    disabled={totalPhotos === 0 || isExporting}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-2 px-2.5 rounded-xl text-xs transition shadow-sm shadow-purple-500/20 active:scale-95 cursor-pointer truncate"
                    title="Xuất trang A4 định dạng PNG 300 DPI với nền trong suốt (loại bỏ nền trắng giấy in)"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                    <span className="truncate">Tải PNG tách nền (A4)</span>
                  </button>

                  {onExportAllPhotosZip && (
                    <button
                      type="button"
                      id="btn-export-all-photos-zip"
                      onClick={() => onExportAllPhotosZip?.()}
                      disabled={totalPhotos === 0 || isExporting}
                      className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 disabled:opacity-50 font-bold py-2 px-2.5 rounded-xl text-xs transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                      title={`Đóng gói toàn bộ ${totalPhotos} ảnh con đã cắt & tách nền vào 1 file ZIP`}
                    >
                      <FolderArchive className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                      <span>ZIP ảnh con</span>
                    </button>
                  )}
                </div>
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
