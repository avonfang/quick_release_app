const express = require('express')
const db = require('../db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// POST /api/records/sync — upload local records to server
router.post('/sync', authMiddleware, (req, res) => {
  const { records } = req.body
  const userId = req.user.userId

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: '记录不能为空' })
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO records
      (_id, user_id, session_id, event, emotion, thought, belief, loosen, release, awareness, action, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((items) => {
    for (const r of items) {
      insert.run(
        r._id,
        userId,
        r.sessionId || null,
        r.event || null,
        r.emotion || null,
        r.thought || null,
        r.belief || null,
        r.loosen || null,
        r.release || null,
        r.awareness || null,
        r.action || null,
        r.createdAt ?? Date.now(),
      )
    }
  })

  try {
    insertMany(records)
    res.json({ synced: records.length })
  } catch (err) {
    console.error('Sync error:', err)
    res.status(500).json({ error: '同步失败' })
  }
})

// GET /api/records — fetch user's records from server
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.userId

  const rows = db.prepare(
    'SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId)

  const data = rows.map(r => ({
    _id: r._id,
    sessionId: r.session_id,
    createdAt: r.created_at,
    event: r.event || '',
    emotion: r.emotion || '',
    thought: r.thought || '',
    belief: r.belief || '',
    loosen: r.loosen || '',
    release: r.release || '',
    awareness: r.awareness || '',
    action: r.action || '',
    status: 'completed',
  }))

  res.json({ data })
})

// DELETE /api/records/:_id — delete a single record
router.delete('/:id', authMiddleware, (req, res) => {
  const userId = req.user.userId
  const { id } = req.params

  const result = db.prepare(
    'DELETE FROM records WHERE _id = ? AND user_id = ?'
  ).run(id, userId)

  if (result.changes === 0) {
    return res.status(404).json({ error: '记录未找到' })
  }

  res.json({ deleted: true })
})

module.exports = router
