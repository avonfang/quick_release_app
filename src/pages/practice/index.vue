<template>
  <view class="page-bg"></view>
  <view class="page-glow"></view>

  <view class="container">

    <!-- Header -->
    <view class="header">
      <view class="header-btn" @tap="onBack">
        <text class="header-btn-icon">✕</text>
      </view>
      <text class="header-title">练习</text>
      <view class="header-btn"></view>
    </view>

    <!-- ====== Empty state: no practice loaded ====== -->
    <view class="empty-area" v-if="showEmptyState">

      <!-- Sub-state: no practices done today -->
      <block v-if="todayCount === 0">
        <view class="empty-icon-wrap">
          <text class="empty-icon">🧘</text>
        </view>
        <text class="empty-title">今天还没有练习</text>
        <text class="empty-desc">开始第一次吧，只需要几分钟</text>

        <!-- Recommendation card -->
        <view class="recommend-card" v-if="recommendedPractice">
          <view class="recommend-header">
            <text class="recommend-badge">今日推荐</text>
            <text class="recommend-icon">💡</text>
          </view>
          <text class="recommend-title">{{recommendedPractice.title}}</text>
          <text class="recommend-desc">{{recommendedPractice.desc}}</text>
          <view class="recommend-btn" @tap="startRecommended" hover-class="recommend-btn-hover">
            <text class="recommend-btn-text">开始练习 →</text>
          </view>
        </view>

        <!-- Disabled summary preview -->
        <view class="summary-preview">
          <text class="summary-preview-label">完成练习后，这里将生成今日情绪变化趋势与练习时长记录。</text>
          <view class="summary-preview-btn disabled">
            <text class="summary-preview-btn-text">查看今日总结</text>
          </view>
          <text class="summary-preview-hint">完成至少 1 项练习后，即可查看今日总结</text>
        </view>
      </block>

      <!-- Sub-state: practices done today -->
      <block v-else>
        <view class="today-summary-card">
          <text class="today-summary-emoji">🌿</text>
          <text class="today-summary-title">今日已完成 {{todayCount}} 项练习</text>
          <text class="today-summary-desc">📊 本周 {{summaryData.weeklyMinutes}} 分钟 · 连续 {{summaryData.streakDays}} 天</text>
        </view>

        <!-- Recommendation card -- for "再练一次" -->
        <view class="recommend-card" v-if="recommendedPractice">
          <view class="recommend-header">
            <text class="recommend-badge">再练一次</text>
            <text class="recommend-icon">💡</text>
          </view>
          <text class="recommend-title">{{recommendedPractice.title}}</text>
          <text class="recommend-desc">{{recommendedPractice.desc}}</text>
          <view class="recommend-btn" @tap="startRecommended" hover-class="recommend-btn-hover">
            <text class="recommend-btn-text">开始练习 →</text>
          </view>
        </view>

        <!-- Enabled summary button -->
        <view class="summary-preview">
          <view class="summary-preview-btn enabled" @tap="goToSummary">
            <text class="summary-preview-btn-text enabled">查看今日总结 →</text>
          </view>
        </view>
      </block>

    </view>

    <!-- ====== Active practice ====== -->
    <view class="practice-area" v-else-if="!isComplete">
      <!-- Progress bar -->
      <view class="progress-section">
        <view class="progress-bar-track" :class="progressPercent === 0 ? 'empty' : ''">
          <view class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <text class="progress-text" v-if="totalSteps > 0">进度 {{progressPercent}}% · 第 {{currentIndex + 1}} / {{totalSteps}} 步</text>
      </view>

      <!-- Practice step card -->
      <view class="practice-card">
        <text class="practice-text">{{currentStep}}</text>
      </view>

      <!-- Next / Summary button -->
      <view class="next-btn" v-if="currentIndex < totalSteps - 1" @tap="onNext" hover-class="next-btn-hover">
        <text class="next-btn-text">继续</text>
        <text class="next-btn-arrow">→</text>
      </view>

      <view class="next-btn summary-btn" v-else @tap="onComplete" hover-class="next-btn-hover">
        <text class="next-btn-text">查看总结</text>
        <text class="next-btn-arrow">→</text>
      </view>
    </view>

    <!-- ====== Completion ====== -->
    <view class="done-area" v-else-if="isComplete">
      <view class="done-icon-wrap">
        <view class="done-glow-ring"></view>
        <text class="done-icon">🌿</text>
      </view>
      <text class="done-title">练习完成</text>
      <text class="done-desc">今天的你，比昨天更靠近自己</text>

      <view class="done-badge">+2 ❤️</view>

      <!-- Completion summary preview -->
      <view class="done-summary-preview">
        <text class="done-summary-line">本次练习 · {{totalSteps}} 个阶段</text>
        <text class="done-summary-line">已完成 {{totalSteps}} / {{totalSteps}} 步</text>
      </view>

      <view class="done-actions">
        <view class="done-btn" @tap="goToSummary" hover-class="done-btn-hover">
          <text class="done-btn-text">查看今日总结</text>
        </view>
        <view class="done-btn-secondary" @tap="restartPractice" hover-class="done-btn-hover">
          <text class="done-btn-secondary-text">再练一次 →</text>
        </view>
      </view>
    </view>

  </view>

  <!-- Summary overlay -->
  <view class="summary-overlay" v-if="showSummary" @tap.stop="closeSummary">
    <view class="summary-card" @tap.stop="">
      <text class="summary-card-emoji">🌿</text>
      <text class="summary-card-title">今日总结</text>
      <text class="summary-card-date">{{summaryDate}}</text>

      <view class="summary-stats">
        <view class="summary-stat-item">
          <text class="summary-stat-value">{{summaryData.todayCount}}</text>
          <text class="summary-stat-unit">项练习</text>
          <text class="summary-stat-label">今日完成</text>
        </view>
        <view class="summary-stat-divider"></view>
        <view class="summary-stat-item">
          <text class="summary-stat-value">{{summaryData.weeklyMinutes}}</text>
          <text class="summary-stat-unit">分钟</text>
          <text class="summary-stat-label">本周专注</text>
        </view>
        <view class="summary-stat-divider"></view>
        <view class="summary-stat-item">
          <text class="summary-stat-value">{{summaryData.streakDays}}</text>
          <text class="summary-stat-unit">天</text>
          <text class="summary-stat-label">连续练习</text>
        </view>
      </view>

      <view class="summary-card-footer">
        <text class="summary-card-footer-text">每一次练习，都是一次回到当下</text>
      </view>

      <view class="summary-card-close" @tap="closeSummary">
        <text class="summary-card-close-text">关闭</text>
      </view>
      <view class="summary-card-home" @tap="goHome">
        <text class="summary-card-home-text">返回首页</text>
      </view>
    </view>
  </view>
