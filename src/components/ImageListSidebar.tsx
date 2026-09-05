import React, { useState } from 'react';
import {
  Trash2,
  RotateCw,
  Crop,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Undo2,
  Loader2,
  Sliders,
  Ruler,
  ChevronUp,
  ChevronDown,
  GripVertical,
  AlertTriangle,
  Zap,
  Check,
  Tag,
} from 'lucide-react';
import { PhotoItem, DEFAULT_SIZE_PRESETS, SizePreset } from '../types';
import { rotateImageBase64, calculateCrop, createOptimizedPreview } from '../utils/imageUtils';
import { enhanceImageQuality, calculatePrintDPI, getRecommendedUpscaleFactor } from '../utils/imageEnhancer';

interface ImageListSidebarProps {
  photos: PhotoItem[];
  onUpdatePhoto: (id: string, updates: Partial<PhotoItem>) => void;
  onRemovePhoto: (id: string) => void;
  onClearAll: () => void;
  onOpenCropModal: (photo: PhotoItem, initialTab?: 'size' | 'crop' | 'enhance' | 'adjust') => void;
  onOpenCustomSizeModal?: (photo?: PhotoItem) => void;
  customPresets?: SizePreset[];
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
  smartCrop: boolean;
  onMovePhoto?: (fromIndex: number, toIndex: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ImageListSidebar: React.FC<ImageListSidebarProps> = ({
  photos,
  onUpdatePhoto,
  onRemovePhoto,
  onClearAll,
  onOpenCropModal,
  onOpenCustomSizeModal,
  customPresets = [],
  onToast,
  smartCrop,
  onMovePhoto,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [upscaleMenuId, setUpscaleMenuId] = useState<string | null>(null);

  const totalCopies = photos.reduce((acc, p) => acc + (p.qty || 1), 0);

  // Combine standard and custom presets
  const allPresets = [...customPresets, ...DEFAULT_SIZE_PRESETS];

  // Enhance / Super-Res Upscale / Revert single image
  const handleEnhanceSingle = async (photo: PhotoItem, chosenFactor?: 1 | 2 | 4) => {
    if (enhancingId) return;
    setEnhancingId(photo.id);
    setUpscaleMenuId(null);

    try {
      if (photo.isEnhanced && !chosenFactor) {
        // Revert to raw original
        const origW = photo.rawOriginalWidth || photo.imgWidth;
        const origH = photo.rawOriginalHeight || photo.imgHeight;
        const origCrop = photo.rawOriginalCrop || {
          cropX: photo.cropX,
          cropY: photo.cropY,
          cropW: photo.cropW,
          cropH: photo.cropH,
        };
        const rawSrc = photo.rawOriginalSrc || photo.originalSrc;
        const previewSrc = await createOptimizedPreview(rawSrc, 800, 0.85);

        onUpdatePhoto(photo.id, {
          originalSrc: rawSrc,
          previewSrc: previewSrc,
          isEnhanced: false,
          upscaleFactor: 1,
          imgWidth: origW,
          imgHeight: origH,
          cropX: origCrop.cropX,
          cropY: origCrop.cropY,
          cropW: origCrop.cropW,
          cropH: origCrop.cropH,
        });
        onToast('info', 'Đã khôi phục ảnh gốc ban đầu');
      } else {
        // Base source and raw metrics
        const sourceForEnhancing = photo.rawOriginalSrc || photo.originalSrc;
        const rawW = photo.rawOriginalWidth || photo.imgWidth;
        const rawH = photo.rawOriginalHeight || photo.imgHeight;
        const rawCrop = photo.rawOriginalCrop || {
          cropX: photo.cropX,
          cropY: photo.cropY,
          cropW: photo.cropW,
          cropH: photo.cropH,
        };

        // Determine factor (or auto-calculate recommended factor to achieve print-safe DPI)
        const factor: 1 | 2 | 4 = chosenFactor ?? getRecommendedUpscaleFactor(
          rawW,
          rawH,
          photo.targetWidth,
          photo.targetHeight
        );

        const result = await enhanceImageQuality(sourceForEnhancing, {
          sharpenAmount: factor >= 4 ? 0.72 : factor === 2 ? 0.62 : 0.52,
          contrastAmount: 0.12,
          brightnessAmount: 0.03,
          vibranceAmount: 0.16,
          upscaleFactor: factor,
        });

        const previewSrc = await createOptimizedPreview(result.enhancedSrc, 800, 0.85);

        // Scale crop coordinates to new dimensions proportionally
        const newCropX = Math.round(rawCrop.cropX * factor);
        const newCropY = Math.round(rawCrop.cropY * factor);
        const newCropW = Math.round(rawCrop.cropW * factor);
        const newCropH = Math.round(rawCrop.cropH * factor);

        onUpdatePhoto(photo.id, {
          originalSrc: result.enhancedSrc,
          previewSrc: previewSrc,
          rawOriginalSrc: sourceForEnhancing,
          rawOriginalWidth: rawW,
          rawOriginalHeight: rawH,
          rawOriginalCrop: rawCrop,
          isEnhanced: true,
          upscaleFactor: factor,
          imgWidth: result.newWidth,
          imgHeight: result.newHeight,
          cropX: newCropX,
          cropY: newCropY,
          cropW: newCropW,
          cropH: newCropH,
        });

        if (factor > 1) {
          const newDpiInfo = calculatePrintDPI(result.newWidth, result.newHeight, photo.targetWidth, photo.targetHeight, photo.scale || 1);
          onToast('success', `Đã nâng độ phân giải AI ${factor}x (${result.newWidth}×${result.newHeight} px) → ${newDpiInfo.label}!`);
        } else {
          onToast('success', `Đã làm nét & tăng chất lượng ảnh: ${photo.name}`);
        }
      }
    } catch (err) {
      console.error(err);
      onToast('error', 'Không thể xử lý ảnh này');
    } finally {
      setEnhancingId(null);
    }
  };

  const handleRotateSingle = async (photo: PhotoItem) => {
    if (rotatingId === photo.id) return;
    setRotatingId(photo.id);

    try {
      const rotatedSrc = await rotateImageBase64(photo.originalSrc, 90);
      const rawRotated = photo.rawOriginalSrc ? await rotateImageBase64(photo.rawOriginalSrc, 90) : undefined;
      const previewSrc = await createOptimizedPreview(rotatedSrc, 800, 0.85);
      const newWidth = photo.imgHeight;
      const newHeight = photo.imgWidth;
      const crop = calculateCrop(newWidth, newHeight, photo.targetWidth, photo.targetHeight, smartCrop);

      onUpdatePhoto(photo.id, {
        originalSrc: rotatedSrc,
        previewSrc: previewSrc,
        rawOriginalSrc: rawRotated,
        imgWidth: newWidth,
        imgHeight: newHeight,
        cropX: crop.cropX,
        cropY: crop.cropY,
        cropW: crop.cropW,
        cropH: crop.cropH,
        scale: 1,
      });
      onToast('success', `Đã xoay ảnh ${photo.name} 90°`);
    } catch (err) {
      console.error('Error rotating single photo:', err);
      onToast('error', 'Không thể xoay ảnh này');
    } finally {
      setRotatingId(null);
    }
  };

  const handleSizePresetChange = (photo: PhotoItem, presetId: string) => {
    if (presetId === '__custom_new__') {
      if (onOpenCustomSizeModal) {
        onOpenCustomSizeModal(photo);
      }
      return;
    }

    const preset = allPresets.find((p) => p.id === presetId);
    if (!preset) return;

    const crop = calculateCrop(photo.imgWidth, photo.imgHeight, preset.width, preset.height, smartCrop);
    onUpdatePhoto(photo.id, {
      targetWidth: preset.width,
      targetHeight: preset.height,
      shape: preset.shape,
      cropX: crop.cropX,
      cropY: crop.cropY,
      cropW: crop.cropW,
      cropH: crop.cropH,
      scale: 1,
    });
  };

  // Group default presets by category
  const defaultCategories = Array.from(new Set(DEFAULT_SIZE_PRESETS.map((p) => p.category)));

  return (
    <aside
      id="list-sidebar"
      className={`no-print transition-all duration-300 flex flex-col bg-slate-50/80 border-r border-slate-200/90 h-full overflow-hidden z-20 ${
        isCollapsed ? 'w-12 shrink-0' : 'w-80 shrink-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-200/80 bg-white sticky top-0 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wide truncate">
              Danh sách ({photos.length})
            </span>
          )}
          {!isCollapsed && photos.length > 0 && (
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
              {totalCopies} bản
            </span>
          )}
        </div>

        {!isCollapsed && photos.length > 0 && (
          <button
            id="btn-clear-all"
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition cursor-pointer"
          >
            Xóa hết
          </button>
        )}
      </div>

      {isCollapsed ? (
        <div className="flex-1 flex flex-col items-center py-4 gap-3 text-slate-400">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Mở rộng danh sách ảnh"
          >
            <Layers className="w-5 h-5 text-emerald-600" />
          </button>
        </div>
      ) : (
        /* Sidebar Content */
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Empty State */}
          {photos.length === 0 ? (
            <div className="text-center py-16 px-4 border-2 border-dashed border-emerald-200/80 rounded-xl bg-emerald-50/30 space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100/60 flex items-center justify-center mx-auto text-emerald-600">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-700">Chưa có ảnh nào</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tải ảnh từ khung bên trái hoặc dán (Ctrl+V) để bắt đầu dàn trang A4.
              </p>
            </div>
          ) : (
            /* Image Cards List */
            <div className="space-y-2.5">
              {photos.map((photo, index) => {
                const isConfirmingDelete = confirmDeleteId === photo.id;
                const currentPresetId = `${photo.targetWidth}x${photo.targetHeight}_${photo.shape}`;
                const matchedPreset = allPresets.find(
                  (p) => p.width === photo.targetWidth && p.height === photo.targetHeight && p.shape === photo.shape
                );

                const dpiInfo = calculatePrintDPI(
                  photo.imgWidth,
                  photo.imgHeight,
                  photo.targetWidth,
                  photo.targetHeight,
                  photo.scale || 1
                );

                return (
                  <div
                    key={photo.id}
                    id={`photo-card-${photo.id}`}
                    className={`bg-white border rounded-xl p-3 shadow-2xs hover:shadow-xs transition-all group flex flex-col gap-2.5 ${
                      isConfirmingDelete
                        ? 'border-rose-400 ring-2 ring-rose-200/80 bg-rose-50/15'
                        : photo.isEnhanced
                        ? 'border-amber-300 ring-1 ring-amber-100/80 bg-amber-50/20'
                        : 'border-slate-200/90 hover:border-blue-300'
                    }`}
                  >
                    {/* Top: Reorder handles + Thumbnail & Size Selector */}
                    <div className="flex items-center gap-2">
                      {/* Reorder Buttons */}
                      {onMovePhoto && (
                        <div className="flex flex-col gap-0.5 shrink-0 text-slate-400">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => onMovePhoto(index, index - 1)}
                            className="p-0.5 hover:text-blue-600 disabled:opacity-20 transition cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === photos.length - 1}
                            onClick={() => onMovePhoto(index, index + 1)}
                            className="p-0.5 hover:text-blue-600 disabled:opacity-20 transition cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Thumbnail with Shape Mask Preview */}
                      <div className="relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                        <div
                          className={`w-full h-full bg-cover bg-center ${
                            photo.shape === 'circle'
                              ? 'shape-circle'
                              : photo.shape === 'heart'
                              ? 'shape-heart'
                              : 'rounded-md'
                          }`}
                          style={{ backgroundImage: `url(${photo.previewSrc || photo.originalSrc})` }}
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white font-mono text-[9px] px-1 rounded font-bold">
                          #{index + 1}
                        </span>
                        {photo.isEnhanced && (
                          <span
                            className="absolute top-0.5 left-0.5 bg-amber-500 text-white px-1 py-0.5 rounded shadow-xs flex items-center gap-0.5 text-[8px] font-bold"
                            title={`Đã tối ưu ${photo.upscaleFactor && photo.upscaleFactor > 1 ? `AI ${photo.upscaleFactor}x (DPI x${photo.upscaleFactor})` : 'HD'}`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {photo.upscaleFactor && photo.upscaleFactor > 1 && (
                              <span>{photo.upscaleFactor}x</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Size Select & DPI Quality Badge */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-[11px] font-bold text-slate-800 truncate" title={photo.name}>
                            {photo.name}
                          </div>

                          {/* Interactive DPI Badge with Upscale Menu */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setUpscaleMenuId(upscaleMenuId === photo.id ? null : photo.id)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 transition cursor-pointer hover:shadow-xs ${
                                dpiInfo.quality === 'high'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : dpiInfo.quality === 'good'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-300 ring-2 ring-rose-200/50 hover:bg-rose-100'
                              }`}
                              title="Bấm để tăng độ phân giải / DPI bằng AI"
                            >
                              {photo.upscaleFactor && photo.upscaleFactor > 1 && (
                                <span className="bg-amber-400 text-amber-950 px-1 py-0.2 rounded text-[8px] font-black">
                                  {photo.upscaleFactor}x
                                </span>
                              )}
                              <span>{dpiInfo.label}</span>
                              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                            </button>

                            {/* Dropdown Menu for DPI / Upscale */}
                            {upscaleMenuId === photo.id && (
                              <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 shadow-xl rounded-xl p-2 w-56 text-left">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1 flex items-center justify-between">
                                  <span>Nâng độ phân giải DPI</span>
                                  <span className="text-amber-600 font-bold">AI Web Worker</span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-50 text-slate-700 hover:text-amber-900 flex items-center justify-between transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Tự động tối ưu DPI</span>
                                    </span>
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                      Khuyên dùng
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo, 2)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-900 flex items-center justify-between transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Phóng to x2 (DPI ×2)</span>
                                    </span>
                                    {photo.upscaleFactor === 2 && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo, 4)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-50 text-slate-700 hover:text-purple-900 flex items-center justify-between transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                      <span>Phóng to x4 Siêu nét</span>
                                    </span>
                                    {photo.upscaleFactor === 4 && <Check className="w-3.5 h-3.5 text-purple-600" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEnhanceSingle(photo, 1)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center justify-between transition font-medium cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Chỉ làm nét HD (1x)</span>
                                    </span>
                                    {photo.isEnhanced && photo.upscaleFactor === 1 && (
                                      <Check className="w-3.5 h-3.5 text-slate-600" />
                                    )}
                                  </button>

                                  {photo.isEnhanced && (
                                    <button
                                      type="button"
                                      onClick={() => handleEnhanceSingle(photo)}
                                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-1.5 transition font-medium border-t border-slate-100 mt-1 pt-1.5 cursor-pointer"
                                    >
                                      <Undo2 className="w-3.5 h-3.5" />
                                      <span>Khôi phục ảnh gốc</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <select
                            value={matchedPreset ? matchedPreset.id : currentPresetId}
                            onChange={(e) => handleSizePresetChange(photo, e.target.value)}
                            className="w-full text-xs font-semibold border border-slate-200 bg-slate-50/80 rounded-lg p-1.5 text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition"
                          >
                            <option value="__custom_new__" className="font-bold text-pink-600">
                              ➕ Nhập kích thước tùy chỉnh...
                            </option>

                            {/* Custom Presets Group */}
                            {customPresets.length > 0 && (
                              <optgroup label="⭐ Kích thước tùy chỉnh của bạn">
                                {customPresets.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            {/* If photo has an ad-hoc dimension not in any preset */}
                            {!matchedPreset && (
                              <optgroup label="📐 Kích thước hiện tại của ảnh">
                                <option value={currentPresetId}>
                                  Tùy chỉnh: {(photo.targetWidth / 10).toFixed(1)} x {(photo.targetHeight / 10).toFixed(1)} cm ({photo.shape})
                                </option>
                              </optgroup>
                            )}

                            {/* Standard presets grouped by category */}
                            {defaultCategories.map((cat) => (
                              <optgroup key={cat} label={cat}>
                                {DEFAULT_SIZE_PRESETS.filter((p) => p.category === cat).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          {onOpenCustomSizeModal && (
                            <button
                              type="button"
                              onClick={() => onOpenCustomSizeModal(photo)}
                              className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg border border-pink-200 transition shrink-0 cursor-pointer"
                              title="Nhập kích thước tùy chỉnh cho ảnh này"
                            >
                              <Ruler className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Tag Input (Gán mã đơn / tên khách) */}
                    <div className="flex items-center gap-1.5 bg-purple-50/70 border border-purple-200/80 rounded-lg px-2 py-1 text-[11px] focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-300 transition">
                      <Tag className="w-3 h-3 text-purple-600 shrink-0" />
                      <input
                        type="text"
                        placeholder="Gán mã đơn (vd: #DH01, Khách Tuấn)..."
                        value={photo.orderTag || ''}
                        onChange={(e) => onUpdatePhoto(photo.id, { orderTag: e.target.value })}
                        className="w-full bg-transparent text-purple-950 font-medium placeholder:text-purple-400/80 placeholder:font-normal outline-none text-[10.5px]"
                        title="Mã đơn riêng cho ảnh này - dùng để in mã mini ngoài viền xén hoặc gom đơn ở chân trang"
                      />
                      {photo.orderTag && (
                        <button
                          type="button"
                          onClick={() => onUpdatePhoto(photo.id, { orderTag: undefined })}
                          className="text-[10px] text-purple-400 hover:text-purple-700 px-1 rounded cursor-pointer"
                          title="Xóa nhãn mã đơn"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Bottom: Quantity & Controls */}
                    <div className="flex items-center justify-between bg-slate-50/90 p-1.5 rounded-lg border border-slate-200/80">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdatePhoto(photo.id, { qty: Math.max(1, (photo.qty || 1) - 1) })}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={photo.qty || 1}
                          onChange={(e) =>
                            onUpdatePhoto(photo.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })
                          }
                          className="w-8 h-6 text-center text-xs font-bold bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdatePhoto(photo.id, { qty: (photo.qty || 1) + 1 })}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {/* Enhance Single Button */}
                        <button
                          type="button"
                          onClick={() => handleEnhanceSingle(photo)}
                          disabled={enhancingId === photo.id}
                          className={`p-1.5 rounded-md border transition shadow-2xs cursor-pointer ${
                            photo.isEnhanced
                              ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                              : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                          title={photo.isEnhanced ? 'Khôi phục ảnh gốc ban đầu' : 'Làm nét & Tăng chất lượng ảnh'}
                        >
                          {enhancingId === photo.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          ) : photo.isEnhanced ? (
                            <Undo2 className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Crop / Adjust framing */}
                        <button
                          type="button"
                          onClick={() => onOpenCropModal(photo, 'size')}
                          className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-2xs cursor-pointer"
                          title="Cài đặt hình: Khổ in, khung & chỉnh sửa"
                        >
                          <Crop className="w-3.5 h-3.5" />
                        </button>

                        {/* Color & Light Adjustments */}
                        <button
                          type="button"
                          onClick={() => onOpenCropModal(photo, 'adjust')}
                          className="p-1.5 rounded-md bg-white border border-slate-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition shadow-2xs cursor-pointer"
                          title="Chỉnh màu, cân bằng trắng & ánh sáng"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Rotate 90° */}
                        <button
                          type="button"
                          onClick={() => handleRotateSingle(photo)}
                          disabled={rotatingId === photo.id}
                          className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Xoay ảnh 90°"
                        >
                          {rotatingId === photo.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete button (Toggle Confirmation) */}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : photo.id)}
                          className={`p-1.5 rounded-md border transition cursor-pointer ${
                            isConfirmingDelete
                              ? 'bg-rose-100 border-rose-300 text-rose-700 shadow-2xs'
                              : 'bg-white border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                          }`}
                          title={isConfirmingDelete ? 'Hủy xóa ảnh' : 'Xóa ảnh này'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Delete Confirmation Row */}
                    {isConfirmingDelete && (
                      <div className="flex items-center justify-between gap-1.5 p-2 bg-rose-50/95 border border-rose-200 rounded-lg text-xs animate-in fade-in duration-150 shadow-2xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="text-[11px] font-bold text-rose-800 truncate">
                            Xóa ảnh #{index + 1}?
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition shadow-2xs cursor-pointer"
                          >
                            Trở lại
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onRemovePhoto(photo.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-md transition shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xác nhận xóa</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
