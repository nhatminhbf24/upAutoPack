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
  unadjustedSrc?: string; // Clean unadjusted base image matching current working orientation & dimensions
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
  badgeMode?: boolean; // Kích hoạt chế độ phôi huy hiệu chuyên dụng
  badgeFaceDiameter?: number; // Đường kính mặt chính diện huy hiệu (mm), ví dụ 43mm (cho khuôn cắt 54mm)
  badgeBleedColor?: string; // Mã màu HEX đổ nền viền bọc mép (tự động nhận diện từ ảnh khách)
  badgeBleedPalette?: string[]; // 5 màu gợi ý từ biên ảnh
  badgeGuideLines?: boolean; // Hiển thị vòng căn dập mặt chính (mặc định false)
  badgeBleedMode?: 'solid' | 'blur_expand'; // 'solid': màu trơn | 'blur_expand': kéo giãn nhòe viền
  templateConfig?: TemplateConfig; // Cấu hình mẫu thiết kế đặc thù (Polaroid, Instagram, Photostrip, Viền Film, Bookmark)
  hasWhiteBackground?: boolean; // Tự động phát hiện ảnh có nền trắng đục (nguy cơ khi in PET / áo tối màu)
  isTransparent?: boolean; // Đã là ảnh PNG trong suốt
}

export type PrintTemplateType = 'none' | 'polaroid' | 'instagram' | 'photostrip' | 'film' | 'bookmark' | 'photocard' | 'spotify' | 'ticket' | 'badge';

export interface PhotostripSlot {
  id: string;
  photoId?: string; // ID của ảnh gốc trong danh sách nếu có
  photoName?: string;
  photoSrc: string; // URL hoặc Base64 ảnh riêng cho ô này
  imgWidth?: number;
  imgHeight?: number;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  scale?: number;
  rotation?: number;
}

export interface TemplateConfig {
  type: PrintTemplateType;
  frameColor?: string; // Màu nền / khung viền (mặc định '#ffffff' hoặc '#111827')
  textColor?: string; // Màu chữ (mặc định '#1e293b' hoặc '#f8fafc')
  fontFamily?: string; // Phông chữ (hỗ trợ 11 phông tiếng Việt Google Fonts và font hệ thống)
  fontSizePt?: number; // Cỡ chữ pt
  textAlign?: 'left' | 'center' | 'right'; // Căn lề chữ
  textLine1?: string; // Lời nhắn dòng 1
  textLine2?: string; // Lời nhắn dòng 2

  // 1. Polaroid
  polaroid?: {
    borderMm?: number; // Viền trái, phải, trên (mặc định 3 mm)
    bottomMm?: number; // Chân dưới ghi lời nhắn (mặc định 16 mm)
  };

  // 2. Instagram
  instagram?: {
    username: string; // Tên hiển thị (tối đa 30 ký tự)
    avatarType: 'main' | 'custom' | 'initial' | 'logo';
    avatarSrc?: string; // Ảnh avatar tải riêng hoặc logo tiệm
    borderMm?: number; // Viền trắng quanh bài viết (mặc định 4 mm, 0 mm là tràn viền)
    layoutMode?: 'rect' | 'square'; // Vùng ảnh 82x72 mm hoặc vuông 82x82 mm
    showFollowBtn?: boolean; // Nút Follow
    showActions?: boolean; // Cụm biểu tượng tương tác (Tim, Comment, Share, Bookmark)
    liked?: boolean; // Trạng thái tim đỏ
    likesCount?: string; // Số lượt thích (ví dụ: "1,280 lượt thích" hoặc "2,368 likes")
    hasGradientRing?: boolean; // Vòng màu gradient Instagram story quanh avatar
  };

  // 3. Photostrip
  photostrip?: {
    slotCount: 3 | 4; // 3 ô (ảnh ~44x44.33mm) hoặc 4 ô (ảnh ~44x32.75mm)
    borderMm?: number; // Viền trái, phải, trên (mặc định 3 mm)
    gapMm?: number; // Khoảng cách giữa các ô (mặc định 2 mm)
    bottomMm?: number; // Chân dưới dành cho lời nhắn (mặc định 10 mm)
    slots?: PhotostripSlot[]; // Danh sách các ô ảnh
  };

  // 4. Viền Film
  film?: {
    borderMm?: number; // Độ dày viền đục lỗ 2 bên (mặc định 4 mm)
    frameNumber?: string; // Số khung (mặc định "01")
    autoIncrement?: boolean; // Tự tăng dần theo bộ ảnh
    sideText?: string; // Dòng chữ kỷ niệm chạy dọc mép trái
    filmStyle?: 'classic_black' | 'vintage_warm' | 'clean_white';
  };

