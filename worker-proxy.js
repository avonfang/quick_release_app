/**
 * Cloudflare Worker — 统一 API 代理
 * 代理 /api/* -> VPS 后端
 * 代理 /v1/* -> DeepSeek
 *
 * 部署: node worker-deploy.js
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 后端 API 代理 -> VPS
    if (path.startsWith('/api/')) {
      const targetUrl = `http://111.229.195.214:3001${path}${url.search}`;
      const headers = new Headers(request.headers);
      headers.set('host', 'localhost:3001');

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method === 'GET' ? undefined : request.body,
      });
      return response;
    }

    // DeepSeek API 代理
    if (path.startsWith('/v1/')) {
      const apiKey = env.VITE_DEEPSEEK_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured' }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }

      const targetUrl = `https://api.deepseek.com${path}${url.search}`;
      const headers = new Headers(request.headers);
      headers.set('host', 'api.deepseek.com');
      headers.set('Authorization', `Bearer ${apiKey}`);

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method === 'GET' ? undefined : request.body,
      });
      return response;
    }

    return new Response('Not found', { status: 404 });
  },
};
