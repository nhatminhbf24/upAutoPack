import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Phục vụ các tệp tĩnh từ thư mục build 'dist'
const distPath = path.join(__dirname, 'dist');

// Tự động biên dịch nếu chưa có thư mục dist/ (hỗ trợ triển khai 1-click không cần dòng lệnh)
if (!fs.existsSync(distPath)) {
  console.log('[AutoPack Print] Thư mục dist/ chưa tồn tại, đang tự động chạy build...');
  try {
    const { execSync } = await import('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('[AutoPack Print] Tự động build thành công!');
  } catch (err) {
    console.error('[AutoPack Print] Lỗi khi tự động build:', err);
  }
}

app.use(express.static(distPath));

// Hỗ trợ Single Page Application (SPA routing) - chuyển tiếp tất cả request về index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>AutoPack Print - Đang khởi động</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
          .card { background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); max-width: 480px; text-align: center; }
          h2 { margin-top: 0; color: #0284c7; }
          code { background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.9rem; color: #e11d48; }
          ol { text-align: left; margin: 1.5rem 0; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚡ AutoPack Print cần Build</h2>
          <p>Ứng dụng đã kết nối Node.js thành công nhưng chưa tìm thấy thư mục <code>dist/</code> đã biên dịch.</p>
          <ol>
            <li>Mở cPanel / SSH Terminal trong thư mục dự án.</li>
            <li>Chạy lệnh: <code>npm run build</code></li>
            <li>Tải lại trang web này.</li>
          </ol>
        </div>
      </body>
      </html>
    `);
  }
});

// Khởi chạy server lắng nghe trên host 0.0.0.0 và cổng động PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AutoPack Print] Server đang hoạt động tại cổng ${PORT} (host: 0.0.0.0)`);
});
