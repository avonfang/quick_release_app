const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, 'data.db')

let db
try {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      wechat_openid TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Migration: add wechat_openid to existing users table
  const tableInfo = db.prepare("PRAGMA table_info('users')").all()
  if (!tableInfo.some(col => col.name === 'wechat_openid')) {
    db.exec("ALTER TABLE users ADD COLUMN wechat_openid TEXT")
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid)")
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      _id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      session_id TEXT,
      event TEXT,
      emotion TEXT,
      thought TEXT,
      belief TEXT,
      loosen TEXT,
      release TEXT,
      awareness TEXT,
      action TEXT,
      created_at INTEGER NOT NULL,
      synced_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id, _id)
  `)

  console.log('Database ready')
} catch (err) {
  console.error('Database init failed:', err)
  process.exit(1)
}

module.exports = db