  // 5. Bookmark
  bookmark?: {
    borderMm?: number; // Viền trái, phải, trên (mặc định 3 mm)
    photoHeightMm?: number; // Vùng ảnh phía trên (mặc định 109.5 mm)
    bottomMm?: number; // Chân dưới dành cho lời nhắn (mặc định ~38 mm)
    hasHolePunchGuide?: boolean; // Dấu vị trí đục lỗ xỏ dây
    fullBleed?: boolean; // Ảnh tràn toàn thẻ
  };

  // 6. Photocard (K-Pop Idol Photocard)
  photocard?: {
    borderRadiusMm?: number; // Bán kính bo góc (mặc định 3.5 mm)
    borderMm?: number; // Độ dày viền trắng (0 mm = tràn viền mép bo tròn)
    bottomMm?: number; // Khoảng chân dành cho tên idol / fandom (0 = không viền chân)
    backDesign?: 'blank' | 'symmetry'; // Mặt sau: Để trắng hoặc Lật đối xứng in 2 mặt
  };

  // 7. Spotify Music Player
  spotify?: {
    borderMm?: number; // Viền xung quanh (mặc định 4 mm)
    songTitle?: string; // Tên bài hát
    artistName?: string; // Tên ca sĩ / nghệ sĩ
    duration?: string; // Thời lượng bài hát (vd: "03:45")
    currentTime?: string; // Thời điểm phát (vd: "01:28")
    progressPercent?: number; // Tiến trình phát 0-100% (mặc định 38%)
    showSpotifyCode?: boolean; // Hiển thị mã vạch sóng âm Spotify Soundwave Code
    theme?: 'dark' | 'light'; // Giao diện nền đen Spotify hoặc trắng tối giản
  };

  // 8. Boarding Pass / Vé máy bay Vintage
  ticket?: {
    passengerName?: string; // Tên hành khách
    flight?: string; // Mã chuyến bay (vd: "VN-2026")
    from?: string; // Mã sân bay đi (vd: "HAN")
    to?: string; // Mã sân bay đến (vd: "SGN")
    fromCity?: string; // Tên thành phố đi (vd: "HANOI")
    toCity?: string; // Tên thành phố đến (vd: "HO CHI MINH")
    flightClass?: string; // Hạng vé (vd: "FIRST CLASS" hoặc "BUSINESS")
    boardingTime?: string; // Giờ lên máy bay (vd: "07:15")
    departureTime?: string; // Giờ khởi hành (vd: "07:45")
    gate?: string; // Cổng lên máy bay (vd: "08")
    seat?: string; // Vị trí ghế ngồi (vd: "12A")
    zone?: string; // Khu vực lên máy bay (vd: "2")
    seq?: string; // Số thứ tự boarding (vd: "042")
    etkt?: string; // Mã vé điện tử (vd: "738-2401-9284")
    date?: string; // Ngày bay
    barcodeText?: string; // Ký tự mã vạch
    theme?: 'airline_blue' | 'vintage_kraft' | 'clean_white'; // Phong cách màu vé
    notchCut?: boolean; // Vết khuyết bán nguyệt ở đường xé vé
  };
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
  fontWeight?: 'normal' | 'bold'; // Độ đậm chữ
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
  packingStrategy?: 'maxrects' | 'guillotine'; // 'maxrects': Ép chặt siêu tiết kiệm (Tetris) | 'guillotine': Cắt thẳng dễ rọc (Dao)
  enableSmartBundling?: boolean; // Tự động ghép cặp các ảnh cùng kích thước để lấp giấy đều hơn
  allowRotation?: boolean; // Cho phép xoay 90° lấp khoảng trống (Tiết kiệm giấy tối đa)
  paperOrientation: 'portrait' | 'landscape';
  layoutMode?: 'auto' | 'freeform'; // Chế độ xếp: Tự động tối ưu (auto) hoặc Kéo thả di chuyển tự do (freeform)
  previewCanvasBg?: 'paper' | 'checker' | 'dark'; // Chế độ nền xem trước: 'paper' (Giấy trắng mặc định) | 'checker' (Bàn cờ caro trong suốt PET) | 'dark' (Áo tối màu)
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
  isBadgePreset?: boolean; // Preset huy hiệu chuyên dụng (tự động viền bọc & căn mặt chính diện)
  badgeFaceDiameter?: number; // Đường kính mặt huy hiệu (mm), ví dụ 44mm
  templateType?: PrintTemplateType; // Kiểu mẫu thiết kế (polaroid, instagram, photostrip, film, bookmark)
}

