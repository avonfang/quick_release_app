const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const https = require('https')
const rateLimit = require('express-rate-limit')
const db = require('../db')
const { JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '请求过于频繁，请稍后再试' },
})

/**
 * 调用微信 jscode2session 接口，换取 openid
 */
function code2Session(code) {
  return new Promise((resolve, reject) => {
    const appid = process.env.WECHAT_APPID
    const secret = process.env.WECHAT_SECRET
    if (!appid || !secret) {
      return reject(new Error('微信登录未配置'))
    }
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch { reject(new Error('解析微信响应失败')) }
      })
    }).on('error', reject)
  })
}

// POST /api/auth/wx-login — 微信小程序登录
router.post('/wx-login', authLimiter, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: '缺少 code 参数' })

    const result = await code2Session(code)
    if (result.errcode) {
      return res.status(400).json({ error: `微信登录失败: ${result.errmsg}` })
    }

    const { openid } = result
    if (!openid) return res.status(400).json({ error: '获取 openid 失败' })

    // 查找或创建用户
    let user = db.prepare('SELECT * FROM users WHERE wechat_openid = ?').get(openid)
    let isNew = false
    if (!user) {
      const placeholderEmail = `wx_${openid}@wechat.local`
      const r = db.prepare('INSERT INTO users (email, password_hash, wechat_openid) VALUES (?, ?, ?)').run(placeholderEmail, bcrypt.hashSync('wechat', 10), openid)
      user = { id: r.lastInsertRowid, wechat_openid: openid }
      isNew = true
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, isNew } })
  } catch (err) {
    console.error('wx-login error:', err)
    res.status(500).json({ error: err.message || '微信登录失败' })
  }
})

// POST /api/auth/register
router.post('/register', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' })
    }

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' })
    }

    const hash = bcrypt.hashSync(password, 10)
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash)

    const token = jwt.sign({ userId: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: result.lastInsertRowid, email },
    })
  } catch (err) {
    console.error('register error:', err)
    res.status(500).json({ error: '注册失败' })
  }
})

// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: user.id, email: user.email },
    })
  } catch (err) {
    console.error('login error:', err)
    res.status(500).json({ error: '登录失败' })
  }
})

// GET /api/auth/me — verify token, return user info
router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: '请输入邮箱' })
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    // Don't reveal whether the email exists
    if (!user) {
      return res.json({ message: '如果该邮箱已注册，重置链接已发送。请在邮箱中查看。' })
    }

    // Generate reset token (valid 1 hour)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000).toISOString()

    db.prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)').run(email, token, expiresAt)

    // In production, send email here. For now, return the link in response.
    const resetUrl = `https://sumeru.online/reset-password?token=${token}`
    console.log(`[Password Reset] ${email} → ${resetUrl}`)

    res.json({
      message: '如果该邮箱已注册，重置链接已发送。请在邮箱中查看。',
    })
  } catch (err) {
    console.error('forgot-password error:', err)
    res.status(500).json({ error: '请求失败' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: '参数不完整' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }

    const record = db.prepare(
      "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')"
    ).get(token)

    if (!record) {
      return res.status(400).json({ error: '重置链接无效或已过期' })
    }

    const hash = bcrypt.hashSync(password, 10)
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, record.email)
    db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token)

    res.json({ message: '密码重置成功，请用新密码登录' })
  } catch (err) {
    console.error('reset-password error:', err)
    res.status(500).json({ error: '重置失败' })
  }
})

module.exports = router
