import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PhotoItem, LayoutSettings, ShapeType, SizePreset } from './types';
import { packImagesToPages } from './utils/packing';
import { exportPagesToImage, calculateCrop } from './utils/imageUtils';
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

  const [settings, setSettings] = useState<LayoutSettings>({
    margin: 5,
    gap: 2,
    cutLines: false,
    smartCrop: false,
    autoNesting: false,
    paperOrientation: 'portrait',
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cropModalConfig, setCropModalConfig] = useState<{
    photo: PhotoItem;
    initialTab?: 'crop' | 'adjust';
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

  const defaultSize = useMemo<{ width: number; height: number; shape: ShapeType }>(
    () => ({
      width: 60,
      height: 90,
      shape: 'rect',
    }),
    []
  );

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
      addToast('info', 'Đang khôi phục dự án cũ...');
      const session = await loadSavedSession();
      if (session && session.photos.length > 0) {
        setPhotos(session.photos);
        setSettings(session.settings);
        if (session.customPresets && session.customPresets.length > 0) {
          setCustomPresets(session.customPresets);
        }
        addToast('success', `Đã khôi phục thành công dự án (${session.photos.length} bức ảnh)!`);
      } else {
        addToast('error', 'Không thể nạp dữ liệu ảnh từ phiên cũ.');
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      addToast('error', 'Có lỗi khi khôi phục dự án.');
    } finally {
      setPendingRestoreMeta(null);
    }
  }, [addToast, setPhotos]);

  // Bỏ qua session cũ và bắt đầu mới
  const handleDiscardSession = useCallback(async () => {
    await clearSavedSession();
    setPendingRestoreMeta(null);
    addToast('info', 'Đã khởi tạo dự án mới trống');
  }, [addToast]);

  // =========================================================================
  // LỚP 3: Xuất / Nhập file dự án .daudau (Lưu thủ công & Chuyển đổi máy)
  // =========================================================================
  const handleExportProject = useCallback(() => {
    if (photos.length === 0) {
      addToast('error', 'Chưa có ảnh nào trong dự án để xuất file .daudau!');
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
        addToast('info', `Đang đóng gói file dự án "${projectName}.daudau"...`);
        await exportProjectToDaudauFile(photos, settings, customPresets, projectName);
        addToast('success', `Đã lưu file dự án "${projectName}.daudau" thành công!`);
      } catch (err) {
        console.error('Error exporting project:', err);
        addToast('error', 'Có lỗi khi đóng gói file dự án.');
      } finally {
        setIsExporting(false);
      }
    },
    [photos, settings, customPresets, addToast]
  );

  const handleImportProject = useCallback(
    async (file: File) => {
      try {
        addToast('info', `Đang giải nén & nạp dự án "${file.name}"...`);
        const projectData = await importProjectFromDaudauFile(file);

        if (!projectData.photos || projectData.photos.length === 0) {
          addToast('error', 'Tệp dự án không chứa hình ảnh hợp lệ.');
          return;
        }

        setPhotos(projectData.photos);
        if (projectData.settings) {
          setSettings(projectData.settings);
        }
        if (projectData.customPresets && projectData.customPresets.length > 0) {
          setCustomPresets(projectData.customPresets);
        }

        addToast('success', `Đã nạp thành công dự án "${projectData.name}" (${projectData.photos.length} ảnh)!`);
      } catch (err: any) {
        console.error('Error importing project:', err);
        addToast('error', err?.message || 'Có lỗi xảy ra khi đọc file dự án.');
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
              addToast('info', 'Làm lại bước tiếp theo');
            }
          } else {
            // Undo: Ctrl+Z
            if (canUndo) {
              handleUndo();
              addToast('info', 'Đã hoàn tác bước trước');
            }
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          // Redo: Ctrl+Y
          e.preventDefault();
          if (canRedo) {
            handleRedo();
            addToast('info', 'Làm lại bước tiếp theo');
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
      addToast('info', 'Đã hoàn tác bước trước');
    }
  }, [canUndo, handleUndo, addToast]);

  const onRedoWithToast = useCallback(() => {
    if (canRedo) {
      handleRedo();
      addToast('info', 'Làm lại bước tiếp theo');
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
      addToast('info', 'Danh sách ảnh đang trống.');
      return;
    }
    setIsClearConfirmOpen(true);
  }, [photos.length, addToast]);

  const handleConfirmClearAll = useCallback(async () => {
    setPhotos([]);
    await clearSavedSession();
    setIsAutoSaved(false);
    addToast('info', 'Đã xóa toàn bộ ảnh trong dự án');
  }, [setPhotos, addToast]);

  const handleUpdateSettings = useCallback((updates: Partial<LayoutSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

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

  const handlePrint = useCallback(() => {
    if (photos.length === 0) {
      addToast('error', 'Chưa có ảnh nào để in!');
      return;
    }
    window.print();
  }, [photos.length, addToast]);

  const handleExport = useCallback(
    async (format: 'png' | 'jpeg') => {
      if (photos.length === 0) {
        addToast('error', 'Chưa có ảnh nào để xuất file!');
        return;
      }

      setIsExporting(true);
      setExportProgress({ current: 1, total: packedPages.length });
      addToast('info', `Đang kết xuất ${packedPages.length} trang độ nét cao 300 DPI...`);

      try {
        await exportPagesToImage(packedPages, settings, format, (current, total) => {
          setExportProgress({ current, total });
        });
        addToast('success', `Đã xuất ${packedPages.length} trang ảnh chất lượng cao thành công!`);
      } catch (err) {
        console.error('Error exporting:', err);
        addToast('error', 'Có lỗi xảy ra khi tạo file xuất.');
      } finally {
        setIsExporting(false);
        setExportProgress(null);
      }
    },
    [photos.length, packedPages, settings, addToast]
  );

  const handleExportPdf = useCallback(async () => {
    if (photos.length === 0) {
      addToast('error', 'Chưa có ảnh nào để xuất file PDF!');
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 1, total: packedPages.length });
    addToast('info', `Đang kết xuất PDF ${packedPages.length} trang chuẩn in ấn 300 DPI...`);

    try {
      await exportPagesToPdf(packedPages, settings, (current, total) => {
        setExportProgress({ current, total });
      });
      addToast('success', `Đã xuất file PDF (${packedPages.length} trang) chuẩn in ấn thành công!`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      addToast('error', 'Có lỗi xảy ra khi tạo file PDF.');
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
    addToast('success', `Đã lưu mẫu kích thước: ${preset.label}`);
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
    addToast('info', 'Đã xóa kích thước tùy chỉnh');
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
      addToast('success', `Đã áp dụng kích thước ${preset.label} cho ảnh`);
    },
    [photos, settings.smartCrop, handleUpdatePhoto, addToast]
  );

  const handleApplyPresetToAll = useCallback(
    (preset: SizePreset) => {
      if (photos.length === 0) {
        addToast('error', 'Chưa có ảnh nào để áp dụng kích thước!');
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
      addToast('success', `Đã đồng bộ tất cả sang kích thước: ${preset.label}`);
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
            onOpenCropModal={(photo, initialTab) => setCropModalConfig({ photo, initialTab: initialTab || 'crop' })}
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
            onToast={addToast}
            smartCrop={settings.smartCrop}
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
            defaultSize={defaultSize}
            customPresets={customPresets}
            onOpenPngSplitter={() => setActiveView('png-splitter')}
          />

          {/* Column 4: Live Interactive A4 Preview (Right) */}
          <A4PreviewArea
            pages={packedPages}
            settings={settings}
            onUpdatePhoto={handleUpdatePhoto}
            onReorderPhotos={handleReorderPhotos}
            onOpenCropModal={(photo) => setCropModalConfig({ photo, initialTab: 'crop' })}
            totalPhotos={photos.length}
            onUndo={onUndoWithToast}
            onRedo={onRedoWithToast}
            canUndo={canUndo}
            canRedo={canRedo}
            historyCount={historyCount}
            onBackToHub={() => setActiveView('hub')}
          />

          {/* Modal for Fine-Tuned Crop / Pan / Framing / Color Adjustments */}
          {cropModalConfig && (
            <CropModal
              photo={cropModalConfig.photo}
              initialTab={cropModalConfig.initialTab || 'crop'}
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
