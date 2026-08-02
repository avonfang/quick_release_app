const coins = require('../src/utils/coins')

describe('addCoins', () => {
  beforeEach(() => {
    uni.getStorageSync.mockClear()
    uni.setStorageSync.mockClear()
  })

  test('adds coins to existing balance', () => {
    uni.getStorageSync.mockImplementation(key => {
      if (key === 'awakeningCoins') return 10
      if (key === 'coinLedger') return []
      return null
    })
    coins.addCoins(5, '情绪急救')
    expect(uni.setStorageSync).toHaveBeenCalledWith('awakeningCoins', 15)
  })

  test('handles no initial balance', () => {
    uni.getStorageSync.mockReturnValue(null)
    coins.addCoins(5, 'test')
    expect(uni.setStorageSync).toHaveBeenCalledWith('awakeningCoins', 5)
  })

  test('adds ledger entry', () => {
    let ledger = []
    uni.getStorageSync.mockImplementation(key => {
      if (key === 'awakeningCoins') return 10
      if (key === 'coinLedger') return ledger
      return null
    })
    uni.setStorageSync.mockImplementation((key, val) => {
      if (key === 'coinLedger') ledger = val
    })
    coins.addCoins(5, '情绪急救')
    expect(ledger[0].amount).toBe(5)
    expect(ledger[0].source).toBe('情绪急救')
  })
})

describe('getLedger', () => {
  test('returns empty array when no ledger', () => {
    uni.getStorageSync.mockReturnValue(null)
    expect(coins.getLedger()).toEqual([])
  })

  test('returns ledger entries', () => {
    const mockLedger = [{ amount: 5, source: 'test' }]
    uni.getStorageSync.mockReturnValue(mockLedger)
    expect(coins.getLedger()).toEqual(mockLedger)
  })
})
