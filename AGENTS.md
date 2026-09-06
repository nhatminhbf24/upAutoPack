# AGENTS.md - Quy tắc & Hướng dẫn Dự án Dâu Dâu AutoPack Print

Tệp tin này ghi lại toàn bộ bối cảnh dự án, kiến trúc hệ thống, nguyên tắc phát triển và quy trình triển khai hosting Tenten được thống nhất cùng tác giả.

---

## 📌 1. Bối cảnh Dự án (Project Context)
- **Tên dự án:** Dâu Dâu AutoPack Print
- **Tên miền sản xuất:** `daudau.pro.vn` (Tenten Hosting)
- **Mục đích:** Ứng dụng web chuyên nghiệp phục vụ in ấn ảnh A4 tự động và bóc tách sticker PNG cho shop Dâu Dâu.
- **Tính năng cốt lõi:**
  1. **Dàn trang in A4 thông minh & Bố cục kép:** Sắp xếp ảnh tối ưu giấy in (Bin Packing Best-Fit) hoặc Kéo thả vị trí tự do (Freeform), thước đo milimet, kiểm tra DPI, chỉnh tâm trực tiếp, làm nét/cân sáng, xuất file PDF đa trang chuẩn in 300 DPI.
  2. **Căn gióng nam châm & In 2 mặt đối xứng:** Smart Snapping căn mép/tâm thông minh khi kéo thả, in 2 mặt đối xứng tự động lật ảnh qua trục dọc, viền xén tràn lề (Bleed) và dấu căn xén (Crop Marks).
  3. **Nhãn đơn hàng di động (Draggable Text Tag):** Nhãn tên khách, mã đơn và ngày giờ có thể kéo thả linh hoạt đến vùng trống trên trang in.
  4. **Tách nhãn dán PNG tự động (PNG Sheet Splitter):** Quét kênh Alpha độ trong suốt, tách rời từng sticker từ bảng sticker tổng hợp, cho phép kéo thả sang bàn in hoặc tải về file ZIP.
  5. **Lưu trữ & Lịch sử thao tác:** Ngăn xếp Undo / Redo đa bước (Ctrl+Z / Ctrl+Y), tự động lưu ngầm vào IndexedDB và xuất/nhập tệp dự án định dạng `.daudau`.

---

## 🔒 2. Nguyên tắc Kiến trúc & Bảo mật (BẮT BUỘC TUÂN THỦ)

1. **100% Client-Side Processing:**
   - Mọi xử lý hình ảnh (cắt cúp, xoay, cân màu, làm nét, tách sticker) chạy hoàn toàn trên RAM và Web Worker của máy khách.
   - Không tạo backend API nhận upload ảnh. Không lưu bất kỳ ảnh hay dữ liệu cá nhân nào lên hosting.
   - Không tích hợp database ngoài (như Firebase/MySQL) trừ khi được người dùng yêu cầu rõ ràng. Sử dụng IndexedDB và localStorage của trình duyệt.

2. **Server Node.js / Express tối giản:**
   - File khởi động: `server.js` (dùng ES Modules `"type": "module"`).
   - Port: Luôn dùng `const PORT = process.env.PORT || 3000;` để nhận port động từ hosting Tenten/cPanel.
   - Host: Luôn lắng nghe `0.0.0.0`.
   - Phục vụ tĩnh: Thư mục `dist/` và fallback SPA route `app.get('*') -> index.html`.

3. **Tính toán Tọa độ & Đơn vị In ấn (mm Coordinate Integrity):**
   - Đơn vị tiêu chuẩn trong toàn bộ logic in ấn là **milimet (mm)**.
   - Khổ A4 chuẩn: Dọc `210mm x 297mm`, Ngang `297mm x 210mm`.
   - Tọa độ hiển thị màn hình (px) được quy đổi đồng bộ từ mm thông qua tỷ lệ `scaleFactor` và `DPI (300 DPI: 1mm ≈ 11.811px)`.
   - Đảm bảo tính nhất quán tuyệt đối giữa: Vùng xem trước màn hình (Preview Canvas) = Bản in trình duyệt (`@media print`) = File PDF xuất ra (`jspdf`).

4. **Quản lý Ngăn xếp Hoàn tác (Undo/Redo History):**
   - Mọi thao tác thay đổi dữ liệu danh sách ảnh (thêm, xóa, nhân bản, xoay, đổi kích thước, di chuyển tọa độ freeform) bắt buộc phải cập nhật qua `useHistoryState` để người dùng luôn có thể ấn `Ctrl+Z` hoàn tác an toàn.

---

## 🚀 3. Cơ chế Triển khai Siêu Tốc trên Hosting Tenten (1-Click Deploy)

Hosting Tenten trang bị giao diện **"Triển khai nhanh" (Quick Deploy)**:
- Nguồn mã nguồn: **Git Repo**
- Đường dẫn Git: URL repository GitHub (ví dụ: `https://github.com/username/autopack-print.git`)
- Tên miền: `daudau.pro.vn`
- Phiên bản Node.js: **Node.js v24 (LTS)** (hoặc v20, v18)
- Nút bấm: **Triển khai dự án ngay**

### Đảm bảo tính tương thích 1-Click:
1. **Tự động Build khi Install (`postinstall`):**
   Trong `package.json` đã có script `"postinstall": "vite build"`. Khi Tenten clone repo và chạy `npm install`, mã nguồn sẽ tự động được biên dịch ra thư mục `dist/` ngay lập tức.
2. **Fallback tự Build trong `server.js`:**
   Nếu vì bất kỳ lý do gì thư mục `dist/` chưa có khi máy chủ khởi chạy, `server.js` tự động phát hiện và gọi `npm run build` ngầm qua `child_process.execSync`, đảm bảo website không bao giờ bị lỗi 404/500 hay thiếu file.
3. **Không cần thao tác SSH/Terminal:**
   Người dùng chỉ cần dán link Git trên giao diện web của Tenten và bấm nút, hệ thống sẽ tự động hoàn tất 100% từ cài đặt đến chạy web.

---

## 🛠️ 4. Quy ước Mã nguồn & Hiệu năng (Coding Conventions)
- **Framework:** React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Icons:** Sử dụng độc quyền thư viện `lucide-react`.
- **Hiệu ứng:** Sử dụng `motion` (từ `motion/react`).
- **Xuất file:** `jspdf` (in ấn A4 PDF 300 DPI), `jszip` (đóng gói sticker).
- **Đa luồng:** Xử lý pixel nặng qua `src/workers/pixelWorker.ts` và `workerBridge.ts`.
- **Hiệu năng kéo thả:** Các tính toán đường gióng nam châm (Smart Snapping) và định vị Freeform cần tính toán trực tiếp trên tọa độ toán học thuần túy, tránh re-render React không cần thiết để đạt độ mượt 60 FPS.
