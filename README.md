# 🖨️ Dâu Dâu AutoPack Print - Công cụ Dàn Trang In Ảnh A4 & Tách Sticker PNG Tự Động

Ứng dụng web chuyên nghiệp hỗ trợ dàn trang in ảnh khổ A4 tự động thông minh, tối ưu diện tích giấy in, tùy biến kích thước hàng loạt, cân chỉnh màu sắc & làm nét ảnh, bóc tách nhãn dán sticker PNG trong suốt tự động, hỗ trợ in trực tiếp và xuất file PDF chuẩn in ấn 300 DPI.

> 🔒 **Quyền riêng tư & Bảo mật dữ liệu (100% Client-Side):**
> Ứng dụng xử lý đồ họa, tính toán bố cục, lưu trữ phiên làm việc và xuất file hoàn toàn trên trình duyệt (RAM, Canvas, IndexedDB) của khách hàng. **Hosting không lưu trữ bất kỳ hình ảnh hay dữ liệu cá nhân nào của người dùng.**

---

## 🌟 Cấu trúc thư mục (Project Structure)

```text
autopack-print/
├── server.js                        # File khởi động máy chủ Node.js (cPanel / Tenten Hosting)
├── package.json                     # Quản lý gói phụ thuộc & scripts start/build
├── vite.config.ts                   # Cấu hình Vite & Tailwind CSS
├── tsconfig.json                    # Cấu hình TypeScript
├── index.html                       # HTML Entrypoint của ứng dụng
├── metadata.json                    # Cấu hình định danh & quyền ứng dụng
├── .env.example                     # Mẫu biến môi trường
├── .gitignore                       # Danh sách loại trừ Git
├── src/
│   ├── components/
│   │   ├── ToolSelectorHub.tsx      # Hub trung tâm lựa chọn không gian làm việc
│   │   ├── A4PreviewArea.tsx        # Vùng xem trước A4, thước đo mm, lưới, kéo thả tự do, chỉnh tâm
│   │   ├── DraggableTextTag.tsx     # Nhãn mã đơn hàng & ngày giờ kéo thả trực tiếp trên trang in
│   │   ├── PngSplitterWorkspace.tsx # Bàn làm việc tách nhãn dán PNG tự động từ bảng sticker
│   │   ├── PngSplitterModal.tsx     # Hộp thoại mở nhanh công cụ tách PNG từ thanh công cụ
│   │   ├── BatchToolsSidebar.tsx    # Thao tác hàng loạt: Kích thước, Xoay 90°, Làm nét, Cân màu
│   │   ├── SettingsSidebar.tsx      # Lề in, khoảng cách, in 2 mặt đối xứng, bleed, nhãn in, xuất file
│   │   ├── ImageListSidebar.tsx     # Quản lý danh sách ảnh, số lượng in, kiểm tra DPI
│   │   ├── CropModal.tsx            # Cắt cúp, xoay, lật, lọc màu, chỉnh sáng chi tiết
│   │   ├── PhotoAdjustmentsPanel.tsx# Bảng thanh trượt nhiệt độ màu, độ sáng, tương phản, highlight
│   │   ├── CustomSizeModal.tsx      # Tạo và lưu kích thước in tùy chỉnh theo cm / mm
│   │   ├── RestoreSessionModal.tsx  # Khôi phục dự án tự động lưu sau khi tải lại trang
│   │   ├── SaveProjectModal.tsx     # Quản lý lưu và tải tệp dự án định dạng .daudau
│   │   ├── ClearConfirmModal.tsx    # Hộp thoại xác nhận làm mới không gian làm việc
│   │   ├── ActivationModal.tsx      # Giao diện xác thực quyền truy cập
│   │   ├── Uploader.tsx             # Vùng tải lên ảnh hỗ trợ kéo thả và clipboard
│   │   └── Toast.tsx                # Hệ thống thông báo trạng thái
│   ├── hooks/
│   │   └── useHistoryState.ts       # Quản lý ngăn xếp lịch sử Undo / Redo đa bước (phím tắt Ctrl+Z/Y)
│   ├── workers/
│   │   ├── pixelWorker.ts           # Web Worker chạy nền xử lý đa luồng làm nét & cân màu
│   │   └── workerBridge.ts          # Cầu nối điều phối tác vụ Worker không chặn giao diện
│   ├── utils/
│   │   ├── pngSheetSplitter.ts      # Thuật toán quét kênh Alpha tách rời từng sticker trong suốt
│   │   ├── packing.ts               # Thuật toán sắp xếp ảnh tối ưu trang in (Bin Packing)
│   │   ├── alignmentGuides.ts       # Tính toán đường căn gióng nam châm thông minh khi kéo thả
│   │   ├── textTagUtils.ts          # Tiện ích định dạng và tính toán vị trí nhãn in đơn hàng
│   │   ├── pdfExport.ts             # Xuất file PDF nhiều trang độ nét cao chuẩn in ấn (300 DPI)
│   │   ├── projectStorage.ts        # Lưu trữ dự án và tự động lưu phiên làm việc (IndexedDB)
│   │   ├── imageUtils.ts            # Xử lý kết xuất Canvas và tối ưu bộ nhớ
│   │   ├── imageEnhancer.ts         # Công cụ tăng cường độ nét ảnh (Unsharp Masking)
│   │   ├── imageAdjustmentEngine.ts # Bộ xử lý màu sắc, cân bằng trắng và độ sáng
│   │   └── presetMatcher.ts         # Nhận diện tự động kích thước phù hợp nhất
│   ├── types.ts                     # Định nghĩa kiểu dữ liệu TypeScript toàn cục
│   ├── App.tsx                      # Điều phối không gian làm việc và trạng thái ứng dụng
│   ├── main.tsx                     # Điểm khởi chạy React
│   └── index.css                    # Định dạng giao diện & quy chuẩn in ấn
├── AGENTS.md                        # Quy tắc hệ thống và hướng dẫn phát triển
└── README.md                        # Tài liệu hướng dẫn sử dụng & triển khai
```

