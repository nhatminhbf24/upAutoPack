# 🖨️ Dâu Dâu AutoPack Print - Công cụ Dàn Trang In Ảnh A4 Tự Động & Tối Ưu Bố Cục

Ứng dụng web hỗ trợ dàn trang in ảnh khổ A4 tự động thông minh, tối ưu diện tích giấy in, tùy biến kích thước hàng loạt, cân chỉnh màu sắc & làm nét ảnh, hỗ trợ in trực tiếp và xuất file PDF chuẩn in ấn 300 DPI.

---

## 🌟 Cấu trúc thư mục (Project Structure)

```text
autopack-print/
├── src/
│   ├── components/
│   │   ├── A4PreviewArea.tsx        # Vùng xem trước A4, thước đo mm, lưới căn lề, kéo chỉnh tâm ảnh
│   │   ├── ActivationModal.tsx      # Giao diện xác thực quyền truy cập
│   │   ├── BatchToolsSidebar.tsx    # Thao tác hàng loạt: Kích thước, Xoay 90°, Số lượng, Làm nét, Cân màu
│   │   ├── CropModal.tsx            # Hộp thoại cắt cúp, xoay, lật, bộ lọc màu & chỉnh sáng chi tiết
│   │   ├── CustomSizeModal.tsx      # Hộp thoại tạo & lưu kích thước in tùy chỉnh
│   │   ├── ImageListSidebar.tsx     # Danh sách ảnh đã tải lên, thay đổi số lượng, đánh giá độ nét
│   │   ├── RestoreSessionModal.tsx  # Khôi phục dự án sau khi tải lại trang
│   │   ├── SettingsSidebar.tsx      # Tùy chỉnh lề in, ghép khít (Nesting), nét đứt cắt, xuất PDF
│   │   └── Toast.tsx                # Thông báo tương tác người dùng
│   ├── workers/
│   │   ├── pixelWorker.ts           # Web Worker chạy nền xử lý làm nét & cân chỉnh màu
│   │   └── workerBridge.ts          # Cầu nối xử lý đa luồng
│   ├── utils/
│   │   ├── pdfExport.ts             # Xuất file PDF nhiều trang chuẩn in ấn (300 DPI)
│   │   ├── projectStorage.ts        # Lưu trữ dự án và tự động lưu phiên làm việc
│   │   ├── imageUtils.ts            # Xử lý kết xuất Canvas và tối ưu bộ nhớ
│   │   ├── imageEnhancer.ts         # Công cụ tăng cường độ nét ảnh
│   │   ├── imageAdjustmentEngine.ts # Bộ lọc màu và độ sáng
│   │   └── packing.ts               # Thuật toán sắp xếp ảnh tối ưu trang in
│   ├── types.ts                     # Định nghĩa kiểu dữ liệu TypeScript
│   ├── App.tsx                      # Component chính điều phối giao diện
│   ├── main.tsx                     # Điểm khởi chạy ứng dụng
│   └── index.css                    # Định dạng giao diện & quy chuẩn in ấn
├── .env.example                     # Mẫu biến môi trường
├── .gitignore                       # Danh sách tệp loại trừ Git
├── package.json                     # Quản lý gói phụ thuộc
├── vite.config.ts                   # Cấu hình Vite
└── README.md                        # Tài liệu hướng dẫn
```

---

## ✨ Các chức năng chính

### 1. 📥 Tải & Quản lý danh sách ảnh
- Hỗ trợ chọn file từ máy tính, kéo thả (Drag & Drop) hoặc dán trực tiếp từ Clipboard (`Ctrl + V`).
- Tự động đánh giá chất lượng in ấn theo độ phân giải (DPI).
- Tùy chỉnh số lượng bản in cho từng bức ảnh hoặc sắp xếp lại thứ tự nhanh chóng.

