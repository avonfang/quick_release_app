/**
 * Cloudflare Pages Function — 代理 /v1/* 到 DeepSeek API
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const apiKey = env.VITE_DEEPSEEK_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `https://api.deepseek.com${url.pathname}${url.search}`;
  const headers = new Headers(request.headers);
  headers.set('host', 'api.deepseek.com');
  headers.set('Authorization', `Bearer ${apiKey}`);

  const body = request.method === 'GET' ? undefined : request.body;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  return response;
}
