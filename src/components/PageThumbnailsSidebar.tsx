import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Layers,
  ChevronsRight,
  ChevronsLeft,
  FileText,
} from 'lucide-react';
import { PackedPage, LayoutSettings } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../utils/packing';

interface PageThumbnailsSidebarProps {
  pages: PackedPage[];
  settings: LayoutSettings;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const PageThumbnailsSidebar: React.FC<PageThumbnailsSidebarProps> = ({
  pages,
  settings,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activePageNumber, setActivePageNumber] = useState<number>(1);
  const isLandscape = settings.orientation === 'landscape';
  const pageW_mm = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageH_mm = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  // Tự động nhận diện trang hiện tại đang hiển thị trong vùng xem trước khi cuộn
  useEffect(() => {
    const previewContainer = document.getElementById('preview-area');
    if (!previewContainer) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pages.length === 0) return;

        const containerRect = previewContainer.getBoundingClientRect();
        const focusY = containerRect.top + containerRect.height / 3;

        let closestPage = pages[0]?.pageNumber || 1;
        let minDistance = Infinity;

        for (const page of pages) {
          const pageEl = document.getElementById(`page-wrapper-${page.pageNumber}`) ||
                         document.getElementById(`a4-page-${page.pageNumber}`);
          if (pageEl) {
            const rect = pageEl.getBoundingClientRect();
            // Khoảng cách từ đỉnh trang đến điểm nhìn tập trung
            const distance = Math.abs(rect.top - focusY);
            if (distance < minDistance) {
              minDistance = distance;
              closestPage = page.pageNumber;
            }
          }
        }

        setActivePageNumber(closestPage);
      });
    };

    previewContainer.addEventListener('scroll', handleScroll, { passive: true });
    // Kích hoạt một lần ban đầu
    handleScroll();

    return () => {
      previewContainer.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [pages]);

  // Cuộn mượt đến trang được chọn và làm nổi bật tức thì
  const handleJumpToPage = useCallback((pageNumber: number) => {
    setActivePageNumber(pageNumber);

    const targetEl =
      document.getElementById(`page-wrapper-${pageNumber}`) ||
      document.getElementById(`a4-page-${pageNumber}`);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Hiệu ứng nhấp nháy viền trang trong chốc lát để thu hút thị giác
      const sheetEl = document.getElementById(`a4-page-${pageNumber}`);
      if (sheetEl) {
        sheetEl.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          sheetEl.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2');
        }, 1200);
      }
    }
  }, []);

  return (
    <aside
      id="page-thumbnails-sidebar"
      className={`no-print transition-all duration-300 flex flex-col bg-slate-50/90 border-l border-slate-200/90 h-full overflow-hidden z-20 shrink-0 ${
        isCollapsed ? 'w-11' : 'w-44'
      }`}
    >
      {/* Sidebar Header */}
      {isCollapsed ? (
        <div className="p-2 border-b border-slate-200/80 bg-white flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
            title="Mở rộng xem trước trang (Thumbnails)"
          >
            <ChevronsLeft className="w-4 h-4 text-blue-600" />
          </button>
          <span className="text-[10px] font-bold text-slate-400 rotate-90 my-2 select-none">
            TRANG
          </span>
        </div>
      ) : (
        <div className="p-3 border-b border-slate-200/80 bg-white sticky top-0 flex justify-between items-center z-10 shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="p-1 rounded-md bg-blue-50 text-blue-600 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-[12px] font-bold text-slate-800 uppercase tracking-wide truncate">
              Trang in ({pages.length})
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Thu gọn cột xem trước trang"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sidebar Body */}
      <div
        ref={sidebarScrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-2.5 custom-scrollbar"
      >
        {pages.length === 0 ? (
          <div className="py-8 px-1 text-center select-none">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <FileText className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <p className="text-[11px] text-slate-400 leading-snug">
                Chưa có trang in
              </p>
            )}
          </div>
        ) : isCollapsed ? (
          /* Khi thu gọn: Danh sách nút số trang dọc nhỏ gọn */
          <div className="flex flex-col items-center gap-1.5">
            {pages.map((page) => {
              const isActive = activePageNumber === page.pageNumber;
              return (
                <button
                  key={`collapsed-page-btn-${page.pageNumber}`}
                  type="button"
                  onClick={() => handleJumpToPage(page.pageNumber)}
                  className={`w-7 h-7 rounded-md text-[11px] font-bold transition flex items-center justify-center cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/50 scale-105'
                      : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200'
                  }`}
                  title={`Trang ${page.pageNumber} (${page.items.length} ảnh) - Bấm để cuộn tới`}
                >
                  {page.pageNumber}
                </button>
              );
            })}
          </div>
        ) : (
          /* Khi mở rộng: Danh sách thẻ thu nhỏ từng trang (Miniature Preview) */
          pages.map((page) => {
            const isActive = activePageNumber === page.pageNumber;

            return (
              <div
                key={`thumbnail-page-${page.pageNumber}`}
                onClick={() => handleJumpToPage(page.pageNumber)}
                className={`group rounded-lg p-2 transition-all cursor-pointer select-none flex flex-col items-center ${
                  isActive
                    ? 'bg-blue-50/70 border-2 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm'
                }`}
              >
                {/* Miniature Canvas Preview (Tỷ lệ A4 thực tế) */}
                <div
                  className="w-full relative bg-white border border-slate-200/90 rounded-[2px] shadow-2xs overflow-hidden transition-transform group-hover:scale-[1.02]"
                  style={{
                    aspectRatio: `${pageW_mm} / ${pageH_mm}`,
                  }}
                >
                  {/* Đường viền lề mờ tượng trưng */}
                  <div className="absolute inset-0 border border-slate-100 pointer-events-none" />

                  {/* Render từng ảnh thu nhỏ theo đúng vị trí % trên trang */}
                  {page.items.map((item, idx) => {
                    const leftPct = (item.x / pageW_mm) * 100;
                    const topPct = (item.y / pageH_mm) * 100;
                    const widthPct = (item.w / pageW_mm) * 100;
                    const heightPct = (item.h / pageH_mm) * 100;
                    const isCircle = item.shape === 'circle';

                    return (
                      <div
                        key={`thumb-item-${item.id}-${idx}`}
                        className={`absolute overflow-hidden bg-slate-100 shadow-2xs pointer-events-none ${
                          isCircle ? 'rounded-full' : 'rounded-[1px]'
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                        }}
                      >
                        <img
                          src={item.previewSrc || item.originalSrc}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Page Info Footer */}
                <div className="w-full mt-2 flex items-center justify-between text-[11px]">
                  <span
                    className={`font-bold transition ${
                      isActive ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-600'
                    }`}
                  >
                    Trang {page.pageNumber}
                  </span>

                  <span className="text-[10px] text-slate-500 font-medium">
                    {page.items.length} ảnh
                  </span>
                </div>

                {/* Duplex status info nếu có bật in 2 mặt */}
                {settings.duplexMode && (
                  <div className="w-full mt-1 flex items-center text-[9.5px]">
                    <span
                      className={`px-1 py-0.5 rounded font-semibold ${
                        page.pageNumber % 2 === 0
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {page.pageNumber % 2 === 0 ? 'Mặt Sau' : 'Mặt Trước'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