</template>

<script>
import { completeLesson } from '@/utils/util'

export default {
  data() {
    return {
      steps: [],
      currentIndex: 0,
      currentStep: '',
      totalSteps: 0,
      progressPercent: 0,
      isComplete: false,
      path: '',
      lessonId: '',
      showEmptyState: false,
      todayCount: 0,
      recommendedPractice: null,
      showSummary: false,
      summaryData: { todayCount: 0, weeklyMinutes: 0, streakDays: 0 },
      summaryDate: ''
    }
  },

  onLoad(options) {
    const path = options.path || ''
    const lessonId = options.lessonId || ''
    const practiceText = uni.getStorageSync('practiceText') || ''
    uni.removeStorageSync('practiceText')

    if (practiceText) {
      this.initPractice(practiceText, path, lessonId)
    } else {
      this.showRecommendation(path, lessonId)
    }
  },

  methods: {
    initPractice(text, path, lessonId) {
      const steps = text.split('\n\n').filter(s => s.trim().length > 0)
      this.steps = steps
      this.path = path
      this.lessonId = lessonId
      this.totalSteps = steps.length
      this.currentStep = steps[0] || ''
      this.currentIndex = 0
      this.progressPercent = 0
      this.showEmptyState = false
      this.isComplete = false
    },

    showRecommendation(path, lessonId) {
      const today = new Date().toISOString().slice(0, 10)
      const todayPractices = uni.getStorageSync('todayPractices') || {}
      const todayCount = todayPractices[today] || 0
      const { weeklyMinutes, streakDays } = this.computeSummary()

      this.path = path
      this.lessonId = lessonId
      this.showEmptyState = true
      this.isComplete = false
      this.todayCount = todayCount
      this.summaryData = { todayCount, weeklyMinutes, streakDays }
      this.steps = []
      this.totalSteps = 0
      this.recommendedPractice = {
        title: '3 分钟安定身心',
        desc: '回到呼吸，回到当下。适合任何状态的入门练习。',
        text: '找一个舒服的姿势坐好。\n\n闭上眼睛，把注意力轻轻放在呼吸上。\n\n吸气——知道自己在吸气。\n呼气——知道自己在呼气。\n\n不需要改变什么，只是观察。\n\n思绪飘走了，没关系，温柔地把注意力带回来。\n\n就这样，和自己安安静静地待一会儿。'
      }
    },

    startRecommended() {
      const { recommendedPractice, path } = this
      uni.setStorageSync('practiceText', recommendedPractice.text)
      this.initPractice(recommendedPractice.text, path, 'guided')
    },

    onNext() {
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      const { currentIndex, steps, totalSteps } = this
      if (currentIndex < steps.length - 1) {
        const nextIndex = currentIndex + 1
        const percent = totalSteps > 0 ? Math.round((nextIndex / totalSteps) * 100) : 0
        this.currentIndex = nextIndex
        this.currentStep = steps[nextIndex]
        this.progressPercent = percent
      }
    },

    onComplete() {
      const { path, lessonId } = this
      uni.vibrateShort({ type: 'light' }).catch(() => {})

      const count = uni.getStorageSync('practice_completed_count') || 0
      uni.setStorageSync('practice_completed_count', count + 1)

      const today = new Date().toISOString().slice(0, 10)
      const todayPractices = uni.getStorageSync('todayPractices') || {}
      todayPractices[today] = (todayPractices[today] || 0) + 1
      uni.setStorageSync('todayPractices', todayPractices)

      if (path && lessonId) {
        completeLesson(path, lessonId)
      }

      uni.showToast({ title: '+2 ❤️', icon: 'success' })

      this.isComplete = true
      this.progressPercent = 100
    },

    restartPractice() {
      // Re-start the same practice using the stored steps text
      const { steps } = this
      const originalText = steps.join('\n\n')
      uni.setStorageSync('practiceText', originalText)
      this.initPractice(originalText, this.path, this.lessonId)
    },

    onBack() {
      uni.navigateBack()
    },

    goToPracticeTab() {
      uni.reLaunch({ url: '/pages/practice/index' })
    },

    computeSummary() {
      const today = new Date().toISOString().slice(0, 10)
      const todayPractices = uni.getStorageSync('todayPractices') || {}
      const todayCount = todayPractices[today] || 0

      // Weekly minutes from pendingEntries
      const entries = uni.getStorageSync('pendingEntries') || []
      const now = Date.now()
      const weekMs = 7 * 86400000
      let weeklyMinutes = 0
      entries.forEach(e => {
        const t = e.timestamp || e.createTime || 0
        if (t > now - weekMs) {
          weeklyMinutes += e.recoveryMinutes || 0
        }
      })

      const streakDays = uni.getStorageSync('streakDays') || 0

      // Format today's date in Chinese
      const d = new Date()
      const month = d.getMonth() + 1
      const day = d.getDate()
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      const weekday = weekdays[d.getDay()]
      const dateStr = `${month}月${day}日 星期${weekday}`

      return { todayCount, weeklyMinutes, streakDays, dateStr }
    },

    goToSummary() {
      const { todayCount, weeklyMinutes, streakDays, dateStr } = this.computeSummary()
      this.showSummary = true
      this.summaryDate = dateStr
      this.summaryData = { todayCount, weeklyMinutes, streakDays }
    },

    closeSummary() {
      this.showSummary = false
    },

    goHome() {
      this.showSummary = false
      // Switch to empty state in-place -- no navigation, no white flash
      this.showRecommendation(this.path, this.lessonId)
    }
  }
}
</script>

