# server/ — Express API 后端

端口 3001，为小程序/H5 前端提供 AI 对话代理、语音识别、记录同步和认证服务。

## 入口

`server/index.js` — Express 应用，CORS + JSON body parser，挂载路由：

```
/api/auth/*     → server/routes/auth.js       # 登录/注册/验证
/api/records/*  → server/routes/records.js    # 卡片记录 CRUD + 同步
/api/chat       → server/routes/chat.js       # DeepSeek API 代理
/api/asr/*      → server/routes/asr.js        # 百度语音识别
/api/health     → { ok: true }                # 健康检查
```

## API 设计

### POST /api/chat
前端 AI 对话代理。请求体：
```json
{ "messages": [...], "temperature": 0.7, "max_tokens": 1024 }
```
转发到 `api.deepseek.com/v1/chat/completions`，模型 `deepseek-v4-flash`。
API key 通过环境变量 `DEEPSEEK_API_KEY` 配置，不暴露给客户端。

### POST /api/auth/login, /api/auth/register
JWT 认证，token 存储在客户端 `uni.getStorageSync('token')`。

### POST /api/records/sync, GET /api/records, DELETE /api/records/:id
卡片记录云端同步。前端本地优先存储，登录后异步上传。

### POST /api/asr
百度语音识别代理。

## 运行时

```bash
cd server && node index.js
# API server running at http://localhost:3001
```

依赖 `.env` 文件提供 `DEEPSEEK_API_KEY`、`BAIDU_ASR_*`、`JWT_SECRET` 等环境变量。

## 部署

生产环境部署在 VPS `111.229.195.214:3001`，通过 Cloudflare Pages Functions (`functions/`) 边缘代理，对外为 `sumeru.online/api/*`。
