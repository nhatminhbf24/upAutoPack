export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ACTIVATION_CODE?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API bảo mật kiểm tra mã kích hoạt trực tiếp trên máy chủ Cloudflare
    if (url.pathname === '/api/verify-code') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      try {
        const body = (await request.json()) as { code?: string };
        const userCode = body.code?.trim() || '';
        // Lấy mã bí mật từ biến môi trường trên Cloudflare (mặc định 0798408406 nếu chưa đổi)
        const secretCode = (env.ACTIVATION_CODE || '0798408406').trim();

        if (userCode && userCode === secretCode) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({ success: false, message: 'Mã kích hoạt không chính xác' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch {
        return new Response(
          JSON.stringify({ success: false, message: 'Yêu cầu không hợp lệ' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Phục vụ toàn bộ giao diện tĩnh từ thư mục dist/
    return env.ASSETS.fetch(request);
  },
};
