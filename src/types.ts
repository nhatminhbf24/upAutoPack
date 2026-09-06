export type ShapeType = 'rect' | 'circle' | 'heart';

export type OrientationMode = 'rotate_to_fit' | 'auto_match' | 'fixed_crop';

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
  rawOriginalWidth?: number; // Dimensions before super-res upscale
  rawOriginalHeight?: number;
  rawOriginalCrop?: { cropX: number; cropY: number; cropW: number; cropH: number };
  unrotatedOriginalSrc?: string; // Original image before auto-rotation for reversible orientation modes
  unrotatedPreviewSrc?: string; // Original preview before auto-rotation
  unrotatedWidth?: number; // Original width before auto-rotation
  unrotatedHeight?: number; // Original height before auto-rotation
  rotatedOriginalSrc?: string; // Cached 90° rotated original for instant orientation switching
  rotatedPreviewSrc?: string; // Cached 90° rotated preview
  autoRotateAngle?: number; // 0 or 90 (degree rotated to fit portrait/landscape frame)
  upscaleFactor?: number; // 1, 2, 4
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
  orderTag?: string; // Nhãn mã đơn hoặc tên khách riêng cho ảnh này (ví dụ: #DH01, Khách Tuấn)
  freePositions?: Record<number, { x: number; y: number; pageNumber?: number }>; // Vị trí tự do trên trang A4 theo từng bản in (instanceIndex)
}

export interface FreeformTextTag {
  enabled: boolean;
  text: string;
  includeDateTime: boolean;
  includePageNumber: boolean;
  fontSizePt: number; // Cỡ chữ (6 - 18 pt)
  rotation: 0 | 90 | 180 | 270; // Góc xoay (0 = Ngang, 90 = Dọc mép giấy)
  xMm: number; // Tọa độ X trên trang A4 (mm)
  yMm: number; // Tọa độ Y trên trang A4 (mm)
  color?: string; // Mã màu chữ (mặc định #334155)
}

export type CutMarkFeature = 'solid' | 'dashed' | 'corner_marks' | 'full_trim_guides';

export interface LayoutSettings {
  margin: number; // mm
  gap: number; // mm
  cutLines: boolean;
  cutStyle?: CutMarkFeature; // Kiểu dấu cắt: viền liền, nét đứt, dấu góc (Corner Crop Marks), hoặc gióng tràn mép giấy (Full Trim Guides)
  cutStyles?: CutMarkFeature[]; // Cho phép chọn nhiều chức năng cắt đồng thời (Gióng mép A4, Dấu góc, Nét đứt, Nét liền)
  bleed?: number; // Tràn lề bù xén (0, 1, 2 mm) để tránh viền trắng khi cắt
  printSlug?: boolean; // In thông tin đơn hàng / mã đơn ở lề trang giấy A4 (tương thích ngược)
  slugPosition?: 'bottom' | 'top'; // Vị trí in mã đơn: 'bottom' (Chân trang - khuyên dùng vì rộng rãi) hoặc 'top' (Đầu trang)
  printMicroSlugs?: boolean; // In mã đơn mini ngoài mép viền xén từng ảnh (xén dao xong sẽ bay mất, không phạm vào ảnh)
  orderSlug?: string; // Tên khách hoặc mã đơn hàng chung (ví dụ: #DH1024 - Khách: Nguyễn Văn A)
  textTag?: FreeformTextTag; // Dòng chữ / mã đơn tự do (kéo thả, xoay dọc/ngang, cỡ chữ tùy chỉnh, ngày giờ tự động)
  pageTextTags?: Record<number, FreeformTextTag>; // Ghi chú riêng biệt theo từng trang (key là số trang: 1, 2, 3... - vị trí & nội dung độc lập)
  duplexMode?: boolean; // Chế độ in 2 mặt: Tự động lật đối xứng trang chẵn (Mirror X) để khớp mặt sau
  smartCrop: boolean;
  orientationMode?: OrientationMode; // Chế độ định hướng: 'rotate_to_fit' (Ép đúng cỡ & Tự xoay ảnh), 'auto_match' (Khớp chiều theo ảnh), 'fixed_crop' (Cố định khổ)
  autoNesting?: boolean; // Tự động sắp xếp ảnh tối ưu diện tích
  allowRotation?: boolean; // Cho phép xoay 90° lấp khoảng trống (Tiết kiệm giấy tối đa)
  paperOrientation: 'portrait' | 'landscape';
  layoutMode?: 'auto' | 'freeform'; // Chế độ xếp: Tự động tối ưu (auto) hoặc Kéo thả di chuyển tự do (freeform)
}

export interface PlacedPhotoItem extends PhotoItem {
  x: number; // in mm from top-left of page
  y: number; // in mm from top-left of page
  w: number; // in mm
  h: number; // in mm
  instanceIndex: number;
  isRotated?: boolean; // true nếu ảnh được thuật toán tự động xoay 90° để lấp khoảng trống
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
  { id: '30x80_rect', label: '3 x 8 cm (Bookmark / Photostrip)', category: 'Cơ bản & Phổ biến', width: 30, height: 80, shape: 'rect' },
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

  // Phôi Quà Tặng Chuyên Dụng (Gift & POD Studio)
  { id: '55x85_gift_pc', label: 'Photocard Idol Kpop (5.5 x 8.5 cm) - Bo góc R3', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 55, height: 85, shape: 'rect' },
  { id: '40x60_gift_keychain', label: 'Móc khóa Acrylic (4 x 6 cm)', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 40, height: 60, shape: 'rect' },
  { id: '50x50_gift_keychain', label: 'Móc khóa Acrylic vuông (5 x 5 cm)', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 50, height: 50, shape: 'rect' },
  { id: '45x45_gift_keychain', label: 'Móc khóa Acrylic tròn (4.5 x 4.5 cm)', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 45, height: 45, shape: 'circle' },
  { id: '44x44_gift_pin', label: 'Huy hiệu cài áo tròn 44mm (Kèm mép phôi bọc 54mm)', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 44, height: 44, shape: 'circle' },
  { id: '58x58_gift_pin', label: 'Huy hiệu cài áo tròn 58mm (Kèm mép phôi bọc 70mm)', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 58, height: 58, shape: 'circle' },
  { id: '50x150_gift_strip', label: 'Dải ảnh Photo Strip 3-4 ô (5 x 15 cm)', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 50, height: 150, shape: 'rect' },
  { id: '200x90_gift_mug', label: 'Phôi Cốc sứ in chuyển nhiệt (20 x 9 cm)', category: '🎁 Phôi Quà Tặng Chuyên Dụng', width: 200, height: 90, shape: 'rect' },
];
