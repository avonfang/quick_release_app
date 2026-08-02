const util = require('../src/utils/util')

describe('formatDate', () => {
  test('formats date as YYYY-MM-DD', () => {
    expect(util.formatDate(new Date(2026, 5, 2))).toBe('2026-06-02')
  })
  test('pads single digit month and day', () => {
    expect(util.formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('formatTime', () => {
  test('formats time as HH:MM', () => {
    expect(util.formatTime(new Date(2026, 5, 2, 14, 30))).toBe('14:30')
  })
  test('pads single digit hours and minutes', () => {
    expect(util.formatTime(new Date(2026, 5, 2, 9, 5))).toBe('09:05')
  })
})

describe('EMOTION_MAP', () => {
  test('contains all 4 emotions', () => {
    expect(Object.keys(util.EMOTION_MAP)).toEqual(['anxiety', 'anger', 'low', 'tangled'])
  })
  test('each entry has label, icon, color', () => {
    Object.values(util.EMOTION_MAP).forEach(e => {
      expect(e).toHaveProperty('label')
      expect(e).toHaveProperty('icon')
      expect(e).toHaveProperty('color')
    })
  })
})

describe('getCourseProgress', () => {
  beforeEach(() => {
    uni.getStorageSync.mockClear()
  })

  test('returns 0 for null path', () => {
    expect(util.getCourseProgress(null)).toBe(0)
  })

  test('returns 0 for non-existent path', () => {
    expect(util.getCourseProgress('invalid')).toBe(0)
  })

  test('counts completed lessons', () => {
    uni.getStorageSync.mockImplementation(key => {
      if (key === 'lesson_presence_p1') return true
      if (key === 'lesson_presence_p2') return true
      if (key === 'lesson_presence_p3') return false
      return null
    })
    expect(util.getCourseProgress('presence')).toBe(2)
  })
})

describe('completeLesson', () => {
  beforeEach(() => {
    uni.getStorageSync.mockClear()
    uni.setStorageSync.mockClear()
  })

  test('returns false for empty path', () => {
    expect(util.completeLesson('', 'l1')).toBe(false)
  })

  test('returns false for empty lessonId', () => {
    expect(util.completeLesson('presence', '')).toBe(false)
  })

  test('returns false if already completed', () => {
    uni.getStorageSync.mockImplementation(key => {
      if (key === 'lesson_presence_l1') return true
      return null
    })
    expect(util.completeLesson('presence', 'l1')).toBe(false)
  })

  test('marks lesson complete and adds coins', () => {
    uni.getStorageSync.mockImplementation(key => {
      if (key === 'lesson_presence_l1') return false
      if (key === 'progress_presence') return 0
      return null
    })
    const result = util.completeLesson('presence', 'l1')
    expect(result).toBe(true)
    expect(uni.setStorageSync).toHaveBeenCalledWith('lesson_presence_l1', true)
  })
})