---

## ✨ Các chức năng chính

### 1. 🖨️ Dàn trang in ảnh A4 thông minh & Bố cục kép
- **Thuật toán sắp xếp tối ưu (Smart Bin-Packing):** Tự động đóng gói và sắp xếp hàng chục bức ảnh trên trang A4 theo thuật toán Best-Fit, giảm thiểu lãng phí giấy in tối đa.
- **Chế độ Kéo thả tự do (Freeform Placement):** Cho phép tắt tự động sắp xếp để tự do di chuyển từng bức ảnh đến vị trí mong muốn trên trang in.
- **Căn gióng nam châm thông minh (Smart Snapping & Alignment Guides):** Khi kéo ảnh ở chế độ tự do, hệ thống tự động hiển thị đường gióng tâm, mép và hút dính vào các ảnh lân cận hoặc mép giấy in.
- **Xem trước chuẩn xác theo milimet:** Thước đo milimet trực quan theo trục X/Y, lưới căn lề (Grid), và vạch nét đứt định vị đường cắt (Cut lines).
- **Chỉnh tâm ảnh trực tiếp:** Kéo rê chuột ngay trên ảnh xem trước để dịch chuyển vùng hiển thị mà không cần mở lại hộp thoại cắt ảnh.
- **In 2 mặt đối xứng (Duplex Print & Mirroring):** Tự động nhân bản trang làm mặt sau, đối xứng vị trí ảnh qua trục dọc giúp khi in 2 mặt giấy, các bức ảnh trùng khít nhau hoàn toàn.
- **Dấu căn mép xén (Bleed & Crop Marks):** Bật viền tràn lề và dấu chữ thập căn mép cắt hỗ trợ các xưởng in gia công cắt xén chính xác.
- **Nhãn đơn hàng di động (Draggable Text Tag):** Tự do gắn tên khách hàng, mã đơn hàng, ngày giờ in lên trang giấy và kéo thả đến vị trí trống tùy ý.

### 2. ✂️ Bộ công cụ tách nhãn dán PNG tự động (PNG Sticker Sheet Splitter)
- Tự động phân tích kênh Alpha (độ trong suốt) của bảng sticker PNG lớn.
- Thuật toán kết nối điểm ảnh (Connected Component Labeling) nhận diện từng sticker riêng biệt với độ chính xác cao.
- Tùy chỉnh linh hoạt ngưỡng trong suốt (Alpha Threshold), kích thước tối thiểu và phần đệm lề (Padding).
- Xem trước khung viền từng sticker và đưa trực tiếp vào bàn in A4 hoặc xuất file zip từng sticker riêng lẻ.

### 3. ⚡ Xử lý hàng loạt (Batch Tools) & Lịch sử thao tác
- **Hoàn tác / Làm lại (Undo/Redo):** Ngăn xếp lưu lịch sử 13 bước, hỗ trợ phím tắt `Ctrl+Z` / `Ctrl+Y` hoặc nút bấm trên thanh công cụ.
- Đổi kích thước toàn bộ ảnh chỉ với 1 cú nhấp chuột.
- Xoay đồng loạt 90° cho toàn bộ danh sách hoặc tự động xoay ngang/dọc theo hướng ảnh.
- Đồng bộ số lượng bản in cho tất cả ảnh.
- Tự động làm nét hàng loạt (Auto Sharpen) và cân bằng sáng đa luồng qua Web Worker không làm đơ giao diện.

