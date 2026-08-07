const express = require('express')
const db = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// GET /api/dialogue/quota — check today's remaining quota
router.get('/quota', authMiddleware, (req, res) => {
  const userId = req.user.userId
  const today = new Date().toISOString().slice(0, 10)

  const row = db.prepare(
    'SELECT count FROM dialogue_quotas WHERE user_id = ? AND date = ?'
  ).get(userId, today)

  res.json({
    count: row ? row.count : 0,
    remaining: Math.max(0, 5 - (row ? row.count : 0)),
  })
})

// POST /api/dialogue/quota — increment today's count
router.post('/quota', authMiddleware, (req, res) => {
  const userId = req.user.userId
  const today = new Date().toISOString().slice(0, 10)

  const row = db.prepare(
    'SELECT id, count FROM dialogue_quotas WHERE user_id = ? AND date = ?'
  ).get(userId, today)

  if (row) {
    const newCount = row.count + 1
    db.prepare('UPDATE dialogue_quotas SET count = ? WHERE id = ?').run(newCount, row.id)
    res.json({ count: newCount, remaining: Math.max(0, 5 - newCount) })
  } else {
    db.prepare('INSERT INTO dialogue_quotas (user_id, date, count) VALUES (?, ?, 1)').run(userId, today)
    res.json({ count: 1, remaining: 4 })
  }
})

module.exports = router