export const DEFAULT_SIZE_PRESETS: SizePreset[] = [
  // 📸 Mẫu in & Thiết kế đặc thù (Polaroid, Instagram, Photostrip, Viền Film, Bookmark, Photocard, Spotify, Ticket)
  { id: 'polaroid_60x90', label: '📸 Polaroid 6 x 9 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 60, height: 90, shape: 'rect', templateType: 'polaroid' },
  { id: 'polaroid_90x120', label: '📸 Polaroid 9 x 12 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 90, height: 120, shape: 'rect', templateType: 'polaroid' },
  { id: 'instagram_90x120', label: '📱 Instagram Post 9 x 12 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 90, height: 120, shape: 'rect', templateType: 'instagram' },
  { id: 'photostrip_50x150', label: '🎞️ Photostrip 5 x 15 cm (3-4 ô)', category: '📸 Mẫu in & Thiết kế đặc thù', width: 50, height: 150, shape: 'rect', templateType: 'photostrip' },
  { id: 'film_60x90', label: '🎬 Viền Film 6 x 9 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 60, height: 90, shape: 'rect', templateType: 'film' },
  { id: 'film_100x150', label: '🎬 Viền Film 10 x 15 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 100, height: 150, shape: 'rect', templateType: 'film' },
  { id: 'bookmark_50x150', label: '🔖 Bookmark 5 x 15 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 50, height: 150, shape: 'rect', templateType: 'bookmark' },
  { id: 'photocard_54x86', label: '🃏 Photocard Idol Kpop 5.4 x 8.6 cm (Bo góc)', category: '📸 Mẫu in & Thiết kế đặc thù', width: 54, height: 86, shape: 'rect', templateType: 'photocard' },
  { id: 'spotify_60x90', label: '🎵 Khung nhạc Spotify 6 x 9 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 60, height: 90, shape: 'rect', templateType: 'spotify' },
  { id: 'spotify_90x120', label: '🎵 Khung nhạc Spotify 9 x 12 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 90, height: 120, shape: 'rect', templateType: 'spotify' },
  { id: 'ticket_60x140', label: '✈️ Vé máy bay Boarding Pass 6 x 14 cm', category: '📸 Mẫu in & Thiết kế đặc thù', width: 60, height: 140, shape: 'rect', templateType: 'ticket' },

  // 🏅 Huy hiệu cài áo chuyên dụng (Badge Pin - Tự động đổ nền viền bọc mép)
  { id: 'badge_44_to_55', label: 'Huy hiệu 4.4 cm (Khuôn 5.4 cm)', category: '🏅 Huy hiệu cài áo (Badge Pin)', width: 54, height: 54, shape: 'circle', isBadgePreset: true, badgeFaceDiameter: 43 },
  { id: 'badge_58_to_70', label: 'Huy hiệu 5.8 cm (Khuôn 6.9 cm)', category: '🏅 Huy hiệu cài áo (Badge Pin)', width: 69, height: 69, shape: 'circle', isBadgePreset: true, badgeFaceDiameter: 57 },
  { id: 'badge_100_to_115', label: 'Huy hiệu 10.0 cm (Khuôn 11.4 cm)', category: '🏅 Huy hiệu cài áo (Badge Pin)', width: 114, height: 114, shape: 'circle', isBadgePreset: true, badgeFaceDiameter: 99 },

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
  { id: 'combo_3x4_4x6', label: '🪪 Combo Ảnh thẻ (3x4 & 4x6 cm)', category: 'Ảnh thẻ & Hồ sơ', width: 40, height: 60, shape: 'rect' },

  // Hình tròn (Sticker)
  { id: '40x40_circle', label: 'Hình tròn 4.0 cm (4.0 x 4.0 cm)', category: 'Hình tròn (Sticker)', width: 40, height: 40, shape: 'circle' },
  { id: '48x48_circle', label: 'Hình tròn 4.8 cm (4.8 x 4.8 cm)', category: 'Hình tròn (Sticker)', width: 48, height: 48, shape: 'circle' },
  { id: '52x52_circle', label: 'Hình tròn 5.2 cm (5.2 x 5.2 cm)', category: 'Hình tròn (Sticker)', width: 52, height: 52, shape: 'circle' },
  { id: '125x125_circle', label: 'Hình tròn 12.5 cm (12.5 x 12.5 cm)', category: 'Hình tròn (Sticker)', width: 125, height: 125, shape: 'circle' },

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
