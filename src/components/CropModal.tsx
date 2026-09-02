import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  Move,
  Sparkles,
  Loader2,
  Eye,
  Crop,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { PhotoItem, ShapeType, ImageAdjustments, DEFAULT_ADJUSTMENTS } from '../types';
import { rotateImageBase64, calculateCrop, createOptimizedPreview } from '../utils/imageUtils';
import { enhanceImageQuality, calculatePrintDPI } from '../utils/imageEnhancer';
import { PhotoAdjustmentsPanel } from './PhotoAdjustmentsPanel';
import {
  applyAdjustmentsToImage,
  calculateAutoAdjustments,
} from '../utils/imageAdjustmentEngine';

interface CropModalProps {
  photo: PhotoItem | null;
  onClose: () => void;
  onSave: (photoId: string, updates: Partial<PhotoItem>) => void;
  smartCrop: boolean;
  initialTab?: 'crop' | 'adjust';
}

export const CropModal: React.FC<CropModalProps> = ({
  photo,
  onClose,
  onSave,
  smartCrop,
  initialTab = 'crop',
}) => {
  if (!photo) return null;

  const [activeTab, setActiveTab] = useState<'crop' | 'adjust'>(initialTab);
  const [scale, setScale] = useState(photo.scale || 1);
  const [cropX, setCropX] = useState(photo.cropX);
  const [cropY, setCropY] = useState(photo.cropY);
  const [shape, setShape] = useState<ShapeType>(photo.shape);
  const [isDragging, setIsDragging] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(photo.isEnhanced || false);
  const [currentBaseSrc, setCurrentBaseSrc] = useState(photo.originalSrc);
  const [rawSrc, setRawSrc] = useState(photo.rawOriginalSrc || photo.originalSrc);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showOriginalComparison, setShowOriginalComparison] = useState(false);

  // Adjustments state matching screenshot
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(
    photo.adjustments ? { ...photo.adjustments } : { ...DEFAULT_ADJUSTMENTS }
  );
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false);
  const [previewAdjustedSrc, setPreviewAdjustedSrc] = useState<string>(photo.originalSrc);
  const [isApplyingAdjustmentPreview, setIsApplyingAdjustmentPreview] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; startCropX: number; startCropY: number }>({
    x: 0,
    y: 0,
    startCropX: 0,
    startCropY: 0,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced live update for canvas adjustments preview
  const updateAdjustmentPreview = useCallback((baseImage: string, adj: ImageAdjustments) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await applyAdjustmentsToImage(baseImage, adj);
        setPreviewAdjustedSrc(result);
      } catch (err) {
        console.error('Failed previewing adjustments:', err);
      }
    }, 40);
  }, []);

  useEffect(() => {
    updateAdjustmentPreview(currentBaseSrc, adjustments);
  }, [currentBaseSrc, adjustments, updateAdjustmentPreview]);

  const actualCropW = photo.cropW / scale;
  const actualCropH = photo.cropH / scale;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startCropX: cropX,
      startCropY: cropY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Scale displacement to original image pixel coordinates
    const containerEl = e.currentTarget as HTMLDivElement;
    const rect = containerEl.getBoundingClientRect();
    const pxScaleX = actualCropW / rect.width;
    const pxScaleY = actualCropH / rect.height;

    let newX = dragStartRef.current.startCropX - dx * pxScaleX;
    let newY = dragStartRef.current.startCropY - dy * pxScaleY;

    newX = Math.max(0, Math.min(newX, photo.imgWidth - actualCropW));
    newY = Math.max(0, Math.min(newY, photo.imgHeight - actualCropH));

    setCropX(newX);
    setCropY(newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleScaleChange = (newScale: number) => {
    const oldActualW = photo.cropW / scale;
    const oldActualH = photo.cropH / scale;
    const centerX = cropX + oldActualW / 2;
    const centerY = cropY + oldActualH / 2;

    const newActualW = photo.cropW / newScale;
    const newActualH = photo.cropH / newScale;

    let newX = centerX - newActualW / 2;
    let newY = centerY - newActualH / 2;

    newX = Math.max(0, Math.min(newX, photo.imgWidth - newActualW));
    newY = Math.max(0, Math.min(newY, photo.imgHeight - newActualH));

    setScale(newScale);
    setCropX(newX);
    setCropY(newY);
  };

  const handleToggleEnhance = async () => {
    if (isEnhancing) return;
    setIsEnhancing(true);

    try {
      if (isEnhanced) {
        // Revert to unenhanced
        setCurrentBaseSrc(rawSrc);
        setIsEnhanced(false);
      } else {
        // Run enhance
        const res = await enhanceImageQuality(rawSrc, {
          sharpenAmount: 0.52,
          contrastAmount: 0.13,
          brightnessAmount: 0.04,
          vibranceAmount: 0.18,
        });
        setCurrentBaseSrc(res.enhancedSrc);
        setIsEnhanced(true);
      }
    } catch (err) {
      console.error('Failed to enhance in modal:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAutoAdjust = async () => {
    if (isAutoAdjusting) return;
    setIsAutoAdjusting(true);
    try {
      const calculated = await calculateAutoAdjustments(currentBaseSrc);
      setAdjustments(calculated);
    } catch (err) {
      console.error('Auto adjust failed:', err);
    } finally {
      setIsAutoAdjusting(false);
    }
  };

  const handleRotate = async () => {
    const rotatedBase = await rotateImageBase64(currentBaseSrc, 90);
    const rotatedRaw = await rotateImageBase64(rawSrc, 90);
    const newWidth = photo.imgHeight;
    const newHeight = photo.imgWidth;
    const crop = calculateCrop(newWidth, newHeight, photo.targetWidth, photo.targetHeight, smartCrop);

    setCurrentBaseSrc(rotatedBase);
    setRawSrc(rotatedRaw);

    const finalAdjusted = await applyAdjustmentsToImage(rotatedBase, adjustments);
    const previewSrc = await createOptimizedPreview(finalAdjusted, 800, 0.85);

    onSave(photo.id, {
      originalSrc: finalAdjusted,
      previewSrc: previewSrc,
      rawOriginalSrc: rotatedRaw,
      isEnhanced,
      adjustments,
      imgWidth: newWidth,
      imgHeight: newHeight,
      cropX: crop.cropX,
      cropY: crop.cropY,
      cropW: crop.cropW,
      cropH: crop.cropH,
      scale: 1,
    });
    onClose();
  };

  const handleSave = async () => {
    setIsApplyingAdjustmentPreview(true);
    try {
      const finalImageSrc = await applyAdjustmentsToImage(currentBaseSrc, adjustments);
      const previewSrc = await createOptimizedPreview(finalImageSrc, 800, 0.85);
      onSave(photo.id, {
        originalSrc: finalImageSrc,
        previewSrc: previewSrc,
        rawOriginalSrc: rawSrc,
        isEnhanced,
        adjustments,
        scale,
        cropX,
        cropY,
        shape,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save adjusted photo:', err);
      onClose();
    } finally {
      setIsApplyingAdjustmentPreview(false);
    }
  };

  const dpiInfo = calculatePrintDPI(
    photo.imgWidth,
    photo.imgHeight,
    photo.targetWidth,
    photo.targetHeight,
    scale
  );

  // Preview calculations
  const percentW = (photo.imgWidth / actualCropW) * 100;
  const percentH = (photo.imgHeight / actualCropH) * 100;
  const percentX = (-cropX / actualCropW) * 100;
  const percentY = (-cropY / actualCropH) * 100;

  const displayImageSrc = showOriginalComparison ? rawSrc : previewAdjustedSrc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{photo.name}</h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    dpiInfo.quality === 'high'
                      ? 'bg-emerald-100 text-emerald-800'
                      : dpiInfo.quality === 'good'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {dpiInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                In ấn: {photo.targetWidth / 10} x {photo.targetHeight / 10} cm • Gốc: {photo.imgWidth}x{photo.imgHeight}px
              </p>
            </div>
          </div>

          {/* Tab switchers in header */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('crop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'crop'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Cắt khung & Bố cục</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('adjust')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'adjust'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Chỉnh màu & Ánh sáng</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body - Split Preview Left & Controls Right */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0 bg-slate-100/50">
          {/* Left Column: Live Visual Canvas Preview */}
          <div className="md:col-span-7 p-6 flex flex-col items-center justify-center bg-slate-100/80 select-none relative border-b md:border-b-0 md:border-r border-slate-200">
            <div className="text-[11px] text-slate-500 mb-2.5 flex items-center justify-between w-full max-w-[340px]">
              <span className="flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-blue-500" />
                Kéo chuột để chỉnh góc tâm ảnh
              </span>

              {(isEnhanced || activeTab === 'adjust') && (
                <button
                  type="button"
                  onMouseDown={() => setShowOriginalComparison(true)}
                  onMouseUp={() => setShowOriginalComparison(false)}
                  onMouseLeave={() => setShowOriginalComparison(false)}
                  className="text-[11px] font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition select-none cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Giữ xem ảnh gốc</span>
                </button>
              )}
            </div>

            {/* Preview Box */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                aspectRatio: `${photo.targetWidth} / ${photo.targetHeight}`,
                width: photo.targetWidth >= photo.targetHeight ? '320px' : 'auto',
                height: photo.targetHeight > photo.targetWidth ? '320px' : 'auto',
                maxHeight: '360px',
              }}
              className={`relative border-2 border-dashed border-blue-400 shadow-lg overflow-hidden cursor-grab active:cursor-grabbing bg-white transition-all ${
                shape === 'circle' ? 'shape-circle' : shape === 'heart' ? 'shape-heart' : 'rounded-xl'
              }`}
            >
              <img
                src={displayImageSrc}
                alt="Live preview"
                draggable={false}
                className="absolute max-w-none pointer-events-none transition-none"
                style={{
                  width: `${percentW}%`,
                  height: `${percentH}%`,
                  left: `${percentX}%`,
                  top: `${percentY}%`,
                }}
              />

              {showOriginalComparison && (
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  Ảnh gốc ban đầu
                </div>
              )}
            </div>

            {/* Quick Zoom Bar under preview */}
            <div className="mt-4 flex items-center gap-3 w-full max-w-[320px] bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
              <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-mono font-bold text-slate-700 w-9 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>
          </div>

          {/* Right Column: Tab Controls */}
          <div className="md:col-span-5 p-5 overflow-y-auto max-h-[520px] bg-white flex flex-col justify-between">
            {activeTab === 'crop' ? (
              <div className="space-y-4">
                {/* HD Enhancement Bar */}
                <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-950">Phục hồi nét & Khử mờ</div>
                      <div className="text-[10px] text-amber-700">Tăng độ nét viền, tương phản & màu in chuẩn</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleEnhance}
                    disabled={isEnhancing}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                      isEnhanced
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {isEnhancing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isEnhanced ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Đã bật làm nét HD</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Bật làm nét HD</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Shape Selection */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <label className="text-xs font-bold text-slate-700 block">Khuôn hình dạng:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShape('rect')}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        shape === 'rect' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Chữ nhật
                    </button>
                    <button
                      type="button"
                      onClick={() => setShape('circle')}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        shape === 'circle' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Tròn
                    </button>
                    <button
                      type="button"
                      onClick={() => setShape('heart')}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        shape === 'heart' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Trái tim
                    </button>
                  </div>
                </div>

                {/* Rotation */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Xoay hướng ảnh:</span>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition shadow-2xs cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xoay 90°</span>
                  </button>
                </div>

                {/* Switch to Adjust Tab Promo Banner */}
                <div
                  onClick={() => setActiveTab('adjust')}
                  className="bg-purple-50 hover:bg-purple-100/80 border border-purple-200 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-xs font-bold text-purple-950">Chỉnh màu & Ánh sáng</div>
                      <div className="text-[10px] text-purple-700">Cân bằng trắng, tương phản, đảo màu...</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-600">Mở &rarr;</span>
                </div>
              </div>
            ) : (
              /* Tab 2: Full Color & Light Adjustments matching screenshot */
              <PhotoAdjustmentsPanel
                adjustments={adjustments}
                onChange={setAdjustments}
                onAutoAdjust={handleAutoAdjust}
                isAutoAdjusting={isAutoAdjusting}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-[11px] text-slate-500">
            {activeTab === 'adjust' && (
              <span>Thay đổi thanh trượt để xem trực tiếp trên khung xem trước</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isApplyingAdjustmentPreview}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isApplyingAdjustmentPreview ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
