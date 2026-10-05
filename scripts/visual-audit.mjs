import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const resultsDir = path.join(rootDir, 'audit-results');
const screenshotsDir = path.join(resultsDir, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper: check if server is already running
function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Helper: wait for server to start
async function ensureServerRunning() {
  const isRunning = await checkServerRunning();
  if (isRunning) {
    console.log('[Audit] Server is already running on port 3000.');
    return null;
  }

  console.log('[Audit] Starting local Express production server...');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: rootDir,
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => console.log(`[Server] ${d.toString().trim()}`));
  serverProcess.stderr.on('data', (d) => console.error(`[Server Error] ${d.toString().trim()}`));

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await checkServerRunning()) {
      console.log('[Audit] Server started successfully!');
      return serverProcess;
    }
  }
  throw new Error('Server failed to start within 15 seconds.');
}

async function runAudit() {
  let serverProcess = null;
  let browser = null;

  const auditLog = {
    timestamp: new Date().toISOString(),
    browser: 'Google Chrome (Real binary simulation)',
    consoleErrors: [],
    consoleWarnings: [],
    overflowIssues: [],
    printVerification: {},
    screenshots: [],
  };

  try {
    serverProcess = await ensureServerRunning();

    console.log('[Audit] Launching Google Chrome via Playwright...');
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1.0,
    });

    const page = await context.newPage();

    // Listen to console errors and warnings
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        auditLog.consoleErrors.push(text);
        console.error(`[Browser Error] ${text}`);
      } else if (type === 'warning') {
        auditLog.consoleWarnings.push(text);
      }
    });

    page.on('pageerror', (err) => {
      auditLog.consoleErrors.push(err.message);
      console.error(`[Page Uncaught Error] ${err.message}`);
    });

    // Helper: take full-page screenshot
    async function takeScreenshot(fileName, description) {
      const filePath = path.join(screenshotsDir, fileName);
      await page.screenshot({ path: filePath, fullPage: true });
      auditLog.screenshots.push({ fileName, description, filePath });
      console.log(`[Captured] ${fileName} - ${description}`);
    }

    // =========================================================================
    // SCENARIO 1: ACTIVATION MODAL & HUB
    // =========================================================================
    console.log('\n--- SCENARIO 1: Activation Modal & Hub ---');
    // Clear localStorage to test fresh activation
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#activation-modal-backdrop', { timeout: 10000 });

    await takeScreenshot('01_activation_modal.png', 'Màn hình Modal Kích hoạt (Chưa mở khóa)');

    // Test entering wrong code
    await page.fill('#input-activation-code', '1234567890');
    await page.click('#btn-submit-activation');
    await page.waitForTimeout(500);
    await takeScreenshot('02_activation_error.png', 'Thông báo lỗi khi nhập sai mã kích hoạt');

    // Test entering correct code
    await page.fill('#input-activation-code', '0798408406');
    await page.click('#btn-submit-activation');
    await page.waitForSelector('#card-select-a4-layout', { timeout: 8000 });

    await takeScreenshot('03_tool_selector_hub.png', 'Màn hình Hub Lựa chọn Công cụ sau khi mở khóa');

    // =========================================================================
    // SCENARIO 2: A4 STUDIO CORE WORKSPACE
    // =========================================================================
    console.log('\n--- SCENARIO 2: A4 Layout Studio Workspace ---');
    await page.click('#card-select-a4-layout');
    await page.waitForSelector('#app-root', { timeout: 8000 });
    await page.waitForTimeout(600);

    // Load sample photos
    const sampleBtn = page.locator('#btn-load-sample');
    if (await sampleBtn.isVisible()) {
      await sampleBtn.click();
      console.log('[Audit] Clicked #btn-load-sample. Waiting for photo generation...');
      await page.waitForTimeout(2500); // Wait for sample images to process
    }

    await takeScreenshot('04_a4_studio_initial.png', 'Bàn làm việc Dàn trang A4 sau khi nạp ảnh mẫu');

    // Turn on Ruler and Grid
    const rulerBtn = page.getByTitle('Bật/tắt thước đo milimet (mm)');
    const gridBtn = page.getByTitle('Bật/tắt lưới căn lề mm');
    if (await rulerBtn.isVisible()) await rulerBtn.click();
    if (await gridBtn.isVisible()) await gridBtn.click();
    await page.waitForTimeout(400);

    await takeScreenshot('05_a4_studio_ruler_grid.png', 'Bàn in A4 hiển thị Thước đo milimet và Lưới căn lề');

    // Test collapsing sidebars
    const collapseLeftBtn = page.getByTitle('Thu gọn danh sách ảnh').or(page.locator('button:has-text("Thu gọn")')).first();
    if (await collapseLeftBtn.isVisible()) {
      await collapseLeftBtn.click();
      await page.waitForTimeout(400);
    }
    await takeScreenshot('06_a4_studio_sidebars_collapsed.png', 'Bố cục mở rộng vùng xem trước khi thu gọn Sidebar');

    // Expand sidebar back
    const expandLeftBtn = page.getByTitle('Mở rộng danh sách ảnh').or(page.locator('button:has-text("Mở rộng")')).first();
    if (await expandLeftBtn.isVisible()) {
      await expandLeftBtn.click();
      await page.waitForTimeout(400);
    }

    // Switch to Freeform Mode
    const freeformBtn = page.locator('#btn-mode-freeform');
    if (await freeformBtn.isVisible()) {
      await freeformBtn.click();
      await page.waitForTimeout(400);
      console.log('[Audit] Activated Freeform layout mode.');
    }

    // Simulate drag interaction to test magnetic snap overlay
    const firstPhotoBox = page.locator('.a4-page-sheet div[style*="cursor: grab"]').first();
    if (await firstPhotoBox.isVisible()) {
      const box = await firstPhotoBox.boundingBox();
      if (box) {
        // Move mouse over item and drag slightly towards left margin
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x - 20, box.y + box.height / 2, { steps: 5 });
        await page.waitForTimeout(300);
        await takeScreenshot('07_a4_studio_magnetic_snap.png', 'Vạch gióng nam châm (Smart Snapping) khi kéo thả tự do');
        await page.mouse.up();
      }
    }

    // Enable Text Tag (Nhãn đơn hàng)
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const tagCheckbox = inputs.find((i) => i.parentElement?.textContent?.includes('In mã đơn') || i.parentElement?.textContent?.includes('Nhãn đơn'));
      if (tagCheckbox && !tagCheckbox.checked) {
        tagCheckbox.click();
      }
    });
    await page.waitForTimeout(400);
    await takeScreenshot('08_a4_text_tag.png', 'Nhãn đơn hàng và ngày giờ trên trang in A4');

    // =========================================================================
    // SCENARIO 3: CROP MODAL VISUAL AUDIT
    // =========================================================================
    console.log('\n--- SCENARIO 3: Crop Modal Visual Audit ---');
    const firstCropBtn = page.locator('button:has-text("Chỉnh sửa"), button:has-text("Cắt ảnh")').first();
    if (await firstCropBtn.isVisible()) {
      await firstCropBtn.click();
      await page.waitForTimeout(1000); // Wait for lazy load of CropModal

      await takeScreenshot('09_crop_modal_size.png', 'Hộp thoại CropModal - Tab Khổ in & Cắt cúp');

      // Check Tab 2: Làm nét & AI
      const enhanceTab = page.locator('button:has-text("Làm nét & AI")');
      if (await enhanceTab.isVisible()) {
        await enhanceTab.click();
        await page.waitForTimeout(400);
        await takeScreenshot('11_crop_modal_enhance.png', 'Hộp thoại CropModal - Tab Làm nét & Tăng DPI AI');
      }

      // Check Tab 3: Màu & Ánh sáng
      const adjustTab = page.locator('button:has-text("Màu & Ánh sáng")');
      if (await adjustTab.isVisible()) {
        await adjustTab.click();
        await page.waitForTimeout(400);
        await takeScreenshot('12_crop_modal_adjust.png', 'Hộp thoại CropModal - Tab Cân chỉnh Màu sắc & Ánh sáng');
      }

      // Test Dark theme canvas toggle in modal
      const themeToggleBtn = page.getByTitle('Đổi nền Dark').or(page.locator('button:has([class*="lucide-moon"]), button:has([class*="lucide-sun"])')).first();
      if (await themeToggleBtn.isVisible()) {
        await themeToggleBtn.click();
        await page.waitForTimeout(300);
        await takeScreenshot('14_crop_modal_dark_theme.png', 'Hộp thoại CropModal - Chế độ nền Canvas Tối (Dark)');
      }

      // Close modal
      const closeBtn = page.locator('button:has-text("Hủy bỏ")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(600);
    }

    // =========================================================================
    // SCENARIO 4: PNG SPLITTER WORKSPACE
    // =========================================================================
    console.log('\n--- SCENARIO 4: PNG Sticker Splitter Workspace ---');
    // Navigate to PNG splitter via ToolKit button
    const toolkitBtn = page.locator('button:has-text("ToolKit")').first();
    if (await toolkitBtn.isVisible()) {
      await toolkitBtn.click();
      await page.waitForSelector('#card-select-png-splitter', { timeout: 5000 });
      await page.click('#card-select-png-splitter');
      await page.waitForTimeout(1200); // Wait for lazy load
    }

    await takeScreenshot('15_png_splitter_workspace.png', 'Không gian làm việc Bóc tách Nhãn dán Sticker PNG');

    // Create a programmatic transparent sticker sheet PNG
    const stickerDataUrl = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 600;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 600, 600); // Transparent background

      // Sticker 1: Red Heart (top-left)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(150, 150, 60, 0, Math.PI * 2);
      ctx.fill();

      // Sticker 2: Blue Star/Circle (top-right)
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(450, 150, 70, 0, Math.PI * 2);
      ctx.fill();

      // Sticker 3: Emerald Rounded Rect (bottom-left)
      ctx.fillStyle = '#10b981';
      ctx.roundRect(90, 380, 140, 120, 20);
      ctx.fill();

      // Sticker 4: Purple Circle Badge (bottom-right)
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(450, 440, 65, 0, Math.PI * 2);
      ctx.fill();

      return c.toDataURL('image/png');
    });

    const stickerBuffer = Buffer.from(stickerDataUrl.split(',')[1], 'base64');
    const sampleStickerPath = path.join(resultsDir, 'test_stickers.png');
    fs.writeFileSync(sampleStickerPath, stickerBuffer);

    // Upload sticker sheet to splitter (target image file input specifically)
    const splitterFileInput = page.locator('input[type="file"][accept*="png"], input[type="file"][accept*="image"]').first();
    if (await splitterFileInput.count() > 0) {
      await splitterFileInput.setInputFiles(sampleStickerPath);
      console.log('[Audit] Uploaded test sticker sheet. Waiting for BFS detection...');
      await page.waitForTimeout(3000); // Wait for scanning and extraction
      await takeScreenshot('16_png_splitter_detected.png', 'Kết quả Quét Alpha và Nhận diện Bounding Box từng Sticker');

      // Open settings panel if closed
      const toggleSettings = page.locator('button:has-text("Cài đặt")').first();
      if (await toggleSettings.isVisible()) {
        await toggleSettings.click();
        await page.waitForTimeout(400);
      }

      // Click 4px white contour button
      const borderBtn = page.locator('button:has-text("4px")').first();
      if (await borderBtn.isVisible()) {
        await borderBtn.click();
        await page.waitForTimeout(600);
        await takeScreenshot('17_png_splitter_white_border.png', 'Tự động tạo viền trắng bế cắt (White Contour Dilation)');
      }
    }

    // =========================================================================
    // SCENARIO 5: CHROME PRINT EMULATION (@media print)
    // =========================================================================
    console.log('\n--- SCENARIO 5: Chrome Physical Print Emulation ---');
    // Navigate back to A4 Studio
    const navA4Btn = page.locator('button:has-text("Sang Dàn Trang In A4")').first();
    if (await navA4Btn.isVisible()) {
      await navA4Btn.click();
      await page.waitForSelector('#app-root', { timeout: 6000 });
      await page.waitForTimeout(600);
    }

    // Switch to Print Media
    console.log('[Audit] Emulating media: "print"...');
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(600);

    // Verify print styling
    const printChecks = await page.evaluate(() => {
      const sidebars = document.querySelectorAll('#sidebar, #list-sidebar, #preview-topbar, .no-print');
      const hiddenProperly = Array.from(sidebars).every((el) => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden';
      });

      const a4Sheet = document.querySelector('.a4-page-sheet');
      const sheetStyle = a4Sheet ? window.getComputedStyle(a4Sheet) : null;

      return {
        sidebarsHidden: hiddenProperly,
        a4SheetPresent: Boolean(a4Sheet),
        pageBreakInside: sheetStyle?.pageBreakInside,
        pageBreakAfter: sheetStyle?.pageBreakAfter,
        computedWidthMm: a4Sheet ? a4Sheet.getBoundingClientRect().width : 0,
      };
    });

    auditLog.printVerification = printChecks;
    console.log('[Audit] Print Verification Metrics:', printChecks);

    await takeScreenshot('18_chrome_print_page1.png', 'Bản in A4 mô phỏng trong Google Chrome (@media print)');

    // Export simulated PDF
    const pdfPath = path.join(resultsDir, 'chrome_print_output.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    console.log(`[Audit] Generated high-fidelity PDF: ${pdfPath}`);

    // Switch back to screen
    await page.emulateMedia({ media: 'screen' });

    // =========================================================================
    // SCENARIO 6: HIGH-DPI SCALING (1.25x Windows DPI)
    // =========================================================================
    console.log('\n--- SCENARIO 6: High-DPI Windows Scaling (125% DPI) ---');
    const highDpiContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1.25,
    });
    const highDpiPage = await highDpiContext.newPage();
    // Use stored unlocked session
    await highDpiPage.goto(BASE_URL);
    await highDpiPage.evaluate(() => localStorage.setItem('daudau_unlocked', 'true'));
    await highDpiPage.reload();
    await highDpiPage.waitForSelector('#card-select-a4-layout', { timeout: 8000 });
    await highDpiPage.click('#card-select-a4-layout');
    await highDpiPage.waitForSelector('#app-root', { timeout: 8000 });
    await highDpiPage.waitForTimeout(600);

    const highDpiShotPath = path.join(screenshotsDir, '20_high_dpi_125_scaling.png');
    await highDpiPage.screenshot({ path: highDpiShotPath, fullPage: true });
    auditLog.screenshots.push({
      fileName: '20_high_dpi_125_scaling.png',
      description: 'Giao diện hiển thị ở mức phóng to màn hình Windows 125% DPI',
      filePath: highDpiShotPath,
    });

    await highDpiContext.close();

    console.log('\n[Audit] Visual Audit completed successfully!');
    fs.writeFileSync(path.join(resultsDir, 'audit_report.json'), JSON.stringify(auditLog, null, 2));

    return auditLog;
  } catch (err) {
    console.error('[Audit Fatal Error]', err);
    throw err;
  } finally {
    if (browser) await browser.close();
    if (serverProcess) {
      console.log('[Audit] Shutting down spawned test server...');
      serverProcess.kill();
    }
  }
}

runAudit();
