import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Scissors,
  CheckCircle2,
  Maximize2,
  Info,
  ArrowLeftRight,
} from 'lucide-react';
import { PhotoItem, ShapeType, ImageAdjustments, DEFAULT_ADJUSTMENTS } from '../types';
import {
  rotateImageBase64,
  calculateCrop,
  createOptimizedPreview,
  cropImageToCanvas,
} from '../utils/imageUtils';
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

type CropRatioPreset = 'free' | '1:1' | 'target' | '3:4' | '4:3' | '9:16' | '16:9';

interface CropBoxCoords {
  x: number;
  y: number;
  w: number;
  h: number;
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
  // In the crop tab, allow switching between "Khung in & Căn góc" and "Cắt xén ảnh (Interactive Crop)"
  const [cropSubMode, setCropSubMode] = useState<'frame' | 'cropTool'>('frame');

  const [scale, setScale] = useState(photo.scale || 1);
  const [cropX, setCropX] = useState(photo.cropX);
  const [cropY, setCropY] = useState(photo.cropY);
  const [cropW, setCropW] = useState(photo.cropW);
  const [cropH, setCropH] = useState(photo.cropH);

  const [shape, setShape] = useState<ShapeType>(photo.shape);
  const [curTargetWidth, setCurTargetWidth] = useState<number>(photo.targetWidth);
  const [curTargetHeight, setCurTargetHeight] = useState<number>(photo.targetHeight);
  // Remember original rectangular dimensions when switching between shapes
  const rectDimsRef = useRef<{ w: number; h: number }>({
    w: photo.targetWidth,
    h: photo.targetHeight,
  });

  // Custom size controls state
  const [sizeUnit, setSizeUnit] = useState<'cm' | 'mm'>('cm');
  const [customWidthInput, setCustomWidthInput] = useState<string>(() =>
    (photo.targetWidth / 10).toFixed(1).replace('.0', '')
  );
  const [customHeightInput, setCustomHeightInput] = useState<string>(() =>
    (photo.targetHeight / 10).toFixed(1).replace('.0', '')
  );

  const [currentImgWidth, setCurrentImgWidth] = useState(photo.imgWidth);
  const [currentImgHeight, setCurrentImgHeight] = useState(photo.imgHeight);

