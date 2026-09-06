import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PhotoItem, LayoutSettings, ShapeType, SizePreset, DEFAULT_SIZE_PRESETS, OrientationMode } from './types';
import { packImagesToPages } from './utils/packing';
import { exportPagesToImage, calculateCrop, formatPhotoToPreset, getShortPresetLabel } from './utils/imageUtils';
import { exportPagesToPdf } from './utils/pdfExport';
import {
  saveProjectMeta,
  syncPhotoBlobs,
  getSavedSessionMeta,
  loadSavedSession,
  clearSavedSession,
  exportProjectToDaudauFile,
  importProjectFromDaudauFile,
  ProjectMetadata,
} from './utils/projectStorage';
import { ImageListSidebar } from './components/ImageListSidebar';
import { BatchToolsSidebar } from './components/BatchToolsSidebar';
import { SettingsSidebar } from './components/SettingsSidebar';
import { A4PreviewArea } from './components/A4PreviewArea';
import { CropModal } from './components/CropModal';
import { CustomSizeModal } from './components/CustomSizeModal';
import { RestoreSessionModal } from './components/RestoreSessionModal';
import { SaveProjectModal } from './components/SaveProjectModal';
import { ActivationModal } from './components/ActivationModal';
import { PngSplitterModal } from './components/PngSplitterModal';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { ToolSelectorHub } from './components/ToolSelectorHub';
import { PngSplitterWorkspace } from './components/PngSplitterWorkspace';
import { ToastContainer, ToastMessage } from './components/Toast';
import { useHistoryState } from './hooks/useHistoryState';

const CUSTOM_PRESETS_STORAGE_KEY = 'dau_dau_custom_size_presets';

