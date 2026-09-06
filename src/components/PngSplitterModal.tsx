import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Scissors,
  Download,
  FolderArchive,
  Upload,
  Layers,
  Sparkles,
  Sliders,
  Check,
  CheckSquare,
  Square,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Loader2,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import {
  splitPngSheet,
  downloadExtractedItemsZip,
  downloadSingleExtractedPng,
  ExtractedImageItem,
  SplitterOptions,
} from '../utils/pngSheetSplitter';
import { PhotoItem, ShapeType, SizePreset } from '../types';
import { readFileAsDataURL, calculateCrop, createOptimizedPreview } from '../utils/imageUtils';
import { findClosestPreset } from '../utils/presetMatcher';

interface PngSplitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPhotosToProject?: (photos: PhotoItem[]) => void;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  customPresets?: SizePreset[];
  smartCrop?: boolean;
}

export const PngSplitterModal: React.FC<PngSplitterModalProps> = ({
  isOpen,
  onClose,
  onAddPhotosToProject,
  onToast,
  customPresets = [],
  smartCrop = false,
}) => {
  const [sourceImageSrc, setSourceImageSrc] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('sticker_sheet');
  const [prefixName, setPrefixName] = useState<string>('sticker');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [extractedItems, setExtractedItems] = useState<ExtractedImageItem[]>([]);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [sourceDimensions, setSourceDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);

  // Filter & Detection Settings
  const [options, setOptions] = useState<SplitterOptions>({
    alphaThreshold: 15,
    minPixelArea: 150,
    padding: 2,
    mergeDistance: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Process and analyze an image source
  const analyzeImage = useCallback(
    async (src: string, fileName: string, customOpts?: Partial<SplitterOptions>, customPrefix?: string) => {
      setIsProcessing(true);
      setProgressPercent(0);
      setProgressMsg('Bắt đầu phân tích hình ảnh...');

      try {
        const baseName = customPrefix || fileName.replace(/\.[^/.]+$/, '').trim() || 'sticker';
        const optsToUse = { ...options, ...customOpts };

        const result = await splitPngSheet(
          src,
          baseName,
          optsToUse,
          (percent, msg) => {
            setProgressPercent(percent);
            setProgressMsg(msg);
          }
        );

        setSourceDimensions({ width: result.sourceWidth, height: result.sourceHeight });
        setExtractedItems(result.items);

        if (result.items.length === 0) {
          onToast('info', 'Không tìm thấy chi tiết nào tách biệt');
        } else {
          onToast('success', `Đã tách được ${result.items.length} chi tiết`);
        }
      } catch (err) {
        console.error('Split PNG error:', err);
        onToast('error', 'Lỗi xử lý file PNG');
      } finally {
        setIsProcessing(false);
      }
    },
    [options, onToast]
  );

  // Load a file from user input
  const handleFile = async (file: File) => {
    if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
      onToast('info', 'Khuyên dùng file PNG có nền trong suốt');
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImageSrc(dataUrl);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setSourceFileName(cleanName);
      setPrefixName(cleanName.toLowerCase().replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_'));
      await analyzeImage(dataUrl, cleanName, undefined, cleanName);
    } catch (e) {
      console.error(e);
      onToast('error', 'Không thể đọc file ảnh');
    }
  };

  // Drag and drop handling
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Clipboard paste support
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleFile(new File([blob], `dan_sticker_${Date.now()}.png`, { type: blob.type }));
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Update item selection
  const handleToggleSelect = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Select all / Deselect all
  const handleSelectAll = (select: boolean) => {
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Rename single item
  const handleRenameItem = (id: string, newName: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

  // Update prefix and rename all items
  const handlePrefixChange = (newPrefix: string) => {
    setPrefixName(newPrefix);
    const safePrefix = newPrefix.trim() || 'sticker';
    setExtractedItems((prev) =>
      prev.map((item, idx) => ({
        ...item,
        name: `${safePrefix}_${String(idx + 1).padStart(2, '0')}.png`,
      }))
    );
  };

  // Download ZIP of selected items
  const handleDownloadZip = async () => {
    const selected = extractedItems.filter((it) => it.selected);
    if (selected.length === 0) {
      onToast('error', 'Chưa chọn ảnh để tải về');
      return;
    }

    setIsDownloadingZip(true);
    try {
      const zipName = `${prefixName || 'bo_anh'}_tach_nen_${selected.length}_anh.zip`;
      onToast('info', `Đang nén ZIP (${selected.length} ảnh)...`);
      await downloadExtractedItemsZip(selected, zipName);
      onToast('success', `Đã tải về file ZIP (${selected.length} ảnh)`);
    } catch (err) {
      console.error('Download ZIP error:', err);
      onToast('error', 'Lỗi khi nén file ZIP');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Add selected items directly to current A4 printing project
  const handleImportToProject = async () => {
    const selected = extractedItems.filter((it) => it.selected);
    if (selected.length === 0) {
      onToast('error', 'Chưa chọn ảnh để chuyển');
      return;
    }

    setIsProcessing(true);
    setProgressMsg(`Đang đưa ${selected.length} ảnh vào dàn trang in A4...`);

    try {
      const addedPhotos: PhotoItem[] = [];

      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        const previewSrc = await createOptimizedPreview(item.dataUrl, 800, 0.85);

        // Find best-fitting preset based on aspect ratio
        const matchedPreset = findClosestPreset(item.width, item.height, customPresets);
        const targetW = matchedPreset.width;
        const targetH = matchedPreset.height;
        const targetShape = matchedPreset.shape;
        const crop = calculateCrop(item.width, item.height, targetW, targetH, smartCrop);

        addedPhotos.push({
          id: `photo_split_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          name: item.name,
          originalSrc: item.dataUrl,
          previewSrc: previewSrc,
          imgWidth: item.width,
          imgHeight: item.height,
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

      if (onAddPhotosToProject) {
        onAddPhotosToProject(addedPhotos);
        onToast('success', `Đã chuyển ${addedPhotos.length} ảnh vào trang in`);
        onClose();
      }
    } catch (err) {
      console.error('Import to project error:', err);
      onToast('error', 'Lỗi khi nạp ảnh vào dự án');
    } finally {
      setIsProcessing(false);
    }
  };

  // Draw bounding boxes on canvas preview
  useEffect(() => {
    if (!sourceImageSrc || !canvasPreviewRef.current || !sourceDimensions) return;

    const canvas = canvasPreviewRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = sourceDimensions.width;
      canvas.height = sourceDimensions.height;

      // Draw background check pattern for transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Overlay bounding boxes if enabled
      if (showBoundingBoxes && extractedItems.length > 0) {
        extractedItems.forEach((item, index) => {
          const { minX, minY, maxX, maxY } = item.bbox;
          const boxW = maxX - minX;
          const boxH = maxY - minY;

          // Box border
          ctx.strokeStyle = item.selected ? '#2563eb' : '#94a3b8';
          ctx.lineWidth = Math.max(2, Math.round(sourceDimensions.width / 400));
          ctx.strokeRect(minX, minY, boxW, boxH);

          // Fill tint
          ctx.fillStyle = item.selected ? 'rgba(37, 99, 235, 0.12)' : 'rgba(148, 163, 184, 0.08)';
          ctx.fillRect(minX, minY, boxW, boxH);

          // Number Badge
          const badgeSize = Math.max(20, Math.round(sourceDimensions.width / 35));
          ctx.fillStyle = item.selected ? '#2563eb' : '#64748b';
          ctx.beginPath();
          ctx.roundRect(minX, minY, badgeSize, badgeSize, 4);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round(badgeSize * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(index + 1), minX + badgeSize / 2, minY + badgeSize / 2);
        });
      }
    };
    img.src = sourceImageSrc;
  }, [sourceImageSrc, extractedItems, showBoundingBoxes, sourceDimensions]);

  const selectedCount = useMemo(() => extractedItems.filter((i) => i.selected).length, [extractedItems]);

  if (!isOpen) return null;

  return (
    <div
      id="png-splitter-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="png-splitter-modal-container"
        className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 tracking-tight">
                  Tách Sticker & Chi Tiết từ Sheet PNG
                </h2>
                {extractedItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {extractedItems.length} chi tiết
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Tự động nhận diện các đối tượng riêng biệt trên nền trong suốt và xuất thành từng file PNG riêng.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Upload / Source Selection Area */}
          {!sourceImageSrc ? (
            <div
              id="splitter-drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-10 text-center cursor-pointer transition-all group select-none space-y-3"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-blue-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform text-blue-600">
                <Upload className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Kéo & Thả file ảnh PNG hoặc Bấm để tải lên
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Chọn ảnh chứa nhiều chi tiết đã tách nền (như bộ sticker xe cộ, đồ chơi, thú cưng...).
                  Bạn cũng có thể dán trực tiếp bằng phím <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-700 font-bold shadow-2xs">Ctrl+V</kbd>.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Chọn file PNG từ máy</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Workflow: Controls & Gallery */
            <div className="space-y-4">
              {/* Top Action Bar: Prefix & File Info & Re-upload */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Tên tiền tố file:</span>
                  <input
                    type="text"
                    value={prefixName}
                    onChange={(e) => handlePrefixChange(e.target.value)}
                    placeholder="ví dụ: sticker, oto, fruit..."
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 w-44"
                  />
                  {sourceDimensions && (
                    <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {sourceDimensions.width} × {sourceDimensions.height} px
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Bounding Boxes */}
                  <button
                    type="button"
                    onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      showBoundingBoxes
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Bật/Tắt xem khung quét nhận diện"
                  >
                    {showBoundingBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>Khung quét ({extractedItems.length})</span>
                  </button>

                  {/* Settings Accordion Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      showSettings
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-600" />
                    <span>Bộ lọc & Độ nhạy</span>
                  </button>

                  {/* Change Image Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Đổi ảnh khác</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Collapsible Fine-Tuning Settings Bar */}
              {showSettings && (
                <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-950 border-b border-purple-200/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-purple-600" />
                      <span>Tùy chỉnh thuật toán quét điểm ảnh (Alpha Scanning)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        sourceImageSrc && analyzeImage(sourceImageSrc, sourceFileName, options, prefixName)
                      }
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>Quét lại ngay</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* 1. Alpha Threshold */}
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200 space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Độ nhạy Alpha:</span>
                        <span className="text-purple-700 font-mono">{options.alphaThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="128"
                        value={options.alphaThreshold}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, alphaThreshold: Number(e.target.value) }))
                        }
                        className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <span className="text-[10px] text-slate-400">Giá trị nhỏ để quét các viền mờ</span>
                    </div>

                    {/* 2. Min Pixel Area (Noise / Dust Filter) */}
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200 space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Lọc bụi (Min pixels):</span>
                        <span className="text-purple-700 font-mono">{options.minPixelArea}px</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="2000"
                        step="10"
                        value={options.minPixelArea}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, minPixelArea: Number(e.target.value) }))
                        }
                        className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <span className="text-[10px] text-slate-400">Bỏ qua các chấm bụi li ti</span>
                    </div>

                    {/* 3. Padding */}
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200 space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Đệm viền (Padding):</span>
                        <span className="text-purple-700 font-mono">+{options.padding}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={options.padding}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, padding: Number(e.target.value) }))
                        }
                        className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <span className="text-[10px] text-slate-400">Thêm lề trong suốt quanh ảnh</span>
                    </div>

                    {/* 4. Merge Distance */}
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200 space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Gom chi tiết gần:</span>
                        <span className="text-purple-700 font-mono">{options.mergeDistance}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={options.mergeDistance}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, mergeDistance: Number(e.target.value) }))
                        }
                        className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <span className="text-[10px] text-slate-400">Ghép chữ & icon rời nhau</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area: Left Bounding Box Canvas + Right Results Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Visual Bounding Box Preview (4 cols on lg) */}
                <div className="lg:col-span-4 bg-slate-900/90 rounded-xl p-3 border border-slate-700 flex flex-col items-center justify-center min-h-[220px] max-h-[380px] overflow-hidden relative group">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                    Ảnh gốc & Khung quét
                  </div>
                  <canvas
                    ref={canvasPreviewRef}
                    className="max-w-full max-h-[320px] object-contain rounded-lg shadow-sm"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  />
                </div>

                {/* Extracted Items Grid (8 cols on lg) */}
                <div className="lg:col-span-8 flex flex-col space-y-2">
                  {/* Selection Toolbar */}
                  <div className="flex items-center justify-between px-2 py-1.5 bg-slate-100/90 rounded-lg text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectAll(selectedCount !== extractedItems.length)}
                        className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold transition cursor-pointer"
                      >
                        {selectedCount === extractedItems.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span>
                          {selectedCount === extractedItems.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </span>
                      </button>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">
                        Đã chọn: <strong className="text-blue-700">{selectedCount}</strong> / {extractedItems.length} ảnh
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Tất cả ảnh xuất ra đều giữ nguyên độ trong suốt 100%
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto p-1">
                    {extractedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleSelect(item.id)}
                        className={`relative rounded-xl border p-2 flex flex-col gap-1.5 transition cursor-pointer select-none group ${
                          item.selected
                            ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                        }`}
                      >
                        {/* Checkbox & Badge */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                              item.selected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {item.selected && <Check className="w-3 h-3" />}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 rounded">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Image Preview with Checkered Background */}
                        <div
                          className="w-full h-24 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200/80"
                          style={{
                            backgroundImage:
                              'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                            backgroundSize: '12px 12px',
                            backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                          }}
                        >
                          <img
                            src={item.dataUrl}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Dimensions & Name */}
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleRenameItem(item.id, e.target.value)}
                            className="w-full text-[11px] font-semibold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 truncate outline-none focus:border-blue-400"
                          />

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>
                              {item.width} × {item.height}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadSingleExtractedPng(item);
                              }}
                              className="p-1 hover:text-blue-600 hover:bg-blue-100/50 rounded transition cursor-pointer"
                              title="Tải riêng file PNG này"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator when Processing */}
          {isProcessing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>{progressMsg || 'Đang xử lý...'}</span>
                </div>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {extractedItems.length > 0 && (
              <span>
                Đang sẵn sàng xuất <strong>{selectedCount}</strong> file PNG tách nền chất lượng cao
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>

            {extractedItems.length > 0 && (
              <>
                {/* 1. Download ZIP Archive Button */}
                <button
                  type="button"
                  id="btn-download-split-zip"
                  onClick={handleDownloadZip}
                  disabled={selectedCount === 0 || isDownloadingZip}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
                >
                  {isDownloadingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang nén ZIP...</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-4 h-4 text-emerald-200" />
                      <span>Tải thư mục ZIP ({selectedCount} ảnh)</span>
                    </>
                  )}
                </button>

                {/* 2. Import into A4 Printing Project */}
                {onAddPhotosToProject && (
                  <button
                    type="button"
                    id="btn-import-split-to-a4"
                    onClick={handleImportToProject}
                    disabled={selectedCount === 0 || isProcessing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
                  >
                    <Layers className="w-4 h-4 text-blue-200" />
                    <span>Đưa vào Dàn Trang In A4 ({selectedCount})</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
