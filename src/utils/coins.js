/**
 * Centralized coin tracking with ledger
 */
export function addCoins(amount, source) {
  const coins = uni.getStorageSync('awakeningCoins') || 0
  uni.setStorageSync('awakeningCoins', coins + amount)

  const ledger = uni.getStorageSync('coinLedger') || []
  ledger.unshift({
    amount,
    source,
    balance: coins + amount,
    time: new Date().toISOString()
  })
  // Keep last 500 entries
  uni.setStorageSync('coinLedger', ledger.slice(0, 500))

  // Debounced sync to server if logged in
  scheduleStateSync()

  return coins + amount
}

let _syncTimer = null

function scheduleStateSync() {
  if (_syncTimer) clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => {
    try {
      const token = uni.getStorageSync('token')
      if (!token) return
      import('./cloud').then(m => m.syncUserState()).catch(() => {})
    } catch {}
  }, 3000)
}

export function getLedger() {
  return uni.getStorageSync('coinLedger') || []
}
