import JSZip from 'jszip';

export interface SplitterOptions {
  alphaThreshold: number; // 1 to 255 (default: 15)
  minPixelArea: number; // Minimum number of non-transparent pixels (default: 150)
  padding: number; // Padding in pixels around extracted image (default: 2)
  mergeDistance: number; // Proximity distance in px to merge nearby detached parts (default: 0)
  whiteBorderWidth?: number; // Automatic white contour/border in px (default: 0)
}

/**
 * Creates a clean, solid white contour/border around a transparent PNG sticker
 */
export function addWhiteBorderToCanvas(
  sourceCanvas: HTMLCanvasElement,
  borderWidth: number
): HTMLCanvasElement {
  if (!borderWidth || borderWidth <= 0) return sourceCanvas;

  const pad = borderWidth + 2;
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const targetW = w + pad * 2;
  const targetH = h + pad * 2;

  // Step 1: Create a white silhouette of sourceCanvas
  const silhouetteCanvas = document.createElement('canvas');
  silhouetteCanvas.width = w;
  silhouetteCanvas.height = h;
  const silCtx = silhouetteCanvas.getContext('2d');
  if (!silCtx) return sourceCanvas;

  silCtx.drawImage(sourceCanvas, 0, 0);
  silCtx.globalCompositeOperation = 'source-in';
  silCtx.fillStyle = '#FFFFFF';
  silCtx.fillRect(0, 0, w, h);

  // Step 2: Draw dilated silhouette on target canvas
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = targetW;
  targetCanvas.height = targetH;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return sourceCanvas;

  targetCtx.imageSmoothingEnabled = true;

  // Multi-ring dilation to ensure solid, gap-free white border
  const steps = 24;
  const rings = borderWidth <= 3 ? [borderWidth] : [borderWidth * 0.5, borderWidth];
  for (const r of rings) {
    for (let i = 0; i < steps; i++) {
      const angle = (i * 2 * Math.PI) / steps;
      const dx = pad + Math.cos(angle) * r;
      const dy = pad + Math.sin(angle) * r;
      targetCtx.drawImage(silhouetteCanvas, dx, dy);
    }
  }
  // Fill center
  targetCtx.drawImage(silhouetteCanvas, pad, pad);

  // Step 3: Draw original color sticker on top
  targetCtx.drawImage(sourceCanvas, pad, pad);

  return targetCanvas;
}

export interface ExtractedImageItem {
  id: string;
  index: number;
  name: string;
  dataUrl: string;
  blob: Blob;
  width: number; // Width in px
  height: number; // Height in px
  pixelCount: number;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  selected: boolean;
}

export interface SplitterResult {
  sourceWidth: number;
  sourceHeight: number;
  items: ExtractedImageItem[];
  totalDetected: number;
}

/**
 * Loads an image from a Data URL or URL into an HTMLImageElement
 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Connected Component Labeling algorithm on Alpha Channel to detect and extract
 * all isolated transparent PNG objects/stickers.
 */
