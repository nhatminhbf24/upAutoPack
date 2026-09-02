export type ShapeType = 'rect' | 'circle' | 'heart';

export interface ImageAdjustments {
  // Cân bằng trắng (White balance)
  temperature: number; // -100 to 100 (Nhiệt độ màu)
  tint: number; // -100 to 100 (Sắc thái)

  // Ánh sáng (Light)
  brightness: number; // -100 to 100 (Độ sáng)
  contrast: number; // -100 to 100 (Độ tương phản)
  highlights: number; // -100 to 100 (Vùng sáng)
  shadows: number; // -100 to 100 (Vùng tối)
  whites: number; // -100 to 100 (Điểm trắng)
  blacks: number; // -100 to 100 (Điểm đen)

  // Màu sắc (Color)
  invert: boolean; // toggle (Đảo màu)
  vibrance: number; // -100 to 100 (Độ rực màu)
  saturation: number; // -100 to 100 (Độ bão hòa)
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  temperature: 0,
  tint: 0,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  invert: false,
  vibrance: 0,
  saturation: 0,
};

export interface PhotoItem {
  id: string;
  name: string;
  originalSrc: string;
  previewSrc?: string; // Lightweight downscaled preview (max 800px) for super-fast UI & A4 layout rendering
  rawOriginalSrc?: string; // Original unenhanced image for toggle/undo
  isEnhanced?: boolean;
  adjustments?: ImageAdjustments;
  imgWidth: number;
  imgHeight: number;
  targetWidth: number; // in mm
  targetHeight: number; // in mm
  shape: ShapeType;
  qty: number;
  scale: number; // 1 to 4 zoom inside bounding box
  cropX: number; // crop origin in source image pixels
  cropY: number;
  cropW: number;
  cropH: number;
  rotation: number; // 0, 90, 180, 270 degrees
}

export interface LayoutSettings {
  margin: number; // mm
  gap: number; // mm
  cutLines: boolean;
  smartCrop: boolean;
  autoNesting?: boolean; // Tự động xoay ngang/dọc ghép khít tối đa tiết kiệm giấy A4
  paperOrientation: 'portrait' | 'landscape';
}

export interface PlacedPhotoItem extends PhotoItem {
  x: number; // in mm from top-left of page
  y: number; // in mm from top-left of page
  w: number; // in mm
  h: number; // in mm
  instanceIndex: number;
}

export interface PackedPage {
  pageNumber: number;
  items: PlacedPhotoItem[];
}

export interface SizePreset {
  id: string;
  label: string;
  category: string;
  width: number; // mm
  height: number; // mm
  shape: ShapeType;
  isCustom?: boolean;
}

export const DEFAULT_SIZE_PRESETS: SizePreset[] = [
  // Ảnh tiêu chuẩn & Phổ biến (Standard & Popular)
  { id: '50x70_rect', label: '5 x 7 cm (Ảnh thẻ / Mini)', category: 'Cơ bản & Phổ biến', width: 50, height: 70, shape: 'rect' },
  { id: '60x80_rect', label: '6 x 8 cm', category: 'Cơ bản & Phổ biến', width: 60, height: 80, shape: 'rect' },
  { id: '60x90_rect', label: '6 x 9 cm (Phổ biến nhất)', category: 'Cơ bản & Phổ biến', width: 60, height: 90, shape: 'rect' },
  { id: '90x120_rect', label: '9 x 12 cm', category: 'Cơ bản & Phổ biến', width: 90, height: 120, shape: 'rect' },
  { id: '100x150_rect', label: '10 x 15 cm (4R / Khung ảnh)', category: 'Cơ bản & Phổ biến', width: 100, height: 150, shape: 'rect' },
  { id: '130x180_rect', label: '13 x 18 cm (5R)', category: 'Cơ bản & Phổ biến', width: 130, height: 180, shape: 'rect' },
  { id: '150x210_rect', label: '15 x 21 cm (A5 / Nửa trang A4)', category: 'Cơ bản & Phổ biến', width: 150, height: 210, shape: 'rect' },

  // Kích thước chữ nhật & Mini mới
  { id: '47x66_rect', label: 'Chữ nhật 4.7 x 6.6 cm', category: 'Chữ nhật & Mini', width: 47, height: 66, shape: 'rect' },
  { id: '53x41_rect', label: 'Chữ nhật 5.3 x 4.1 cm', category: 'Chữ nhật & Mini', width: 53, height: 41, shape: 'rect' },
  { id: '41x29_rect', label: 'Chữ nhật 4.1 x 2.9 cm', category: 'Chữ nhật & Mini', width: 41, height: 29, shape: 'rect' },
  { id: '40x55_rect', label: 'Chữ nhật 4 x 5.5 cm', category: 'Chữ nhật & Mini', width: 40, height: 55, shape: 'rect' },
  { id: '103x132_rect', label: 'Chữ nhật 10.3 x 13.2 cm (Lồng lịch)', category: 'Chữ nhật & Mini', width: 103, height: 132, shape: 'rect' },

  // Ảnh thẻ & Hồ sơ
  { id: '30x40_rect', label: 'Ảnh 3 x 4 cm (CMND / CCCD)', category: 'Ảnh thẻ & Hồ sơ', width: 30, height: 40, shape: 'rect' },
  { id: '40x60_rect', label: 'Ảnh 4 x 6 cm (Hộ chiếu)', category: 'Ảnh thẻ & Hồ sơ', width: 40, height: 60, shape: 'rect' },

  // Hình tròn (Sticker / Huy hiệu)
  { id: '40x40_circle', label: 'Hình tròn 4.0 cm (4.0 x 4.0 cm)', category: 'Hình tròn (Sticker / Huy hiệu)', width: 40, height: 40, shape: 'circle' },
  { id: '48x48_circle', label: 'Hình tròn 4.8 cm (4.8 x 4.8 cm)', category: 'Hình tròn (Sticker / Huy hiệu)', width: 48, height: 48, shape: 'circle' },
  { id: '52x52_circle', label: 'Hình tròn 5.2 cm (5.2 x 5.2 cm)', category: 'Hình tròn (Sticker / Huy hiệu)', width: 52, height: 52, shape: 'circle' },
  { id: '75x75_circle', label: 'Hình tròn 7.5 cm (7.5 x 7.5 cm)', category: 'Hình tròn (Sticker / Huy hiệu)', width: 75, height: 75, shape: 'circle' },
  { id: '125x125_circle', label: 'Hình tròn 12.5 cm (12.5 x 12.5 cm)', category: 'Hình tròn (Sticker / Huy hiệu)', width: 125, height: 125, shape: 'circle' },

  // Hình vuông & Trái tim
  { id: '50x50_rect', label: 'Vuông 5 x 5 cm (Polaroid mini)', category: 'Hình vuông & Trái tim', width: 50, height: 50, shape: 'rect' },
  { id: '70x70_rect', label: 'Vuông 7 x 7 cm', category: 'Hình vuông & Trái tim', width: 70, height: 70, shape: 'rect' },
  { id: '42x42_heart', label: 'Trái tim 4.2 x 4.2 cm (Sticker Cute)', category: 'Hình vuông & Trái tim', width: 42, height: 42, shape: 'heart' },
  { id: '70x70_heart', label: 'Trái tim 7 x 7 cm', category: 'Hình vuông & Trái tim', width: 70, height: 70, shape: 'heart' },
];
