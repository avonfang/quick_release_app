const express = require('express')
const cors = require('cors')
const path = require('path')

// 加载 .env 文件
try { require('dotenv').config() } catch {}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Auth routes
app.use('/api/auth', require('./routes/auth'))
// Records routes (sync to server)
app.use('/api/records', require('./routes/records'))
// ASR routes (Baidu speech recognition)
app.use('/api', require('./routes/asr'))
// Chat routes (proxy to DeepSeek)
app.use('/api', require('./routes/chat'))

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