### 4. 🎨 Bộ chỉnh sửa ảnh chuyên sâu (Crop & Color Engine)
- Cắt cúp khung hình tự do hoặc cố định theo các tỷ lệ in chuẩn (Polaroid, 6x9, 9x12, 10x15, A4, v.v.).
- Đầy đủ thao tác: Xoay 90°, lật ngang, lật dọc, phóng to/thu nhỏ.
- Thanh trượt chi tiết: Nhiệt độ màu, Độ sáng, Độ tương phản, Vùng sáng (Highlights), Vùng tối (Shadows).

### 5. 📄 Xuất file & In ấn chuẩn in 300 DPI
- **In trực tiếp A4 (`Ctrl + P`):** Tối ưu stylesheet cho máy in văn phòng và máy in ảnh chuyên dụng.
- **Xuất PDF đa trang chất lượng cao:** File PDF đạt chuẩn 300 DPI sắc nét theo đúng bố cục đã dàn.
- **Xuất ảnh định dạng PNG/JPEG:** Lưu trữ các trang in A4 thành ảnh độ nét cao.

### 6. 💾 Tự động lưu & Khôi phục phiên làm việc
- Tự động lưu ngầm toàn bộ trạng thái vào **IndexedDB** của trình duyệt.
- Hỗ trợ xuất và mở lại tệp dự án định dạng `.daudau` mang sang máy tính khác dễ dàng.

---

## 🌐 HƯỚNG DẪN TRIỂN KHAI 1-CLICK TRÊN TENTEN HOSTING (TRIỂN KHAI NHANH)

Dự án đã được cấu hình tối ưu 100% cho tính năng **"Triển khai nhanh"** của Hosting Tenten. Hệ thống Tenten sẽ tự động hóa toàn bộ quá trình: kéo code, cài đặt thư viện, tự động build và kích hoạt máy chủ mà **không cần bạn phải gõ bất kỳ câu lệnh nào**.

### Các bước thực hiện:

1. **Bước 1: Đẩy mã nguồn lên GitHub**
   - Đẩy toàn bộ mã nguồn dự án lên một kho lưu trữ GitHub của bạn.

2. **Bước 2: Mở bảng "Triển khai nhanh" trên Tenten**
   - Đăng nhập vào trang quản trị Hosting Tenten.
   - Chọn mục **Triển khai nhanh** (Quick Deploy):
     - **Nguồn mã nguồn:** Chọn **Git Repo**.
     - **Đường dẫn Git:** Dán đường dẫn repository của bạn (ví dụ: `https://github.com/username/autopack-print.git`).
     - **Tên miền (Domain):** Chọn tên miền của bạn (ví dụ: `daudau.pro.vn`).
     - **Phiên bản Node.js:** Chọn **Node.js v24 (LTS)** (hoặc v20, v18).
     - Nhấn nút: **Triển khai dự án ngay**.

3. **Bước 3: Hoàn tất!**
   - Hosting Tenten sẽ tự động clone mã nguồn từ GitHub.
   - Quá trình `npm install` sẽ tự động kích hoạt lệnh build (`postinstall: "vite build"`).
   - Tệp `server.js` tích hợp sẵn cơ chế **Auto-Build Fallback** — nếu chưa có thư mục `dist/`, server sẽ tự động chạy build ngầm ngay khi khởi động.
   - Cổng mạng `PORT` tự động nhận diện theo môi trường động của Tenten (`process.env.PORT || 3000`).
   - Bạn chỉ cần chờ vài chục giây và truy cập thẳng tên miền `daudau.pro.vn` để sử dụng!

---

### 🔄 Cập nhật dự án khi có thay đổi (Auto Update)
Mỗi khi bạn cập nhật code và đẩy lên GitHub:
- Trên bảng quản trị Tenten, bạn chỉ cần nhấn **Cập nhật / Pull & Deploy**.
- Hệ thống Tenten sẽ tự động kéo bản mới nhất, tự động biên dịch lại và khởi động lại web tức thì.

---

## 💻 Chạy thử nghiệm trên máy tính cá nhân (Local Development)

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Chạy môi trường phát triển (Dev)
npm run dev

# 3. Đóng gói mã nguồn (Production Build)
npm run build

# 4. Chạy thử máy chủ sản xuất (Production Test)
npm start
```

---

## 📄 Giấy phép (License)

Dự án được phát hành theo giấy phép **MIT License**.
