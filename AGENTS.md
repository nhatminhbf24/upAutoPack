# AGENTS.md - Quy tắc & Hướng dẫn Dự án Dâu Dâu AutoPack Print

Tệp tin này ghi lại toàn bộ bối cảnh dự án, kiến trúc hệ thống, nguyên tắc phát triển và các quy tắc kỹ thuật bắt buộc dành cho AI agent khi làm việc với codebase này.

---

## 📌 1. Bối cảnh Dự án (Project Context)
- **Tên dự án:** Dâu Dâu AutoPack Print
- **Mục đích:** Ứng dụng web chuyên nghiệp phục vụ in ấn ảnh A4 tự động và bóc tách sticker PNG.
- **Tính năng cốt lõi:**
  1. **Dàn trang in A4 thông minh & Bố cục kép:** Sắp xếp ảnh tối ưu giấy in (Bin Packing Best-Fit) hoặc Kéo thả vị trí tự do (Freeform), thước đo milimet, kiểm tra DPI, chỉnh tâm trực tiếp, làm nét/cân sáng, xuất file PDF đa trang chuẩn in 300 DPI.
  2. **Căn gióng nam châm & In 2 mặt đối xứng:** Smart Snapping căn mép/tâm thông minh khi kéo thả, in 2 mặt đối xứng tự động lật ảnh qua trục dọc, viền xén tràn lề (Bleed) và dấu căn xén (Crop Marks).
  3. **Cột xem trước các trang in (Page Thumbnails Navigator):** Thanh thu nhỏ bố cục các trang A4 ngoài cùng bên phải, nhấp chuột để cuộn mượt (smooth scroll) đến trang bất kỳ, tự động đánh dấu trang đang active và hỗ trợ thu gọn/mở rộng linh hoạt.
  4. **Nhãn đơn hàng di động (Draggable Text Tag):** Nhãn tên khách, mã đơn và ngày giờ có thể kéo thả linh hoạt đến vùng trống trên trang in.
  5. **Tách nhãn dán PNG tự động (PNG Sheet Splitter):** Quét kênh Alpha độ trong suốt, tách rời từng sticker từ bảng sticker tổng hợp, cho phép kéo thả sang bàn in hoặc tải về file ZIP.
  6. **Lưu trữ & Lịch sử thao tác:** Ngăn xếp Undo / Redo đa bước (Ctrl+Z / Ctrl+Y), tự động lưu ngầm vào IndexedDB và xuất/nhập tệp dự án định dạng `.daudau`.

---

## 🔒 2. Nguyên tắc Kiến trúc & Bảo mật (BẮT BUỘC TUÂN THỦ)

1. **100% Client-Side Processing:**
   - Mọi xử lý hình ảnh (cắt cúp, xoay, cân màu, làm nét, tách sticker) chạy hoàn toàn trên RAM và Web Worker của máy khách.
   - Không tạo backend API nhận upload ảnh. Không lưu bất kỳ ảnh hay dữ liệu cá nhân nào lên hosting.
   - Không tích hợp database ngoài (như Firebase/MySQL) trừ khi được người dùng yêu cầu rõ ràng. Sử dụng IndexedDB và localStorage của trình duyệt.

2. **Server Node.js / Express tối giản:**
   - File khởi động: `server.js` (dùng ES Modules `"type": "module"`).
   - Port: Luôn dùng `const PORT = process.env.PORT || 3000;` để nhận port động từ môi trường hosting.
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

## 🚀 3. Quy tắc Triển khai (Deployment Rules)

Dự án sử dụng cơ chế **tự động build** để đảm bảo tương thích với mọi môi trường hosting Node.js:

1. **Tự động Build khi Install (`postinstall`):**
   - `package.json` có script `"postinstall": "vite build"`. Sau khi `npm install`, mã nguồn tự động được biên dịch ra thư mục `dist/`.

2. **Auto-Build Fallback trong `server.js`:**
   - Nếu thư mục `dist/` chưa tồn tại khi server khởi động, `server.js` tự động phát hiện và gọi `npm run build` ngầm qua `child_process.execSync` trước khi serve. Không được xóa hoặc thay đổi cơ chế này.

3. **Yêu cầu môi trường:**
   - Node.js v18 trở lên (khuyến nghị v20 LTS hoặc v24).
   - Server lắng nghe `0.0.0.0` và nhận port qua `process.env.PORT`.

---

## 🛠️ 4. Quy ước Mã nguồn & Hiệu năng (Coding Conventions)
- **Framework:** React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Icons:** Sử dụng độc quyền thư viện `lucide-react`.
- **Hiệu ứng:** Sử dụng `motion` (từ `motion/react`).
- **Xuất file:** `jspdf` (in ấn A4 PDF 300 DPI), `jszip` (đóng gói sticker).
- **Đa luồng:** Xử lý pixel nặng qua `src/workers/pixelWorker.ts` và `workerBridge.ts`.
- **Hiệu năng kéo thả:** Các tính toán đường gióng nam châm (Smart Snapping) và định vị Freeform cần tính toán trực tiếp trên tọa độ toán học thuần túy, tránh re-render React không cần thiết để đạt độ mượt 60 FPS.
