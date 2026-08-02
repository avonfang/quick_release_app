/**
 * Centralized coin tracking with ledger
 */
function addCoins(amount, source) {
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
  return coins + amount
}

function getLedger() {
  return uni.getStorageSync('coinLedger') || []
}

module.exports = { addCoins, getLedger }
