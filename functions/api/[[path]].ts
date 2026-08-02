/**
 * Cloudflare Pages Function — 代理 /api/* 到后端 VPS 服务器
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = `http://111.229.195.214:3001${url.pathname}${url.search}`;

  // 复制 headers，修正 Host 指向后端服务器
  const headers = new Headers(request.headers);
  headers.set('Host', '111.229.195.214:3001');
  // Cloudflare 会自动处理 Content-Length，不需要手动转发
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  });

  // 复制响应 headers（排除 hop-by-hop headers）
  const respHeaders = new Headers(response.headers);
  respHeaders.delete('cf-ray');
  respHeaders.delete('server');
  respHeaders.delete('alt-svc');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });

  return response;
}
