import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Instagram,
  Columns,
  Film,
  Bookmark as BookmarkIcon,
  Award,
  Sparkles,
  Type,
  Palette,
  Image as ImageIcon,
  Check,
  Upload,
  Layers,
  Heart,
  Save,
  Copy,
  ArrowUp,
  ArrowDown,
  RotateCw,
  RefreshCw,
  Shuffle,
  Trash2,
  Plus,
  FolderOpen,
  ArrowUpDown,
  Maximize2,
  Sliders,
  Edit3,
  PenLine,
  Eraser,
  CopyCheck,
} from 'lucide-react';
import { PhotoItem, TemplateConfig, PrintTemplateType, ShapeType, PhotostripSlot } from '../types';
import { createDefaultTemplateConfig } from '../utils/templateRenderUtils';
import { FontSelector } from './FontSelector';
import { rotateImageBase64, getImageDimensions } from '../utils/imageUtils';

interface TemplateSettingsPanelProps {
  photo: PhotoItem;
  allPhotos?: PhotoItem[];
  curTargetWidth: number;
  curTargetHeight: number;
  shape: ShapeType;
  templateConfig: TemplateConfig;
  onBatchUpdatePhotos?: (updater: (photo: PhotoItem) => Partial<PhotoItem> | null) => void;
  onChangeTemplateConfig: (
    newConfig: TemplateConfig,
    dimensions?: { w: number; h: number; shape?: ShapeType }
  ) => void;
  // Badge props
  badgeMode: boolean;
  badgeFaceDiameter: number;
  badgeBleedColor: string;
  badgeBleedPalette: string[];
  badgeGuideLines: boolean;
  badgeBleedMode: 'solid' | 'blur_expand';
  onUpdateBadge: (updates: {
    badgeMode?: boolean;
    badgeFaceDiameter?: number;
    badgeBleedColor?: string;
    badgeGuideLines?: boolean;
    badgeBleedMode?: 'solid' | 'blur_expand';
    shape?: ShapeType;
    width?: number;
    height?: number;
  }) => void;
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

interface TemplateSizeSelectorProps {
  presets: { label: string; w: number; h: number }[];
  curW: number;
  curH: number;
  onSelectSize: (w: number, h: number) => void;
  title?: string;
}

const TemplateSizeSelector: React.FC<TemplateSizeSelectorProps> = ({
  presets,
  curW,
  curH,
  onSelectSize,
  title = 'Kích thước thành phẩm (Rộng × Cao):',
}) => {
  const isMatch = presets.some((p) => p.w === curW && p.h === curH);
  const [showCustom, setShowCustom] = useState(!isMatch);
  const [localW, setLocalW] = useState(String(curW));
  const [localH, setLocalH] = useState(String(curH));

  useEffect(() => {
    setLocalW(String(curW));
    setLocalH(String(curH));
    if (!presets.some((p) => p.w === curW && p.h === curH)) {
      setShowCustom(true);
    }
  }, [curW, curH, presets]);

  const handleApplyCustom = (wStr: string, hStr: string) => {
    const wNum = Math.max(15, Math.min(297, Number(wStr) || curW));
    const hNum = Math.max(15, Math.min(297, Number(hStr) || curH));
    onSelectSize(wNum, hNum);
  };

  return (
    <div className="space-y-1.5 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span>{title}</span>
        </label>
        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
          {curW} × {curH} mm ({curW / 10} × {curH / 10} cm)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {presets.map((p) => {
          const isSelected = curW === p.w && curH === p.h;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setShowCustom(false);
                onSelectSize(p.w, p.h);
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
            showCustom && !isMatch
              ? 'bg-indigo-600 text-white shadow-2xs'
              : showCustom
              ? 'bg-slate-200 text-slate-800'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
          title="Tự nhập kích thước Rộng x Cao bất kỳ theo milimet"
        >
          <Edit3 className="w-3 h-3" />
          <span>Tùy chỉnh mm</span>
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="text-[10px] text-slate-400 font-medium">Rộng:</span>
            <input
              type="number"
              min="15"
              max="297"
              step="1"
              value={localW}
              onChange={(e) => {
                setLocalW(e.target.value);
                handleApplyCustom(e.target.value, localH);
              }}
              className="w-full text-xs font-mono font-bold text-slate-800 outline-none"
            />
            <span className="text-[10px] text-slate-400">mm</span>
          </div>
          <span className="text-slate-400 font-bold">×</span>
          <div className="flex-1 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="text-[10px] text-slate-400 font-medium">Cao:</span>
            <input
              type="number"
              min="15"
              max="297"
              step="1"
              value={localH}
              onChange={(e) => {
                setLocalH(e.target.value);
                handleApplyCustom(localW, e.target.value);
              }}
              className="w-full text-xs font-mono font-bold text-slate-800 outline-none"
            />
            <span className="text-[10px] text-slate-400">mm</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface TemplateTextToolbarProps {
  label: string;
  hasText: boolean;
  onClearCurrent: () => void;
  onApplyToSame?: () => void;
  onApplyToAll?: () => void;
  onClearAll?: () => void;
  totalPhotosCount: number;
  sameTemplateCount: number;
  templateName: string;
}

const TemplateTextToolbar: React.FC<TemplateTextToolbarProps> = ({
  label,
  hasText,
  onClearCurrent,
  onApplyToSame,
  onApplyToAll,
  onClearAll,
  totalPhotosCount,
  sameTemplateCount,
  templateName,
}) => {
  const [showApplyMenu, setShowApplyMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="space-y-1.5 pb-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </label>

        {/* Nút xóa nhanh chữ ảnh này (để viết tay) */}
        {hasText && (
          <button
            type="button"
            onClick={onClearCurrent}
            title="Xóa chữ trên ảnh này để khách tự viết tay"
            className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1 cursor-pointer"
          >
            <PenLine className="w-3 h-3 text-amber-600" />
            <span>Để trống viết tay</span>
          </button>
        )}
      </div>

      {/* Thanh công cụ thao tác hàng loạt (khi có từ 2 ảnh trở lên) */}
      {totalPhotosCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
            Hàng loạt ({totalPhotosCount} ảnh):
          </span>

          <div className="flex items-center gap-1">
            {/* Nút Áp dụng chữ */}
            <button
              type="button"
              onClick={() => {
                setShowClearConfirm(false);
                setShowApplyMenu(!showApplyMenu);
              }}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                showApplyMenu
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-blue-50 text-blue-700 border border-blue-200'
              }`}
              title="Áp dụng nội dung chữ này cho các ảnh khác"
            >
              <CopyCheck className="w-3 h-3" />
              <span>Áp dụng chữ...</span>
            </button>

            {/* Nút Bỏ hàng loạt chữ để viết tay */}
            <button
              type="button"
              onClick={() => {
                setShowApplyMenu(false);
                setShowClearConfirm(!showClearConfirm);
              }}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                showClearConfirm
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-200'
              }`}
              title="Xóa toàn bộ chữ trên tất cả ảnh để khách tự viết tay"
            >
              <Eraser className="w-3 h-3" />
              <span>Bỏ chữ hàng loạt</span>
            </button>
          </div>
        </div>
      )}

      {/* Menu lựa chọn phạm vi áp dụng chữ */}
      {showApplyMenu && (
        <div className="p-2 bg-blue-50/80 rounded-xl border border-blue-200 space-y-1.5 shadow-xs">
          <div className="text-[10.5px] font-bold text-blue-950 flex items-center justify-between">
            <span>Chọn phạm vi áp dụng nội dung chữ:</span>
            <button
              type="button"
              onClick={() => setShowApplyMenu(false)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {sameTemplateCount > 1 && onApplyToSame && (
              <button
                type="button"
                onClick={() => {
                  setShowApplyMenu(false);
                  onApplyToSame();
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg bg-white hover:bg-blue-100 text-blue-800 text-[10.5px] font-bold border border-blue-200 transition flex items-center justify-between cursor-pointer"
              >
                <span>📌 Áp dụng chữ cho các ảnh mẫu {templateName}</span>
                <span className="text-[9.5px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
                  {sameTemplateCount} ảnh
                </span>
              </button>
            )}

            {onApplyToAll && (
              <button
                type="button"
                onClick={() => {
                  setShowApplyMenu(false);
                  onApplyToAll();
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-800 text-[10.5px] font-bold border border-indigo-200 transition flex items-center justify-between cursor-pointer"
              >
                <span>🌐 Áp dụng mẫu {templateName} & chữ cho TẤT CẢ</span>
                <span className="text-[9.5px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
                  {totalPhotosCount} ảnh
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Xác nhận xóa sạch chữ hàng loạt */}
      {showClearConfirm && onClearAll && (
        <div className="p-2 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5 shadow-xs">
          <div className="text-[11px] font-bold text-amber-900 leading-tight">
            Xác nhận xóa sạch toàn bộ chữ trên tất cả ({totalPhotosCount} ảnh) để khách tự viết tay?
          </div>
          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-1 rounded-md text-[10px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                setShowClearConfirm(false);
                onClearAll();
              }}
              className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Eraser className="w-3 h-3" />
              <span>Đồng ý xóa hết</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const TemplateSettingsPanel: React.FC<TemplateSettingsPanelProps> = ({
  photo,
  allPhotos,
  curTargetWidth,
  curTargetHeight,
  shape,
  templateConfig,
  onBatchUpdatePhotos,
  onChangeTemplateConfig,
  badgeMode,
  badgeFaceDiameter,
  badgeBleedColor,
  badgeBleedPalette,
  badgeGuideLines,
  badgeBleedMode,
  onUpdateBadge,
  onToast,
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const targetSlotIndexRef = useRef<number>(0);

  const slotCount = templateConfig.photostrip?.slotCount ?? 4;

  const getEffectiveSlots = (): PhotostripSlot[] => {
    const currentSlots = templateConfig.photostrip?.slots || [];
    const res: PhotostripSlot[] = [];
    for (let i = 0; i < slotCount; i++) {
      if (currentSlots[i]) {
        res.push(currentSlots[i]);
      } else {
        res.push({
          id: `slot-${i}-${Date.now()}`,
          photoId: photo.id,
          photoName: photo.name,
          photoSrc: photo.previewSrc || photo.originalSrc,
          imgWidth: photo.imgWidth,
          imgHeight: photo.imgHeight,
          rotation: 0,
        });
      }
    }
    return res;
  };

  const updateSlot = (index: number, updates: Partial<PhotostripSlot>) => {
    const slots = getEffectiveSlots();
    slots[index] = { ...slots[index], ...updates };
    onChangeTemplateConfig({
      ...templateConfig,
      photostrip: {
        ...(templateConfig.photostrip || { borderMm: 3, gapMm: 2, bottomMm: 10, slotCount }),
        slotCount,
        slots,
      },
    });
  };

  const handleSelectProjectPhotoForSlot = (index: number, selectedPhoto: PhotoItem) => {
    updateSlot(index, {
      photoId: selectedPhoto.id,
      photoName: selectedPhoto.name,
      photoSrc: selectedPhoto.previewSrc || selectedPhoto.originalSrc,
      imgWidth: selectedPhoto.imgWidth,
      imgHeight: selectedPhoto.imgHeight,
      rotation: selectedPhoto.rotation || 0,
    });
    onToast('success', `Đã chọn "${selectedPhoto.name}" cho Ô ${index + 1}`);
  };

  const handleOpenUploadForSlot = (index: number) => {
    targetSlotIndexRef.current = index;
    slotFileInputRef.current?.click();
  };

  const handleSlotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetIdx = targetSlotIndexRef.current;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const src = ev.target?.result as string;
        const dims = await getImageDimensions(src);
        updateSlot(targetIdx, {
          photoId: undefined,
          photoName: file.name,
          photoSrc: src,
          imgWidth: dims.width,
          imgHeight: dims.height,
          rotation: 0,
        });
        onToast('success', `Đã tải ảnh lên Ô ${targetIdx + 1}`);
      };
      reader.readAsDataURL(file);
    } catch {
      onToast('error', 'Không thể đọc ảnh');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRotateSlot = async (index: number) => {
    const slots = getEffectiveSlots();
    const curSlot = slots[index];
    try {
      const rotated = await rotateImageBase64(curSlot.photoSrc, 90);
      const newW = curSlot.imgHeight || 100;
      const newH = curSlot.imgWidth || 100;
      updateSlot(index, {
        photoSrc: rotated,
        imgWidth: newW,
        imgHeight: newH,
        rotation: ((curSlot.rotation || 0) + 90) % 360,
      });
      onToast('info', `Đã xoay Ô ${index + 1} 90°`);
    } catch {
      onToast('error', 'Lỗi khi xoay ảnh');
    }
  };

  const handleSwapSlots = (idx1: number, idx2: number) => {
    const slots = getEffectiveSlots();
    if (idx1 < 0 || idx1 >= slots.length || idx2 < 0 || idx2 >= slots.length) return;
    const temp = slots[idx1];
    slots[idx1] = slots[idx2];
    slots[idx2] = temp;
    onChangeTemplateConfig({
      ...templateConfig,
      photostrip: {
        ...(templateConfig.photostrip || { borderMm: 3, gapMm: 2, bottomMm: 10, slotCount }),
        slotCount,
        slots,
      },
    });
  };

  const handleAutoFillSlots = () => {
    if (!allPhotos || allPhotos.length === 0) {
      onToast('error', 'Chưa có ảnh trong danh sách dự án');
      return;
    }
    const curIdx = Math.max(0, allPhotos.findIndex((p) => p.id === photo.id));
    const newSlots: PhotostripSlot[] = [];
    for (let i = 0; i < slotCount; i++) {
      const p = allPhotos[(curIdx + i) % allPhotos.length];
      newSlots.push({
        id: `slot-${i}-${Date.now()}`,
        photoId: p.id,
        photoName: p.name,
        photoSrc: p.previewSrc || p.originalSrc,
        imgWidth: p.imgWidth,
        imgHeight: p.imgHeight,
        rotation: p.rotation || 0,
      });
    }
    onChangeTemplateConfig({
      ...templateConfig,
      photostrip: {
        ...(templateConfig.photostrip || { borderMm: 3, gapMm: 2, bottomMm: 10, slotCount }),
        slotCount,
        slots: newSlots,
      },
    });
    onToast('success', `Đã tự động gán ${slotCount} ảnh liên tiếp từ danh sách dự án`);
  };

  const handleShuffleSlots = () => {
    const slots = [...getEffectiveSlots()];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    onChangeTemplateConfig({
      ...templateConfig,
      photostrip: {
        ...(templateConfig.photostrip || { borderMm: 3, gapMm: 2, bottomMm: 10, slotCount }),
        slotCount,
        slots,
      },
    });
    onToast('info', 'Đã xáo trộn vị trí các ô');
  };

  const handleReverseSlots = () => {
    const slots = [...getEffectiveSlots()].reverse();
    onChangeTemplateConfig({
      ...templateConfig,
      photostrip: {
        ...(templateConfig.photostrip || { borderMm: 3, gapMm: 2, bottomMm: 10, slotCount }),
        slotCount,
        slots,
      },
    });
    onToast('info', 'Đã đảo ngược thứ tự các ô');
  };

  const handleResetSlotsToMain = () => {
    const newSlots: PhotostripSlot[] = [];
    for (let i = 0; i < slotCount; i++) {
      newSlots.push({
        id: `slot-${i}-${Date.now()}`,
        photoId: photo.id,
        photoName: photo.name,
        photoSrc: photo.previewSrc || photo.originalSrc,
        imgWidth: photo.imgWidth,
        imgHeight: photo.imgHeight,
        rotation: 0,
      });
    }
    onChangeTemplateConfig({
      ...templateConfig,
      photostrip: {
        ...(templateConfig.photostrip || { borderMm: 3, gapMm: 2, bottomMm: 10, slotCount }),
        slotCount,
        slots: newSlots,
      },
    });
    onToast('info', 'Đã đặt lại tất cả các ô về ảnh chính');
  };

  const handleSetSlotCount = (count: 3 | 4) => {
    const currentSlots = getEffectiveSlots();
    let nextSlots = [...currentSlots];
    if (count === 3) {
      nextSlots = nextSlots.slice(0, 3);
    } else if (count === 4 && nextSlots.length < 4) {
      const curIdx = Math.max(0, (allPhotos || []).findIndex((p) => p.id === photo.id));
      const nextPhoto = allPhotos && allPhotos.length > 3 ? allPhotos[(curIdx + 3) % allPhotos.length] : photo;
      nextSlots.push({
        id: `slot-3-${Date.now()}`,
        photoId: nextPhoto.id,
        photoName: nextPhoto.name,
        photoSrc: nextPhoto.previewSrc || nextPhoto.originalSrc,
        imgWidth: nextPhoto.imgWidth,
        imgHeight: nextPhoto.imgHeight,
        rotation: nextPhoto.rotation || 0,
      });
    }
    onChangeTemplateConfig({
      ...templateConfig,
      photostrip: {
        ...(templateConfig.photostrip || { borderMm: 3, gapMm: 2, bottomMm: 10 }),
        slotCount: count,
        slots: nextSlots,
      },
    });
  };

  // Xóa chữ ảnh này (để khách tự viết tay)
  const handleClearCurrentPhotoText = (type: PrintTemplateType) => {
    if (type === 'film') {
      onChangeTemplateConfig({
        ...templateConfig,
        film: { ...(templateConfig.film || {}), sideText: '' },
      });
    } else if (type === 'spotify') {
      onChangeTemplateConfig({
        ...templateConfig,
        textLine1: '',
        textLine2: '',
        spotify: {
          ...(templateConfig.spotify || {}),
          songTitle: '',
          artistName: '',
        },
      });
    } else if (type === 'ticket') {
      onChangeTemplateConfig({
        ...templateConfig,
        textLine1: '',
        textLine2: '',
        ticket: {
          ...(templateConfig.ticket || {}),
          passengerName: '',
        },
      });
    } else {
      onChangeTemplateConfig({
        ...templateConfig,
        textLine1: '',
        textLine2: '',
      });
    }
    onToast('info', 'Đã để trống khung để khách tự viết tay ✍️');
  };

  // Xóa chữ hàng loạt trên tất cả ảnh
  const handleClearAllPhotosText = () => {
    onChangeTemplateConfig({
      ...templateConfig,
      textLine1: '',
      textLine2: '',
      ...(templateConfig.film ? { film: { ...templateConfig.film, sideText: '' } } : {}),
      ...(templateConfig.spotify ? { spotify: { ...templateConfig.spotify, songTitle: '', artistName: '' } } : {}),
      ...(templateConfig.ticket ? { ticket: { ...templateConfig.ticket, passengerName: '' } } : {}),
    });

    if (onBatchUpdatePhotos) {
      onBatchUpdatePhotos((p) => {
        if (!p.templateConfig || p.templateConfig.type === 'none') return null;
        return {
          templateConfig: {
            ...p.templateConfig,
            textLine1: '',
            textLine2: '',
            ...(p.templateConfig.film ? { film: { ...p.templateConfig.film, sideText: '' } } : {}),
            ...(p.templateConfig.spotify ? { spotify: { ...p.templateConfig.spotify, songTitle: '', artistName: '' } } : {}),
            ...(p.templateConfig.ticket ? { ticket: { ...p.templateConfig.ticket, passengerName: '' } } : {}),
          },
        };
      });
    }
    onToast('success', `Đã xóa toàn bộ chữ trên tất cả (${allPhotos?.length || 1} ảnh) để viết tay ✍️`);
  };

  // Áp dụng chữ cho các ảnh cùng mẫu
  const handleApplyTextToSameTemplate = (type: PrintTemplateType) => {
    if (onBatchUpdatePhotos) {
      onBatchUpdatePhotos((p) => {
        if (!p.templateConfig || p.templateConfig.type !== type) return null;
        return {
          templateConfig: {
            ...p.templateConfig,
            textLine1: templateConfig.textLine1,
            textLine2: templateConfig.textLine2,
            fontFamily: templateConfig.fontFamily,
            fontSizePt: templateConfig.fontSizePt,
            textColor: templateConfig.textColor,
            textAlign: templateConfig.textAlign,
            ...(type === 'film' && templateConfig.film
              ? { film: { ...p.templateConfig.film, sideText: templateConfig.film.sideText } }
              : {}),
            ...(type === 'instagram' && templateConfig.instagram
              ? {
                  instagram: {
                    ...(p.templateConfig.instagram || {}),
                    username: templateConfig.instagram.username,
                  },
                }
              : {}),
            ...(type === 'spotify' && templateConfig.spotify
              ? {
                  spotify: {
                    ...(p.templateConfig.spotify || {}),
                    songTitle: templateConfig.spotify.songTitle,
                    artistName: templateConfig.spotify.artistName,
                    duration: templateConfig.spotify.duration,
                    currentTime: templateConfig.spotify.currentTime,
                    theme: templateConfig.spotify.theme,
                    showSpotifyCode: templateConfig.spotify.showSpotifyCode,
                  },
                }
              : {}),
            ...(type === 'ticket' && templateConfig.ticket
              ? {
                  ticket: {
                    ...(p.templateConfig.ticket || {}),
                    passengerName: templateConfig.ticket.passengerName,
                    flight: templateConfig.ticket.flight,
                    from: templateConfig.ticket.from,
                    to: templateConfig.ticket.to,
                    gate: templateConfig.ticket.gate,
                    seat: templateConfig.ticket.seat,
                    theme: templateConfig.ticket.theme,
                  },
                }
              : {}),
          },
        };
      });
    }
    const count = allPhotos?.filter((p) => p.templateConfig?.type === type).length || 1;
    onToast('success', `Đã áp dụng chữ cho ${count} ảnh cùng mẫu! ✨`);
  };

  // Áp dụng cả mẫu & chữ cho TOÀN BỘ ảnh trong dự án
  const handleApplyTemplateAndTextToAll = (type: PrintTemplateType) => {
    if (onBatchUpdatePhotos) {
      onBatchUpdatePhotos((p) => {
        return {
          targetWidth: curTargetWidth,
          targetHeight: curTargetHeight,
          shape: shape,
          templateConfig: {
            ...templateConfig,
            type,
          },
        };
      });
    }
    onToast('success', `Đã áp dụng mẫu & chữ này cho TOÀN BỘ (${allPhotos?.length || 1} ảnh)! 🎉`);
  };

  const activeType: PrintTemplateType = badgeMode ? 'badge' : templateConfig.type || 'none';

  // Chuyển đổi mẫu in
  const handleSelectTemplate = (type: PrintTemplateType) => {
    if (type === 'badge') {
      onChangeTemplateConfig({ type: 'none' });
      onUpdateBadge({
        badgeMode: true,
        shape: 'circle',
        width: 54,
        height: 54,
        badgeFaceDiameter: 43,
      });
      return;
    }

    if (badgeMode) {
      onUpdateBadge({ badgeMode: false, shape: 'rect' });
    }

    if (type === 'none') {
      onChangeTemplateConfig({ type: 'none' });
      return;
    }

    const newConfig = createDefaultTemplateConfig(type, photo.name);

    let dims: { w: number; h: number; shape: ShapeType } | undefined;
    if (type === 'polaroid') {
      dims = { w: 60, h: 90, shape: 'rect' };
    } else if (type === 'instagram') {
      dims = { w: 90, h: 120, shape: 'rect' };
    } else if (type === 'photostrip') {
      dims = { w: 50, h: 150, shape: 'rect' };
    } else if (type === 'film') {
      dims = { w: 60, h: 90, shape: 'rect' };
    } else if (type === 'bookmark') {
      dims = { w: 50, h: 150, shape: 'rect' };
    } else if (type === 'photocard') {
      dims = { w: 54, h: 86, shape: 'rect' };
    } else if (type === 'spotify') {
      dims = { w: 60, h: 90, shape: 'rect' };
    } else if (type === 'ticket') {
      dims = { w: 60, h: 140, shape: 'rect' };
    }

    onChangeTemplateConfig(newConfig, dims);
  };

  // Upload Avatar riêng cho Instagram
  const handleUploadCustomAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onChangeTemplateConfig({
        ...templateConfig,
        instagram: {
          ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'custom' }),
          avatarType: 'custom',
          avatarSrc: result,
        },
      });
      onToast('success', 'Đã tải avatar riêng thành công!');
    };
    reader.readAsDataURL(file);
  };

  // Lưu thông tin Instagram vào localStorage để dùng lại
  const handleSaveInstagramProfile = () => {
    if (!templateConfig.instagram) return;
    try {
      localStorage.setItem(
        'daudau_instagram_profile',
        JSON.stringify({
          username: templateConfig.instagram.username,
          avatarType: templateConfig.instagram.avatarType,
          avatarSrc: templateConfig.instagram.avatarSrc,
        })
      );
      onToast('success', 'Đã lưu tên & avatar Instagram để sử dụng lại!');
    } catch (err) {
      onToast('error', 'Không thể lưu hồ sơ Instagram');
    }
  };

  // Tải lại thông tin Instagram đã lưu
  const handleLoadSavedInstagramProfile = () => {
    try {
      const saved = localStorage.getItem('daudau_instagram_profile');
      if (!saved) {
        onToast('info', 'Chưa có thông tin Instagram nào được lưu trước đó.');
        return;
      }
      const data = JSON.parse(saved);
      onChangeTemplateConfig({
        ...templateConfig,
        instagram: {
          ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
          username: data.username || 'daudau_print',
          avatarType: data.avatarType || 'main',
          avatarSrc: data.avatarSrc,
        },
      });
      onToast('success', 'Đã áp dụng thông tin Instagram đã lưu!');
    } catch {
      onToast('error', 'Lỗi khi đọc dữ liệu lưu trữ');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Thanh chọn Mẫu thiết kế đặc thù */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Chọn mẫu thiết kế thành phẩm:</span>
          </label>
          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {activeType === 'none'
              ? 'Ảnh tiêu chuẩn'
              : activeType === 'polaroid'
              ? 'Polaroid'
              : activeType === 'instagram'
              ? 'Instagram Post'
              : activeType === 'photostrip'
              ? 'Photostrip'
              : activeType === 'film'
              ? 'Viền Film'
              : activeType === 'bookmark'
              ? 'Bookmark'
              : activeType === 'photocard'
              ? 'Photocard (Bo góc)'
              : activeType === 'spotify'
              ? 'Khung nhạc Spotify'
              : activeType === 'ticket'
              ? 'Vé máy bay Boarding Pass'
              : 'Huy hiệu cài áo'}
          </span>
        </div>

        {/* Danh sách 10 mẫu in */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* None */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('none')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'none'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🖼️</span>
              {activeType === 'none' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Chuẩn thường</span>
            <span className="text-[10px] text-slate-500">In tràn / không viền</span>
          </button>

          {/* Polaroid */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('polaroid')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'polaroid'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">📸</span>
              {activeType === 'polaroid' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Polaroid</span>
            <span className="text-[10px] text-slate-500">Chân rộng ghi chữ</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('instagram')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'instagram'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">📱</span>
              {activeType === 'instagram' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Instagram</span>
            <span className="text-[10px] text-slate-500">Mô phỏng bài viết</span>
          </button>

          {/* Photostrip */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('photostrip')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'photostrip'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🎞️</span>
              {activeType === 'photostrip' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Photostrip</span>
            <span className="text-[10px] text-slate-500">Dải ghép 3 - 4 ảnh</span>
          </button>

          {/* Viền film */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('film')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'film'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🎬</span>
              {activeType === 'film' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Viền Film</span>
            <span className="text-[10px] text-slate-500">Khung đen & số "01"</span>
          </button>

          {/* Bookmark */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('bookmark')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'bookmark'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🔖</span>
              {activeType === 'bookmark' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Bookmark</span>
            <span className="text-[10px] text-slate-500">Thẻ kẹp sách 5x15</span>
          </button>

          {/* Photocard Idol */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('photocard')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'photocard'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🃏</span>
              {activeType === 'photocard' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Photocard Idol</span>
            <span className="text-[10px] text-slate-500">Bo góc tròn K-Pop</span>
          </button>

          {/* Spotify Player */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('spotify')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'spotify'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🎵</span>
              {activeType === 'spotify' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Khung Spotify</span>
            <span className="text-[10px] text-slate-500">Sóng âm & Play bar</span>
          </button>

          {/* Boarding Pass */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('ticket')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 ${
              activeType === 'ticket'
                ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">✈️</span>
              {activeType === 'ticket' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
            <span className="text-xs font-bold">Boarding Pass</span>
            <span className="text-[10px] text-slate-500">Vé máy bay & Barcode</span>
          </button>

          {/* Huy hiệu cài áo */}
          <button
            type="button"
            onClick={() => handleSelectTemplate('badge')}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col gap-1 col-span-2 sm:col-span-3 ${
              activeType === 'badge'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500/30 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🏅</span>
                <span className="text-xs font-bold">Phôi Huy Hiệu Cài Áo Chuyên Dụng</span>
              </div>
              {activeType === 'badge' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <span className="text-[10px] text-slate-500">
              Tự động đổ nền viền bọc mép khuôn (5.4cm/6.9cm/11.4cm) & căn mặt chính diện
            </span>
          </button>
        </div>
      </div>

      {/* 2. BẢNG TINH CHỈNH CHI TIẾT TỪNG MẪU */}

      {/* A. POLAROID */}
      {activeType === 'polaroid' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>📸 Tùy chỉnh mẫu Polaroid</span>
            </span>
          </div>

          {/* Kích thước thành phẩm */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '6 × 9 cm', w: 60, h: 90 },
              { label: '9 × 12 cm', w: 90, h: 120 },
              { label: '10 × 15 cm', w: 100, h: 150 },
              { label: '8 × 8 cm (Vuông)', w: 80, h: 80 },
            ]}
          />

          {/* Lời nhắn dòng 1 & dòng 2 */}
          <div className="space-y-2">
            <TemplateTextToolbar
              label="Lời nhắn chân ảnh Polaroid:"
              hasText={Boolean(templateConfig.textLine1 || templateConfig.textLine2)}
              onClearCurrent={() => handleClearCurrentPhotoText('polaroid')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('polaroid')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('polaroid')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'polaroid').length || 1}
              templateName="Polaroid"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lời nhắn dòng 1:
              </label>
              <input
                type="text"
                value={templateConfig.textLine1 ?? ''}
                onChange={(e) =>
                  onChangeTemplateConfig({ ...templateConfig, textLine1: e.target.value })
                }
                placeholder="Ví dụ: Sweet Memories..."
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lời nhắn dòng 2 (tùy chọn):
              </label>
              <input
                type="text"
                value={templateConfig.textLine2 ?? ''}
                onChange={(e) =>
                  onChangeTemplateConfig({ ...templateConfig, textLine2: e.target.value })
                }
                placeholder="Ví dụ: 19.10.2026 • Dalat trip"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phông chữ & Cỡ chữ */}
          <div className="space-y-2 pt-1">
            <FontSelector
              value={templateConfig.fontFamily || 'dancing_script'}
              onChange={(fontId) => onChangeTemplateConfig({ ...templateConfig, fontFamily: fontId })}
              label="Kiểu phông chữ viết tay / in ấn:"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Cỡ chữ: {templateConfig.fontSizePt || 13} pt
              </label>
              <input
                type="range"
                min="9"
                max="24"
                step="1"
                value={templateConfig.fontSizePt || 13}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    fontSizePt: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Màu khung Polaroid */}
          <div className="pt-1">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Màu khung:</label>
            <div className="flex items-center gap-1.5">
              {['#ffffff', '#fef9c3', '#fce7f3', '#f1f5f9', '#0f172a'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeTemplateConfig({ ...templateConfig, frameColor: col })}
                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                    (templateConfig.frameColor || '#ffffff').toLowerCase() === col
                      ? 'border-blue-600 scale-110 shadow-xs'
                      : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={templateConfig.frameColor || '#ffffff'}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, frameColor: e.target.value })}
                className="w-6 h-6 p-0 rounded-full cursor-pointer border border-slate-300 hover:border-blue-500"
                title="Chọn màu khác"
              />
            </div>
          </div>

          {/* Tùy chỉnh độ dày viền trắng & Chân dưới Polaroid */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Độ dày viền trắng (trên & 2 bên):</span>
                </span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.polaroid?.borderMm ?? 3} mm</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={templateConfig.polaroid?.borderMm ?? 3}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    polaroid: {
                      ...(templateConfig.polaroid || {}),
                      borderMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>1 mm (Viền mảnh)</span>
                <span>3 mm (Chuẩn)</span>
                <span>12 mm (Viền dày vintage)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Độ cao chân dưới ghi chữ:</span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.polaroid?.bottomMm ?? 16} mm</span>
              </div>
              <input
                type="range"
                min="10"
                max="35"
                step="1"
                value={templateConfig.polaroid?.bottomMm ?? 16}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    polaroid: {
                      ...(templateConfig.polaroid || {}),
                      bottomMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>10 mm (Gọn)</span>
                <span>16 mm (Chuẩn)</span>
                <span>35 mm (Chân cao)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. INSTAGRAM */}
      {activeType === 'instagram' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>📱 Tùy chỉnh bài viết Instagram</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSaveInstagramProfile}
                title="Lưu thông tin Instagram này để dùng lại"
                className="p-1 rounded-md text-slate-600 hover:bg-slate-100 flex items-center gap-1 text-[10.5px] font-bold border border-slate-200"
              >
                <Save className="w-3 h-3 text-blue-600" />
                <span>Lưu mẫu</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSavedInstagramProfile}
                title="Tải lại thông tin đã lưu"
                className="p-1 rounded-md text-slate-600 hover:bg-slate-100 flex items-center gap-1 text-[10.5px] font-bold border border-slate-200"
              >
                <span>Nạp mẫu</span>
              </button>
            </div>
          </div>

          {/* Kích thước thành phẩm */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '9 × 12 cm', w: 90, h: 120 },
              { label: '10 × 15 cm', w: 100, h: 150 },
              { label: '6 × 9 cm', w: 60, h: 90 },
              { label: '9 × 9 cm (Vuông)', w: 90, h: 90 },
            ]}
          />

          {/* Tên hiển thị (Username) */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
              <span>Tên hiển thị / Username (tối đa 30 ký tự):</span>
              <span className="text-[10px] text-slate-400">
                {(templateConfig.instagram?.username || '').length}/30
              </span>
            </label>
            <input
              type="text"
              maxLength={30}
              value={templateConfig.instagram?.username ?? 'daudau_print'}
              onChange={(e) =>
                onChangeTemplateConfig({
                  ...templateConfig,
                  instagram: {
                    ...(templateConfig.instagram || { avatarType: 'main' }),
                    username: e.target.value,
                  },
                })
              }
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Lựa chọn Avatar (4 nguồn) */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Hình đại diện (Avatar tròn Ø 8 mm):
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-[10.5px]">
              <button
                type="button"
                onClick={() =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    instagram: {
                      ...(templateConfig.instagram || { username: 'daudau_print' }),
                      avatarType: 'main',
                    },
                  })
                }
                className={`py-1.5 px-1 rounded-lg border font-bold text-center transition ${
                  templateConfig.instagram?.avatarType === 'main'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Từ ảnh chính
              </button>

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className={`py-1.5 px-1 rounded-lg border font-bold text-center transition ${
                  templateConfig.instagram?.avatarType === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tải ảnh riêng
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadCustomAvatar}
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    instagram: {
                      ...(templateConfig.instagram || { username: 'daudau_print' }),
                      avatarType: 'initial',
                    },
                  })
                }
                className={`py-1.5 px-1 rounded-lg border font-bold text-center transition ${
                  templateConfig.instagram?.avatarType === 'initial'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Chữ cái đầu
              </button>

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className={`py-1.5 px-1 rounded-lg border font-bold text-center transition ${
                  templateConfig.instagram?.avatarType === 'logo'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Logo tiệm
              </button>
            </div>
          </div>

          {/* Bố cục ảnh chính & Nút tính năng */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Khuôn ảnh chính:
              </label>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      instagram: {
                        ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
                        layoutMode: 'rect',
                      },
                    })
                  }
                  className={`flex-1 py-1 rounded-md font-bold transition ${
                    templateConfig.instagram?.layoutMode !== 'square'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Chữ nhật (Dọc)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      instagram: {
                        ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
                        layoutMode: 'square',
                      },
                    })
                  }
                  className={`flex-1 py-1 rounded-md font-bold transition ${
                    templateConfig.instagram?.layoutMode === 'square'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vuông 1:1
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateConfig.instagram?.showFollowBtn ?? true}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      instagram: {
                        ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
                        showFollowBtn: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span>Hiện nút Follow</span>
              </label>

              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateConfig.instagram?.liked ?? true}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      instagram: {
                        ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
                        liked: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-rose-600"
                />
                <span>Thả tim đỏ (Liked)</span>
              </label>

              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateConfig.instagram?.hasGradientRing ?? true}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      instagram: {
                        ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
                        hasGradientRing: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-pink-600"
                />
                <span>Vòng màu Story Instagram</span>
              </label>
            </div>
          </div>

          {/* Tùy chỉnh độ dày viền trắng quanh bài viết */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Độ dày viền trắng quanh bài viết:</span>
              </span>
              <span className="text-blue-600 font-mono font-bold">
                {(templateConfig.instagram?.borderMm ?? 4) === 0 ? '0 mm (Tràn viền)' : `${templateConfig.instagram?.borderMm ?? 4} mm`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={templateConfig.instagram?.borderMm ?? 4}
              onChange={(e) =>
                onChangeTemplateConfig({
                  ...templateConfig,
                  instagram: {
                    ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
                    borderMm: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[9.5px] text-slate-400">
              <span>0 mm (Tràn mép thẻ)</span>
              <span>4 mm (Chuẩn)</span>
              <span>12 mm (Thẻ viền rộng)</span>
            </div>
          </div>

          {/* Lượt thích & Màu nền thẻ */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Số lượt thích:
              </label>
              <input
                type="text"
                value={templateConfig.instagram?.likesCount ?? '1,280 lượt thích'}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    instagram: {
                      ...(templateConfig.instagram || { username: 'daudau_print', avatarType: 'main' }),
                      likesCount: e.target.value,
                    },
                  })
                }
                placeholder="1,280 lượt thích"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Màu nền thẻ:</label>
              <div className="flex items-center gap-1.5 pt-0.5">
                {['#ffffff', '#0a0a0a', '#f8fafc', '#fdf2f8', '#f0fdf4'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => onChangeTemplateConfig({ ...templateConfig, frameColor: col })}
                    className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                      (templateConfig.frameColor || '#ffffff').toLowerCase() === col
                        ? 'border-blue-600 scale-110 shadow-xs'
                        : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
                <input
                  type="color"
                  value={templateConfig.frameColor || '#ffffff'}
                  onChange={(e) => onChangeTemplateConfig({ ...templateConfig, frameColor: e.target.value })}
                  className="w-6 h-6 p-0 rounded-full cursor-pointer border border-slate-300 hover:border-blue-500"
                  title="Chọn màu khác"
                />
              </div>
            </div>
          </div>

          {/* Lời nhắn / Caption */}
          <div className="space-y-1.5 pt-1">
            <TemplateTextToolbar
              label="Lời nhắn / Caption bài viết:"
              hasText={Boolean(templateConfig.textLine1 || templateConfig.textLine2)}
              onClearCurrent={() => handleClearCurrentPhotoText('instagram')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('instagram')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('instagram')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'instagram').length || 1}
              templateName="Instagram"
            />
            <input
              type="text"
              value={templateConfig.textLine1 ?? ''}
              onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine1: e.target.value })}
              placeholder="Dòng 1: Nội dung bài viết..."
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <input
              type="text"
              value={templateConfig.textLine2 ?? ''}
              onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine2: e.target.value })}
              placeholder="Dòng 2: #hashtag hoặc ngày tháng..."
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Phông chữ hiển thị */}
          <div className="pt-1">
            <FontSelector
              value={templateConfig.fontFamily || 'be_vietnam_pro'}
              onChange={(fontId) => onChangeTemplateConfig({ ...templateConfig, fontFamily: fontId })}
              label="Kiểu phông chữ bài viết:"
            />
          </div>
        </div>
      )}

      {/* C. PHOTOSTRIP */}
      {activeType === 'photostrip' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <input
            ref={slotFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleSlotFileChange}
            className="hidden"
          />

          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>🎞️ Dải Photostrip</span>
            </span>
            <div className="flex gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleSetSlotCount(3)}
                className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                  slotCount === 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                3 ô ảnh
              </button>
              <button
                type="button"
                onClick={() => handleSetSlotCount(4)}
                className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                  slotCount === 4
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                4 ô ảnh
              </button>
            </div>
          </div>

          {/* Kích thước thành phẩm dải ảnh */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '5 × 15 cm (Chuẩn)', w: 50, h: 150 },
              { label: '4 × 12 cm (Bỏ ví)', w: 40, h: 120 },
              { label: '6 × 18 cm (Khổ to)', w: 60, h: 180 },
            ]}
          />

          {/* QUẢN LÝ TỪNG Ô ẢNH TRÊN DẢI (MULTI-PHOTO SLOTS) */}
          <div className="space-y-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <Columns className="w-3.5 h-3.5 text-blue-600" />
                <span>Quản lý từng ô ảnh ({slotCount} ô riêng biệt):</span>
              </label>
            </div>

            {/* Thanh công cụ thao tác nhanh */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={handleAutoFillSlots}
                title="Tự động lấy các ảnh kế tiếp từ danh sách dự án gán vào từng ô"
                className="py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>⚡ Tự động gán theo thứ tự</span>
              </button>
              <button
                type="button"
                onClick={handleShuffleSlots}
                title="Xáo trộn vị trí các ô ngẫu nhiên"
                className="py-1 px-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <Shuffle className="w-3 h-3 text-slate-500" />
                <span>Xáo trộn</span>
              </button>
              <button
                type="button"
                onClick={handleReverseSlots}
                title="Đảo ngược thứ tự các ô"
                className="py-1 px-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <span>Đảo ngược</span>
              </button>
              <button
                type="button"
                onClick={handleResetSlotsToMain}
                title="Đặt lại toàn bộ các ô về ảnh chính ban đầu"
                className="py-1 px-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Đặt lại</span>
              </button>
            </div>

            {/* Danh sách các ô ảnh */}
            <div className="space-y-2 pt-1">
              {getEffectiveSlots().map((slot, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === slotCount - 1;

                return (
                  <div
                    key={slot.id || idx}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Thumbnail & Slot badge */}
                    <div className="relative w-11 h-11 shrink-0 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                      <img
                        src={slot.photoSrc}
                        alt={`Ô ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-0.5 left-0.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1 rounded-xs">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Controls & Selection */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          Ô {idx + 1}: {slot.photoName || (idx === 0 ? 'Ảnh chính' : 'Ảnh phụ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Dropdown chọn ảnh từ danh sách dự án */}
                        {allPhotos && allPhotos.length > 0 && (
                          <select
                            value={slot.photoId || ''}
                            onChange={(e) => {
                              const found = allPhotos.find((p) => p.id === e.target.value);
                              if (found) handleSelectProjectPhotoForSlot(idx, found);
                            }}
                            className="text-[10px] py-1 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 max-w-[120px] truncate cursor-pointer"
                            title="Chọn ảnh khác từ danh sách dự án"
                          >
                            <option value="">-- Chọn ảnh dự án --</option>
                            {allPhotos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Nút tải ảnh riêng từ máy */}
                        <button
                          type="button"
                          onClick={() => handleOpenUploadForSlot(idx)}
                          className="p-1 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition cursor-pointer"
                          title="Tải ảnh riêng từ máy tính cho ô này"
                        >
                          <Upload className="w-3 h-3 text-blue-600" />
                        </button>

                        {/* Nút xoay 90° */}
                        <button
                          type="button"
                          onClick={() => handleRotateSlot(idx)}
                          className="p-1 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition cursor-pointer"
                          title="Xoay ảnh ô này 90°"
                        >
                          <RotateCw className="w-3 h-3 text-emerald-600" />
                        </button>
                      </div>
                    </div>

                    {/* Nút di chuyển lên / xuống */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleSwapSlots(idx, idx - 1)}
                        className={`p-1 rounded-md transition ${
                          isFirst
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                        }`}
                        title="Đổi vị trí lên trên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleSwapSlots(idx, idx + 1)}
                        className={`p-1 rounded-md transition ${
                          isLast
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                        }`}
                        title="Đổi vị trí xuống dưới"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LỜI NHẮN & PHÔNG CHỮ */}
          <div className="space-y-2">
            <TemplateTextToolbar
              label="Lời nhắn chân dải Photostrip:"
              hasText={Boolean(templateConfig.textLine1 || templateConfig.textLine2)}
              onClearCurrent={() => handleClearCurrentPhotoText('photostrip')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('photostrip')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('photostrip')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'photostrip').length || 1}
              templateName="Photostrip"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lời nhắn chân dải (dòng 1):
              </label>
              <input
                type="text"
                value={templateConfig.textLine1 ?? ''}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine1: e.target.value })}
                placeholder="PHOTOBOOTH MEMORIES"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Ngày giờ / Dòng 2:
              </label>
              <input
                type="text"
                value={templateConfig.textLine2 ?? ''}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine2: e.target.value })}
                placeholder="19.10.2026"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phông chữ & Cỡ chữ */}
          <div className="space-y-2 pt-1">
            <FontSelector
              value={templateConfig.fontFamily || 'montserrat'}
              onChange={(fontId) => onChangeTemplateConfig({ ...templateConfig, fontFamily: fontId })}
              label="Kiểu phông chữ chân dải:"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Cỡ chữ chân dải: {templateConfig.fontSizePt || 10} pt
              </label>
              <input
                type="range"
                min="8"
                max="18"
                step="1"
                value={templateConfig.fontSizePt || 10}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    fontSizePt: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Màu nền dải */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Màu nền khung dải:</label>
            <div className="flex items-center gap-1.5">
              {['#ffffff', '#0a0a0a', '#fbcfe8', '#e0e7ff', '#fef3c7', '#dcfce7'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeTemplateConfig({ ...templateConfig, frameColor: col })}
                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                    (templateConfig.frameColor || '#ffffff').toLowerCase() === col
                      ? 'border-blue-600 scale-110 shadow-xs'
                      : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={templateConfig.frameColor || '#ffffff'}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, frameColor: e.target.value })}
                className="w-6 h-6 p-0 rounded-full cursor-pointer border border-slate-300 hover:border-blue-500"
                title="Chọn màu khác"
              />
            </div>
          </div>

          {/* Tùy chỉnh độ dày viền trắng, khoảng cách ô & Chân dải */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Độ dày viền quanh dải:</span>
                </span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.photostrip?.borderMm ?? 3} mm</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={templateConfig.photostrip?.borderMm ?? 3}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    photostrip: {
                      ...(templateConfig.photostrip || { slotCount: 4 }),
                      borderMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>1 mm (Viền mảnh)</span>
                <span>3 mm (Chuẩn)</span>
                <span>8 mm (Viền rộng)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Khoảng cách giữa các ô ảnh:</span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.photostrip?.gapMm ?? 2} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={templateConfig.photostrip?.gapMm ?? 2}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    photostrip: {
                      ...(templateConfig.photostrip || { slotCount: 4 }),
                      gapMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>0 mm (Liền sát)</span>
                <span>2 mm (Chuẩn)</span>
                <span>6 mm (Thưa thoáng)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Độ cao chân dải ghi lời nhắn:</span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.photostrip?.bottomMm ?? 10} mm</span>
              </div>
              <input
                type="range"
                min="6"
                max="25"
                step="1"
                value={templateConfig.photostrip?.bottomMm ?? 10}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    photostrip: {
                      ...(templateConfig.photostrip || { slotCount: 4 }),
                      bottomMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>6 mm (Nhỏ gọn)</span>
                <span>10 mm (Chuẩn)</span>
                <span>25 mm (Chân rộng)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. VIỀN FILM */}
      {activeType === 'film' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">
              🎬 Tùy chỉnh Viền Film cổ điển
            </span>
          </div>

          {/* Kích thước thành phẩm Film */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '6 × 9 cm', w: 60, h: 90 },
              { label: '10 × 15 cm', w: 100, h: 150 },
              { label: '9 × 12 cm', w: 90, h: 120 },
            ]}
          />

          <div className="space-y-2">
            <TemplateTextToolbar
              label="Dòng chữ kỷ niệm mép Film:"
              hasText={Boolean(templateConfig.film?.sideText)}
              onClearCurrent={() => handleClearCurrentPhotoText('film')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('film')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('film')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'film').length || 1}
              templateName="Film"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Dòng chữ kỷ niệm mép trái:
              </label>
              <input
                type="text"
                value={templateConfig.film?.sideText ?? 'FUJIFILM SUPERIA 400 • MEMORIES'}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    film: { ...(templateConfig.film || {}), sideText: e.target.value },
                  })
                }
                className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Số khung ảnh:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={templateConfig.film?.frameNumber ?? '01'}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      film: { ...(templateConfig.film || {}), frameNumber: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateConfig.film?.autoIncrement ?? true}
                    onChange={(e) =>
                      onChangeTemplateConfig({
                        ...templateConfig,
                        film: { ...(templateConfig.film || {}), autoIncrement: e.target.checked },
                      })
                    }
                    className="rounded text-amber-600"
                  />
                  <span>Tự nhảy số 01, 02...</span>
                </label>
              </div>
            </div>

            {/* Màu khung Film */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Màu khung Film:</label>
              <div className="flex items-center gap-1.5">
                {['#0a0a0a', '#18181b', '#27272a', '#ffffff', '#3f2c22'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => onChangeTemplateConfig({ ...templateConfig, frameColor: col })}
                    className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                      (templateConfig.frameColor || '#0a0a0a').toLowerCase() === col
                        ? 'border-amber-600 scale-110 shadow-xs'
                        : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
                <input
                  type="color"
                  value={templateConfig.frameColor || '#0a0a0a'}
                  onChange={(e) => onChangeTemplateConfig({ ...templateConfig, frameColor: e.target.value })}
                  className="w-6 h-6 p-0 rounded-full cursor-pointer border border-slate-300 hover:border-amber-500"
                  title="Chọn màu khác"
                />
              </div>
            </div>

            {/* Phông chữ mép film */}
            <div className="pt-1">
              <FontSelector
                value={templateConfig.fontFamily || 'mono'}
                onChange={(fontId) => onChangeTemplateConfig({ ...templateConfig, fontFamily: fontId })}
                label="Kiểu phông chữ mép film:"
              />
            </div>

            {/* Tùy chỉnh độ dày viền film */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>Độ dày viền film đục lỗ (2 bên):</span>
                </span>
                <span className="text-amber-600 font-mono font-bold">{templateConfig.film?.borderMm ?? 4} mm</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                step="0.5"
                value={templateConfig.film?.borderMm ?? 4}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    film: {
                      ...(templateConfig.film || {}),
                      borderMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-amber-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>2 mm (Mảnh)</span>
                <span>4 mm (Chuẩn 35mm)</span>
                <span>10 mm (Viền dày)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E. BOOKMARK */}
      {activeType === 'bookmark' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">
              🔖 Tùy chỉnh Thẻ Bookmark
            </span>
          </div>

          {/* Kích thước thành phẩm Bookmark */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '5 × 15 cm (Chuẩn)', w: 50, h: 150 },
              { label: '4 × 12 cm (Nhỏ gọn)', w: 40, h: 120 },
              { label: '6 × 18 cm (Cỡ lớn)', w: 60, h: 180 },
            ]}
          />

          <div className="space-y-2">
            <TemplateTextToolbar
              label="Lời nhắn chân thẻ Bookmark:"
              hasText={Boolean(templateConfig.textLine1 || templateConfig.textLine2)}
              onClearCurrent={() => handleClearCurrentPhotoText('bookmark')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('bookmark')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('bookmark')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'bookmark').length || 1}
              templateName="Bookmark"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lời nhắn chân thẻ:
              </label>
              <input
                type="text"
                value={templateConfig.textLine1 ?? ''}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine1: e.target.value })}
                placeholder="Dành tặng trang sách yêu thích 📖"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Dòng 2 (tác giả hoặc trích dẫn):
              </label>
              <input
                type="text"
                value={templateConfig.textLine2 ?? ''}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine2: e.target.value })}
                placeholder="Read with love & passion"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phông chữ & Cỡ chữ */}
          <div className="space-y-2 pt-1">
            <FontSelector
              value={templateConfig.fontFamily || 'playpen_sans'}
              onChange={(fontId) => onChangeTemplateConfig({ ...templateConfig, fontFamily: fontId })}
              label="Kiểu phông chữ lời nhắn:"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Cỡ chữ lời nhắn: {templateConfig.fontSizePt || 11} pt
              </label>
              <input
                type="range"
                min="8"
                max="20"
                step="1"
                value={templateConfig.fontSizePt || 11}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    fontSizePt: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Màu nền thẻ Bookmark */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Màu nền thẻ:</label>
            <div className="flex items-center gap-1.5">
              {['#ffffff', '#fef9c3', '#fce7f3', '#f1f5f9', '#0f172a'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeTemplateConfig({ ...templateConfig, frameColor: col })}
                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                    (templateConfig.frameColor || '#ffffff').toLowerCase() === col
                      ? 'border-blue-600 scale-110 shadow-xs'
                      : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={templateConfig.frameColor || '#ffffff'}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, frameColor: e.target.value })}
                className="w-6 h-6 p-0 rounded-full cursor-pointer border border-slate-300 hover:border-blue-500"
                title="Chọn màu khác"
              />
            </div>
          </div>

          {/* Tùy chỉnh độ dày viền trắng & Chân thẻ Bookmark */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Độ dày viền quanh ảnh:</span>
                </span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.bookmark?.borderMm ?? 3} mm</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={templateConfig.bookmark?.borderMm ?? 3}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    bookmark: {
                      ...(templateConfig.bookmark || {}),
                      borderMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>1 mm (Viền mảnh)</span>
                <span>3 mm (Chuẩn)</span>
                <span>8 mm (Viền rộng)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Độ cao chân thẻ lời nhắn:</span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.bookmark?.bottomMm ?? 38} mm</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="1"
                value={templateConfig.bookmark?.bottomMm ?? 38}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    bookmark: {
                      ...(templateConfig.bookmark || {}),
                      bottomMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>15 mm (Gọn)</span>
                <span>38 mm (Chuẩn)</span>
                <span>50 mm (Rộng rãi)</span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.bookmark?.hasHolePunchGuide ?? true}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    bookmark: {
                      ...(templateConfig.bookmark || { borderMm: 3, photoHeightMm: 109.5 }),
                      hasHolePunchGuide: e.target.checked,
                    },
                  })
                }
                className="rounded text-blue-600"
              />
              <span>Hiển thị vạch dấu đục lỗ xỏ dây (Ø 3.6 mm)</span>
            </label>
          </div>
        </div>
      )}

      {/* F. PHOTOCARD IDOL (BO GÓC) */}
      {activeType === 'photocard' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>🃏 Tùy chỉnh Photocard Idol (Bo góc tròn)</span>
            </span>
          </div>

          {/* Kích thước thành phẩm Photocard */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '5.4 × 8.6 cm (Chuẩn K-Pop)', w: 54, h: 86 },
              { label: '5.5 × 8.5 cm (Chuẩn ATM/CCCD)', w: 55, h: 85 },
              { label: '6 × 9 cm (Cỡ lớn)', w: 60, h: 90 },
            ]}
          />

          {/* Thanh công cụ text hàng loạt */}
          <div className="space-y-2">
            <TemplateTextToolbar
              label="Tên Idol / Fandom / Lời nhắn:"
              hasText={Boolean(templateConfig.textLine1 || templateConfig.textLine2)}
              onClearCurrent={() => handleClearCurrentPhotoText('photocard')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('photocard')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('photocard')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'photocard').length || 1}
              templateName="Photocard"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tên Idol / Dòng 1:
              </label>
              <input
                type="text"
                value={templateConfig.textLine1 ?? ''}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine1: e.target.value })}
                placeholder="Idol Name / Nhóm nhạc..."
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Fandom / Dòng 2 (phụ):
              </label>
              <input
                type="text"
                value={templateConfig.textLine2 ?? ''}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, textLine2: e.target.value })}
                placeholder="Special Edition / 2026..."
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phông chữ & Cỡ chữ */}
          <div className="space-y-2 pt-1">
            <FontSelector
              value={templateConfig.fontFamily || 'be_vietnam_pro'}
              onChange={(fontId) => onChangeTemplateConfig({ ...templateConfig, fontFamily: fontId })}
              label="Kiểu phông chữ lời nhắn:"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Cỡ chữ: {templateConfig.fontSizePt || 10} pt
              </label>
              <input
                type="range"
                min="8"
                max="18"
                step="1"
                value={templateConfig.fontSizePt || 10}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    fontSizePt: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Màu nền / khung card */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Màu nền khung thẻ:</label>
            <div className="flex items-center gap-1.5">
              {['#ffffff', '#0f172a', '#fce7f3', '#fef9c3', '#e0e7ff', '#f1f5f9'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeTemplateConfig({ ...templateConfig, frameColor: col })}
                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                    (templateConfig.frameColor || '#ffffff').toLowerCase() === col
                      ? 'border-blue-600 scale-110 shadow-xs'
                      : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={templateConfig.frameColor || '#ffffff'}
                onChange={(e) => onChangeTemplateConfig({ ...templateConfig, frameColor: e.target.value })}
                className="w-6 h-6 p-0 rounded-full cursor-pointer border border-slate-300 hover:border-blue-500"
                title="Chọn màu khác"
              />
            </div>
          </div>

          {/* Tùy chỉnh Độ bo góc & Viền trắng */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Bán kính bo góc (Corner Radius):</span>
                </span>
                <span className="text-blue-600 font-mono font-bold">R{templateConfig.photocard?.borderRadiusMm ?? 3.5} mm</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={templateConfig.photocard?.borderRadiusMm ?? 3.5}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    photocard: {
                      ...(templateConfig.photocard || {}),
                      borderRadiusMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>R1 mm (Bo nhẹ)</span>
                <span>R3.5 mm (Chuẩn K-Pop)</span>
                <span>R8 mm (Bo sâu)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Độ dày viền quanh ảnh:</span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.photocard?.borderMm ?? 0} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={templateConfig.photocard?.borderMm ?? 0}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    photocard: {
                      ...(templateConfig.photocard || {}),
                      borderMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>0 mm (Tràn viền góc bo)</span>
                <span>2 mm (Viền mảnh)</span>
                <span>6 mm (Viền rộng)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Độ cao chân card ghi chữ:</span>
                <span className="text-blue-600 font-mono font-bold">{templateConfig.photocard?.bottomMm ?? 0} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="18"
                step="1"
                value={templateConfig.photocard?.bottomMm ?? 0}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    photocard: {
                      ...(templateConfig.photocard || {}),
                      bottomMm: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400">
                <span>0 mm (Không có chân chữ)</span>
                <span>8 mm (Nhỏ gọn)</span>
                <span>18 mm (Rộng rãi)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* G. SPOTIFY MUSIC PLAYER */}
      {activeType === 'spotify' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>🎵 Tùy chỉnh Khung Nhạc Spotify Player</span>
            </span>
          </div>

          {/* Kích thước thành phẩm Spotify */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '6 × 9 cm (Mini Player)', w: 60, h: 90 },
              { label: '9 × 12 cm (Chuẩn để bàn)', w: 90, h: 120 },
              { label: '10 × 15 cm (Cỡ lớn 4R)', w: 100, h: 150 },
            ]}
          />

          {/* Chọn phong cách giao diện Sáng / Tối */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Giao diện màu sắc:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    frameColor: '#121212',
                    textColor: '#ffffff',
                    spotify: { ...(templateConfig.spotify || {}), theme: 'dark' },
                  })
                }
                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                  templateConfig.spotify?.theme !== 'light'
                    ? 'bg-slate-900 text-white border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span>🌙 Dark Mode (Nền đen Spotify)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    frameColor: '#ffffff',
                    textColor: '#0f172a',
                    spotify: { ...(templateConfig.spotify || {}), theme: 'light' },
                  })
                }
                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                  templateConfig.spotify?.theme === 'light'
                    ? 'bg-blue-50 text-blue-900 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <span>☀️ Light Mode (Nền trắng hiện đại)</span>
              </button>
            </div>
          </div>

          {/* Thông tin bài hát & Toolbar text */}
          <div className="space-y-2">
            <TemplateTextToolbar
              label="Thông tin bài hát & Nghệ sĩ:"
              hasText={Boolean(templateConfig.spotify?.songTitle || templateConfig.textLine1)}
              onClearCurrent={() => handleClearCurrentPhotoText('spotify')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('spotify')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('spotify')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'spotify').length || 1}
              templateName="Spotify"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tên bài hát:
              </label>
              <input
                type="text"
                value={templateConfig.spotify?.songTitle ?? templateConfig.textLine1 ?? ''}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    textLine1: e.target.value,
                    spotify: { ...(templateConfig.spotify || {}), songTitle: e.target.value },
                  })
                }
                placeholder="Tên bài hát..."
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tên ca sĩ / nghệ sĩ:
              </label>
              <input
                type="text"
                value={templateConfig.spotify?.artistName ?? templateConfig.textLine2 ?? ''}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    textLine2: e.target.value,
                    spotify: { ...(templateConfig.spotify || {}), artistName: e.target.value },
                  })
                }
                placeholder="Tên nghệ sĩ thể hiện..."
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Thời lượng & Tiến trình nghe */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Thời điểm phát:
              </label>
              <input
                type="text"
                value={templateConfig.spotify?.currentTime ?? '01:28'}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    spotify: { ...(templateConfig.spotify || {}), currentTime: e.target.value },
                  })
                }
                placeholder="01:28"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tổng thời lượng:
              </label>
              <input
                type="text"
                value={templateConfig.spotify?.duration ?? '03:45'}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    spotify: { ...(templateConfig.spotify || {}), duration: e.target.value },
                  })
                }
                placeholder="03:45"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Slider tiến trình phát nhạc */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>Tiến trình thanh nhạc (Progress):</span>
              <span className="text-blue-600 font-mono font-bold">{templateConfig.spotify?.progressPercent ?? 38}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={templateConfig.spotify?.progressPercent ?? 38}
              onChange={(e) =>
                onChangeTemplateConfig({
                  ...templateConfig,
                  spotify: {
                    ...(templateConfig.spotify || {}),
                    progressPercent: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-green-600"
            />
          </div>

          {/* Toggle Mã vạch sóng âm Spotify Code */}
          <div className="pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.spotify?.showSpotifyCode ?? true}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    spotify: {
                      ...(templateConfig.spotify || {}),
                      showSpotifyCode: e.target.checked,
                    },
                  })
                }
                className="rounded text-green-600 focus:ring-green-500"
              />
              <span>Hiển thị mã vạch sóng âm Spotify Soundwave Code</span>
            </label>
          </div>
        </div>
      )}

      {/* H. BOARDING PASS / VÉ MÁY BAY */}
      {activeType === 'ticket' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>✈️ Tùy chỉnh Vé Máy Bay Boarding Pass</span>
            </span>
          </div>

          {/* Kích thước thành phẩm Ticket */}
          <TemplateSizeSelector
            curW={curTargetWidth}
            curH={curTargetHeight}
            onSelectSize={(w, h) => onChangeTemplateConfig(templateConfig, { w, h, shape: 'rect' })}
            presets={[
              { label: '6 × 14 cm (Chuẩn Boarding Pass)', w: 60, h: 140 },
              { label: '7 × 15 cm (Khổ rộng)', w: 70, h: 150 },
              { label: '5 × 12 cm (Mini Ticket)', w: 50, h: 120 },
            ]}
          />

          {/* Chọn phong cách màu vé */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Phong cách màu vé:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    ticket: { ...(templateConfig.ticket || {}), theme: 'airline_blue' },
                  })
                }
                className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                  templateConfig.ticket?.theme === 'airline_blue' || !templateConfig.ticket?.theme
                    ? 'bg-sky-50 text-sky-900 border-sky-500 ring-2 ring-sky-500/30'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <span>✈️ Xanh Bay</span>
                <span className="text-[9px] text-slate-400 font-normal">Hàng không</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    ticket: { ...(templateConfig.ticket || {}), theme: 'vintage_kraft' },
                  })
                }
                className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                  templateConfig.ticket?.theme === 'vintage_kraft'
                    ? 'bg-amber-50 text-amber-900 border-amber-600 ring-2 ring-amber-600/30'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <span>📜 Vintage</span>
                <span className="text-[9px] text-slate-400 font-normal">Giấy Kraft</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    ticket: { ...(templateConfig.ticket || {}), theme: 'clean_white' },
                  })
                }
                className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                  templateConfig.ticket?.theme === 'clean_white'
                    ? 'bg-slate-100 text-slate-900 border-slate-600 ring-2 ring-slate-600/30'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <span>⚪ Tối giản</span>
                <span className="text-[9px] text-slate-400 font-normal">Đen & Trắng</span>
              </button>
            </div>
          </div>

          {/* Thông tin chuyến bay & Toolbar text */}
          <div className="space-y-2">
            <TemplateTextToolbar
              label="Thông tin hành khách & Chuyến bay:"
              hasText={Boolean(templateConfig.ticket?.passengerName || templateConfig.textLine2)}
              onClearCurrent={() => handleClearCurrentPhotoText('ticket')}
              onClearAll={handleClearAllPhotosText}
              onApplyToSame={() => handleApplyTextToSameTemplate('ticket')}
              onApplyToAll={() => handleApplyTemplateAndTextToAll('ticket')}
              totalPhotosCount={allPhotos?.length || 1}
              sameTemplateCount={allPhotos?.filter((p) => p.templateConfig?.type === 'ticket').length || 1}
              templateName="Vé máy bay"
            />
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tên hành khách (Passenger):
              </label>
              <input
                type="text"
                value={templateConfig.ticket?.passengerName ?? templateConfig.textLine2 ?? ''}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    textLine2: e.target.value,
                    ticket: { ...(templateConfig.ticket || {}), passengerName: e.target.value },
                  })
                }
                placeholder="NGUYEN VAN A"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
              />
            </div>

            {/* Chặng bay: FROM -> TO */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nơi đi (FROM):
                </label>
                <input
                  type="text"
                  value={templateConfig.ticket?.from ?? 'HAN'}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      ticket: { ...(templateConfig.ticket || {}), from: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="HAN"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-bold text-sky-700"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nơi đến (TO):
                </label>
                <input
                  type="text"
                  value={templateConfig.ticket?.to ?? 'SGN'}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      ticket: { ...(templateConfig.ticket || {}), to: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="SGN"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-bold text-sky-700"
                />
              </div>
            </div>

            {/* Mã chuyến bay & Cổng & Ghế */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Chuyến bay:
                </label>
                <input
                  type="text"
                  value={templateConfig.ticket?.flight ?? 'VN-2026'}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      ticket: { ...(templateConfig.ticket || {}), flight: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="VN-2026"
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Cổng (Gate):
                </label>
                <input
                  type="text"
                  value={templateConfig.ticket?.gate ?? '08'}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      ticket: { ...(templateConfig.ticket || {}), gate: e.target.value },
                    })
                  }
                  placeholder="08"
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Ghế (Seat):
                </label>
                <input
                  type="text"
                  value={templateConfig.ticket?.seat ?? '12A'}
                  onChange={(e) =>
                    onChangeTemplateConfig({
                      ...templateConfig,
                      ticket: { ...(templateConfig.ticket || {}), seat: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="12A"
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-center"
                />
              </div>
            </div>

            {/* Mã vạch Barcode Text */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Ký tự in dưới mã vạch Barcode:
              </label>
              <input
                type="text"
                value={templateConfig.ticket?.barcodeText ?? 'DAU-DAU-PRINT-2026'}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    ticket: { ...(templateConfig.ticket || {}), barcodeText: e.target.value.toUpperCase() },
                  })
                }
                placeholder="DAU-DAU-PRINT-2026"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              />
            </div>
          </div>

          {/* Toggle Vết khuyết bán nguyệt (Notch) & đường xé vé */}
          <div className="pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.ticket?.notchCut ?? true}
                onChange={(e) =>
                  onChangeTemplateConfig({
                    ...templateConfig,
                    ticket: {
                      ...(templateConfig.ticket || {}),
                      notchCut: e.target.checked,
                    },
                  })
                }
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Đường nét đứt xé vé & vết khuyết bán nguyệt ở 2 mép</span>
            </label>
          </div>
        </div>
      )}

      {/* F. HUY HIỆU CÀI ÁO (BADGE PIN) */}
      {activeType === 'badge' && (
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/90 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>🏅 Tùy chỉnh Phôi Huy Hiệu Cài Áo</span>
            </span>
          </div>

          {/* Chọn khuôn phôi tiêu chuẩn */}
          <div>
            <label className="text-[11px] font-bold text-slate-800 block mb-1.5">
              Chọn kích cỡ khuôn dập & mặt chính diện:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'b44', label: '4.4 cm', face: 43, cut: 54 },
                { id: 'b58', label: '5.8 cm', face: 57, cut: 69 },
                { id: 'b100', label: '10.0 cm', face: 99, cut: 114 },
              ].map((spec) => {
                const isSelected = curTargetWidth === spec.cut && badgeFaceDiameter === spec.face;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => {
                      onUpdateBadge({
                        badgeFaceDiameter: spec.face,
                        width: spec.cut,
                        height: spec.cut,
                        shape: 'circle',
                      });
                    }}
                    className={`py-2 px-1 rounded-xl text-center border transition cursor-pointer flex flex-col items-center ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{spec.label}</span>
                    <span className="text-[9.5px] opacity-80">Khuôn {spec.cut / 10} cm</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kiểu đổ nền viền bọc mép */}
          <div>
            <label className="text-[11px] font-bold text-slate-800 block mb-1.5">
              Kiểu đổ nền viền bọc mép khuôn:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => onUpdateBadge({ badgeBleedMode: 'blur_expand' })}
                className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition ${
                  badgeBleedMode === 'blur_expand'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/50'
                }`}
              >
                <span>✨ Kéo giãn làm mờ</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateBadge({ badgeBleedMode: 'solid' })}
                className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition ${
                  badgeBleedMode !== 'blur_expand'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/50'
                }`}
              >
                <span>🎨 Đổ màu đơn sắc</span>
              </button>
            </div>
          </div>

          {/* Bảng màu nhận diện tự động từ biên ảnh */}
          {badgeBleedMode !== 'blur_expand' && (
            <div>
              <label className="text-[11px] font-bold text-slate-800 block mb-1">
                Màu viền bọc (nhận diện tự động từ ảnh):
              </label>
              <div className="flex items-center gap-2">
                {badgeBleedPalette?.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => onUpdateBadge({ badgeBleedColor: col, badgeBleedMode: 'solid' })}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      (badgeBleedColor || '').toLowerCase() === col.toLowerCase()
                        ? 'border-emerald-600 scale-110 shadow-xs'
                        : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
                <input
                  type="color"
                  value={badgeBleedColor || '#ffffff'}
                  onChange={(e) =>
                    onUpdateBadge({ badgeBleedColor: e.target.value, badgeBleedMode: 'solid' })
                  }
                  className="w-7 h-7 p-0 rounded-full cursor-pointer border border-slate-300"
                  title="Chọn màu khác"
                />
              </div>
            </div>
          )}

          {/* Vạch nét đứt căn dập mặt trước */}
          <div className="pt-1 border-t border-emerald-200/60">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={badgeGuideLines}
                onChange={(e) => onUpdateBadge({ badgeGuideLines: e.target.checked })}
                className="rounded text-emerald-600"
              />
              <span>Hiện vạch nét đứt căn dập mặt trước (Ø {(badgeFaceDiameter / 10).toFixed(1)} cm)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