### 2. 📐 Kích thước & Hình dạng đa dạng
- **Kích thước chuẩn**: 5x7 cm, 6x8 cm, 6x9 cm, 9x12 cm, 10x15 cm (4R), 13x18 cm (5R), 15x21 cm (A5), photocard (5.4x8.6 cm), ảnh vuông (6x6 cm, 8x8 cm, 10x10 cm), ảnh thẻ (3x4 cm, 4x6 cm, passport 3.5x4.5 cm).
- **Hình dạng đặc biệt**: Chữ nhật, bo góc, hình tròn, hình trái tim.
- **Kích thước tùy chỉnh**: Tự do nhập kích thước theo đơn vị cm / mm và lưu lại mẫu kích thước cá nhân.

### 3. ⚡ Thao tác xử lý hàng loạt (Batch Tools)
- Đổi kích thước toàn bộ ảnh chỉ với 1 thao tác.
- Xoay 90° tất cả các bức ảnh.
- Đồng bộ số lượng bản in cho tất cả ảnh.
- Tự động cân bằng sáng và tăng độ sắc nét cho toàn bộ danh sách.

### 4. 🖼️ Vùng xem trước A4 & Trải nghiệm in ấn
- Bố cục thông minh tự động dàn trang tối ưu diện tích giấy.
- Thước đo milimet trực quan và lưới căn lề.
- Kéo chỉnh tâm ảnh trực tiếp trên trang xem trước.
- Tùy chỉnh lề giấy in (Margin) và khoảng cách giữa các ảnh (Gap).
- Tùy chọn hiển thị đường nét đứt cắt giấy (Cut lines).

### 5. 🎨 Bộ chỉnh sửa ảnh chi tiết
- Cắt cúp khung hình tự do hoặc cố định theo tỷ lệ in.
- Xoay, lật ảnh ngang/dọc và phóng to/thu nhỏ.
- Cân chỉnh nhiệt độ màu, độ sáng, tương phản, vùng sáng (Highlights) và vùng tối (Shadows).

### 6. 🖨️ In ấn & Xuất file chuẩn in ấn
- **In trực tiếp A4 (`Ctrl + P`)**: Căn chỉnh lề in chính xác theo tiêu chuẩn trình duyệt.
- **Xuất ảnh chất lượng cao**: Lưu từng trang A4 thành file ảnh PNG / JPEG độ phân giải cao 300 DPI.
- **Xuất file PDF nhiều trang**: Tạo tệp PDF chứa đầy đủ các trang in sẵn sàng cho máy in.

### 7. 💾 Lưu trữ & Phục hồi phiên làm việc
- Tự động lưu ngầm trạng thái làm việc để tránh mất dữ liệu.
- Cảnh báo trước khi rời trang nếu đang có dự án dở dang.
- Hỗ trợ lưu và mở lại tệp dự án định dạng `.daudau` mang theo khi cần.

### 8. 🔒 Xác thực quyền truy cập
- Giao diện khóa bảo vệ trang làm việc, hỗ trợ ghi nhớ trạng thái đăng nhập an toàn trên trình duyệt.

---

## ⌨️ Phím tắt tiện ích

| Phím tắt | Chức năng |
| :--- | :--- |
| `Ctrl + S` / `Cmd + S` | Lưu tệp dự án `.daudau` |
| `Ctrl + P` / `Cmd + P` | Mở hộp thoại in ấn tiêu chuẩn |
| `Ctrl + V` / `Cmd + V` | Dán ảnh từ Clipboard |
| `Ctrl + Z` / `Cmd + Z` | Hoàn tác thao tác (Undo) |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Làm lại thao tác (Redo) |
| `Kéo rê trên ảnh` | Di chuyển tâm ảnh |
| `Nhấp đúp vào ảnh` | Mở trình chỉnh sửa cắt cúp |

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Thư viện chính**: jsPDF, JSZip, lucide-react

---

## 🚀 Hướng dẫn cài đặt & Chạy cục bộ

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Chạy môi trường phát triển (Dev)
npm run dev

# 3. Đóng gói mã nguồn (Production Build)
npm run build
```

---

## 📄 Giấy phép (License)

Phát hành theo giấy phép **MIT License**.