<style scoped>
/* 练习 -- 沉浸深色风格 */

.page-bg {
  position: fixed; inset: 0;
  background: linear-gradient(180deg, #5C4F42 0%, #3E342B 50%, #2A231D 100%);
  z-index: 0;
}
.page-glow {
  position: fixed; top: 50%; left: 50%;
  width: 600rpx; height: 600rpx;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(198, 156, 109, 0.12) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none; z-index: 0;
}

.container {
  position: relative; z-index: 1;
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center;
  padding: 0 40rpx calc(160rpx + env(safe-area-inset-bottom));
  color: #FDFBF7;
}

/* ====== Header ====== */
.header {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding-top: calc(96rpx + env(safe-area-inset-top));
  padding-bottom: 24rpx;
}
.header-btn {
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
}
.header-btn:active { background: rgba(255,255,255,0.08); }
.header-btn-icon {
  font-size: 32rpx; color: #FDFBF7; line-height: 1;
}
.header-title {
  font-size: 32rpx; font-weight: 500;
  color: rgba(255,255,255,0.85);
  letter-spacing: 4rpx;
}

/* ====== Progress bar ====== */
.progress-section {
  width: 100%;
  display: flex; flex-direction: column; align-items: center;
  margin-top: 24rpx; margin-bottom: 32rpx;
}
.progress-bar-track {
  width: 100%; height: 6rpx;
  background: rgba(255,255,255,0.08);
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
  position: relative;
}
.progress-bar-track.empty::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2.4s ease-in-out infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #C69C6D, #D4AF7A);
  border-radius: 6rpx;
  transition: width 0.4s ease;
}
.progress-text {
  font-size: 24rpx; color: rgba(255,255,255,0.4);
  letter-spacing: 2rpx;
}

