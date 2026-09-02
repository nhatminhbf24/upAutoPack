import { PhotoItem, LayoutSettings, SizePreset } from '../types';
import JSZip from 'jszip';

const DB_NAME = 'AutoPackPrint_DB';
const DB_VERSION = 1;
const STORE_META = 'project_meta';
const STORE_BLOBS = 'project_blobs';

export interface ProjectMetadata {
  id: string;
  name: string;
  lastUpdated: number;
  settings: LayoutSettings;
  customPresets: SizePreset[];
  photosMeta: Array<Omit<PhotoItem, 'originalSrc' | 'previewSrc' | 'rawOriginalSrc'>>;
}

export interface ProjectData {
  meta: ProjectMetadata;
  blobs: Map<string, Blob>; // photoId -> Blob
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Convert base64 / dataUrl to Blob safely
 */
export function dataURLToBlob(dataurl: string): Blob {
  if (!dataurl) return new Blob([], { type: 'image/jpeg' });
  try {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
      return new Blob([], { type: 'image/jpeg' });
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('Error in dataURLToBlob:', err);
    return new Blob([], { type: 'image/jpeg' });
  }
}

/**
 * Universal src to Blob converter (supports data:, blob:, http: urls)
 */
export async function srcToBlob(src: string): Promise<Blob> {
  if (!src) return new Blob([], { type: 'image/jpeg' });

  if (src.startsWith('data:')) {
    const blob = dataURLToBlob(src);
    if (blob.size > 0) return blob;
  }

  try {
    const res = await fetch(src);
    return await res.blob();
  } catch (err) {
    console.warn('Fallback converting src to blob:', err);
    return dataURLToBlob(src);
  }
}

/**
 * Convert Blob to Base64 dataURL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save Project Metadata to IndexedDB (Debounced, fast ~3KB)
 */
export async function saveProjectMeta(
  photos: PhotoItem[],
  settings: LayoutSettings,
  customPresets: SizePreset[]
): Promise<void> {
  try {
    const db = await openDatabase();
    const photosMeta = photos.map(({ originalSrc, previewSrc, rawOriginalSrc, ...meta }) => meta);

    const projectMeta: ProjectMetadata = {
      id: 'current_session',
      name: 'Dự án in A4 gần nhất',
      lastUpdated: Date.now(),
      settings,
      customPresets,
      photosMeta,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      const req = store.put({ key: 'current_project', value: projectMeta });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save project meta to IndexedDB:', err);
  }
}

/**
 * Sync photo blobs to IndexedDB:
 * Adds missing blobs, removes deleted blobs
 */
export async function syncPhotoBlobs(photos: PhotoItem[]): Promise<void> {
  try {
    const db = await openDatabase();
    const currentPhotoIds = new Set(photos.map((p) => p.id));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);

      // 1. Get all stored blob IDs to delete orphans
      const getAllKeysReq = store.getAllKeys();
      getAllKeysReq.onsuccess = () => {
        const storedKeys = (getAllKeysReq.result as string[]) || [];
        for (const key of storedKeys) {
          if (!currentPhotoIds.has(key)) {
            store.delete(key);
          }
        }

        // 2. Put blobs for photos
        for (const photo of photos) {
          if (photo.originalSrc) {
            try {
              const blob = dataURLToBlob(photo.originalSrc);
              store.put({ id: photo.id, blob });
            } catch (e) {
              console.warn('Error converting photo to blob:', e);
            }
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to sync photo blobs to IndexedDB:', err);
  }
}

/**
 * Clear Auto-saved Session from IndexedDB
 */
export async function clearSavedSession(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_META).clear();
      tx.objectStore(STORE_BLOBS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB session:', err);
  }
}

/**
 * Check if there is an existing saved session
 */
export async function getSavedSessionMeta(): Promise<ProjectMetadata | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get('current_project');

      req.onsuccess = () => {
        if (req.result && req.result.value) {
          const meta = req.result.value as ProjectMetadata;
          if (meta.photosMeta && meta.photosMeta.length > 0) {
            resolve(meta);
            return;
          }
        }
        resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error checking saved session:', err);
    return null;
  }
}

/**
 * Load full project data from IndexedDB
 */
export async function loadSavedSession(): Promise<{
  photos: PhotoItem[];
  settings: LayoutSettings;
  customPresets: SizePreset[];
} | null> {
  try {
    const db = await openDatabase();
    const meta = await getSavedSessionMeta();
    if (!meta) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const getAllReq = store.getAll();

      getAllReq.onsuccess = async () => {
        const storedBlobs = getAllReq.result as Array<{ id: string; blob: Blob }>;
        const blobMap = new Map<string, Blob>();
        storedBlobs.forEach((item) => blobMap.set(item.id, item.blob));

        const restoredPhotos: PhotoItem[] = [];
        for (const pMeta of meta.photosMeta) {
          const blob = blobMap.get(pMeta.id);
          if (blob) {
            const dataUrl = await blobToDataURL(blob);
            restoredPhotos.push({
              ...pMeta,
              originalSrc: dataUrl,
              previewSrc: dataUrl,
            });
          }
        }

        resolve({
          photos: restoredPhotos,
          settings: meta.settings,
          customPresets: meta.customPresets || [],
        });
      };

      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch (err) {
    console.warn('Error restoring session from IndexedDB:', err);
    return null;
  }
}

/**
 * Export project to .daudau file (ZIP bundle containing project.json and images/)
 */
export async function exportProjectToDaudauFile(
  photos: PhotoItem[],
  settings: LayoutSettings,
  customPresets: SizePreset[],
  projectName: string = 'Du_An_In_Anh'
): Promise<void> {
  const zip = new JSZip();

  const photosMeta = photos.map(({ originalSrc, previewSrc, rawOriginalSrc, ...meta }) => ({
    ...meta,
    fileName: `${meta.id}.jpg`,
  }));

  const projectConfig = {
    version: '1.0',
    appName: 'AutoPack Print',
    createdAt: new Date().toISOString(),
    name: projectName,
    settings,
    customPresets,
    photos: photosMeta,
  };

  // 1. Add project.json
  zip.file('project.json', JSON.stringify(projectConfig, null, 2));

  // 2. Add images/ directory
  const imgFolder = zip.folder('images');
  if (imgFolder) {
    for (const photo of photos) {
      const src = photo.originalSrc || photo.previewSrc;
      if (!src) continue;

      try {
        if (src.startsWith('data:')) {
          const parts = src.split(',');
          if (parts.length >= 2) {
            const base64Data = parts[1];
            imgFolder.file(`${photo.id}.jpg`, base64Data, { base64: true });
            continue;
          }
        }

        // For blob: or http: URLs
        const blob = await srcToBlob(src);
        if (blob && blob.size > 0) {
          imgFolder.file(`${photo.id}.jpg`, blob);
        }
      } catch (err) {
        console.warn(`Could not add image ${photo.id} to project archive:`, err);
      }
    }
  }

  // 3. Generate .daudau ZIP bundle
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const blobUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  const cleanName = (projectName || 'Du_An_In_Anh').replace(/[\\/:*?"<>|]/g, '_').trim();
  link.download = cleanName.endsWith('.daudau') ? cleanName : `${cleanName}.daudau`;
  link.href = blobUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
}

/**
 * Import project from .daudau / .zip file
 */
export async function importProjectFromDaudauFile(file: File): Promise<{
  photos: PhotoItem[];
  settings: LayoutSettings;
  customPresets: SizePreset[];
  name: string;
}> {
  const zip = await JSZip.loadAsync(file);

  const configFile = zip.file('project.json') || zip.file('config.json');
  if (!configFile) {
    throw new Error('Tệp không đúng định dạng dự án .daudau (thiếu project.json)');
  }

  const configJsonStr = await configFile.async('text');
  const config = JSON.parse(configJsonStr);

  const restoredPhotos: PhotoItem[] = [];
  const photosList = config.photos || [];

  for (const p of photosList) {
    const imgFileName = p.fileName || `${p.id}.jpg`;
    const imageFile =
      zip.file(`images/${imgFileName}`) ||
      zip.file(imgFileName) ||
      zip.file(`images/${p.id}.jpg`) ||
      zip.file(`${p.id}.jpg`) ||
      zip.file(`images/${p.id}.png`) ||
      zip.file(`${p.id}.png`) ||
      zip.file(`images/${p.id}.jpeg`) ||
      zip.file(`${p.id}.jpeg`);

    if (imageFile) {
      try {
        const base64 = await imageFile.async('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        const { fileName, ...cleanMeta } = p;
        restoredPhotos.push({
          ...cleanMeta,
          originalSrc: dataUrl,
          previewSrc: dataUrl,
        });
      } catch (err) {
        console.warn(`Could not extract image ${imgFileName}:`, err);
      }
    }
  }

  return {
    photos: restoredPhotos,
    settings: config.settings,
    customPresets: config.customPresets || [],
    name: config.name || file.name.replace(/\.[^/.]+$/, ''),
  };
}
