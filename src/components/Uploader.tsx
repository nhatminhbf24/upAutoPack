import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Images, Plus, Loader2, FileImage, Save, FolderOpen, ChevronDown } from 'lucide-react';
import { PhotoItem, ShapeType, SizePreset } from '../types';
import { readFileAsDataURL, getImageDimensions, calculateCrop, createOptimizedPreview, getOrientedDimensions } from '../utils/imageUtils';

interface UploaderProps {
  onAddPhotos: (newPhotos: PhotoItem[]) => void;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  activePreset: SizePreset;
  autoMatchOrientation: boolean;
  smartCrop: boolean;
  customPresets?: SizePreset[];
  onOpenPngSplitter?: () => void;
  onExportProject?: () => void;
  onImportProject?: (file: File) => void;
}

export const Uploader: React.FC<UploaderProps> = ({
  onAddPhotos,
  onToast,
  activePreset,
  autoMatchOrientation,
  smartCrop,
  customPresets = [],
  onOpenPngSplitter,
  onExportProject,
  onImportProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const projectDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number } | null>(null);

  // Close project dropdown on click outside or Escape
  useEffect(() => {
    if (!isProjectDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProjectDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProjectDropdownOpen]);

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportProject) {
      onImportProject(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|jfif|bmp|gif|svg)$/i.test(f.name)
    );

    if (files.length === 0) {
      onToast('error', 'Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP, v.v.)');
      return;
    }

    setIsProcessing(true);
    setUploadProgress({ current: 0, total: files.length, percent: 0 });
    const addedPhotos: PhotoItem[] = [];

    try {
      // Process files in small asynchronous chunks to keep main thread 100% fluid
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({
          current: i + 1,
          total: files.length,
          percent: Math.round(((i + 1) / files.length) * 100),
        });

        try {
          const dataUrl = await readFileAsDataURL(file);
          const dims = await getImageDimensions(dataUrl);

          // Generate lightweight preview for buttery smooth UI rendering (60fps)
          const previewSrc = await createOptimizedPreview(dataUrl, 800, 0.85);

          // Determine target dimensions based on active preset configured on the app
          let targetW = activePreset.width;
          let targetH = activePreset.height;
          const targetShape: ShapeType = activePreset.shape;

          if (autoMatchOrientation && targetShape === 'rect') {
            const oriented = getOrientedDimensions(dims.width, dims.height, targetW, targetH, true, targetShape);
            targetW = oriented.targetWidth;
            targetH = oriented.targetHeight;
          }

          const crop = calculateCrop(dims.width, dims.height, targetW, targetH, smartCrop);

          addedPhotos.push({
            id: 'photo_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now() + '_' + i,
            name: file.name || 'Ảnh tải lên',
            originalSrc: dataUrl,
            previewSrc: previewSrc,
            imgWidth: dims.width,
            imgHeight: dims.height,
            targetWidth: targetW,
            targetHeight: targetH,
            shape: targetShape,
            qty: 1,
            scale: 1,
            cropX: crop.cropX,
            cropY: crop.cropY,
            cropW: crop.cropW,
            cropH: crop.cropH,
            rotation: 0,
          });
        } catch (err) {
          console.error('Error processing single image:', err);
        }

        // Yield to browser main thread every 2 images to avoid UI frame drop
        if (i % 2 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      if (addedPhotos.length > 0) {
        onAddPhotos(addedPhotos);
        const portraitCount = addedPhotos.filter((p) => p.targetHeight >= p.targetWidth).length;
        const landscapeCount = addedPhotos.length - portraitCount;
        const detailMsg =
          portraitCount > 0 && landscapeCount > 0
            ? ` (${portraitCount} ảnh dọc, ${landscapeCount} ảnh ngang)`
            : '';
        onToast('success', `Đã nạp ${addedPhotos.length} ảnh${detailMsg} theo khổ ${activePreset.label}!`);
      } else {
        onToast('error', 'Không thể đọc nội dung file ảnh.');
      }
    } catch (e) {
      console.error('Error in batch upload:', e);
      onToast('error', 'Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clipboard Paste Support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            imageFiles.push(new File([blob], `paste_${Date.now()}.png`, { type: blob.type }));
          }
        }
      }

      if (imageFiles.length > 0) {
        processFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activePreset, autoMatchOrientation, smartCrop, customPresets]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const loadSamplePhotos = async () => {
    setIsProcessing(true);
    const sampleUrls = [
      {
        name: 'Chân dung 1.jpg',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      },
      {
        name: 'Phong cảnh 2.jpg',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      },
      {
        name: 'Thú cưng 3.jpg',
        url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
      },
    ];

    try {
      const addedPhotos: PhotoItem[] = [];
      for (const sample of sampleUrls) {
        const dims = await getImageDimensions(sample.url);
        const previewSrc = await createOptimizedPreview(sample.url, 800, 0.85);
        let targetW = activePreset.width;
        let targetH = activePreset.height;
        const targetShape: ShapeType = activePreset.shape;

        if (autoMatchOrientation && targetShape === 'rect') {
          const oriented = getOrientedDimensions(dims.width, dims.height, targetW, targetH, true, targetShape);
          targetW = oriented.targetWidth;
          targetH = oriented.targetHeight;
        }

        const crop = calculateCrop(dims.width, dims.height, targetW, targetH, smartCrop);
        addedPhotos.push({
          id: 'sample_' + Math.random().toString(36).substring(2, 9),
          name: sample.name,
          originalSrc: sample.url,
          previewSrc: previewSrc,
          imgWidth: dims.width,
          imgHeight: dims.height,
          targetWidth: targetW,
          targetHeight: targetH,
          shape: targetShape,
          qty: 1,
          scale: 1,
          cropX: crop.cropX,
          cropY: crop.cropY,
          cropW: crop.cropW,
          cropH: crop.cropH,
          rotation: 0,
        });
      }
      onAddPhotos(addedPhotos);
      onToast('success', `Đã nạp 3 ảnh mẫu theo khổ ${activePreset.label}!`);
    } catch (e) {
      console.error(e);
      onToast('error', 'Không thể tải ảnh mẫu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="uploader-section" className="space-y-2">
      {/* Header cùng dòng: TẢI ẢNH LÊN + Dropdown Dự án (Image 1) + Nút ảnh mẫu */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-rose-950 font-bold shrink-0">
          <FileImage className="w-4 h-4 text-rose-600" />
          <h2 className="text-xs uppercase tracking-wide">Tải ảnh lên</h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Streamlined Project Dropdown (Lưu / Mở dự án .daudau) */}
          {(onExportProject || onImportProject) && (
            <div className="relative" ref={projectDropdownRef}>
              <button
                type="button"
                id="btn-project-dropdown"
                onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
                className={`h-7 flex items-center gap-1 px-2.5 rounded-lg border transition cursor-pointer shadow-2xs text-xs font-semibold ${
                  isProjectDropdownOpen
                    ? 'bg-slate-200/90 text-slate-900 border-slate-300'
                    : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300'
                }`}
                title="Quản lý dự án: Lưu hoặc Mở tệp .daudau"
              >
                <Save className="w-3.5 h-3.5 text-slate-600" />
                <span>Dự án</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu (Image 1 style) */}
              {isProjectDropdownOpen && (
                <div
                  id="project-menu-popover"
                  className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 z-50 animate-fadeIn space-y-0.5"
                >
                  {onExportProject && (
                    <button
                      type="button"
                      id="btn-menu-export-daudau"
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onExportProject();
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-emerald-50/70 text-left transition cursor-pointer group"
                    >
                      <div className="p-0.5 text-emerald-600 shrink-0 mt-0.5">
                        <Save className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-slate-900 group-hover:text-emerald-950 transition leading-tight">
                          Lưu tệp .daudau
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Tải về máy để dùng lại sau
                        </div>
                      </div>
                    </button>
                  )}

                  {onImportProject && (
                    <button
                      type="button"
                      id="btn-menu-import-daudau"
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        projectInputRef.current?.click();
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-blue-50/70 text-left transition cursor-pointer group"
                    >
                      <div className="p-0.5 text-blue-600 shrink-0 mt-0.5">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-slate-900 group-hover:text-blue-950 transition leading-tight">
                          Mở tệp .daudau
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Nhập dự án từ máy tính
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Hidden file input for .daudau */}
              <input
                type="file"
                ref={projectInputRef}
                accept=".daudau,.zip"
                className="hidden"
                onChange={handleProjectFileChange}
              />
            </div>
          )}

          <button
            type="button"
            id="btn-load-sample"
            onClick={loadSamplePhotos}
            disabled={isProcessing}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/95 hover:bg-rose-50 hover:border-rose-300 border border-rose-200 text-rose-500 hover:text-rose-600 transition shadow-2xs cursor-pointer active:scale-90 disabled:opacity-50"
            title="Thử ngay với ảnh mẫu có sẵn (Chân dung, phong cảnh, thú cưng)"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
            ) : (
              <Images className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id="file-upload-input"
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Main Upload Dropzone (Ô cấu hình trùng lặp đã được gỡ bỏ theo yêu cầu) */}
      <div
        id="drop-zone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group select-none ${
          isDragging
            ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 scale-[0.99]'
            : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 hover:border-blue-400'
        }`}
      >
        <div className="w-10 h-10 mx-auto bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadCloud className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
          )}
        </div>

        <div className="text-[13px] font-bold text-gray-800 mb-0.5">
          {isProcessing
            ? `Đang tối ưu & nạp ảnh ${uploadProgress ? `(${uploadProgress.current}/${uploadProgress.total})` : ''}...`
            : 'Kéo thả hoặc Nhấp để chọn ảnh'}
        </div>

        {uploadProgress ? (
          <div className="mt-2 space-y-1">
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-blue-600 font-bold">
              {uploadProgress.percent}% hoàn tất (Giảm tải bộ nhớ siêu tốc)
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-gray-500">
            Tự định dạng sang <strong className="text-blue-700 font-semibold">{activePreset.label}</strong>
            {autoMatchOrientation ? ' (Tự khớp chiều)' : ''}
          </p>
        )}

        <button
          type="button"
          id="btn-select-photos-device"
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Chọn ảnh từ máy</span>
        </button>
      </div>
    </div>
  );
};
