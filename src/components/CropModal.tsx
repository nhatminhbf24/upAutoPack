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
  Scissors,
  CheckCircle2,
  Maximize2,
  Minimize2,
  ArrowLeftRight,
  Zap,
  Palette,
  Sun,
  Moon,
  Ruler,
  Maximize,
  HelpCircle,
} from 'lucide-react';
import { PhotoItem, ShapeType, ImageAdjustments, DEFAULT_ADJUSTMENTS } from '../types';
import {
  rotateImageBase64,
  calculateCrop,
  createOptimizedPreview,
  cropImageToCanvas,
} from '../utils/imageUtils';
import { enhanceImageQuality, calculatePrintDPI, getRecommendedUpscaleFactor } from '../utils/imageEnhancer';
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
  initialTab?: 'crop' | 'adjust' | 'size' | 'enhance';
}

type EditTab = 'size' | 'crop' | 'enhance' | 'adjust';
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
  initialTab = 'size',
}) => {
  if (!photo) return null;

  // Determine initial active tab
  const getInitialTab = (): EditTab => {
    if (initialTab === 'adjust') return 'adjust';
    if (initialTab === 'crop') return 'crop';
    if (initialTab === 'enhance') return 'enhance';
    return 'size';
  };

  const [activeTab, setActiveTab] = useState<EditTab>(getInitialTab);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [initialTab, photo.id]);

  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('daudau_crop_canvas_theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const handleToggleCanvasTheme = () => {
    setCanvasTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('daudau_crop_canvas_theme', nextTheme);
      } catch {
        // ignore
      }
      return nextTheme;
    });
  };

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
  const [upscaleFactor, setUpscaleFactor] = useState<1 | 2 | 4>(
    (photo.upscaleFactor as 1 | 2 | 4) || 1
  );
  const [currentBaseSrc, setCurrentBaseSrc] = useState(photo.originalSrc);
  const [rawSrc, setRawSrc] = useState(photo.rawOriginalSrc || photo.originalSrc);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceStrength, setEnhanceStrength] = useState<number>(55);
  const unenhancedBaseSrcRef = useRef<string>(photo.rawOriginalSrc || photo.originalSrc);
  const enhanceDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Dynamic canvas container measurement
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 650,
    height: 520,
  });

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setContainerDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMaximized]);

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
    }, 35);
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

  // Reset Pan and Center position
  const handleResetCenter = () => {
    const centerCrop = calculateCrop(currentImgWidth, currentImgHeight, effectiveTargetW, effectiveTargetH, smartCrop);
    setCropX(centerCrop.cropX);
    setCropY(centerCrop.cropY);
    setScale(1);
    setCropSuccessToast('Đã canh giữa ảnh & đặt lại thu phóng 100%');
    setTimeout(() => setCropSuccessToast(null), 2000);
  };

  // Mouse wheel zoom on preview box
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const curScale = stateRef.current.scale;
      const step = e.deltaY < 0 ? 0.08 : -0.08;
      const nextScale = Math.min(3, Math.max(1, Math.round((curScale + step) * 100) / 100));
      if (nextScale !== curScale) {
        handleScaleChange(nextScale);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [handleScaleChange, activeTab]);

  // Ratio calculation helper
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
          h = currentImgHeight * 0.9;
          w = h * ratio;
        }
        if (w > currentImgWidth) {
          w = currentImgWidth * 0.9;
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

  // Helper to update target dimensions
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

  // Swap width and height
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
    setCropSuccessToast(`Đã đổi hướng: ${newWStr} × ${newHStr} ${sizeUnit}`);
    setTimeout(() => setCropSuccessToast(null), 2500);
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
      const newPreviewSrc = await createOptimizedPreview(result.croppedSrc, 1000, 0.88);

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

      setCropSuccessToast(`Đã cắt ảnh thành công: ${result.width} × ${result.height} px`);
      setTimeout(() => setCropSuccessToast(null), 3500);

      // Switch to size tab to view the final framed print result
      setActiveTab('size');
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

  // Real-time HD Enhancement & Super-Resolution Upscaling with adjustable strength
  const applyEnhanceWithStrength = useCallback(
    async (strength: number, shouldEnable: boolean = true, factorOverride?: 1 | 2 | 4) => {
      setIsEnhancing(true);
      try {
        if (!shouldEnable) {
          setCurrentBaseSrc(unenhancedBaseSrcRef.current);
          setIsEnhanced(false);
          setUpscaleFactor(1);
          if (photo.rawOriginalWidth && photo.rawOriginalHeight) {
            setCurrentImgWidth(photo.rawOriginalWidth);
            setCurrentImgHeight(photo.rawOriginalHeight);
          }
        } else {
          const activeFactor = factorOverride !== undefined ? factorOverride : upscaleFactor;
          const sharpenVal = (strength / 100) * 0.85 + 0.1;
          const contrastVal = (strength / 100) * 0.16 + 0.04;
          const res = await enhanceImageQuality(unenhancedBaseSrcRef.current, {
            sharpenAmount: sharpenVal,
            contrastAmount: contrastVal,
            brightnessAmount: 0.04,
            vibranceAmount: 0.18,
            upscaleFactor: activeFactor,
          });
          setCurrentBaseSrc(res.enhancedSrc);
          setCurrentImgWidth(res.newWidth);
          setCurrentImgHeight(res.newHeight);
          setIsEnhanced(true);
          setUpscaleFactor(activeFactor);
        }
      } catch (err) {
        console.error('Failed to enhance in modal:', err);
      } finally {
        setIsEnhancing(false);
      }
    },
    [upscaleFactor, photo.rawOriginalWidth, photo.rawOriginalHeight]
  );

  // Handle slider changes in real time
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
      const rawW = photo.rawOriginalWidth || photo.imgWidth;
      const rawH = photo.rawOriginalHeight || photo.imgHeight;
      const recommended = getRecommendedUpscaleFactor(rawW, rawH, curTargetWidth, curTargetHeight);
      applyEnhanceWithStrength(enhanceStrength, true, recommended);
    }
  };

  // Auto Adjust Colors
  const handleAutoAdjust = async () => {
    if (isAutoAdjusting) return;
    setIsAutoAdjusting(true);
    try {
      const calculated = await calculateAutoAdjustments(currentBaseSrc);
      setAdjustments(calculated);
      setCropSuccessToast('Đã tự động cân bằng màu & ánh sáng!');
      setTimeout(() => setCropSuccessToast(null), 2500);
    } catch (err) {
      console.error('Auto adjust failed:', err);
    } finally {
      setIsAutoAdjusting(false);
    }
  };

  // Rotate 90 degrees in-place
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
    setCropX(crop.cropX);
    setCropY(crop.cropY);
    setCropW(crop.cropW);
    setCropH(crop.cropH);
    setScale(1);

    setCropBox({
      x: Math.round(crop.cropX),
      y: Math.round(crop.cropY),
      w: Math.round(crop.cropW),
      h: Math.round(crop.cropH),
    });

    const finalAdjusted = await applyAdjustmentsToImage(rotatedBase, adjustments);
    setPreviewAdjustedSrc(finalAdjusted);
    setCropSuccessToast('Đã xoay ảnh 90° thành công');
    setTimeout(() => setCropSuccessToast(null), 2500);
  };

  // Save changes
  const handleSave = async () => {
    setIsApplyingAdjustmentPreview(true);
    try {
      const finalImageSrc = await applyAdjustmentsToImage(currentBaseSrc, adjustments);
      const previewSrc = await createOptimizedPreview(finalImageSrc, 900, 0.88);
      const rawW = photo.rawOriginalWidth || (upscaleFactor > 1 ? Math.round(currentImgWidth / upscaleFactor) : currentImgWidth);
      const rawH = photo.rawOriginalHeight || (upscaleFactor > 1 ? Math.round(currentImgHeight / upscaleFactor) : currentImgHeight);
      const rawCrop = photo.rawOriginalCrop || {
        cropX: Math.round(cropX / upscaleFactor),
        cropY: Math.round(cropY / upscaleFactor),
        cropW: Math.round(cropW / upscaleFactor),
        cropH: Math.round(cropH / upscaleFactor),
      };

      onSave(photo.id, {
        originalSrc: finalImageSrc,
        previewSrc: previewSrc,
        rawOriginalSrc: rawSrc,
        rawOriginalWidth: rawW,
        rawOriginalHeight: rawH,
        rawOriginalCrop: rawCrop,
        isEnhanced,
        upscaleFactor,
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

  // Dynamic box sizing calculation based on canvas dimensions
  const availableW = Math.max(260, containerDimensions.width - 56);
  const availableH = Math.max(260, containerDimensions.height - 70);
  const aspect = effectiveTargetW / effectiveTargetH;

  let fitBoxW = availableW;
  let fitBoxH = fitBoxW / aspect;
  if (fitBoxH > availableH) {
    fitBoxH = availableH;
    fitBoxW = fitBoxH * aspect;
  }
  // Max cap for aesthetics
  fitBoxW = Math.round(Math.min(fitBoxW, 720));
  fitBoxH = Math.round(Math.min(fitBoxH, 620));

  // Max bounds for interactive crop image
  const maxCropImgW = Math.max(300, containerDimensions.width - 48);
  const maxCropImgH = Math.max(280, containerDimensions.height - 70);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div
        className={`bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200 transition-all duration-150 ${
          isMaximized
            ? 'fixed inset-0 w-screen h-screen rounded-none z-50 max-h-none max-w-none'
            : 'rounded-2xl w-[98vw] max-w-[1440px] h-[94vh] max-h-[960px]'
        }`}
      >
        {/* TOP HEADER: Title, Badges, Tab Switcher & Quick Actions */}
        <header className="px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap gap-2 justify-between items-center bg-slate-50/95 shrink-0 select-none">
          {/* Photo Info & DPI */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-[240px] sm:max-w-[340px]" title={photo.name}>
                  {photo.name}
                </h3>

                {/* Print Quality Badge */}
                <span
                  className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs ${
                    dpiInfo.quality === 'high'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : dpiInfo.quality === 'good'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                  title={`${dpiInfo.dpi} DPI tại khổ in hiện tại`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    dpiInfo.quality === 'high' ? 'bg-emerald-500' : dpiInfo.quality === 'good' ? 'bg-blue-500' : 'bg-rose-500'
                  }`} />
                  {dpiInfo.label} ({dpiInfo.dpi} DPI)
                </span>

                {isEnhanced && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    HD {upscaleFactor > 1 ? `AI ${upscaleFactor}x` : ''}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                <span>
                  Khổ in:{' '}
                  <strong className="text-slate-700 font-semibold">
                    {shape === 'circle'
                      ? `Hình tròn Ø ${(curTargetWidth / 10).toFixed(1)} cm`
                      : shape === 'heart'
                      ? `Trái tim ${(curTargetWidth / 10).toFixed(1)} × ${(curTargetHeight / 10).toFixed(1)} cm`
                      : `${(curTargetWidth / 10).toFixed(1)} × ${(curTargetHeight / 10).toFixed(1)} cm`}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Gốc: <strong className="text-slate-700 font-semibold">{currentImgWidth} × {currentImgHeight} px</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Center 4 Main Tabs */}
          <nav className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-xl shadow-inner border border-slate-300/60">
            {/* Tab 1: Size & Framing */}
            <button
              type="button"
              onClick={() => setActiveTab('size')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'size'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Khổ in & Khung</span>
            </button>

            {/* Tab 2: Interactive Crop */}
            <button
              type="button"
              onClick={() => setActiveTab('crop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'crop'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Cắt xén (Crop)</span>
            </button>

            {/* Tab 3: HD Enhance & AI */}
            <button
              type="button"
              onClick={() => setActiveTab('enhance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'enhance'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Làm nét & AI</span>
            </button>

            {/* Tab 4: Color & Lighting */}
            <button
              type="button"
              onClick={() => setActiveTab('adjust')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'adjust'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Màu & Ánh sáng</span>
            </button>
          </nav>

          {/* Quick Header Actions: Compare, Theme, Maximize, Close */}
          <div className="flex items-center gap-1.5">
            {/* Hold to view original comparison */}
            <button
              type="button"
              onMouseDown={() => setShowOriginalComparison(true)}
              onMouseUp={() => setShowOriginalComparison(false)}
              onMouseLeave={() => setShowOriginalComparison(false)}
              onTouchStart={() => setShowOriginalComparison(true)}
              onTouchEnd={() => setShowOriginalComparison(false)}
              className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition select-none cursor-pointer shadow-2xs active:scale-95"
              title="Nhấn và giữ chuột để xem lại ảnh gốc ban đầu"
            >
              <Eye className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Giữ xem gốc</span>
            </button>

            {/* Canvas Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleCanvasTheme}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              title={canvasTheme === 'dark' ? 'Chuyển sang nền canvas sáng' : 'Chuyển sang nền canvas tối (phòng tối studio)'}
            >
              {canvasTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Fullscreen Maximize Toggle */}
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              title={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer ml-1"
              title="Đóng (Hủy bỏ)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* MAIN BODY: Large Left Canvas & Organized Right Control Sidebar */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT COLUMN: Spacious Interactive Canvas Workspace */}
          <div
            className={`flex-1 flex flex-col relative min-h-[380px] select-none transition-colors duration-200 border-b lg:border-b-0 lg:border-r border-slate-200 ${
              canvasTheme === 'dark'
                ? 'bg-slate-950 text-slate-200'
                : 'bg-slate-100/90 text-slate-800'
            }`}
          >
            {/* Top Workspace Helper / Mode status */}
            <div
              className={`px-4 py-2 border-b flex items-center justify-between text-xs font-semibold shrink-0 z-10 ${
                canvasTheme === 'dark'
                  ? 'bg-slate-900/80 border-slate-800/80 text-slate-300'
                  : 'bg-white/80 border-slate-200/80 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {activeTab === 'crop' ? (
                  <>
                    <Scissors className="w-4 h-4 text-blue-400" />
                    <span>Chế độ Cắt xén ảnh (Interactive Crop) • Kéo 8 điểm neo để định khung</span>
                  </>
                ) : (
                  <>
                    <Move className="w-4 h-4 text-blue-400" />
                    <span>Khung in thực tế • Kéo chuột để di chuyển tâm • Lăn chuột để thu phóng</span>
                  </>
                )}
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-2">
                {activeTab === 'size' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('crop')}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Cắt ảnh thừa (Crop) &rarr;</span>
                  </button>
                )}
                {activeTab === 'crop' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('size')}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem khung in &rarr;</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification Toast */}
            {cropSuccessToast && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>{cropSuccessToast}</span>
              </div>
            )}

            {/* MAIN PREVIEW CANVAS AREA */}
            <div
              ref={canvasContainerRef}
              className="flex-1 flex items-center justify-center relative overflow-hidden p-4 sm:p-6"
            >
              {/* Studio Background Ambient Pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    canvasTheme === 'dark'
                      ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), transparent 70%)'
                      : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08), transparent 70%)',
                }}
              />

              {/* MODE 1: Framed Print Preview (Used in Size, Enhance, Adjust tabs) */}
              {activeTab !== 'crop' ? (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                  {/* Dynamic Sized Framed Box */}
                  <div
                    ref={previewBoxRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                      width: `${fitBoxW}px`,
                      height: `${fitBoxH}px`,
                      aspectRatio: `${effectiveTargetW} / ${effectiveTargetH}`,
                    }}
                    className={`relative border-2 border-dashed border-blue-400 shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing bg-white transition-all select-none ${
                      shape === 'circle' ? 'shape-circle' : shape === 'heart' ? 'shape-heart' : 'rounded-2xl'
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

                    {/* Original Comparison Badge */}
                    {showOriginalComparison && (
                      <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-lg border border-white/20">
                        Ảnh gốc ban đầu
                      </div>
                    )}

                    {/* Shape dimensions indicator badge */}
                    <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md pointer-events-none shadow-xs border border-white/10">
                      {shape === 'circle'
                        ? `Ø ${(curTargetWidth / 10).toFixed(1)} cm`
                        : `${(curTargetWidth / 10).toFixed(1)} × ${(curTargetHeight / 10).toFixed(1)} cm`}
                    </div>

                    {/* Center Crosshair Guide */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-blue-500" />
                      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-blue-500" />
                    </div>
                  </div>
                </div>
              ) : (
                /* MODE 2: Interactive Crop Workspace */
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                  {/* Image and Crop Box Container */}
                  <div className="relative inline-block select-none overflow-hidden rounded-xl shadow-2xl">
                    <img
                      ref={imageElRef}
                      src={displayImageSrc}
                      alt="Original for crop"
                      style={{
                        maxHeight: `${maxCropImgH}px`,
                        maxWidth: `${maxCropImgW}px`,
                      }}
                      className="w-auto h-auto block select-none pointer-events-none object-contain"
                      draggable={false}
                    />

                    {/* 4 Darkened Background Overlays */}
                    <div
                      className="absolute bg-black/65 pointer-events-none"
                      style={{ top: 0, left: 0, right: 0, height: `${cropTopPct}%` }}
                    />
                    <div
                      className="absolute bg-black/65 pointer-events-none"
                      style={{ bottom: 0, left: 0, right: 0, height: `${cropBottomPct}%` }}
                    />
                    <div
                      className="absolute bg-black/65 pointer-events-none"
                      style={{
                        top: `${cropTopPct}%`,
                        bottom: `${cropBottomPct}%`,
                        left: 0,
                        width: `${cropLeftPct}%`,
                      }}
                    />
                    <div
                      className="absolute bg-black/65 pointer-events-none"
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
                      className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] cursor-move select-none"
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
                      <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded pointer-events-none border border-white/20">
                        {Math.round(cropBox.w)} × {Math.round(cropBox.h)} px
                      </div>

                      {/* 4 Corner Handles */}
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 'nw')}
                        className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize shadow-md"
                      />
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 'ne')}
                        className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize shadow-md"
                      />
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 'sw')}
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize shadow-md"
                      />
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 'se')}
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize shadow-md"
                      />

                      {/* 4 Edge Handles */}
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 'n')}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize shadow-md"
                      />
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 's')}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize shadow-md"
                      />
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 'w')}
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2 h-8 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize shadow-md"
                      />
                      <div
                        onMouseDown={(e) => handleCropBoxMouseDown(e, 'e')}
                        className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2 h-8 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize shadow-md"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM CANVAS FLOATING TOOLBAR: Zoom, Center, Rotate */}
            <div
              className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 ${
                canvasTheme === 'dark'
                  ? 'bg-slate-900/90 border-slate-800/80 text-slate-300'
                  : 'bg-white/90 border-slate-200/80 text-slate-700'
              }`}
            >
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleScaleChange(Math.max(1, Math.round((scale - 0.1) * 100) / 100))}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    canvasTheme === 'dark'
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 flex-1 sm:w-44">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-400/40 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-mono font-bold w-11 text-right">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleScaleChange(Math.min(3, Math.round((scale + 0.1) * 100) / 100))}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    canvasTheme === 'dark'
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {scale > 1 && (
                  <button
                    type="button"
                    onClick={() => handleScaleChange(1)}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-400 px-2 py-1 rounded-md border border-blue-500/30 cursor-pointer"
                  >
                    100%
                  </button>
                )}
              </div>

              {/* Center Pan & Rotate Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetCenter}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    canvasTheme === 'dark'
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs'
                  }`}
                  title="Canh giữa ảnh và đặt lại thu phóng 100%"
                >
                  <Move className="w-3.5 h-3.5 text-blue-500" />
                  <span>Về giữa</span>
                </button>

                <button
                  type="button"
                  onClick={handleRotate}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    canvasTheme === 'dark'
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs'
                  }`}
                  title="Xoay ảnh 90 độ theo chiều kim đồng hồ"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Xoay 90°</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Highly Organized, Structured Controls Panel */}
          <aside className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-white border-t lg:border-t-0 min-h-0 shrink-0">
            {/* Tab Title Banner */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeTab === 'size' && (
                  <>
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Ruler className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Khổ in & Hình dạng</h4>
                      <p className="text-[10px] text-slate-500">Chỉnh kích thước, hình khuôn và căn góc in</p>
                    </div>
                  </>
                )}
                {activeTab === 'crop' && (
                  <>
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Cắt xén ảnh tương tác</h4>
                      <p className="text-[10px] text-slate-500">Kéo khung chọn vùng cắt xén tự do hoặc theo tỷ lệ</p>
                    </div>
                  </>
                )}
                {activeTab === 'enhance' && (
                  <>
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Làm nét HD & Nâng DPI (AI)</h4>
                      <p className="text-[10px] text-slate-500">Khử mờ, tăng độ nét viền và siêu phân giải AI</p>
                    </div>
                  </>
                )}
                {activeTab === 'adjust' && (
                  <>
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Chỉnh màu sắc & Ánh sáng</h4>
                      <p className="text-[10px] text-slate-500">Cân bằng trắng, độ sáng, tương phản & rực màu</p>
                    </div>
                  </>
                )}
              </div>

              {/* Sub-tag indicator */}
              <span className="text-[10.5px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {activeTab === 'size' && '1 / 4'}
                {activeTab === 'crop' && '2 / 4'}
                {activeTab === 'enhance' && '3 / 4'}
                {activeTab === 'adjust' && '4 / 4'}
              </span>
            </div>

            {/* TAB CONTENT: Scrollable controls container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* TAB 1: KÍCH THƯỚC & KHUNG IN (Size) */}
              {activeTab === 'size' && (
                <div className="space-y-4">
                  {/* 1. Khuôn hình dạng (Shape) */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Hình dạng khung in:</span>
                      </label>
                      <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-mono">
                        {shape === 'circle'
                          ? `Tròn Ø ${(curTargetWidth / 10).toFixed(1)} cm`
                          : shape === 'heart'
                          ? `Trái tim ${(curTargetWidth / 10).toFixed(1)} cm`
                          : `Chữ nhật`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleShapeChange('rect')}
                        className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center gap-1 ${
                          shape === 'rect'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-4 h-3 rounded-xs border border-current" />
                        <span>Chữ nhật</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShapeChange('circle')}
                        className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center gap-1 ${
                          shape === 'circle'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 rounded-full border border-current" />
                        <span>Tròn (1:1)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShapeChange('heart')}
                        className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center gap-1 ${
                          shape === 'heart'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs leading-none">♥</span>
                        <span>Trái tim</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Kích thước in tùy chỉnh (Custom Dimensions) */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Kích thước in tùy chỉnh:</span>
                      {/* Unit selector cm / mm */}
                      <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60">
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
                    {shape === 'rect' ? (
                      <div className="space-y-3">
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
                                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                                placeholder={sizeUnit === 'cm' ? '4.0' : '40'}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium pointer-events-none">
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
                              className="px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all hover:scale-105 active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer text-xs font-bold"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                              <span>Đổi</span>
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
                                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                                placeholder={sizeUnit === 'cm' ? '6.0' : '60'}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium pointer-events-none">
                                {sizeUnit}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick rectangular presets */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Khổ in ảnh chuẩn:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: '2x3', w: 20, h: 30 },
                              { label: '3x4', w: 30, h: 40 },
                              { label: '3x8', w: 30, h: 80 },
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
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
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
                    ) : (
                      /* Circular / Heart diameter input & presets */
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            {shape === 'circle' ? `Đường kính Ø (${sizeUnit})` : `Kích thước (${sizeUnit})`}
                          </span>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={customWidthInput}
                              onChange={(e) => handleDiameterInputChange(e.target.value)}
                              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                              placeholder={sizeUnit === 'cm' ? '4.0' : '40'}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium pointer-events-none">
                              {sizeUnit}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Kích thước phổ biến:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[25, 30, 40, 48, 50, 60, 75].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleSelectCirclePreset(d)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
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

                  {/* 3. Phân tích chất lượng in (Print DPI Analysis) */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Độ phân giải in (DPI):</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          dpiInfo.quality === 'high'
                            ? 'bg-emerald-100 text-emerald-800'
                            : dpiInfo.quality === 'good'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {dpiInfo.label} ({dpiInfo.dpi} DPI)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 leading-relaxed">
                      {dpiInfo.quality === 'high' ? (
                        <p className="text-emerald-700">
                          ✓ Ảnh đạt độ phân giải tiêu chuẩn xưởng in (trên 250 DPI). Bản in sẽ cực kỳ sắc nét.
                        </p>
                      ) : dpiInfo.quality === 'good' ? (
                        <p className="text-blue-700">
                          ✓ Độ phân giải tốt cho in ấn khổ thường. Có thể bật thêm tính năng <strong>Làm nét HD</strong> để viền sắc hơn.
                        </p>
                      ) : (
                        <p className="text-rose-700">
                          ⚠ Ảnh có độ phân giải hơi thấp khi in ở khổ này ({dpiInfo.dpi} DPI). Hãy chuyển sang tab <strong>Làm nét & AI</strong> để nâng chất lượng.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Action: Open Interactive Crop Tool */}
                  <div
                    onClick={() => setActiveTab('crop')}
                    className="bg-blue-50/80 hover:bg-blue-100 border border-blue-200 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-950">Công cụ cắt xén ảnh (Interactive Crop)</div>
                        <div className="text-[11px] text-blue-700">Kéo 8 điểm neo cắt bỏ viền ảnh thừa dễ dàng</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded-lg border border-blue-200">
                      Mở &rarr;
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: CẮT XÉN ẢNH (Crop Tool) */}
              {activeTab === 'crop' && (
                <div className="space-y-4">
                  {/* Tỷ lệ cắt khóa (Aspect Ratio Presets) */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Tỷ lệ cắt khóa (Aspect Ratio):</span>
                      <span className="text-[10px] text-blue-600 font-bold uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {cropRatioPreset}
                      </span>
                    </label>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRatioPresetChange('free')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          cropRatioPreset === 'target'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Theo khổ in
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRatioPresetChange('3:4')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          cropRatioPreset === '3:4'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        3:4 (Ảnh đứng)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRatioPresetChange('4:3')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          cropRatioPreset === '4:3'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        4:3 (Ảnh ngang)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRatioPresetChange('9:16')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          cropRatioPreset === '9:16'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        9:16 (Story)
                      </button>
                    </div>

                    <p className="text-[10.5px] text-slate-500 pt-1">
                      * Mẹo: Chọn <strong>1:1</strong> nếu bạn chuẩn bị in huy hiệu hoặc tem nhãn hình tròn.
                    </p>
                  </div>

                  {/* Thông số vùng cắt */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Kích thước vùng cắt hiện tại:</span>
                    <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200 font-mono">
                      <span className="text-slate-500">Độ phân giải:</span>
                      <strong className="text-blue-700 font-bold">
                        {Math.round(cropBox.w)} × {Math.round(cropBox.h)} px
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleApplyCrop}
                      disabled={isCroppingAction}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                      className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Khôi phục lại ảnh gốc ban đầu</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: LÀM NÉT & AI (Enhance) */}
              {activeTab === 'enhance' && (
                <div className="space-y-4">
                  {/* HD Enhancement Bar with Real-time Sharpness Slider */}
                  <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500 text-white shadow-2xs">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-950">Phục hồi nét & Khử mờ</div>
                          <div className="text-[10.5px] text-amber-800">
                            Tăng độ nét viền, tương phản & màu sắc in
                          </div>
                        </div>
                      </div>
                      {isEnhanced && (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-md">
                          {enhanceStrength}%
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleEnhance}
                      disabled={isEnhancing}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
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
                    <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-amber-950 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Mức độ làm nét:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isEnhancing && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" /> Đang cập nhật...
                            </span>
                          )}
                          <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-xs font-mono">
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
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
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
                            className={`py-1 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                              enhanceStrength === p.val && isEnhanced
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      <div className="text-[10px] text-amber-800/80 flex items-center justify-between pt-1">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Cập nhật thời gian thực
                        </span>
                        <span>Xem trước tức thì trên ảnh</span>
                      </div>
                    </div>

                    {/* Độ phân giải & Phóng to DPI bằng AI */}
                    <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-amber-950 font-bold">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Độ phân giải / Nâng DPI (AI):</span>
                        </span>
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          {upscaleFactor > 1 ? `AI ${upscaleFactor}x (DPI ×${upscaleFactor})` : 'Gốc 1x'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUpscaleFactor(1);
                            if (isEnhanced) applyEnhanceWithStrength(enhanceStrength, true, 1);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center ${
                            upscaleFactor === 1
                              ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                              : 'bg-amber-50/50 hover:bg-amber-100/70 border-amber-200 text-slate-700'
                          }`}
                        >
                          <span>Chuẩn 1x</span>
                          <span className={`text-[9.5px] ${upscaleFactor === 1 ? 'text-amber-100' : 'text-slate-500'}`}>
                            Chỉ làm nét
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setUpscaleFactor(2);
                            applyEnhanceWithStrength(enhanceStrength, true, 2);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center ${
                            upscaleFactor === 2
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-blue-50/50 hover:bg-blue-100/70 border-blue-200 text-slate-700'
                          }`}
                        >
                          <span>AI Phóng 2x</span>
                          <span className={`text-[9.5px] ${upscaleFactor === 2 ? 'text-blue-100' : 'text-blue-600'}`}>
                            DPI ×2 nét
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setUpscaleFactor(4);
                            applyEnhanceWithStrength(enhanceStrength, true, 4);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center ${
                            upscaleFactor === 4
                              ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                              : 'bg-purple-50/50 hover:bg-purple-100/70 border-purple-200 text-slate-700'
                          }`}
                        >
                          <span>AI Phóng 4x</span>
                          <span className={`text-[9.5px] ${upscaleFactor === 4 ? 'text-purple-100' : 'text-purple-600'}`}>
                            DPI ×4 cực nét
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MÀU SẮC & ÁNH SÁNG (Adjust) */}
              {activeTab === 'adjust' && (
                <div className="space-y-4">
                  <PhotoAdjustmentsPanel
                    adjustments={adjustments}
                    onChange={setAdjustments}
                    onAutoAdjust={handleAutoAdjust}
                    isAutoAdjusting={isAutoAdjusting}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* BOTTOM FOOTER: Status Tips & Primary Save Actions */}
        <footer className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0 select-none">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            {activeTab === 'size' && (
              <span>Mẹo: Kéo chuột trực tiếp trên ảnh để dịch tâm, lăn chuột để phóng to.</span>
            )}
            {activeTab === 'crop' && (
              <span>Kéo các điểm neo để chọn vùng cắt &bull; Bấm &quot;Áp dụng cắt&quot; để cắt ảnh.</span>
            )}
            {activeTab === 'enhance' && (
              <span>Kéo thanh trượt làm nét để xem trước thời gian thực trên khung ảnh.</span>
            )}
            {activeTab === 'adjust' && (
              <span>Thay đổi thanh trượt để cân bằng màu & ánh sáng tức thì.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isApplyingAdjustmentPreview || isCroppingAction}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-60"
            >
              {isApplyingAdjustmentPreview ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