export async function splitPngSheet(
  imageSrc: string,
  baseName: string = 'sticker',
  options: Partial<SplitterOptions> = {},
  onProgress?: (percent: number, message: string) => void
): Promise<SplitterResult> {
  const {
    alphaThreshold = 15,
    minPixelArea = 150,
    padding = 2,
    mergeDistance = 0,
    whiteBorderWidth = 0,
  } = options;

  onProgress?.(10, 'Đang đọc và phân tích dữ liệu điểm ảnh...');

  const img = await loadImageElement(imageSrc);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Create canvas to read RGBA pixels
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not create 2D canvas context');
  }

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  onProgress?.(25, 'Đang quét phân vùng trong suốt (Alpha Channel)...');

  const totalPixels = width * height;
  const labels = new Int32Array(totalPixels); // 0 = unvisited/transparent, >0 = label ID
  const queue = new Int32Array(totalPixels);

  interface RawComponent {
    id: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    pixelCount: number;
  }

  const rawComponents: RawComponent[] = [];
  let currentLabel = 0;

  // 8-directional neighbor offsets (dx, dy)
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

  // Scan through image pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const alpha = data[idx * 4 + 3];

      // If it has visible opacity and hasn't been visited yet
      if (alpha >= alphaThreshold && labels[idx] === 0) {
        currentLabel++;
        let head = 0;
        let tail = 0;

        queue[tail++] = idx;
        labels[idx] = currentLabel;

        let cMinX = x;
        let cMaxX = x;
        let cMinY = y;
        let cMaxY = y;
        let count = 0;

        // BFS flood fill
        while (head < tail) {
          const currIdx = queue[head++];
          const currX = currIdx % width;
          const currY = Math.floor(currIdx / width);
          count++;

          if (currX < cMinX) cMinX = currX;
          if (currX > cMaxX) cMaxX = currX;
          if (currY < cMinY) cMinY = currY;
          if (currY > cMaxY) cMaxY = currY;

          for (let d = 0; d < 8; d++) {
            const nx = currX + dx[d];
            const ny = currY + dy[d];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (labels[nIdx] === 0 && data[nIdx * 4 + 3] >= alphaThreshold) {
                labels[nIdx] = currentLabel;
                queue[tail++] = nIdx;
              }
            }
          }
        }

        // Only register if pixel area is large enough (filters stray dust / single noise pixels)
        if (count >= minPixelArea) {
          rawComponents.push({
            id: currentLabel,
            minX: cMinX,
            maxX: cMaxX,
            minY: cMinY,
            maxY: cMaxY,
            pixelCount: count,
          });
        }
      }
    }
  }

  onProgress?.(50, `Đã nhận diện ${rawComponents.length} đối tượng tách biệt...`);

  // Optional: Merge nearby bounding boxes if mergeDistance > 0 (for multi-part stickers like text + logo)
  let componentsToExtract = rawComponents;

  if (mergeDistance > 0 && rawComponents.length > 1) {
    const merged: RawComponent[] = [];
    const used = new Uint8Array(rawComponents.length);

    for (let i = 0; i < rawComponents.length; i++) {
      if (used[i]) continue;
      used[i] = 1;

      let cMinX = rawComponents[i].minX;
      let cMaxX = rawComponents[i].maxX;
      let cMinY = rawComponents[i].minY;
      let cMaxY = rawComponents[i].maxY;
      let totalCount = rawComponents[i].pixelCount;
      const mergedIds = [rawComponents[i].id];

      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < rawComponents.length; j++) {
          if (used[j]) continue;
          const other = rawComponents[j];

          // Check if other bounding box is within mergeDistance
          const isNearby =
            cMinX - mergeDistance <= other.maxX &&
            cMaxX + mergeDistance >= other.minX &&
            cMinY - mergeDistance <= other.maxY &&
            cMaxY + mergeDistance >= other.minY;

          if (isNearby) {
            used[j] = 1;
            cMinX = Math.min(cMinX, other.minX);
            cMaxX = Math.max(cMaxX, other.maxX);
            cMinY = Math.min(cMinY, other.minY);
            cMaxY = Math.max(cMaxY, other.maxY);
            totalCount += other.pixelCount;
            mergedIds.push(other.id);
            changed = true;
          }
        }
      }

      merged.push({
        id: rawComponents[i].id,
        minX: cMinX,
        maxX: cMaxX,
        minY: cMinY,
        maxY: cMaxY,
        pixelCount: totalCount,
      });
    }
    componentsToExtract = merged;
  }

  // Sort components in natural reading order (Top to Bottom, Left to Right)
  componentsToExtract.sort((a, b) => {
    // If vertically separated by more than 20% of their height, top comes first
    const avgHeight = ((a.maxY - a.minY) + (b.maxY - b.minY)) / 2;
    if (Math.abs(a.minY - b.minY) > avgHeight * 0.4) {
      return a.minY - b.minY;
    }
    return a.minX - b.minX;
  });

  onProgress?.(65, 'Đang trích xuất từng file PNG độc lập...');

  // Extract each component to isolated PNG canvas
  const extractedItems: ExtractedImageItem[] = [];

  for (let i = 0; i < componentsToExtract.length; i++) {
    const comp = componentsToExtract[i];
    const cropW = comp.maxX - comp.minX + 1;
    const cropH = comp.maxY - comp.minY + 1;

    const outW = cropW + padding * 2;
    const outH = cropH + padding * 2;

    const itemCanvas = document.createElement('canvas');
    itemCanvas.width = outW;
    itemCanvas.height = outH;
    const itemCtx = itemCanvas.getContext('2d');
    if (!itemCtx) continue;

    // Draw slice from source canvas directly with exact transparency
    itemCtx.drawImage(
      canvas,
      comp.minX,
      comp.minY,
      cropW,
      cropH,
      padding,
      padding,
      cropW,
      cropH
    );

    let finalCanvas = itemCanvas;
    if (whiteBorderWidth && whiteBorderWidth > 0) {
      finalCanvas = addWhiteBorderToCanvas(itemCanvas, whiteBorderWidth);
    }

    const dataUrl = finalCanvas.toDataURL('image/png');
    const blob = await new Promise<Blob>((resolve) => {
      finalCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });

    const safeBaseName = baseName.replace(/\.[^/.]+$/, '').trim() || 'sticker';
    const itemNumber = String(i + 1).padStart(2, '0');
    const name = `${safeBaseName}_${itemNumber}.png`;

    extractedItems.push({
      id: `extracted_${Date.now()}_${i}`,
      index: i + 1,
      name,
      dataUrl,
      blob,
      width: finalCanvas.width,
      height: finalCanvas.height,
      pixelCount: comp.pixelCount,
      bbox: {
        minX: comp.minX,
        minY: comp.minY,
        maxX: comp.maxX,
        maxY: comp.maxY,
      },
      selected: true,
    });

    onProgress?.(
      65 + Math.round(((i + 1) / componentsToExtract.length) * 30),
      `Đã xử lý ${i + 1} / ${componentsToExtract.length} chi tiết...`
    );

    // Yield every 3 items to avoid blocking UI
    if (i % 3 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(100, `Hoàn tất tách ${extractedItems.length} ảnh PNG!`);

  return {
    sourceWidth: width,
    sourceHeight: height,
    items: extractedItems,
    totalDetected: extractedItems.length,
  };
}

/**
 * Downloads a list of extracted items as a single .ZIP archive
 */
export async function downloadExtractedItemsZip(
  items: ExtractedImageItem[],
  zipName: string = 'bo_anh_da_tach_nen.zip',
  onProgress?: (percent: number) => void
): Promise<void> {
  if (items.length === 0) return;

  const zip = new JSZip();
  const folderName = zipName.replace(/\.zip$/i, '');
  const folder = zip.folder(folderName) || zip;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const fileName = item.name.endsWith('.png') ? item.name : `${item.name}.png`;
    folder.file(fileName, item.blob);
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );

  // Trigger browser file download
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Downloads a single extracted PNG file
 */
export function downloadSingleExtractedPng(item: ExtractedImageItem): void {
  const url = URL.createObjectURL(item.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = item.name.endsWith('.png') ? item.name : `${item.name}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
