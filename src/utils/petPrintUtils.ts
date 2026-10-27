/**
 * PET / DTF Printing Utilities for Dâu Dâu AutoPack Print
 * 100% Client-side image analysis & white background removal
 */

export interface WhiteBackgroundAnalysis {
  isOpaque: boolean; // Ảnh không có kênh alpha trong suốt (ví dụ file JPEG)
  hasWhiteCorners: boolean; // Có ít nhất 3 góc màu trắng đục
  hasWhiteEdges: boolean; // Có viền mép màu trắng đục
  hasWhiteBackground: boolean; // Đánh giá tổng hợp: Có nền trắng đục gây nguy cơ khi in PET
}

/**
 * Phân tích độ trong suốt và phát hiện nền trắng đục của ảnh
 */
export async function analyzeWhiteBackground(imgSrc: string): Promise<WhiteBackgroundAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const sampleSize = 100;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve({ isOpaque: false, hasWhiteCorners: false, hasWhiteEdges: false, hasWhiteBackground: false });
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imgData.data;

        let transparentPixelCount = 0;
        const totalPixels = sampleSize * sampleSize;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) {
            transparentPixelCount++;
          }
        }

        const isOpaque = transparentPixelCount < totalPixels * 0.01; // Dưới 1% pixel trong suốt -> coi là ảnh đục

        // Kiểm tra 4 góc
        const checkPixelWhite = (x: number, y: number) => {
          const idx = (y * sampleSize + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          return a > 200 && r > 235 && g > 235 && b > 235;
        };

        const corners = [
          checkPixelWhite(2, 2),
          checkPixelWhite(sampleSize - 3, 2),
          checkPixelWhite(2, sampleSize - 3),
          checkPixelWhite(sampleSize - 3, sampleSize - 3),
        ];

        const whiteCornersCount = corners.filter(Boolean).length;
        const hasWhiteCorners = whiteCornersCount >= 3;

        // Kiểm tra mẫu 16 điểm quanh 4 cạnh biên
        let whiteEdgeSampleCount = 0;
        const edgeSamples: Array<[number, number]> = [];
        for (let i = 10; i < sampleSize; i += 20) {
          edgeSamples.push([i, 1]); // Cạnh trên
          edgeSamples.push([i, sampleSize - 2]); // Cạnh dưới
          edgeSamples.push([1, i]); // Cạnh trái
          edgeSamples.push([sampleSize - 2, i]); // Cạnh phải
        }

        for (const [x, y] of edgeSamples) {
          if (checkPixelWhite(x, y)) {
            whiteEdgeSampleCount++;
          }
        }

        const hasWhiteEdges = whiteEdgeSampleCount >= edgeSamples.length * 0.6;
        const hasWhiteBackground = isOpaque && (hasWhiteCorners || hasWhiteEdges);

        resolve({
          isOpaque,
          hasWhiteCorners,
          hasWhiteEdges,
          hasWhiteBackground,
        });
      } catch (err) {
        console.warn('analyzeWhiteBackground failed:', err);
        resolve({ isOpaque: false, hasWhiteCorners: false, hasWhiteEdges: false, hasWhiteBackground: false });
      }
    };

    img.onerror = () => {
      resolve({ isOpaque: false, hasWhiteCorners: false, hasWhiteEdges: false, hasWhiteBackground: false });
    };

    img.src = imgSrc;
  });
}

/**
 * Tẩy sạch nền trắng đục thành PNG trong suốt (100% Client-Side)
 * Sử dụng thuật toán Flood Fill từ 4 cạnh mép biên ngoài vào,
 * giúp xóa sạch nền trắng bao bọc mà KHÔNG làm mất chi tiết màu trắng bên trong tác phẩm.
 *
 * @param imgSrc URL hoặc Base64 ảnh gốc
 * @param tolerance Ngưỡng dung sai màu trắng (0 - 50, mặc định 25)
 */
export async function removeWhiteBackground(
  imgSrc: string,
  tolerance: number = 25
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error('Cannot get canvas 2d context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // BFS Flood Fill từ các điểm rìa ngoài của ảnh
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        // Ngưỡng phát hiện trắng: R, G, B đều >= (255 - tolerance)
        const minWhite = Math.max(180, 255 - tolerance);

        const isWhitePixel = (idx: number) => {
          const a = data[idx + 3];
          if (a < 30) return true; // Pixel vốn đã trong suốt -> cho flood fill xuyên qua
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return r >= minWhite && g >= minWhite && b >= minWhite;
        };

        // Đưa tất cả pixel viền mép ngoài (top, bottom, left, right) vào hàng đợi
        // 1. Mép trên & dưới
        for (let x = 0; x < width; x++) {
          const topIdx = (0 * width + x) * 4;
          const bottomIdx = ((height - 1) * width + x) * 4;

          if (isWhitePixel(topIdx)) {
            queue.push(x, 0);
            visited[0 * width + x] = 1;
          }
          if (isWhitePixel(bottomIdx)) {
            queue.push(x, height - 1);
            visited[(height - 1) * width + x] = 1;
          }
        }

        // 2. Mép trái & phải
        for (let y = 0; y < height; y++) {
          const leftIdx = (y * width + 0) * 4;
          const rightIdx = (y * width + (width - 1)) * 4;

          if (!visited[y * width + 0] && isWhitePixel(leftIdx)) {
            queue.push(0, y);
            visited[y * width + 0] = 1;
          }
          if (!visited[y * width + (width - 1)] && isWhitePixel(rightIdx)) {
            queue.push(width - 1, y);
            visited[y * width + (width - 1)] = 1;
          }
        }

        // Bắt đầu lan truyền BFS (Breadth-First Search)
        let head = 0;
        const dx = [0, 0, 1, -1];
        const dy = [1, -1, 0, 0];

        while (head < queue.length) {
          const curX = queue[head++];
          const curY = queue[head++];

          // Xóa pixel hiện tại thành trong suốt (Alpha = 0)
          const curIdx = (curY * width + curX) * 4;
          data[curIdx + 3] = 0; // Set Alpha = 0

          // Duyệt 4 hướng lân cận
          for (let dir = 0; dir < 4; dir++) {
            const nx = curX + dx[dir];
            const ny = curY + dy[dir];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nCoord = ny * width + nx;
              if (!visited[nCoord]) {
                const nIdx = nCoord * 4;
                if (isWhitePixel(nIdx)) {
                  visited[nCoord] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }

        // Áp dụng dữ liệu pixel đã tẩy nền lên canvas
        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');

        resolve({
          dataUrl,
          width,
          height,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);
    img.src = imgSrc;
  });
}
