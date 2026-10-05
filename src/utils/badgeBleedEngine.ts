import { detectBadgeBleedColors } from './badgeUtils';

/**
 * Badge Bleed Engine - Xử lý tự động mở rộng viền & đổ màu nền cho Phôi Huy Hiệu (Button Pin Badge)
 * - Tự động quét viền ảnh khách gửi để lấy màu chủ đạo biên ngoài
 * - Hỗ trợ bảng màu gợi ý, lấy màu theo chu vi tròn
 * - Hỗ trợ vẽ chuẩn khuôn dập (mặt chính diện 4.4cm, khuôn cắt 5.5cm)
 */

export interface EdgeColorAnalysis {
  dominantColor: string; // Mã màu HEX chủ đạo ở mép viền (VD: #ffffff)
  averageColor: string; // Mã màu HEX trung bình
  palette: string[]; // Danh sách màu biên nổi bật nhất để gợi ý cho người dùng
}

/**
 * Tự động quét chu vi vòng tròn ngoài cùng của ảnh để phân tích màu viền
 */
export async function sampleDominantEdgeColor(imageSrc: string): Promise<EdgeColorAnalysis> {
  const result = await detectBadgeBleedColors(imageSrc);
  return {
    dominantColor: result.dominantColor,
    averageColor: result.dominantColor,
    palette: result.palette,
  };
}
