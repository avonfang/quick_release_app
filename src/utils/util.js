import courses from '../data/courses'
import { addCoins } from './coins'

export function formatDate(date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export const EMOTION_MAP = {
  anxiety: { label: '焦虑', icon: '😰', color: '#D4A5A5' },
  anger: { label: '愤怒', icon: '😤', color: '#D4786A' },
  low: { label: '低落', icon: '😔', color: '#8B9DC3' },
  tangled: { label: '纠结', icon: '😵‍💫', color: '#B8A5C4' }
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 获取指定路径的课程进度（已完成课数） */
export function getCourseProgress(path) {
  if (!path || typeof path !== 'string') return 0
  const course = courses[path]
  if (!course) return 0
  let completed = 0
  course.lessons.forEach(l => {
    if (uni.getStorageSync(`lesson_${path}_${l.id}`)) completed++
  })
  return completed
}

/** 获取所有课程的进度快照 */
export function getAllCourseProgress() {
  const result = {}
  Object.keys(courses).forEach(path => {
    const completed = getCourseProgress(path)
    if (completed > 0) result[path] = completed
  })
  return result
}

/** 标记课程完成并更新进度 */
export function completeLesson(path, lessonId, coinReward = 2) {
  if (!path || typeof path !== 'string') return false
  if (!lessonId || typeof lessonId !== 'string') return false

  const key = `lesson_${path}_${lessonId}`
  if (uni.getStorageSync(key)) return false
  uni.setStorageSync(key, true)

  addCoins(coinReward, '完成课程')
  const progress = getCourseProgress(path)
  uni.setStorageSync(`progress_${path}`, progress)
  return true
}
