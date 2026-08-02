const express = require('express')
const https = require('https')

const router = express.Router()

// POST /api/chat — proxy to DeepSeek API (keeps API key server-side)
router.post('/chat', async (req, res) => {
  const { messages, temperature, max_tokens } = req.body
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'DeepSeek not configured on server' })
  }
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages required' })
  }

  const body = JSON.stringify({
    model: 'deepseek-v4-flash',
    messages,
    temperature: temperature ?? 0.7,
    max_tokens: max_tokens ?? 1024,
    stream: false,
  })

  const options = {
    hostname: 'api.deepseek.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(body),
    },
  }

  const proxyReq = https.request(options, (proxyRes) => {
    let data = ''
    proxyRes.on('data', (chunk) => { data += chunk })
    proxyRes.on('end', () => {
      try {
        res.status(proxyRes.statusCode).json(JSON.parse(data))
      } catch {
        res.status(502).json({ error: 'DeepSeek returned invalid response' })
      }
    })
  })

  proxyReq.on('error', (err) => {
    res.status(502).json({ error: err.message })
  })

  proxyReq.write(body)
  proxyReq.end()
})

module.exports = router
