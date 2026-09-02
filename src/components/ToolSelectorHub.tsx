import React from 'react';
import {
  Scissors,
  LayoutGrid,
  Layers,
  ArrowRight,
  Sparkles,
  Download,
  FolderArchive,
  Printer,
  CheckCircle2,
  Image as ImageIcon,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ToolSelectorHubProps {
  onSelectTool: (tool: 'png-splitter' | 'a4-layout') => void;
  photoCount?: number;
}

export const ToolSelectorHub: React.FC<ToolSelectorHubProps> = ({
  onSelectTool,
  photoCount = 0,
}) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Header */}
      <header className="px-6 py-6 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center font-black shadow-lg shadow-pink-500/25 text-lg">
            🍓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">
                Dâu Dâu AutoPack Studio
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                PRO v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Hệ sinh thái xử lý & dàn trang in ảnh thông minh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4" />
          <span>Đã kích hoạt bản quyền vĩnh viễn</span>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full relative z-10 py-10">
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-bold mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Chọn công cụ làm việc của bạn</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Bạn muốn thực hiện tác vụ nào hôm nay?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Lựa chọn 1 trong 2 công cụ chuyên dụng bên dưới để bắt đầu quy trình làm việc tối ưu nhất.
          </p>
        </div>

        {/* 2 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
          {/* OPTION 1: PNG SHEET & STICKER SPLITTER */}
          <div
            id="card-select-png-splitter"
            onClick={() => onSelectTool('png-splitter')}
            className="group relative bg-slate-800/80 hover:bg-slate-800 border-2 border-slate-700 hover:border-blue-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 cursor-pointer"
          >
            <div className="space-y-5">
              {/* Badge & Icon */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Scissors className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Mới & Độc Lập
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-400 transition-colors">
                  1. Tách Sticker & Sheet PNG
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Đầu vào là 1 tấm ảnh chứa nhiều hình (xe cộ, đồ chơi, thú cưng, trái cây...) đã tách nền. Tự động nhận diện từng chi tiết và <strong>xuất ra từng file .PNG riêng biệt trong 1 thư mục ZIP</strong>.
                </p>
              </div>

              {/* Bullet Features */}
              <div className="space-y-2 pt-2 border-t border-slate-700/80">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Quét ma trận điểm ảnh Alpha chính xác 100%</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Xem khung quét nhận diện & Tải file ZIP trọn bộ</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Có thể tải lẻ từng ảnh hoặc nạp vào bàn in A4</span>
                </div>
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="pt-6">
              <div className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-blue-500 group-hover:to-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition">
                <span>Mở Công Cụ Tách Sticker PNG</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* OPTION 2: A4 AUTO PACK & PRINT */}
          <div
            id="card-select-a4-layout"
            onClick={() => onSelectTool('a4-layout')}
            className="group relative bg-slate-800/80 hover:bg-slate-800 border-2 border-slate-700 hover:border-pink-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-1 cursor-pointer"
          >
            <div className="space-y-5">
              {/* Badge & Icon */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform">
                  <Printer className="w-7 h-7" />
                </div>
                {photoCount > 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-pink-400" />
                    Có {photoCount} ảnh đang mở
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600">
                    Dàn Trang In Ấn
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-pink-400 transition-colors">
                  2. Dàn Trang In Ảnh A4 Tự Động
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Công cụ dàn trang in ấn chuyên nghiệp. Tự động xếp ảnh tối ưu diện tích giấy A4, cắt khung Polaroid, thẻ bài, tròn, trái tim và xuất ảnh / PDF siêu nét 300 DPI.
                </p>
              </div>

              {/* Bullet Features */}
              <div className="space-y-2 pt-2 border-t border-slate-700/80">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Thuật toán đóng gói ảnh A4 tối ưu diện tích giấy</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Cắt góc, đường cắt, chỉnh màu & độ sáng chuyên sâu</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Xuất file PDF & Ảnh in độ phân giải cao 300 DPI</span>
                </div>
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="pt-6">
              <div className="w-full py-3.5 px-4 bg-gradient-to-r from-pink-600 to-rose-600 group-hover:from-pink-500 group-hover:to-rose-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-600/30 transition">
                <span>Vào Bàn Dàn Trang In A4</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 text-center text-xs text-slate-500 relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>Dâu Dâu AutoPack Print © 2025 - Giải Pháp Dàn Trang & Xử Lý Ảnh Chuyên Nghiệp</div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Hỗ trợ định dạng: PNG, JPG, WEBP, ZIP</span>
          <span>•</span>
          <span>Bảo mật 100% cục bộ</span>
        </div>
      </footer>
    </div>
  );
};