  const [isDragging, setIsDragging] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(photo.isEnhanced || false);
  const [currentBaseSrc, setCurrentBaseSrc] = useState(photo.originalSrc);
  const [rawSrc, setRawSrc] = useState(photo.rawOriginalSrc || photo.originalSrc);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceStrength, setEnhanceStrength] = useState<number>(55);
  const unenhancedBaseSrcRef = useRef<string>(photo.rawOriginalSrc || photo.originalSrc);
  const enhanceDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);

  const [showOriginalComparison, setShowOriginalComparison] = useState(false);
  const [cropSuccessToast, setCropSuccessToast] = useState<string | null>(null);

  // Adjustments state
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(
    photo.adjustments ? { ...photo.adjustments } : { ...DEFAULT_ADJUSTMENTS }
  );
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false);
  const [previewAdjustedSrc, setPreviewAdjustedSrc] = useState<string>(photo.originalSrc);
  const [isApplyingAdjustmentPreview, setIsApplyingAdjustmentPreview] = useState(false);
  const [isCroppingAction, setIsCroppingAction] = useState(false);

  // Drag state for Framed View (Pan)
  const dragStartRef = useRef<{ x: number; y: number; startCropX: number; startCropY: number }>({
    x: 0,
    y: 0,
    startCropX: 0,
    startCropY: 0,
  });

  // Interactive Crop Box state
  const [cropRatioPreset, setCropRatioPreset] = useState<CropRatioPreset>(
    photo.shape === 'circle' ? '1:1' : 'target'
  );
  const [cropBox, setCropBox] = useState<CropBoxCoords>(() => ({
    x: Math.max(0, Math.round(photo.cropX)),
    y: Math.max(0, Math.round(photo.cropY)),
    w: Math.max(20, Math.round(photo.cropW / (photo.scale || 1))),
    h: Math.max(20, Math.round(photo.cropH / (photo.scale || 1))),
  }));

  const imageElRef = useRef<HTMLImageElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure shape 'circle' is ALWAYS 1:1 on initial render if not already
  useEffect(() => {
    if (photo.shape === 'circle' || photo.shape === 'heart') {
      const diam = Math.min(photo.targetWidth, photo.targetHeight);
      setCurTargetWidth(diam);
      setCurTargetHeight(diam);
    }
  }, [photo.shape, photo.targetWidth, photo.targetHeight]);

  // Live update for canvas adjustments preview
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

  // Framed view calculations
  const isSquareShape = shape === 'circle' || shape === 'heart';
  const effectiveTargetW = isSquareShape ? Math.min(curTargetWidth, curTargetHeight) : curTargetWidth;
  const effectiveTargetH = isSquareShape ? Math.min(curTargetWidth, curTargetHeight) : curTargetHeight;

  const actualCropW = cropW / scale;
  const actualCropH = cropH / scale;

  // Pan image in Framed view
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

    const containerEl = e.currentTarget as HTMLDivElement;
    const rect = containerEl.getBoundingClientRect();
    const pxScaleX = actualCropW / rect.width;
    const pxScaleY = actualCropH / rect.height;

    let newX = dragStartRef.current.startCropX - dx * pxScaleX;
    let newY = dragStartRef.current.startCropY - dy * pxScaleY;

    newX = Math.max(0, Math.min(newX, currentImgWidth - actualCropW));
    newY = Math.max(0, Math.min(newY, currentImgHeight - actualCropH));

    setCropX(newX);
    setCropY(newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const stateRef = useRef({
    scale,
    cropX,
    cropY,
    cropW,
    cropH,
    currentImgWidth,
    currentImgHeight,
  });
  stateRef.current = {
    scale,
    cropX,
    cropY,
    cropW,
    cropH,
    currentImgWidth,
    currentImgHeight,
  };

  const handleScaleChange = useCallback((newScale: number) => {
    const {
      scale: curScale,
      cropX: curX,
      cropY: curY,
      cropW: curW,
      cropH: curH,
      currentImgWidth: imgW,
      currentImgHeight: imgH,
    } = stateRef.current;

    const oldActualW = curW / curScale;
    const oldActualH = curH / curScale;
    const centerX = curX + oldActualW / 2;
    const centerY = curY + oldActualH / 2;

    const newActualW = curW / newScale;
    const newActualH = curH / newScale;

    let newX = centerX - newActualW / 2;
    let newY = centerY - newActualH / 2;

    newX = Math.max(0, Math.min(newX, imgW - newActualW));
    newY = Math.max(0, Math.min(newY, imgH - newActualH));

    setScale(newScale);
    setCropX(newX);
    setCropY(newY);
  }, []);

  // Mouse wheel zoom on preview box
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const curScale = stateRef.current.scale;
      // Scrolling up (deltaY < 0) zooms in, scrolling down (deltaY > 0) zooms out
      const step = e.deltaY < 0 ? 0.06 : -0.06;
      const nextScale = Math.min(3, Math.max(1, Math.round((curScale + step) * 100) / 100));
      if (nextScale !== curScale) {
        handleScaleChange(nextScale);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [handleScaleChange, activeTab, cropSubMode]);



  // Interactive Crop: Ratio calculation helper
  const getRatioValue = useCallback(
    (preset: CropRatioPreset): number | null => {
      switch (preset) {
        case '1:1':
          return 1;
        case 'target':
          return effectiveTargetW / effectiveTargetH;
        case '3:4':
          return 3 / 4;
        case '4:3':
          return 4 / 3;
        case '9:16':
          return 9 / 16;
        case '16:9':
          return 16 / 9;
        case 'free':
        default:
          return null;
      }
    },
    [effectiveTargetW, effectiveTargetH]
  );

  const updateCropBoxForRatio = useCallback(
    (ratio: number | null) => {
      if (!ratio) return;
      setCropBox((prev) => {
        let w = prev.w;
        let h = w / ratio;
        if (h > currentImgHeight) {
          h = currentImgHeight * 0.88;
          w = h * ratio;
        }
        if (w > currentImgWidth) {
          w = currentImgWidth * 0.88;
          h = w / ratio;
        }
        const x = Math.max(0, Math.min(prev.x, currentImgWidth - w));
        const y = Math.max(0, Math.min(prev.y, currentImgHeight - h));
        return {
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h),
        };
      });
    },
    [currentImgWidth, currentImgHeight]
  );

  const handleRatioPresetChange = (preset: CropRatioPreset) => {
    setCropRatioPreset(preset);
    const ratioVal = getRatioValue(preset);
    if (ratioVal !== null) {
      updateCropBoxForRatio(ratioVal);
    }
  };

  // Helper to update target dimensions and recalculate crop/layout
  const updateTargetDimensions = useCallback(
    (wMm: number, hMm: number) => {
      const validW = Math.max(10, Math.min(600, Math.round(wMm)));
      const validH = Math.max(10, Math.min(600, Math.round(hMm)));
      setCurTargetWidth(validW);
      setCurTargetHeight(validH);
      if (shape === 'rect') {
        rectDimsRef.current = { w: validW, h: validH };
      }

      const newCrop = calculateCrop(currentImgWidth, currentImgHeight, validW, validH, smartCrop);
      setCropX(newCrop.cropX);
      setCropY(newCrop.cropY);
      setCropW(newCrop.cropW);
      setCropH(newCrop.cropH);
      setScale(1);

      if (cropRatioPreset === 'target') {
        updateCropBoxForRatio(validW / validH);
      }
    },
    [currentImgWidth, currentImgHeight, smartCrop, shape, cropRatioPreset, updateCropBoxForRatio]
  );

  // Swap width and height (Cao thành Rộng, Rộng thành Cao)
  const handleSwapDimensions = () => {
    if (shape === 'circle' || shape === 'heart') return;
    const oldW = curTargetWidth;
    const oldH = curTargetHeight;
    const newW = oldH;
    const newH = oldW;

    const newWStr = sizeUnit === 'cm' ? (newW / 10).toFixed(1).replace('.0', '') : String(newW);
    const newHStr = sizeUnit === 'cm' ? (newH / 10).toFixed(1).replace('.0', '') : String(newH);

    setCustomWidthInput(newWStr);
    setCustomHeightInput(newHStr);
    updateTargetDimensions(newW, newH);
  };

  // Custom Width Input Change
  const handleCustomWidthChange = (val: string) => {
    setCustomWidthInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const mm = sizeUnit === 'cm' ? Math.round(parsed * 10) : Math.round(parsed);
      if (mm >= 10 && mm <= 600) {
        if (shape === 'circle' || shape === 'heart') {
          setCustomHeightInput(val);
          updateTargetDimensions(mm, mm);
        } else {
          updateTargetDimensions(mm, curTargetHeight);
        }
      }
    }
  };

  // Custom Height Input Change
  const handleCustomHeightChange = (val: string) => {
    setCustomHeightInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const mm = sizeUnit === 'cm' ? Math.round(parsed * 10) : Math.round(parsed);
      if (mm >= 10 && mm <= 600) {
        if (shape === 'circle' || shape === 'heart') {
          setCustomWidthInput(val);
          updateTargetDimensions(mm, mm);
        } else {
          updateTargetDimensions(curTargetWidth, mm);
        }
      }
    }
  };

  // Custom Diameter Input for Circle / Heart
  const handleDiameterInputChange = (val: string) => {
    setCustomWidthInput(val);
    setCustomHeightInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const mm = sizeUnit === 'cm' ? Math.round(parsed * 10) : Math.round(parsed);
      if (mm >= 10 && mm <= 600) {
        updateTargetDimensions(mm, mm);
      }
    }
  };

  // Unit toggle (cm / mm)
  const handleUnitToggle = (newUnit: 'cm' | 'mm') => {
    if (newUnit === sizeUnit) return;
    setSizeUnit(newUnit);
    if (newUnit === 'mm') {
      setCustomWidthInput(String(curTargetWidth));
      setCustomHeightInput(String(curTargetHeight));
    } else {
      setCustomWidthInput((curTargetWidth / 10).toFixed(1).replace('.0', ''));
      setCustomHeightInput((curTargetHeight / 10).toFixed(1).replace('.0', ''));
    }
  };

  // Select rectangular preset
  const handleSelectRectPreset = (wMm: number, hMm: number) => {
    const wStr = sizeUnit === 'cm' ? (wMm / 10).toFixed(1).replace('.0', '') : String(wMm);
    const hStr = sizeUnit === 'cm' ? (hMm / 10).toFixed(1).replace('.0', '') : String(hMm);
    setCustomWidthInput(wStr);
    setCustomHeightInput(hStr);
    updateTargetDimensions(wMm, hMm);
  };

  // Select circle preset
  const handleSelectCirclePreset = (diamMm: number) => {
    const dStr = sizeUnit === 'cm' ? (diamMm / 10).toFixed(1).replace('.0', '') : String(diamMm);
    setCustomWidthInput(dStr);
    setCustomHeightInput(dStr);
    updateTargetDimensions(diamMm, diamMm);
  };

  // Shape switching logic
  const handleShapeChange = (newShape: ShapeType) => {
    setShape(newShape);

    if (newShape === 'circle' || newShape === 'heart') {
      if (shape === 'rect') {
        rectDimsRef.current = { w: curTargetWidth, h: curTargetHeight };
      }
      const diam = Math.min(curTargetWidth, curTargetHeight) || 40;
      const dStr = sizeUnit === 'cm' ? (diam / 10).toFixed(1).replace('.0', '') : String(diam);
      setCustomWidthInput(dStr);
      setCustomHeightInput(dStr);
      updateTargetDimensions(diam, diam);

      setCropRatioPreset('1:1');
      updateCropBoxForRatio(1);
    } else {
      const restoredW = rectDimsRef.current.w;
      const restoredH = rectDimsRef.current.h;
      const wStr = sizeUnit === 'cm' ? (restoredW / 10).toFixed(1).replace('.0', '') : String(restoredW);
      const hStr = sizeUnit === 'cm' ? (restoredH / 10).toFixed(1).replace('.0', '') : String(restoredH);
      setCustomWidthInput(wStr);
      setCustomHeightInput(hStr);
      updateTargetDimensions(restoredW, restoredH);

      setCropRatioPreset('target');
      updateCropBoxForRatio(restoredW / restoredH);
    }
  };

  // Interactive Crop Box Drag Handler (8 handles + center move)
  const handleCropBoxMouseDown = (
    e: React.MouseEvent,
    handleType: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageElRef.current) return;

    const rect = imageElRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialBox = { ...cropBox };
    const imgW = currentImgWidth;
    const imgH = currentImgHeight;
    const dispW = rect.width;
    const dispH = rect.height;
    const ratio = getRatioValue(cropRatioPreset);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) * (imgW / dispW);
      const dy = (ev.clientY - startY) * (imgH / dispH);
      const minSize = 25;

      let { x, y, w, h } = initialBox;

      if (handleType === 'move') {
        x = Math.max(0, Math.min(initialBox.x + dx, imgW - initialBox.w));
        y = Math.max(0, Math.min(initialBox.y + dy, imgH - initialBox.h));
      } else if (handleType === 'se') {
        w = Math.max(minSize, Math.min(initialBox.w + dx, imgW - x));
        if (ratio) {
          h = w / ratio;
          if (y + h > imgH) {
            h = imgH - y;
            w = h * ratio;
          }
        } else {
          h = Math.max(minSize, Math.min(initialBox.h + dy, imgH - y));
        }
      } else if (handleType === 'e') {
        w = Math.max(minSize, Math.min(initialBox.w + dx, imgW - x));
        if (ratio) {
          h = w / ratio;
          if (y + h > imgH) {
            h = imgH - y;
            w = h * ratio;
          }
        }
      } else if (handleType === 's') {
        h = Math.max(minSize, Math.min(initialBox.h + dy, imgH - y));
        if (ratio) {
          w = h * ratio;
          if (x + w > imgW) {
            w = imgW - x;
            h = w / ratio;
          }
        }
      } else if (handleType === 'nw') {
        const targetW = initialBox.w - dx;
        const targetH = ratio ? targetW / ratio : initialBox.h - dy;
        if (targetW >= minSize && targetH >= minSize) {
          const newX = initialBox.x + (initialBox.w - targetW);
          const newY = initialBox.y + (initialBox.h - targetH);
          if (newX >= 0 && newY >= 0) {
            x = newX;
            y = newY;
            w = targetW;
            h = targetH;
          }
        }
      } else if (handleType === 'ne') {
        const targetW = initialBox.w + dx;
        const targetH = ratio ? targetW / ratio : initialBox.h - dy;
        if (targetW >= minSize && targetH >= minSize) {
          const newY = initialBox.y + (initialBox.h - targetH);
          if (x + targetW <= imgW && newY >= 0) {
            y = newY;
            w = targetW;
            h = targetH;
          }
        }
      } else if (handleType === 'sw') {
        const targetW = initialBox.w - dx;
        const targetH = ratio ? targetW / ratio : initialBox.h + dy;
        if (targetW >= minSize && targetH >= minSize) {
          const newX = initialBox.x + (initialBox.w - targetW);
          if (newX >= 0 && y + targetH <= imgH) {
            x = newX;
            w = targetW;
            h = targetH;
          }
        }
      } else if (handleType === 'w') {
        const targetW = initialBox.w - dx;
        if (targetW >= minSize) {
          const newX = initialBox.x + (initialBox.w - targetW);
          if (newX >= 0) {
            x = newX;
            w = targetW;
            if (ratio) {
              h = w / ratio;
              if (y + h > imgH) {
                h = imgH - y;
                w = h * ratio;
                x = initialBox.x + (initialBox.w - w);
              }
            }
          }
        }
      } else if (handleType === 'n') {
        const targetH = initialBox.h - dy;
        if (targetH >= minSize) {
          const newY = initialBox.y + (initialBox.h - targetH);
          if (newY >= 0) {
            y = newY;
            h = targetH;
            if (ratio) {
              w = h * ratio;
              if (x + w > imgW) {
                w = imgW - x;
                h = w / ratio;
                y = initialBox.y + (initialBox.h - h);
              }
            }
          }
        }
      }

      setCropBox({
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Perform actual Crop
  const handleApplyCrop = async () => {
    if (isCroppingAction) return;
    setIsCroppingAction(true);

    try {
      const result = await cropImageToCanvas(currentBaseSrc, cropBox);
      const newPreviewSrc = await createOptimizedPreview(result.croppedSrc, 800, 0.85);

      unenhancedBaseSrcRef.current = result.croppedSrc;
      setCurrentBaseSrc(result.croppedSrc);
      setPreviewAdjustedSrc(result.croppedSrc);
      setCurrentImgWidth(result.width);
      setCurrentImgHeight(result.height);

      // Recalculate framed crop bounds
      const newCrop = calculateCrop(
        result.width,
        result.height,
        effectiveTargetW,
        effectiveTargetH,
        smartCrop
      );
      setCropX(newCrop.cropX);
      setCropY(newCrop.cropY);
      setCropW(newCrop.cropW);
      setCropH(newCrop.cropH);
      setScale(1);

      // Reset cropBox to full cropped image
      setCropBox({
        x: 0,
        y: 0,
        w: result.width,
        h: result.height,
      });

      setCropSuccessToast(`Đã cắt ảnh thành công (${result.width} × ${result.height} px)`);
      setTimeout(() => setCropSuccessToast(null), 3500);

      // Switch back to framed preview to show final result
      setCropSubMode('frame');
    } catch (err) {
      console.error('Failed applying crop:', err);
    } finally {
      setIsCroppingAction(false);
    }
  };

  // Reset to full uncropped raw photo
  const handleResetToRawOriginal = async () => {
    try {
      const img = new Image();
      img.src = rawSrc;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const rawW = img.naturalWidth || 800;
      const rawH = img.naturalHeight || 600;

      unenhancedBaseSrcRef.current = rawSrc;
      setCurrentBaseSrc(rawSrc);
      setPreviewAdjustedSrc(rawSrc);
      setCurrentImgWidth(rawW);
      setCurrentImgHeight(rawH);
      setIsEnhanced(false);

      const newCrop = calculateCrop(rawW, rawH, effectiveTargetW, effectiveTargetH, smartCrop);
      setCropX(newCrop.cropX);
      setCropY(newCrop.cropY);
      setCropW(newCrop.cropW);
      setCropH(newCrop.cropH);
      setScale(1);

      setCropBox({
        x: Math.round(newCrop.cropX),
        y: Math.round(newCrop.cropY),
        w: Math.round(newCrop.cropW),
        h: Math.round(newCrop.cropH),
      });

      setCropSuccessToast('Đã khôi phục lại ảnh gốc ban đầu!');
      setTimeout(() => setCropSuccessToast(null), 3000);
    } catch (err) {
      console.error('Failed resetting to raw original:', err);
    }
  };

  // Real-time HD Enhancement with adjustable strength
  const applyEnhanceWithStrength = useCallback(
    async (strength: number, shouldEnable: boolean = true) => {
      setIsEnhancing(true);
      try {
        if (!shouldEnable) {
          setCurrentBaseSrc(unenhancedBaseSrcRef.current);
          setIsEnhanced(false);
        } else {
          const sharpenVal = (strength / 100) * 0.85 + 0.1;
          const contrastVal = (strength / 100) * 0.16 + 0.04;
          const res = await enhanceImageQuality(unenhancedBaseSrcRef.current, {
            sharpenAmount: sharpenVal,
            contrastAmount: contrastVal,
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
    },
    []
  );

  // Handle slider changes in real time (debounced ~180ms for silky smooth dragging)
  const handleEnhanceStrengthChange = (newStrength: number) => {
    setEnhanceStrength(newStrength);
    setIsEnhanced(true);

    if (enhanceDebounceRef.current) {
      clearTimeout(enhanceDebounceRef.current);
    }

    enhanceDebounceRef.current = setTimeout(() => {
      applyEnhanceWithStrength(newStrength, true);
    }, 180);
  };

  // HD Enhancement Toggle Button
  const handleToggleEnhance = async () => {
    if (isEnhancing) return;
    if (isEnhanced) {
      applyEnhanceWithStrength(enhanceStrength, false);
    } else {
      applyEnhanceWithStrength(enhanceStrength, true);
    }
  };

  // Auto Adjust Colors
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

  // Rotate 90 degrees
  const handleRotate = async () => {
    const rotatedBase = await rotateImageBase64(currentBaseSrc, 90);
    const rotatedRaw = await rotateImageBase64(rawSrc, 90);
    const newWidth = currentImgHeight;
    const newHeight = currentImgWidth;

    const crop = calculateCrop(newWidth, newHeight, effectiveTargetW, effectiveTargetH, smartCrop);

    unenhancedBaseSrcRef.current = rotatedRaw;
    setCurrentBaseSrc(rotatedBase);
    setRawSrc(rotatedRaw);
    setCurrentImgWidth(newWidth);
    setCurrentImgHeight(newHeight);

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
      targetWidth: curTargetWidth,
      targetHeight: curTargetHeight,
      shape,
      cropX: crop.cropX,
      cropY: crop.cropY,
      cropW: crop.cropW,
      cropH: crop.cropH,
      scale: 1,
    });
    onClose();
  };

  // Save changes
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
        cropW,
        cropH,
        shape,
        targetWidth: curTargetWidth,
        targetHeight: curTargetHeight,
        imgWidth: currentImgWidth,
        imgHeight: currentImgHeight,
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
    currentImgWidth,
    currentImgHeight,
    effectiveTargetW,
    effectiveTargetH,
    scale
  );

  // Framed Preview style calculations
  const percentW = (currentImgWidth / actualCropW) * 100;
  const percentH = (currentImgHeight / actualCropH) * 100;
  const percentX = (-cropX / actualCropW) * 100;
  const percentY = (-cropY / actualCropH) * 100;

  const displayImageSrc = showOriginalComparison ? rawSrc : previewAdjustedSrc;

  // Percentage coordinates for CropBox overlay
  const cropLeftPct = (cropBox.x / currentImgWidth) * 100;
  const cropTopPct = (cropBox.y / currentImgHeight) * 100;
  const cropWidthPct = (cropBox.w / currentImgWidth) * 100;
  const cropHeightPct = (cropBox.h / currentImgHeight) * 100;
  const cropRightPct = 100 - (cropLeftPct + cropWidthPct);
  const cropBottomPct = 100 - (cropTopPct + cropHeightPct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/90">
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
                {shape === 'circle' ? (
                  <>In ấn: <strong className="text-slate-700 font-semibold">Hình tròn Ø {(curTargetWidth / 10).toFixed(1)} cm</strong></>
                ) : shape === 'heart' ? (
                  <>In ấn: <strong className="text-slate-700 font-semibold">Trái tim {(curTargetWidth / 10).toFixed(1)} x {(curTargetHeight / 10).toFixed(1)} cm</strong></>
                ) : (
                  <>In ấn: <strong className="text-slate-700 font-semibold">{(curTargetWidth / 10).toFixed(1)} x {(curTargetHeight / 10).toFixed(1)} cm</strong></>
                )}{' '}
                • Gốc: {currentImgWidth}x{currentImgHeight}px
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
          {/* Left Column: Canvas Preview */}
          <div className="md:col-span-7 p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-100/80 select-none relative border-b md:border-b-0 md:border-r border-slate-200 min-h-[380px]">
            {/* Top Sub-Mode Bar: Frame View vs Crop Tool */}
            {activeTab === 'crop' && (
              <div className="w-full max-w-[360px] flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCropSubMode('frame')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      cropSubMode === 'frame'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>Khung in & Tâm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCropSubMode('cropTool')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      cropSubMode === 'cropTool'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Cắt ảnh (Crop)</span>
                  </button>
                </div>

                {(isEnhanced || activeTab === 'adjust') && (
                  <button
                    type="button"
                    onMouseDown={() => setShowOriginalComparison(true)}
                    onMouseUp={() => setShowOriginalComparison(false)}
                    onMouseLeave={() => setShowOriginalComparison(false)}
                    className="text-[11px] font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 px-2 py-1 rounded-lg flex items-center gap-1 transition select-none cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Giữ xem gốc</span>
                  </button>
                )}
              </div>
            )}

            {/* Notification Toast */}
            {cropSuccessToast && (
              <div className="absolute top-4 z-40 bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{cropSuccessToast}</span>
              </div>
            )}

            {/* View Mode 1: Framed Print Preview (with Pan & Zoom) */}
            {activeTab === 'adjust' || cropSubMode === 'frame' ? (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-center gap-1.5 w-full">
                  <Move className="w-3.5 h-3.5 text-blue-500" />
                  <span>Kéo chuột để dịch tâm • Lăn chuột để phóng to / thu nhỏ</span>
                </div>

                {/* The Preview Box Container */}
                <div
                  ref={previewBoxRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{
                    aspectRatio: `${effectiveTargetW} / ${effectiveTargetH}`,
                    width: effectiveTargetW >= effectiveTargetH ? '310px' : 'auto',
                    height: effectiveTargetH > effectiveTargetW ? '310px' : 'auto',
                    maxHeight: '340px',
                    maxWidth: '340px',
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

                  {/* Circular visual indicator badge */}
                  {shape === 'circle' && (
                    <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none shadow-xs">
                      Ø {(curTargetWidth / 10).toFixed(1)} cm
                    </div>
                  )}
                </div>

                {/* Quick Zoom Bar under preview */}
                <div className="mt-4 flex items-center gap-3 w-full max-w-[320px] bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
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
            ) : (
              /* View Mode 2: Interactive Crop Box Workspace */
              <div className="flex flex-col items-center justify-center w-full">
                <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-center gap-1.5">
                  <Scissors className="w-3 h-3 text-blue-500" />
                  <span>Kéo 8 điểm neo hoặc di chuyển khung để chọn vùng cắt</span>
                </div>

                {/* Image and Crop Box Container */}
                <div className="relative inline-block select-none overflow-hidden rounded-lg shadow-md max-h-[350px] max-w-full">
                  <img
                    ref={imageElRef}
                    src={displayImageSrc}
                    alt="Original for crop"
                    className="max-h-[330px] max-w-[420px] w-auto h-auto block select-none pointer-events-none"
                    draggable={false}
                  />

                  {/* 4 Darkened Background Overlays */}
                  <div
                    className="absolute bg-black/60 pointer-events-none"
                    style={{ top: 0, left: 0, right: 0, height: `${cropTopPct}%` }}
                  />
                  <div
                    className="absolute bg-black/60 pointer-events-none"
                    style={{ bottom: 0, left: 0, right: 0, height: `${cropBottomPct}%` }}
                  />
                  <div
                    className="absolute bg-black/60 pointer-events-none"
                    style={{
                      top: `${cropTopPct}%`,
                      bottom: `${cropBottomPct}%`,
                      left: 0,
                      width: `${cropLeftPct}%`,
                    }}
                  />
                  <div
                    className="absolute bg-black/60 pointer-events-none"
                    style={{
                      top: `${cropTopPct}%`,
                      bottom: `${cropBottomPct}%`,
                      right: 0,
                      width: `${cropRightPct}%`,
                    }}
                  />

                  {/* The Interactive Crop Box */}
                  <div
                    onMouseDown={(e) => handleCropBoxMouseDown(e, 'move')}
                    style={{
                      left: `${cropLeftPct}%`,
                      top: `${cropTopPct}%`,
                      width: `${cropWidthPct}%`,
                      height: `${cropHeightPct}%`,
                    }}
                    className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move select-none"
                  >
                    {/* Rule of Thirds Grid */}
                    <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/40 pointer-events-none" />
                    <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/40 pointer-events-none" />
                    <div className="absolute left-0 right-0 top-1/3 h-px bg-white/40 pointer-events-none" />
                    <div className="absolute left-0 right-0 top-2/3 h-px bg-white/40 pointer-events-none" />

                    {/* Circular Cut Guide when shape is 'circle' or ratio is 1:1 */}
                    {(shape === 'circle' || cropRatioPreset === '1:1') && (
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300 pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.3)]" />
                    )}

                    {/* Dimensions Pill inside Crop Box */}
                    <div className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded pointer-events-none">
                      {Math.round(cropBox.w)} × {Math.round(cropBox.h)} px
                    </div>

                    {/* 4 Corner Handles */}
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize shadow-md"
                    />

                    {/* 4 Edge Handles */}
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 'n')}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 'w')}
                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2 h-6 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize shadow-md"
                    />
                    <div
                      onMouseDown={(e) => handleCropBoxMouseDown(e, 'e')}
                      className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2 h-6 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize shadow-md"
                    />
                  </div>
                </div>

                {/* Crop Action Buttons under workspace */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={isCroppingAction}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isCroppingAction ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Scissors className="w-3.5 h-3.5" />
                    )}
                    <span>Cắt ảnh ngay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCropSubMode('frame')}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Tab Controls */}
          <div className="md:col-span-5 p-5 overflow-y-auto max-h-[520px] bg-white flex flex-col justify-between">
            {activeTab === 'crop' ? (
              <div className="space-y-4">
                {/* Mode: Interactive Crop Tool Controls */}
                {cropSubMode === 'cropTool' ? (
                  <div className="space-y-4">
                    {/* Aspect Ratio Selector */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span>Tỷ lệ cắt (Aspect Ratio):</span>
                        <span className="text-[10px] text-blue-600 font-semibold uppercase">
                          {cropRatioPreset}
                        </span>
                      </label>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRatioPresetChange('free')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            cropRatioPreset === 'free'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Tự do
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRatioPresetChange('1:1')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            cropRatioPreset === '1:1'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          1:1 (Tròn/Vuông)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRatioPresetChange('target')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            cropRatioPreset === 'target'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Khổ in
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRatioPresetChange('3:4')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            cropRatioPreset === '3:4'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          3:4
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRatioPresetChange('4:3')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            cropRatioPreset === '4:3'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          4:3
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRatioPresetChange('9:16')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            cropRatioPreset === '9:16'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          9:16
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 pt-1">
                        * Khóa tỷ lệ 1:1 chuẩn xác cho các ấn phẩm sticker tròn, huy hiệu.
                      </p>
                    </div>

                    {/* Apply & Reset Box */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleApplyCrop}
                        disabled={isCroppingAction}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isCroppingAction ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Scissors className="w-4 h-4" />
                        )}
                        <span>Áp dụng cắt vùng đã chọn</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetToRawOriginal}
                        className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Khôi phục ảnh gốc ban đầu</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Mode: Framed View Controls */
                  <div className="space-y-4">
                    {/* HD Enhancement Bar with Real-time Sharpness Slider */}
                    <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-2xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-amber-950">Phục hồi nét & Khử mờ</div>
                            <div className="text-[10px] text-amber-700">
                              Tăng độ nét viền, tương phản & màu in chuẩn
                            </div>
                          </div>
                        </div>
                        {isEnhanced && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 border border-amber-300 px-1.5 py-0.5 rounded">
                            {enhanceStrength}%
                          </span>
                        )}
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
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang xử lý thời gian thực...</span>
                          </>
                        ) : isEnhanced ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Đã bật làm nét HD ({enhanceStrength}%)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Bật làm nét HD</span>
                          </>
                        )}
                      </button>

                      {/* Mức độ làm nét - Real-time Sharpness Level Slider */}
                      <div className="bg-white border border-amber-200 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-amber-950 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Mức độ làm nét:</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isEnhancing && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" /> Đang cập nhật...
                              </span>
                            )}
                            <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
                              {enhanceStrength}%
                            </span>
                          </div>
                        </div>

                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={enhanceStrength}
                          onChange={(e) => handleEnhanceStrengthChange(Number(e.target.value))}
                          className="w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />

                        {/* Quick Presets */}
                        <div className="grid grid-cols-4 gap-1 pt-0.5">
                          {[
                            { label: 'Nhẹ', val: 30 },
                            { label: 'Chuẩn', val: 55 },
                            { label: 'Rõ nét', val: 75 },
                            { label: 'Tối đa', val: 100 },
                          ].map((p) => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => handleEnhanceStrengthChange(p.val)}
                              className={`py-1 text-[10px] font-bold rounded-lg transition cursor-pointer text-center ${
                                enhanceStrength === p.val && isEnhanced
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>

                        <div className="text-[9.5px] text-amber-800/80 flex items-center justify-between pt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Cập nhật thời gian thực
                          </span>
                          <span>Kéo để xem trước tức thì</span>
                        </div>
                      </div>
                    </div>

                    {/* Shape Selection & Custom Dimensions */}
                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Khuôn hình dạng:</span>
                        </label>
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-mono">
                          {shape === 'circle'
                            ? `Ø ${(curTargetWidth / 10).toFixed(1)} cm (1:1)`
                            : shape === 'heart'
                            ? `${(curTargetWidth / 10).toFixed(1)} cm (1:1)`
                            : `${(curTargetWidth / 10).toFixed(1)} × ${(curTargetHeight / 10).toFixed(1)} cm`}
                        </span>
                      </div>

                      {/* 3 Shape buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleShapeChange('rect')}
                          className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            shape === 'rect'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Chữ nhật
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShapeChange('circle')}
                          className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            shape === 'circle'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Tròn (1:1)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShapeChange('heart')}
                          className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            shape === 'heart'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Trái tim (1:1)
                        </button>
                      </div>

                      {/* Custom Size Section for Rectangular Shape */}
                      {shape === 'rect' && (
                        <div className="pt-2.5 border-t border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Kích thước in tùy chỉnh:</span>
                            {/* Unit selector cm / mm */}
                            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60">
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('cm')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                  sizeUnit === 'cm'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                cm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('mm')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                  sizeUnit === 'mm'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                mm
                              </button>
                            </div>
                          </div>

                          {/* Inputs: Width, Swap button, Height */}
                          <div className="flex items-center gap-2">
                            {/* Width Input */}
                            <div className="flex-1 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Rộng ({sizeUnit})
                              </span>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={customWidthInput}
                                  onChange={(e) => handleCustomWidthChange(e.target.value)}
                                  className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                  placeholder={sizeUnit === 'cm' ? '4.0' : '40'}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                                  {sizeUnit}
                                </span>
                              </div>
                            </div>

                            {/* Swap Width ⇄ Height Button */}
                            <div className="flex flex-col items-center pt-4">
                              <button
                                type="button"
                                onClick={handleSwapDimensions}
                                title="Hoán đổi Rộng ⇄ Dài (Cao thành Rộng, Rộng thành Cao)"
                                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all hover:scale-105 active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer text-[11px] font-bold"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[10.5px]">Đổi</span>
                              </button>
                            </div>

                            {/* Height Input */}
                            <div className="flex-1 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Cao / Dài ({sizeUnit})
                              </span>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={customHeightInput}
                                  onChange={(e) => handleCustomHeightChange(e.target.value)}
                                  className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                  placeholder={sizeUnit === 'cm' ? '6.0' : '60'}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                                  {sizeUnit}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick rectangular presets */}
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-semibold text-slate-500 block">Kích thước chuẩn:</span>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { label: '2x3', w: 20, h: 30 },
                                { label: '3x4', w: 30, h: 40 },
                                { label: '4x6', w: 40, h: 60 },
                                { label: '6x9', w: 60, h: 90 },
                                { label: '9x12', w: 90, h: 120 },
                                { label: '10x15', w: 100, h: 150 },
                                { label: '13x18', w: 130, h: 180 },
                              ].map((p) => {
                                const isSelected =
                                  (curTargetWidth === p.w && curTargetHeight === p.h) ||
                                  (curTargetWidth === p.h && curTargetHeight === p.w);
                                return (
                                  <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => handleSelectRectPreset(p.w, p.h)}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {p.label} cm
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom Diameter Section for Circle Shape */}
                      {shape === 'circle' && (
                        <div className="pt-2.5 border-t border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Đường kính in (Ø):</span>
                            {/* Unit selector cm / mm */}
                            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60">
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('cm')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                  sizeUnit === 'cm'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                cm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('mm')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                  sizeUnit === 'mm'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                mm
                              </button>
                            </div>
                          </div>

                          {/* Custom diameter input */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Nhập đường kính Ø ({sizeUnit})
                            </span>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={customWidthInput}
                                onChange={(e) => handleDiameterInputChange(e.target.value)}
                                className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder={sizeUnit === 'cm' ? '3.0' : '30'}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                                {sizeUnit}
                              </span>
                            </div>
                          </div>

                          {/* Quick circle diameter presets */}
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-semibold text-slate-500 block">Đường kính phổ biến:</span>
                            <div className="flex flex-wrap gap-1">
                              {[25, 30, 40, 48, 50, 60, 75].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => handleSelectCirclePreset(d)}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                    curTargetWidth === d
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {d / 10} cm
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom Size Section for Heart Shape */}
                      {shape === 'heart' && (
                        <div className="pt-2.5 border-t border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Kích thước trái tim:</span>
                            {/* Unit selector cm / mm */}
                            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60">
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('cm')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                  sizeUnit === 'cm'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                cm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('mm')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                                  sizeUnit === 'mm'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                mm
                              </button>
                            </div>
                          </div>

                          {/* Custom size input */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Kích thước ({sizeUnit})
                            </span>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={customWidthInput}
                                onChange={(e) => handleDiameterInputChange(e.target.value)}
                                className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder={sizeUnit === 'cm' ? '4.0' : '40'}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                                {sizeUnit}
                              </span>
                            </div>
                          </div>

                          {/* Quick heart presets */}
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-semibold text-slate-500 block">Kích thước phổ biến:</span>
                            <div className="flex flex-wrap gap-1">
                              {[30, 40, 50, 60, 75].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => handleSelectCirclePreset(d)}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                    curTargetWidth === d
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {d / 10} cm
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Open Crop Tool Button Promo Card */}
                    <div
                      onClick={() => setCropSubMode('cropTool')}
                      className="bg-blue-50 hover:bg-blue-100/80 border border-blue-200 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-blue-950">Công cụ cắt ảnh (Crop)</div>
                          <div className="text-[10px] text-blue-700">Kéo 8 điểm neo cắt tự do hoặc theo tỷ lệ</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-600">Mở &rarr;</span>
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
                )}
              </div>
            ) : (
              /* Tab 2: Full Color & Light Adjustments */
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
            {activeTab === 'crop' && cropSubMode === 'cropTool' && (
              <span>Kéo các điểm neo để điều chỉnh khung cắt &bull; Bấm &quot;Cắt ảnh ngay&quot; để áp dụng</span>
            )}
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
              disabled={isApplyingAdjustmentPreview || isCroppingAction}
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