/* ====== Empty state ====== */
.empty-area {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  width: 100%;
}
.empty-icon-wrap {
  width: 160rpx; height: 160rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24rpx;
}
.empty-icon { font-size: 80rpx; }
.empty-title {
  font-size: 38rpx; font-weight: 700; color: #FDFBF7;
  display: block; margin-bottom: 10rpx;
}
.empty-desc {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  display: block; margin-bottom: 48rpx;
}

/* Recommendation card */
.recommend-card {
  width: 100%;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 28rpx;
  padding: 36rpx;
  border: 2rpx solid rgba(198,156,109,0.2);
  margin-bottom: 40rpx;
  animation: fadeUp 0.4s ease both;
}
.recommend-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16rpx;
}
.recommend-badge {
  font-size: 24rpx; color: #C69C6D;
  font-weight: 600; letter-spacing: 2rpx;
}
.recommend-icon { font-size: 32rpx; }
.recommend-title {
  font-size: 34rpx; font-weight: 700; color: #FDFBF7;
  display: block; margin-bottom: 8rpx;
}
.recommend-desc {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  display: block; margin-bottom: 28rpx; line-height: 1.6;
}
.recommend-btn {
  display: inline-flex; align-items: center; gap: 8rpx;
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  background: #C69C6D;
  transition: transform 0.2s;
}
.recommend-btn-hover { transform: scale(0.96); opacity: 0.9; }
.recommend-btn-text {
  font-size: 28rpx; color: #FFF; font-weight: 600;
}

