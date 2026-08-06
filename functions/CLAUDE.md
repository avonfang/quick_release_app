# functions/ — Cloudflare Pages Functions

边缘代理层，将 Cloudflare Pages 的 `/api/*` 请求转发到后端 VPS 服务器。

## 文件

- `functions/api/[[path]].ts` — 捕获所有 `/api/*` 路径
- `functions/v1/[[path]].ts` — 捕获 `/v1/*` 路径

## 代理逻辑 (api/[[path]].ts)

1. 接收 Cloudflare Pages 边缘请求
2. 转发到 `http://111.229.195.214:3001` (VPS Express 后端)
3. 清理 hop-by-hop headers (cf-*, Server, Alt-Svc)
4. 返回响应给客户端

## 部署

```bash
npx wrangler pages deploy
# 或
node deploy-cf.js
```

域名: `sumeru.online`，通过 Cloudflare Pages 绑定。