export default function App() {
  // Activation / Lock State (Stored in localStorage)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daudau_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Active Tool View: 'hub' (Selection screen) | 'png-splitter' (Standalone Splitter) | 'a4-layout' (A4 Auto Pack)
  const [activeView, setActiveView] = useState<'hub' | 'png-splitter' | 'a4-layout'>('hub');
  const {
    state: photos,
    set: setPhotos,
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    historyCount,
  } = useHistoryState<PhotoItem[]>([], 13);

  const initialOrientationMode: OrientationMode = (() => {
    try {
      const saved = localStorage.getItem('daudau_orientation_mode');
      if (saved === 'rotate_to_fit' || saved === 'auto_match' || saved === 'fixed_crop') {
        return saved as OrientationMode;
      }
      const legacyAutoMatch = localStorage.getItem('daudau_auto_match_orientation');
      if (legacyAutoMatch === 'true') {
        return 'auto_match';
      }
      if (legacyAutoMatch === 'false') {
        return 'rotate_to_fit';
      }
    } catch {
      // ignore
    }
    return 'rotate_to_fit';
  })();

  const [orientationMode, setOrientationMode] = useState<OrientationMode>(initialOrientationMode);

  const [settings, setSettings] = useState<LayoutSettings>(() => ({
    margin: 5,
    gap: 2,
    cutLines: false,
    smartCrop: false,
    autoNesting: false,
    paperOrientation: 'portrait',
    orientationMode: initialOrientationMode,
  }));

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cropModalConfig, setCropModalConfig] = useState<{
    photo: PhotoItem;
    initialTab?: 'size' | 'crop' | 'enhance' | 'adjust';
  } | null>(null);

  // Restore Session Modal State
  const [pendingRestoreMeta, setPendingRestoreMeta] = useState<ProjectMetadata | null>(null);
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(false);

  // Custom Size Presets & Modal State
  const [customPresets, setCustomPresets] = useState<SizePreset[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error loading custom presets from storage', e);
    }
    return [];
  });

  const [customSizeModalConfig, setCustomSizeModalConfig] = useState<{
    isOpen: boolean;
    targetPhoto?: PhotoItem | null;
  }>({
    isOpen: false,
    targetPhoto: null,
  });

  const [isSaveProjectModalOpen, setIsSaveProjectModalOpen] = useState(false);
  const [isPngSplitterOpen, setIsPngSplitterOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Khổ in mặc định được cài trên ứng dụng (active preset) và tùy chọn tự khớp chiều
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    try {
      return localStorage.getItem('daudau_active_preset_id') || '60x80_rect';
    } catch {
      return '60x80_rect';
    }
  });

  const [autoMatchOrientation, setAutoMatchOrientation] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('daudau_auto_match_orientation');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const allPresets = useMemo(
    () => [...customPresets, ...DEFAULT_SIZE_PRESETS],
    [customPresets]
  );

  const activePreset = useMemo<SizePreset>(() => {
    return (
      allPresets.find((p) => p.id === activePresetId) ||
      allPresets.find((p) => p.id === '60x80_rect') ||
      DEFAULT_SIZE_PRESETS[0]
    );
  }, [allPresets, activePresetId]);

  const handleActivePresetChange = useCallback((id: string) => {
    setActivePresetId(id);
    try {
      localStorage.setItem('daudau_active_preset_id', id);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const handleOrientationModeChange = useCallback(
    (newMode: OrientationMode) => {
      setOrientationMode(newMode);
      setAutoMatchOrientation(newMode === 'auto_match');
      setSettings((prev) => ({ ...prev, orientationMode: newMode }));
      try {
        localStorage.setItem('daudau_orientation_mode', newMode);
        localStorage.setItem('daudau_auto_match_orientation', String(newMode === 'auto_match'));
      } catch (e) {
        console.warn(e);
      }
    },
    []
  );

  const handleBatchUpdatePhotos = useCallback(
    (updatedPhotos: PhotoItem[]) => {
      setPhotos(updatedPhotos);
    },
    [setPhotos]
  );

  const MAX_TOASTS = 5;

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    setToasts((prev) => {
      let filtered = prev;
      // Khi tác vụ thành công hoặc có lỗi kết thúc, dọn dẹp các thông báo "Đang..." chờ trước đó
      if (type === 'success' || type === 'error') {
        filtered = filtered.filter((t) => !t.text.startsWith('Đang '));
      }
      // Tránh lặp lại thông báo trùng lặp
      filtered = filtered.filter((t) => t.text !== trimmed);

      // Thêm mới và giữ tối đa 5 thông báo (tự động đẩy thông báo cũ nhất đi)
      const next = [...filtered, { id, type, text: trimmed }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Bật/tắt "Tự khớp chiều theo ảnh" -> áp dụng tức thì cho cả các ảnh đã tải lên trước đó
  const handleToggleAutoMatchOrientation = useCallback(
    async (enabled: boolean) => {
      const newMode: OrientationMode = enabled ? 'auto_match' : 'rotate_to_fit';
      handleOrientationModeChange(newMode);

      if (photos.length === 0) {
        addToast('info', enabled ? 'Đã bật tự khớp chiều' : 'Đã tắt tự khớp chiều');
        return;
      }

      try {
        const updatedPhotos: PhotoItem[] = [];
        for (const photo of photos) {
          const res = await formatPhotoToPreset(photo, activePreset, newMode, settings.smartCrop);
          updatedPhotos.push(res.photo);
        }
        setPhotos(updatedPhotos);
        addToast(
          'success',
          enabled
            ? `Đã bật tự khớp chiều (${updatedPhotos.length} ảnh)`
            : `Đã ép đúng khuôn (${updatedPhotos.length} ảnh)`
        );
      } catch (err) {
        console.error('Error in handleToggleAutoMatchOrientation:', err);
      }
    },
    [handleOrientationModeChange, photos, activePreset, settings.smartCrop, setPhotos, addToast]
  );

  // =========================================================================
  // LỚP 1: Chống tắt tab / tải lại trang đột ngột (beforeunload)
  // =========================================================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (photos.length > 0) {
        e.preventDefault();
        e.returnValue = 'Bạn có dự án in chưa hoàn tất. Bạn có chắc chắn muốn rời khỏi trang không?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [photos.length]);

  // =========================================================================
  // LỚP 2: Tự động lưu ngầm vào IndexedDB (Debounced 500ms) & Kiểm tra khôi phục
  // =========================================================================
  // 1. Kiểm tra session cũ khi load ứng dụng lần đầu
  const hasCheckedSessionRef = useRef(false);
  useEffect(() => {
    if (hasCheckedSessionRef.current) return;
    hasCheckedSessionRef.current = true;

    async function checkPreviousSession() {
      try {
        const meta = await getSavedSessionMeta();
        if (meta && meta.photosMeta && meta.photosMeta.length > 0) {
          setPendingRestoreMeta(meta);
        }
      } catch (e) {
        console.warn('Error checking existing session:', e);
      }
    }
    checkPreviousSession();
  }, []);

  // 2. Debounce lưu project_meta sau mỗi thao tác (500ms)
  const saveTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (photos.length === 0) {
      setIsAutoSaved(false);
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      await saveProjectMeta(photos, settings, customPresets);
      setIsAutoSaved(true);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [photos, settings, customPresets]);

  // 3. Đồng bộ blobs (chỉ khi số lượng ảnh hoặc id ảnh thay đổi)
  const previousPhotoIdsRef = useRef<string>('');
  useEffect(() => {
    const currentPhotoIds = photos.map((p) => p.id).join(',');
    if (currentPhotoIds !== previousPhotoIdsRef.current) {
      previousPhotoIdsRef.current = currentPhotoIds;
      if (photos.length > 0) {
        syncPhotoBlobs(photos);
      } else {
        clearSavedSession();
      }
    }
  }, [photos]);

  // Khôi phục session từ IndexedDB
  const handleRestoreSession = useCallback(async () => {
    try {
      addToast('info', 'Đang nạp dự án cũ...');
      const session = await loadSavedSession();
      if (session && session.photos.length > 0) {
        setPhotos(session.photos);
        setSettings(session.settings);
        if (session.settings.orientationMode) {
          setOrientationMode(session.settings.orientationMode);
          setAutoMatchOrientation(session.settings.orientationMode === 'auto_match');
        }
        if (session.customPresets && session.customPresets.length > 0) {
          setCustomPresets(session.customPresets);
        }
        addToast('success', `Đã khôi phục ${session.photos.length} ảnh`);
      } else {
        addToast('error', 'Không thể nạp dữ liệu phiên cũ');
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      addToast('error', 'Lỗi khôi phục dự án');
    } finally {
      setPendingRestoreMeta(null);
    }
  }, [addToast, setPhotos]);

  // Bỏ qua session cũ và bắt đầu mới
  const handleDiscardSession = useCallback(async () => {
    await clearSavedSession();
    setPendingRestoreMeta(null);
    addToast('info', 'Đã tạo dự án mới');
  }, [addToast]);

  // =========================================================================
  // LỚP 3: Xuất / Nhập file dự án .daudau (Lưu thủ công & Chuyển đổi máy)
  // =========================================================================
  const handleExportProject = useCallback(() => {
    if (photos.length === 0) {
      addToast('error', 'Chưa có ảnh để xuất file');
      return;
    }
    setIsSaveProjectModalOpen(true);
  }, [photos.length, addToast]);

  const handleConfirmSaveProject = useCallback(
    async (projectName: string) => {
      setIsSaveProjectModalOpen(false);
      if (photos.length === 0) return;

      setIsExporting(true);
      try {
        addToast('info', `Đang lưu dự án "${projectName}"...`);
        await exportProjectToDaudauFile(photos, settings, customPresets, projectName);
        addToast('success', `Đã lưu dự án "${projectName}.daudau"`);
      } catch (err) {
        console.error('Error exporting project:', err);
        addToast('error', 'Lỗi khi lưu file dự án');
      } finally {
        setIsExporting(false);
      }
    },
    [photos, settings, customPresets, addToast]
  );

  const handleImportProject = useCallback(
    async (file: File) => {
      try {
        addToast('info', `Đang mở dự án "${file.name}"...`);
        const projectData = await importProjectFromDaudauFile(file);

        if (!projectData.photos || projectData.photos.length === 0) {
          addToast('error', 'Tệp dự án không có ảnh hợp lệ');
          return;
        }

        setPhotos(projectData.photos);
        if (projectData.settings) {
          setSettings(projectData.settings);
          if (projectData.settings.orientationMode) {
            setOrientationMode(projectData.settings.orientationMode);
            setAutoMatchOrientation(projectData.settings.orientationMode === 'auto_match');
          }
        }
        if (projectData.customPresets && projectData.customPresets.length > 0) {
          setCustomPresets(projectData.customPresets);
        }

        addToast('success', `Đã mở dự án "${projectData.name}" (${projectData.photos.length} ảnh)`);
      } catch (err: any) {
        console.error('Error importing project:', err);
        addToast('error', err?.message || 'Lỗi đọc file dự án');
      }
    },
    [addToast, setPhotos]
  );

  // Keyboard shortcut support for Undo (Ctrl+Z) and Redo (Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlOrCmd && !e.altKey) {
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handlePrint();
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            // Redo: Ctrl+Shift+Z
            if (canRedo) {
              handleRedo();
              addToast('info', 'Đã làm lại (Ctrl+Y)');
            }
          } else {
            // Undo: Ctrl+Z
            if (canUndo) {
              handleUndo();
              addToast('info', 'Đã hoàn tác (Ctrl+Z)');
            }
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          // Redo: Ctrl+Y
          e.preventDefault();
          if (canRedo) {
            handleRedo();
            addToast('info', 'Đã làm lại (Ctrl+Y)');
          }
        } else if (e.key === 's' || e.key === 'S') {
          // Quick save project: Ctrl+S
          e.preventDefault();
          handleExportProject();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo, handleExportProject, addToast]);

  const onUndoWithToast = useCallback(() => {
    if (canUndo) {
      handleUndo();
      addToast('info', 'Đã hoàn tác (Ctrl+Z)');
    }
  }, [canUndo, handleUndo, addToast]);

  const onRedoWithToast = useCallback(() => {
    if (canRedo) {
      handleRedo();
      addToast('info', 'Đã làm lại (Ctrl+Y)');
    }
  }, [canRedo, handleRedo, addToast]);

  const handleAddPhotos = useCallback((newPhotos: PhotoItem[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, [setPhotos]);

  const handleUpdatePhoto = useCallback((id: string, updates: Partial<PhotoItem>) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === id ? { ...photo, ...updates } : photo))
    );
  }, [setPhotos]);

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    addToast('info', 'Đã xóa ảnh');
  }, [setPhotos, addToast]);

  const handleClearAll = useCallback(() => {
    if (photos.length === 0) {
      addToast('info', 'Danh sách ảnh trống');
      return;
    }
    setIsClearConfirmOpen(true);
  }, [photos.length, addToast]);

  const handleConfirmClearAll = useCallback(async () => {
    setPhotos([]);
    await clearSavedSession();
    setIsAutoSaved(false);
    addToast('info', 'Đã xóa toàn bộ ảnh');
  }, [setPhotos, addToast]);

  const handleUpdateSettings = useCallback(
    (updates: Partial<LayoutSettings>) => {
      setSettings((prev) => {
        const nextSettings = { ...prev, ...updates };

        // Nếu người dùng chuyển sang chế độ 'auto' hoặc bật autoNesting / allowRotation:
        // Tự động xóa các tọa độ kéo tay cũ để thuật toán xếp tối ưu mà không bị đè ảnh!
        const isSwitchingToAuto = updates.layoutMode === 'auto';
        const isEnablingAutoNesting = updates.autoNesting === true && prev.layoutMode === 'freeform';
        const isEnablingAllowRotation = updates.allowRotation === true && prev.layoutMode === 'freeform';

        if (isSwitchingToAuto || isEnablingAutoNesting || isEnablingAllowRotation) {
          nextSettings.layoutMode = 'auto';
          setPhotos((currentPhotos) => {
            const hasFree = currentPhotos.some((p) => p.freePositions && Object.keys(p.freePositions).length > 0);
            if (hasFree) {
              return currentPhotos.map((p) => {
                if (!p.freePositions) return p;
                const copy = { ...p };
                delete copy.freePositions;
                return copy;
              });
            }
            return currentPhotos;
          });
          addToast('success', 'Đã bật Tự động sắp xếp');
        }

        return nextSettings;
      });
    },
    [setPhotos, addToast]
  );

  const handleMovePhoto = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= photos.length || toIndex >= photos.length) return;
      setPhotos((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      addToast('info', 'Đã thay đổi thứ tự ảnh');
    },
    [photos.length, setPhotos, addToast]
  );

  const handleReorderPhotos = useCallback(
    (sourceId: string, targetId: string) => {
      setPhotos((prev) => {
        const sourceIndex = prev.findIndex((p) => p.id === sourceId);
        const targetIndex = prev.findIndex((p) => p.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
          return prev;
        }

        const newPhotos = [...prev];
        const [movedPhoto] = newPhotos.splice(sourceIndex, 1);
        newPhotos.splice(targetIndex, 0, movedPhoto);
        return newPhotos;
      });
      addToast('info', 'Đã đổi vị trí ảnh');
    },
    [setPhotos, addToast]
  );

  const packedPages = useMemo(() => {
    return packImagesToPages(photos, settings);
  }, [photos, settings]);

  // Cập nhật vị trí tự do của ảnh trên trang in A4 (kèm hỗ trợ Undo/Redo)
  const handleUpdateFreeformPosition = useCallback(
    (photoId: string, instanceIndex: number, pos: { x: number; y: number; pageNumber?: number }) => {
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== photoId) return p;
          const currentFree = { ...(p.freePositions || {}) };
          currentFree[instanceIndex] = pos;
          return {
            ...p,
            freePositions: currentFree,
          };
        })
      );
    },
    [setPhotos]
  );

  // Đặt lại toàn bộ ảnh về vị trí sắp xếp tối ưu tự động
  const handleResetFreeformPositions = useCallback(() => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (!p.freePositions || Object.keys(p.freePositions).length === 0) return p;
        const copy = { ...p };
        delete copy.freePositions;
        return copy;
      })
    );
    addToast('success', 'Đã xếp lại ảnh tối ưu');
  }, [setPhotos, addToast]);

  // Nhân bản toàn bộ ảnh của một trang để làm mặt sau (kèm tự động kích hoạt In 2 mặt đối xứng)
  const handleClonePageAsBackside = useCallback((pageNumber: number) => {
    const targetPage = packedPages.find((p) => p.pageNumber === pageNumber);
    if (!targetPage || targetPage.items.length === 0) {
      addToast('error', `Trang ${pageNumber} không có ảnh để nhân bản`);
      return;
    }

    const clonedPhotos: PhotoItem[] = targetPage.items.map((it, idx) => {
      // Tìm photo gốc trong photos hoặc trích xuất đầy đủ từ item đã đặt
      const sourcePhoto = photos.find((p) => p.id === it.id);
      const src = sourcePhoto || it;

      return {
        id: `photo_${Date.now()}_clone_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        name: src.name ? `${src.name} (Mặt sau)` : `Ảnh mặt sau ${idx + 1}`,
        originalSrc: src.originalSrc,
        previewSrc: src.previewSrc,
        rawOriginalSrc: src.rawOriginalSrc,
        rawOriginalWidth: src.rawOriginalWidth,
        rawOriginalHeight: src.rawOriginalHeight,
        rawOriginalCrop: src.rawOriginalCrop ? { ...src.rawOriginalCrop } : undefined,
        upscaleFactor: src.upscaleFactor,
        isEnhanced: src.isEnhanced,
        adjustments: src.adjustments ? { ...src.adjustments } : undefined,
        imgWidth: src.imgWidth,
        imgHeight: src.imgHeight,
        targetWidth: src.targetWidth,
        targetHeight: src.targetHeight,
        shape: src.shape,
        qty: 1,
        scale: src.scale ?? 1,
        cropX: src.cropX ?? 0,
        cropY: src.cropY ?? 0,
        cropW: src.cropW ?? src.imgWidth,
        cropH: src.cropH ?? src.imgHeight,
        rotation: src.rotation ?? 0,
        orderTag: src.orderTag,
      };
    });

    if (!settings.duplexMode) {
      setSettings((prev) => ({ ...prev, duplexMode: true }));
    }

    setPhotos((prev) => {
      // Chèn các ảnh bản sao ngay sau các ảnh của trang được nhân bản để tạo trang mặt sau liền kề
      const lastItem = targetPage.items[targetPage.items.length - 1];
      const lastIndex = prev.findIndex((p) => p.id === lastItem.id);
      if (lastIndex !== -1) {
        const next = [...prev];
        next.splice(lastIndex + 1, 0, ...clonedPhotos);
        return next;
      }
      return [...prev, ...clonedPhotos];
    });

    addToast(
      'success',
      `Đã nhân bản ${clonedPhotos.length} ảnh Trang ${pageNumber} làm mặt sau`
    );
  }, [packedPages, photos, settings.duplexMode, setSettings, setPhotos, addToast]);

  const handleClonePage1AsBackside = useCallback(() => {
    handleClonePageAsBackside(1);
  }, [handleClonePageAsBackside]);

  const handlePrint = useCallback(() => {
    if (photos.length === 0) {
      addToast('error', 'Chưa có ảnh để in');
      return;
    }
    window.print();
  }, [photos.length, addToast]);

  const handleExport = useCallback(
    async (format: 'png' | 'jpeg') => {
      if (photos.length === 0) {
        addToast('error', 'Chưa có ảnh để xuất file');
        return;
      }

      setIsExporting(true);
      setExportProgress({ current: 1, total: packedPages.length });
      addToast('info', `Đang xuất ${packedPages.length} trang ảnh 300 DPI...`);

      try {
        await exportPagesToImage(packedPages, settings, format, (current, total) => {
          setExportProgress({ current, total });
        });
        addToast('success', `Đã xuất xong ${packedPages.length} trang ảnh`);
      } catch (err) {
        console.error('Error exporting:', err);
        addToast('error', 'Lỗi khi xuất ảnh');
      } finally {
        setIsExporting(false);
        setExportProgress(null);
      }
    },
    [photos.length, packedPages, settings, addToast]
  );

  const handleExportPdf = useCallback(async () => {
    if (photos.length === 0) {
      addToast('error', 'Chưa có ảnh để xuất PDF');
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 1, total: packedPages.length });
    addToast('info', `Đang tạo PDF ${packedPages.length} trang chuẩn 300 DPI...`);

    try {
      await exportPagesToPdf(packedPages, settings, (current, total) => {
        setExportProgress({ current, total });
      });
      addToast('success', `Đã xuất xong PDF ${packedPages.length} trang`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      addToast('error', 'Lỗi khi tạo file PDF');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [photos.length, packedPages, settings, addToast]);

  const handleSaveCustomPreset = useCallback((preset: SizePreset) => {
    setCustomPresets((prev) => {
      // If already exists with same dimensions and shape, replace it
      const filtered = prev.filter((p) => !(p.width === preset.width && p.height === preset.height && p.shape === preset.shape));
      const updated = [preset, ...filtered];
      try {
        localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving custom presets to storage', e);
      }
      return updated;
    });
    // Kích hoạt ngay khổ in tùy chỉnh mới làm khổ in mặc định hiện tại
    setActivePresetId(preset.id);
    try {
      localStorage.setItem('daudau_active_preset_id', preset.id);
    } catch (e) {
      console.warn(e);
    }
    addToast('success', `Đã lưu cỡ: ${getShortPresetLabel(preset.label)}`);
  }, [addToast]);

  const handleRemoveCustomPreset = useCallback((id: string) => {
    setCustomPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving custom presets to storage', e);
      }
      return updated;
    });
    addToast('info', 'Đã xóa cỡ tùy chỉnh');
  }, [addToast]);

  const handleApplyPresetToPhoto = useCallback(
    (photoId: string, preset: SizePreset) => {
      const target = photos.find((p) => p.id === photoId);
      if (!target) return;
      const crop = calculateCrop(target.imgWidth, target.imgHeight, preset.width, preset.height, settings.smartCrop);
      handleUpdatePhoto(photoId, {
        targetWidth: preset.width,
        targetHeight: preset.height,
        shape: preset.shape,
        cropX: crop.cropX,
        cropY: crop.cropY,
        cropW: crop.cropW,
        cropH: crop.cropH,
        scale: 1,
      });
      addToast('success', `Đã đổi cỡ: ${getShortPresetLabel(preset.label)}`);
    },
    [photos, settings.smartCrop, handleUpdatePhoto, addToast]
  );

  const handleApplyPresetToAll = useCallback(
    (preset: SizePreset) => {
      if (photos.length === 0) {
        addToast('error', 'Chưa có ảnh để áp dụng');
        return;
      }
      photos.forEach((photo) => {
        const crop = calculateCrop(photo.imgWidth, photo.imgHeight, preset.width, preset.height, settings.smartCrop);
        handleUpdatePhoto(photo.id, {
          targetWidth: preset.width,
          targetHeight: preset.height,
          shape: preset.shape,
          cropX: crop.cropX,
          cropY: crop.cropY,
          cropW: crop.cropW,
          cropH: crop.cropH,
          scale: 1,
        });
      });
      addToast('success', `Đã đổi tất cả sang cỡ ${getShortPresetLabel(preset.label)}`);
    },
    [photos, settings.smartCrop, handleUpdatePhoto, addToast]
  );

  // Global shortcut Ctrl+S / Cmd+S for saving project
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExportProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExportProject]);

  // =========================================================================
  // VIEW ROUTING & WORKSPACE RENDERING
  // =========================================================================

  return (
    <>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Lock / Security Activation Modal (0798408406) */}
      {!isUnlocked ? (
        <ActivationModal
          onUnlock={() => {
            setIsUnlocked(true);
            setActiveView('hub');
          }}
        />
      ) : activeView === 'hub' ? (
        /* 1. Tool Selection Hub Screen (2 Options) */
        <ToolSelectorHub
          onSelectTool={(tool) => setActiveView(tool)}
          photoCount={photos.length}
        />
      ) : activeView === 'png-splitter' ? (
        /* 2. Standalone PNG Sheet & Sticker Splitter Tool Workspace */
        <PngSplitterWorkspace
          onBackToHub={() => setActiveView('hub')}
          onNavigateToA4={() => setActiveView('a4-layout')}
          onAddPhotosToA4Project={handleAddPhotos}
          onToast={addToast}
          customPresets={customPresets}
          smartCrop={settings.smartCrop}
        />
      ) : (
        /* 3. A4 Auto Pack & Layout Printing Studio */
        <div id="app-root" className="flex w-full h-screen overflow-hidden bg-slate-100 text-slate-800 font-sans">
          {/* Restore Session Modal (Auto-save recovery) */}
          {pendingRestoreMeta && (
            <RestoreSessionModal
              isOpen={Boolean(pendingRestoreMeta)}
              meta={pendingRestoreMeta}
              onRestore={handleRestoreSession}
              onDiscard={handleDiscardSession}
            />
          )}

          {/* Column 1: Image List Sidebar (Left) */}
          <ImageListSidebar
            photos={photos}
            onUpdatePhoto={handleUpdatePhoto}
            onRemovePhoto={handleRemovePhoto}
            onClearAll={handleClearAll}
            onOpenCropModal={(photo, initialTab) => setCropModalConfig({ photo, initialTab: initialTab || 'size' })}
            onOpenCustomSizeModal={(photo) => setCustomSizeModalConfig({ isOpen: true, targetPhoto: photo || null })}
            customPresets={customPresets}
            onToast={addToast}
            smartCrop={settings.smartCrop}
            onMovePhoto={handleMovePhoto}
          />

          {/* Column 2: Batch Actions / Tools Sidebar */}
          <BatchToolsSidebar
            photos={photos}
            onUpdatePhoto={handleUpdatePhoto}
            onBatchUpdatePhotos={handleBatchUpdatePhotos}
            onToast={addToast}
            smartCrop={settings.smartCrop}
            activePresetId={activePresetId}
            onChangeActivePresetId={handleActivePresetChange}
            orientationMode={orientationMode}
            onChangeOrientationMode={handleOrientationModeChange}
            autoMatchOrientation={autoMatchOrientation}
            onToggleAutoMatchOrientation={handleToggleAutoMatchOrientation}
            customPresets={customPresets}
            onOpenCustomSizeModal={() => setCustomSizeModalConfig({ isOpen: true, targetPhoto: null })}
          />

          {/* Column 3: Settings Sidebar */}
          <SettingsSidebar
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            pageCount={packedPages.length}
            totalPhotos={photos.length}
            onAddPhotos={handleAddPhotos}
            onPrint={handlePrint}
            onExport={handleExport}
            onExportPdf={handleExportPdf}
            onExportProject={handleExportProject}
            onImportProject={handleImportProject}
            onClearAllPhotos={handleClearAll}
            isAutoSaved={isAutoSaved}
            isExporting={isExporting}
            exportProgress={exportProgress}
            onToast={addToast}
            activePreset={activePreset}
            orientationMode={orientationMode}
            autoMatchOrientation={autoMatchOrientation}
            customPresets={customPresets}
            onOpenPngSplitter={() => setActiveView('png-splitter')}
            onClonePage1AsBackside={handleClonePage1AsBackside}
            onResetFreeformPositions={handleResetFreeformPositions}
            photos={photos}
          />

          {/* Column 4: Live Interactive A4 Preview (Right) */}
          <A4PreviewArea
            pages={packedPages}
            settings={settings}
            onUpdatePhoto={handleUpdatePhoto}
            onReorderPhotos={handleReorderPhotos}
            onOpenCropModal={(photo) => setCropModalConfig({ photo, initialTab: 'size' })}
            totalPhotos={photos.length}
            onUndo={onUndoWithToast}
            onRedo={onRedoWithToast}
            canUndo={canUndo}
            canRedo={canRedo}
            historyCount={historyCount}
            onBackToHub={() => setActiveView('hub')}
            onUpdateSettings={handleUpdateSettings}
            onUpdateFreeformPosition={handleUpdateFreeformPosition}
            onResetFreeformPositions={handleResetFreeformPositions}
          />

          {/* Modal for Fine-Tuned Crop / Pan / Framing / Color Adjustments */}
          {cropModalConfig && (
            <CropModal
              photo={cropModalConfig.photo}
              initialTab={cropModalConfig.initialTab || 'size'}
              onClose={() => setCropModalConfig(null)}
              onSave={handleUpdatePhoto}
              smartCrop={settings.smartCrop}
            />
          )}

          {/* Modal for Custom Size Input & Presets Management */}
          {customSizeModalConfig.isOpen && (
            <CustomSizeModal
              isOpen={customSizeModalConfig.isOpen}
              onClose={() => setCustomSizeModalConfig({ isOpen: false, targetPhoto: null })}
              targetPhoto={customSizeModalConfig.targetPhoto}
              customPresets={customPresets}
              onSaveCustomPreset={handleSaveCustomPreset}
              onRemoveCustomPreset={handleRemoveCustomPreset}
              onApplyPresetToPhoto={(id, preset) => handleApplyPresetToPhoto(id, preset)}
              onApplyPresetToAll={(preset) => handleApplyPresetToAll(preset)}
            />
          )}

          {/* Modal for Saving .daudau Project File with Custom Name */}
          {isSaveProjectModalOpen && (
            <SaveProjectModal
              isOpen={isSaveProjectModalOpen}
              photoCount={photos.length}
              pageCount={packedPages.length}
              onSave={handleConfirmSaveProject}
              onClose={() => setIsSaveProjectModalOpen(false)}
            />
          )}

          {/* Modal for Splitting Transparent PNG Sheets into Individual Stickers */}
          {isPngSplitterOpen && (
            <PngSplitterModal
              isOpen={isPngSplitterOpen}
              onClose={() => setIsPngSplitterOpen(false)}
              onAddPhotosToProject={handleAddPhotos}
              onToast={addToast}
              customPresets={customPresets}
              smartCrop={settings.smartCrop}
            />
          )}

          {/* Modal for Confirming Clear All Photos */}
          <ClearConfirmModal
            isOpen={isClearConfirmOpen}
            photoCount={photos.length}
            onConfirm={handleConfirmClearAll}
            onClose={() => setIsClearConfirmOpen(false)}
          />
        </div>
      )}
    </>
  );
}
