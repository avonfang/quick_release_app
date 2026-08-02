const express = require('express')
const https = require('https')
const router = express.Router()

// ─── Baidu access_token cache ──────────────────────────────────────────────
let _cachedToken = null
let _tokenExpire = 0

function fetchToken() {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BAIDU_ASR_API_KEY
    const secretKey = process.env.BAIDU_ASR_SECRET_KEY
    if (!apiKey || !secretKey) {
      return reject(new Error('BAIDU_ASR_API_KEY or BAIDU_ASR_SECRET_KEY not set'))
    }

    const url =
      `https://aip.baidubce.com/oauth/2.0/token` +
      `?grant_type=client_credentials` +
      `&client_id=${apiKey}` +
      `&client_secret=${secretKey}`

    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.access_token) {
            _cachedToken = json.access_token
            _tokenExpire = Date.now() + (json.expires_in - 60) * 1000
            resolve(_cachedToken)
          } else {
            reject(new Error(json.error_description || 'Failed to get Baidu token'))
          }
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function getToken() {
  if (_cachedToken && Date.now() < _tokenExpire) return _cachedToken
  return fetchToken()
}

// ─── ASR handler ───────────────────────────────────────────────────────────
router.post('/asr', async (req, res) => {
  try {
    const { audio } = req.body // base64 PCM
    if (!audio) return res.status(400).json({ error: 'Missing audio field' })

    const token = await getToken()
    const audioBuffer = Buffer.from(audio, 'base64')

    const body = JSON.stringify({
      format: 'pcm',
      rate: 16000,
      channel: 1,
      cuid: 'miniapp',
      token,
      speech: audioBuffer.toString('base64'),
      len: audioBuffer.length,
    })

    const options = {
      hostname: 'vop.baidubce.com',
      path: '/server_api?dev_pid=1537', // 普通话(纯中文识别)
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const apiReq = https.request(options, (apiRes) => {
      let data = ''
      apiRes.on('data', (chunk) => (data += chunk))
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.err_no === 0) {
            const text = json.result[0] || ''
            res.json({ text })
          } else {
            res.status(500).json({ error: `Baidu ASR error: ${json.err_no} - ${json.err_msg}` })
          }
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse Baidu response' })
        }
      })
    })

    apiReq.on('error', (e) => res.status(500).json({ error: e.message }))
    apiReq.write(body)
    apiReq.end()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
