const express = require('express')
const cors = require('cors')
const path = require('path')
const rateLimit = require('express-rate-limit')

// 加载 .env 文件
try { require('dotenv').config() } catch {}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ── Rate limiters ──

// chat: 30 次/分钟/IP，预防 DeepSeek 配额刷取
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求太频繁，请稍后再试' },
})

// asr: 10 次/分钟/IP
const asrLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '语音请求太频繁，请稍后再试' },
})

// Auth routes (has its own rate limiter in auth.js)
app.use('/api/auth', require('./routes/auth'))
// Records routes (sync to server)
app.use('/api/records', require('./routes/records'))
// Dialogue quota routes (server-side daily limit)
app.use('/api/dialogue', require('./routes/dialogue'))
// ASR routes (Baidu speech recognition) — with rate limit
app.use('/api', asrLimiter, require('./routes/asr'))
// Chat routes (proxy to DeepSeek) — with rate limit
app.use('/api', chatLimiter, require('./routes/chat'))

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
