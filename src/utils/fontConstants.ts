export interface FontOption {
  id: string;
  name: string;
  familyCss: string;
  category: 'sans' | 'handwriting' | 'rounded' | 'calligraphy';
  sampleText?: string;
}

export const PRINT_FONT_OPTIONS: FontOption[] = [
  // 1. Phông Hiện Đại / Tiêu Chuẩn (Modern Sans)
  {
    id: 'be_vietnam_pro',
    name: 'Be Vietnam Pro (Chuẩn Việt Nam)',
    familyCss: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
    category: 'sans',
    sampleText: 'Kỷ niệm đẹp',
  },
  {
    id: 'montserrat',
    name: 'Montserrat (Hiện đại & Tinh tế)',
    familyCss: '"Montserrat", sans-serif',
    category: 'sans',
    sampleText: 'MEMORIES 2026',
  },
  {
    id: 'sans',
    name: 'System Sans (Mặc định hệ thống)',
    familyCss: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    category: 'sans',
    sampleText: 'Tiêu chuẩn',
  },

  // 2. Phông Bo Tròn Thân Thiện (Rounded)
  {
    id: 'quicksand',
    name: 'Quicksand (Bo tròn trẻ trung)',
    familyCss: '"Quicksand", sans-serif',
    category: 'rounded',
    sampleText: 'Dễ thương & Ngọt ngào',
  },
  {
    id: 'nunito',
    name: 'Nunito (Cân đối mềm mại)',
    familyCss: '"Nunito", sans-serif',
    category: 'rounded',
    sampleText: 'Hạnh phúc mỗi ngày',
  },

  // 3. Phông Viết Tay Cảm Xúc (Handwriting / Cursive)
  {
    id: 'dancing_script',
    name: 'Dancing Script (Bay bổng mềm mại)',
    familyCss: '"Dancing Script", cursive',
    category: 'handwriting',
    sampleText: 'Sweet Memories',
  },
  {
    id: 'pacifico',
    name: 'Pacifico (Retro & Năng động)',
    familyCss: '"Pacifico", cursive',
    category: 'handwriting',
    sampleText: 'Summer Vibes',
  },
  {
    id: 'mali',
    name: 'Mali (Nét bút trẻ thơ cute)',
    familyCss: '"Mali", cursive',
    category: 'handwriting',
    sampleText: 'Gia đình nhỏ',
  },
  {
    id: 'playpen_sans',
    name: 'Playpen Sans (Mộc mạc gần gũi)',
    familyCss: '"Playpen Sans", cursive',
    category: 'handwriting',
    sampleText: 'Những ngày bình yên',
  },
  {
    id: 'sriracha',
    name: 'Sriracha (Viết tay tự nhiên)',
    familyCss: '"Sriracha", cursive',
    category: 'handwriting',
    sampleText: 'Dấu ấn thời gian',
  },
  {
    id: 'handwriting',
    name: 'Cursive cơ bản (Hệ thống)',
    familyCss: '"Dancing Script", "Caveat", "Segoe Print", cursive, sans-serif',
    category: 'handwriting',
    sampleText: 'Viết tay',
  },

  // 4. Phông Thư Pháp / Lãng Mạn (Calligraphy & Script)
  {
    id: 'great_vibes',
    name: 'Great Vibes (Thư pháp sang trọng)',
    familyCss: '"Great Vibes", cursive',
    category: 'calligraphy',
    sampleText: 'Forever Love',
  },
  {
    id: 'allura',
    name: 'Allura (Bút lông thanh mảnh)',
    familyCss: '"Allura", cursive',
    category: 'calligraphy',
    sampleText: 'Wedding Day',
  },

  // 5. Cổ điển & Máy đánh chữ (Legacy options)
  {
    id: 'serif',
    name: 'Có chân cổ điển (Serif)',
    familyCss: '"Playfair Display", Georgia, "Times New Roman", serif',
    category: 'sans',
    sampleText: 'Classic',
  },
  {
    id: 'mono',
    name: 'Máy đánh chữ (Mono)',
    familyCss: '"JetBrains Mono", Consolas, "Courier New", monospace',
    category: 'sans',
    sampleText: 'PHOTO-01',
  },
];

/**
 * Trả về chuỗi CSS font-family hợp lệ tương ứng với ID hoặc chuỗi font đã lưu
 */
export function resolveFontFamilyCss(fontIdOrCss?: string): string {
  if (!fontIdOrCss) {
    return '"Be Vietnam Pro", system-ui, -apple-system, sans-serif';
  }

  const matched = PRINT_FONT_OPTIONS.find(
    (f) => f.id.toLowerCase() === fontIdOrCss.toLowerCase()
  );
  if (matched) {
    return matched.familyCss;
  }

  // Nếu đã là chuỗi font CSS có chứa dấu nháy hoặc phẩy (ví dụ '"Montserrat", sans-serif')
  if (fontIdOrCss.includes(',') || fontIdOrCss.includes('"')) {
    return fontIdOrCss;
  }

  return `"${fontIdOrCss}", sans-serif`;
}

/**
 * Đảm bảo font chữ đã tải sẵn trong document trước khi vẽ canvas 2D
 */
export async function ensureFontLoaded(fontFamily: string, fontSizePx = 16): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    const fontStr = `${fontSizePx}px ${resolveFontFamilyCss(fontFamily)}`;
    await document.fonts.load(fontStr);
  } catch {
    // Bỏ qua lỗi mạng nếu font chưa sẵn sàng, canvas tự fallback
  }
}
