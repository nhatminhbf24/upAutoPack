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
  RefreshCw,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Loader2,
  ArrowLeft,
  Printer,
  ChevronRight,
  Info,
  ShieldCheck,
  Maximize2,
} from 'lucide-react';
import {
  splitPngSheet,
  downloadExtractedItemsZip,
  downloadSingleExtractedPng,
  ExtractedImageItem,
  SplitterOptions,
} from '../utils/pngSheetSplitter';
import { PhotoItem, SizePreset } from '../types';
import { readFileAsDataURL, calculateCrop, createOptimizedPreview } from '../utils/imageUtils';
import { findClosestPreset } from '../utils/presetMatcher';

interface PngSplitterWorkspaceProps {
  onBackToHub: () => void;
  onNavigateToA4: () => void;
  onAddPhotosToA4Project: (photos: PhotoItem[]) => void;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  customPresets?: SizePreset[];
  smartCrop?: boolean;
}

export const PngSplitterWorkspace: React.FC<PngSplitterWorkspaceProps> = ({
  onBackToHub,
  onNavigateToA4,
  onAddPhotosToA4Project,
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

  // Algorithm configuration
  const [options, setOptions] = useState<SplitterOptions>({
    alphaThreshold: 15,
    minPixelArea: 150,
    padding: 2,
    mergeDistance: 0,
    whiteBorderWidth: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Core image analysis
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

  // Handle uploaded file
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Clipboard paste support
  useEffect(() => {
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
  }, []);

  const handleToggleSelect = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleRenameItem = (id: string, newName: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

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

  // Download entire folder as ZIP
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

  // Send to A4 Printing Project & switch view
  const handleImportToA4 = async () => {
    const selected = extractedItems.filter((it) => it.selected);
    if (selected.length === 0) {
      onToast('error', 'Chưa chọn ảnh để chuyển');
      return;
    }

    setIsProcessing(true);
    setProgressMsg(`Đang đưa ${selected.length} ảnh vào bàn dàn trang in A4...`);

    try {
      const addedPhotos: PhotoItem[] = [];

      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        const previewSrc = await createOptimizedPreview(item.dataUrl, 800, 0.85);

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

      onAddPhotosToA4Project(addedPhotos);
      onToast('success', `Đã chuyển ${addedPhotos.length} ảnh vào trang in A4`);
      onNavigateToA4();
    } catch (err) {
      console.error('Import to project error:', err);
      onToast('error', 'Lỗi khi nạp ảnh vào dự án');
    } finally {
      setIsProcessing(false);
    }
  };

  // Canvas visual overlay
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (showBoundingBoxes && extractedItems.length > 0) {
        extractedItems.forEach((item, index) => {
          const { minX, minY, maxX, maxY } = item.bbox;
          const boxW = maxX - minX;
          const boxH = maxY - minY;

          ctx.strokeStyle = item.selected ? '#2563eb' : '#94a3b8';
          ctx.lineWidth = Math.max(2, Math.round(sourceDimensions.width / 400));
          ctx.strokeRect(minX, minY, boxW, boxH);

          ctx.fillStyle = item.selected ? 'rgba(37, 99, 235, 0.14)' : 'rgba(148, 163, 184, 0.08)';
          ctx.fillRect(minX, minY, boxW, boxH);

          const badgeSize = Math.max(22, Math.round(sourceDimensions.width / 35));
          ctx.fillStyle = item.selected ? '#2563eb' : '#64748b';
          ctx.beginPath();
          ctx.roundRect(minX, minY, badgeSize, badgeSize, 4);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round(badgeSize * 0.58)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(index + 1), minX + badgeSize / 2, minY + badgeSize / 2);
        });
      }
    };
    img.src = sourceImageSrc;
  }, [sourceImageSrc, extractedItems, showBoundingBoxes, sourceDimensions]);

  const selectedCount = useMemo(() => extractedItems.filter((i) => i.selected).length, [extractedItems]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-900">
      {/* Top Navigation Bar */}
      <header className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 shadow-2xs flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            title="Quay về màn hình chọn công cụ"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Chọn công cụ khác</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Công Cụ Tách Sticker & Sheet PNG</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  Chuyên Dụng
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Right switch to A4 Layout Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateToA4}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 font-bold rounded-xl text-xs transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Sang Dàn Trang In A4</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
        {!sourceImageSrc ? (
          /* Empty / Upload State */
          <div className="max-w-3xl mx-auto py-12 space-y-6 animate-fadeIn">
            <div
              id="splitter-workspace-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 bg-white hover:bg-blue-50/40 rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md group space-y-4 select-none"
            >
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform text-blue-600">
                <Upload className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-slate-800">
                  Kéo & Thả file ảnh PNG hoặc Bấm để tải lên
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Chọn ảnh chứa nhiều chi tiết đã tách biệt (ví dụ: 10 chiếc xe, hoa quả, sticker đồ chơi...). Bạn cũng có thể dán trực tiếp bằng <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-700 font-bold shadow-2xs">Ctrl + V</kbd>.
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Chọn file PNG từ máy tính</span>
                </button>
              </div>
            </div>

            {/* Feature Explain Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="font-bold text-xs text-blue-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Tự động 100%</span>
                </div>
                <p className="text-xs text-slate-500">
                  Tự quét và nhóm các điểm ảnh thành từng đối tượng mà không cần khoanh vùng thủ công.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                  <FolderArchive className="w-4 h-4" />
                  <span>Đóng gói file ZIP</span>
                </div>
                <p className="text-xs text-slate-500">
                  Tải về ngay 1 file ZIP chứa đủ tất cả các ảnh PNG con với nền trong suốt giữ nguyên 100%.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="font-bold text-xs text-purple-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Liên kết Dàn Trang A4</span>
                </div>
                <p className="text-xs text-slate-500">
                  Chuyển nhanh các chi tiết vừa tách sang bàn in A4 để tự động xếp lên giấy in sắc nét.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Splitter Workspace */
          <div className="space-y-4 animate-fadeIn">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              {/* File details & prefix */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Tên tiền tố xuất file:</span>
                  <input
                    type="text"
                    value={prefixName}
                    onChange={(e) => handlePrefixChange(e.target.value)}
                    placeholder="ví dụ: xe_oto, fruit..."
                    className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 w-48 text-slate-800"
                  />
                </div>

                {sourceDimensions && (
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                    Kích thước gốc: {sourceDimensions.width} × {sourceDimensions.height} px
                  </span>
                )}

                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                  Đã phát hiện: {extractedItems.length} chi tiết
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Toggle Bounding Box */}
                <button
                  type="button"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    showBoundingBoxes
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {showBoundingBoxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>Khung quét ({extractedItems.length})</span>
                </button>

                {/* Toggle Fine-tuning */}
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    showSettings
                      ? 'bg-purple-50 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>Bộ lọc & Độ nhạy</span>
                </button>

                {/* Upload other photo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
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

            {/* Fine Tuning Accordion */}
            {showSettings && (
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3 animate-fadeIn">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>Quét lại ngay</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  {/* 1. Alpha Threshold */}
                  <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Độ nhạy Alpha:</span>
                      <span className="text-purple-700 font-mono font-bold">{options.alphaThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="128"
                      value={options.alphaThreshold}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, alphaThreshold: Number(e.target.value) }))
                      }
                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="text-[11px] text-slate-400">Nhận diện viền mờ</span>
                  </div>

                  {/* 2. Min Pixel Area */}
                  <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Lọc bụi (Min):</span>
                      <span className="text-purple-700 font-mono font-bold">{options.minPixelArea}px</span>
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
                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="text-[11px] text-slate-400">Bỏ qua chấm bụi li ti</span>
                  </div>

                  {/* 3. Padding */}
                  <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Đệm viền (Padding):</span>
                      <span className="text-purple-700 font-mono font-bold">+{options.padding}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={options.padding}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, padding: Number(e.target.value) }))
                      }
                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="text-[11px] text-slate-400">Lề trong suốt quanh ảnh</span>
                  </div>

                  {/* 4. Merge Distance */}
                  <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Gom chi tiết gần:</span>
                      <span className="text-purple-700 font-mono font-bold">{options.mergeDistance}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={options.mergeDistance}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, mergeDistance: Number(e.target.value) }))
                      }
                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="text-[11px] text-slate-400">Ghép chữ & icon rời rạc</span>
                  </div>

                  {/* 5. White Contour / Die-cut Border */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Viền trắng Die-cut:</span>
                      <span className="text-amber-700 font-mono font-bold">
                        {options.whiteBorderWidth ? `+${options.whiteBorderWidth}px` : 'Tắt'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-200">
                      {[0, 2, 4, 6].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setOptions((prev) => ({ ...prev, whiteBorderWidth: w }))}
                          className={`flex-1 py-1 rounded text-center text-[10px] font-bold transition cursor-pointer ${
                            (options.whiteBorderWidth || 0) === w
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          {w === 0 ? '0' : `${w}px`}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-400">Tạo viền trắng bế sticker</span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Visual Grid: Left Source Canvas + Right Items Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Visual Bounding Box Preview */}
              <div className="lg:col-span-4 bg-slate-900 rounded-2xl p-4 border border-slate-700 flex flex-col items-center justify-center min-h-[350px] max-h-[550px] overflow-hidden relative shadow-md">
                <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ảnh gốc & Khung quét</span>
                </div>
                <canvas
                  ref={canvasPreviewRef}
                  className="max-w-full max-h-[480px] object-contain rounded-xl shadow-lg"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                />
              </div>

              {/* Right Column: Extracted Cards */}
              <div className="lg:col-span-8 flex flex-col space-y-3">
                {/* Selection & Summary Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
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
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">
                      Đã chọn: <strong className="text-blue-700">{selectedCount}</strong> / {extractedItems.length} ảnh
                    </span>
                  </div>

                  {/* Bulk Actions in Bar */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-workspace-download-zip"
                      onClick={handleDownloadZip}
                      disabled={selectedCount === 0 || isDownloadingZip}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
                    >
                      {isDownloadingZip ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang nén ZIP...</span>
                        </>
                      ) : (
                        <>
                          <FolderArchive className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Tải thư mục ZIP ({selectedCount} ảnh)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="btn-workspace-import-a4"
                      onClick={handleImportToA4}
                      disabled={selectedCount === 0 || isProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-200" />
                      <span>Đưa vào Dàn Trang In A4 ({selectedCount})</span>
                    </button>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto p-1">
                  {extractedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleSelect(item.id)}
                      className={`relative rounded-2xl border p-2.5 flex flex-col gap-2 transition cursor-pointer select-none group shadow-2xs ${
                        item.selected
                          ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                      }`}
                    >
                      {/* Header in card */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                            item.selected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {item.selected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Image Preview with checkered background */}
                      <div
                        className="w-full h-28 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200/90 bg-white"
                        style={{
                          backgroundImage:
                            'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                          backgroundSize: '14px 14px',
                          backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                        }}
                      >
                        <img
                          src={item.dataUrl}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Name & Quick Download */}
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={item.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleRenameItem(item.id, e.target.value)}
                          className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 truncate outline-none focus:border-blue-500"
                        />

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>
                            {item.width} × {item.height}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSingleExtractedPng(item);
                            }}
                            className="p-1 hover:text-blue-600 hover:bg-blue-100 rounded-md transition cursor-pointer text-slate-500"
                            title="Tải riêng ảnh PNG này"
                          >
                            <Download className="w-3.5 h-3.5" />
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

        {/* Progress Alert */}
        {isProcessing && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>{progressMsg || 'Đang xử lý...'}</span>
              </div>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-200 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