/* Summary preview (empty state) */
.summary-preview {
  width: 100%;
  display: flex; flex-direction: column; align-items: center;
  gap: 12rpx;
}
.summary-preview-label {
  font-size: 24rpx; color: rgba(255,255,255,0.25);
  text-align: center; line-height: 1.6;
  display: block;
  margin-bottom: 8rpx;
}
.summary-preview-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  padding: 24rpx 0;
  border-radius: 48rpx;
  background: rgba(255,255,255,0.06);
  transition: transform 0.2s;
}
.summary-preview-btn.disabled { opacity: 0.5; pointer-events: none; }
.summary-preview-btn.enabled {
  background: rgba(198,156,109,0.10);
  border: 2rpx solid rgba(198,156,109,0.3);
}
.summary-preview-btn.enabled:active { transform: scale(0.96); }
.summary-preview-btn-text {
  font-size: 28rpx; color: rgba(255,255,255,0.3);
  font-weight: 500;
}
.summary-preview-btn-text.enabled {
  color: #C69C6D;
  font-weight: 600;
}
.summary-preview-hint {
  font-size: 22rpx; color: rgba(255,255,255,0.18);
  text-align: center; display: block;
}

/* Today summary card (shown when practices completed today) */
.today-summary-card {
  width: 100%;
  display: flex; flex-direction: column; align-items: center;
  padding: 32rpx 0;
  margin-bottom: 32rpx;
}
.today-summary-emoji { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.today-summary-title {
  font-size: 36rpx; font-weight: 700; color: #FDFBF7;
  display: block; margin-bottom: 8rpx;
}
.today-summary-desc {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  display: block;
}

/* ====== Practice area ====== */
.practice-area {
  flex: 1; display: flex; flex-direction: column;
  width: 100%;
}
.practice-card {
  width: 100%;
  flex: 1;
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 32rpx;
  padding: 48rpx 40rpx;
  box-sizing: border-box;
  border: 2rpx solid rgba(255,255,255,0.06);
  margin-bottom: 48rpx;
  display: flex; flex-direction: column;
  justify-content: center;
  min-height: 360rpx;
}
.practice-text {
  font-size: 30rpx; color: #FDFBF7;
  line-height: 2; display: block; white-space: pre-line;
}

/* ====== Next button ====== */
.next-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  gap: 12rpx;
  padding: 28rpx 0;
  border-radius: 56rpx;
  background: #C69C6D;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(198,156,109,0.3);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.next-btn-hover { transform: scale(0.96); opacity: 0.9; }
.next-btn-text {
  font-size: 30rpx; color: #FFF; font-weight: 600;
}
.next-btn-arrow {
  font-size: 30rpx; color: #FFF; font-weight: 600;
}
.summary-btn { margin-top: auto; }

/* ====== Completion ====== */
.done-area {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  width: 100%;
}
.done-icon-wrap {
  position: relative;
  width: 200rpx; height: 200rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 32rpx;
}
.done-glow-ring {
  position: absolute;
  width: 200rpx; height: 200rpx;
  background: radial-gradient(circle, rgba(198,156,109,0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: celebratePulse 1.4s ease-out infinite;
}
@keyframes celebratePulse {
  0% { transform: scale(0.8); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
  100% { transform: scale(1); opacity: 0.3; }
}
.done-icon {
  font-size: 88rpx; display: block;
  position: relative; z-index: 1;
  animation: bounceIn 0.5s ease-out both;
}
@keyframes bounceIn {
  0% { transform: scale(0); }
  60% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
.done-title {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-size: 44rpx; font-weight: 600; color: #FDFBF7;
  display: block; margin-bottom: 12rpx;
}
.done-desc {
  font-size: 26rpx; color: rgba(255,255,255,0.5);
  display: block; margin-bottom: 32rpx;
}
.done-badge {
  font-size: 32rpx; color: #C69C6D; font-weight: 600;
  padding: 12rpx 40rpx;
  background: rgba(198,156,109,0.1);
  border-radius: 48rpx; display: inline-block;
  margin-bottom: 32rpx;
}

/* Completion summary */
.done-summary-preview {
  display: flex; flex-direction: column; align-items: center;
  gap: 6rpx; margin-bottom: 48rpx;
}
.done-summary-line {
  font-size: 24rpx; color: rgba(255,255,255,0.3);
}

.done-btn {
  width: 100%;
  padding: 28rpx 0;
  border-radius: 56rpx;
  background: #C69C6D;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(198,156,109,0.3);
  transition: transform 0.2s;
}
.done-btn-hover { transform: scale(0.96); opacity: 0.9; }
.done-btn-text {
  font-size: 30rpx; color: #FFF; font-weight: 600; display: block;
}

/* Done actions */
.done-actions {
  display: flex; flex-direction: column; align-items: center;
  gap: 20rpx; width: 100%; max-width: 400rpx;
}
.done-btn-secondary {
  width: 100%;
  padding: 22rpx 0;
  border-radius: 48rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(255,255,255,0.10);
  text-align: center;
}
.done-btn-secondary:active { background: rgba(255,255,255,0.08); }
.done-btn-secondary-text {
  font-size: 28rpx; color: rgba(255,255,255,0.5); font-weight: 500;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* ====== Summary overlay ====== */
.summary-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 50;
  display: flex; align-items: center; justify-content: center;
  padding: 48rpx;
  animation: overlayIn 0.25s ease;
}
@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.summary-card {
  background: rgba(42,35,29,0.96);
  backdrop-filter: blur(30rpx);
  -webkit-backdrop-filter: blur(30rpx);
  border-radius: 32rpx;
  padding: 48rpx 40rpx;
  border: 2rpx solid rgba(255,255,255,0.08);
  width: 100%;
  max-width: 560rpx;
  display: flex; flex-direction: column;
  align-items: center;
  animation: fadeUp 0.3s ease;
}
.summary-card-emoji { font-size: 72rpx; display: block; margin-bottom: 12rpx; }
.summary-card-title {
  font-size: 38rpx; font-weight: 700; color: #FDFBF7;
  display: block; margin-bottom: 6rpx;
}
.summary-card-date {
  font-size: 24rpx; color: rgba(255,255,255,0.35);
  display: block; margin-bottom: 36rpx;
}

/* Stats row */
.summary-stats {
  width: 100%;
  display: flex; align-items: center;
  justify-content: space-around;
  margin-bottom: 32rpx;
}
.summary-stat-item {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.summary-stat-value {
  font-size: 52rpx; font-weight: 700; color: #C69C6D;
  display: block;
}
.summary-stat-unit {
  font-size: 22rpx; color: rgba(255,255,255,0.3);
  display: block;
}
.summary-stat-label {
  font-size: 22rpx; color: rgba(255,255,255,0.4);
  display: block; margin-top: 4rpx;
}
.summary-stat-divider {
  width: 2rpx; height: 64rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 2rpx;
}

/* Footer */
.summary-card-footer {
  padding: 20rpx 0;
  border-top: 2rpx solid rgba(255,255,255,0.04);
  width: 100%;
  display: flex; justify-content: center;
  margin-bottom: 28rpx;
}
.summary-card-footer-text {
  font-size: 24rpx; color: rgba(255,255,255,0.25);
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
}

/* Close button */
.summary-card-close {
  padding: 20rpx 48rpx;
  border-radius: 40rpx;
  background: rgba(255,255,255,0.06);
}
.summary-card-close:active { background: rgba(255,255,255,0.10); }
.summary-card-close-text {
  font-size: 28rpx; color: rgba(255,255,255,0.5);
  font-weight: 500;
}
.summary-card-home {
  margin-top: 16rpx;
  padding: 12rpx 0;
}
.summary-card-home:active { opacity: 0.6; }
.summary-card-home-text {
  font-size: 24rpx; color: rgba(255,255,255,0.25);
}
</style>
