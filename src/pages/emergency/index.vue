<template>
  <view class="container">

    <!-- ====== STEP 1: 停下 ====== -->
    <block v-if="phase === 'step1'">
      <view class="back-btn" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-section">
        <text class="step-label">情绪急救 · 第 1 步</text>
        <text class="main-title">停下来，给自己一点空间</text>
        <text class="sub-text">当情绪来临时，先暂停，允许自己感受这一刻。</text>
      </view>
      <view class="card-container">
        <image class="illustration-area" :src="personSvgUri" mode="aspectFit" />
        <text class="card-title">我需要先停下来</text>
        <text class="card-subtitle">时长 1 分钟</text>
        <view class="action-btn" @tap="onStep1Action" hover-class="action-btn-hover">
          <image class="action-icon" :src="arrowSvgUri" mode="aspectFit" />
        </view>
      </view>
      <view class="pagination-container">
        <view class="pagination-track">
          <view class="dot active"></view><view class="dot"></view><view class="dot"></view><view class="dot"></view><view class="dot"></view>
        </view>
      </view>
    </block>

    <!-- ====== STEP 2: 选择情绪 ====== -->
    <block v-else-if="phase === 'step2'">
      <view class="back-btn" @tap="goToStep1">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-section">
        <text class="step-label">情绪急救 · 第 2 步</text>
        <text class="main-title" style="font-size:44rpx">现在感觉怎么样？</text>
        <text class="sub-text">选择一种情绪，获得专属引导</text>
      </view>
      <view class="card-container">
        <view class="emotion-grid">
          <view
            class="emotion-card"
            v-for="(item, index) in emotionOptions" :key="item.value"
            :data-value="item.value"
            @tap="onEmotionSelect"
            hover-class="emotion-card-hover"
          >
            <text class="emotion-card-icon">{{item.icon}}</text>
            <text class="emotion-card-label">{{item.label}}</text>
          </view>
        </view>
      </view>
      <view class="pagination-container">
        <view class="pagination-track">
          <view class="dot"></view><view class="dot active"></view><view class="dot"></view><view class="dot"></view><view class="dot"></view>
        </view>
      </view>
    </block>

    <!-- ====== STEP 3: 引导步骤 ====== -->
    <block v-else-if="phase === 'step3'">
      <view class="back-btn" @tap="onGuideBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-section">
        <text class="step-label">情绪急救 · 第 3 步</text>
        <text class="sub-text-mini">{{emotionLabel}} · {{stepIndex + 1}} / {{totalSteps}}</text>
      </view>
      <view class="card-container">
        <view class="guide-text-wrap">
          <text class="guide-text">{{currentStep.text}}</text>
        </view>
        <block v-if="currentStep.options && currentStep.options.length > 0">
          <view class="guide-options">
            <view
              class="guide-option"
              v-for="(item, index) in currentStep.options" :key="item.value"
              :data-value="item.value"
              @tap="onGuideSelect"
              hover-class="guide-option-hover"
            >
              <text class="guide-option-text">{{item.label}}</text>
            </view>
          </view>
        </block>
        <block v-else-if="currentStep.showNext">
          <view class="action-btn" @tap="onGuideNext" hover-class="action-btn-hover">
            <image class="action-icon" :src="arrowSvgUri" mode="aspectFit" />
          </view>
        </block>
      </view>
      <view class="pagination-container">
        <view class="pagination-track">
          <view class="dot"></view><view class="dot"></view><view class="dot active"></view><view class="dot"></view><view class="dot"></view>
        </view>
      </view>
    </block>

    <!-- ====== STEP 4: 记录 ====== -->
    <block v-else-if="phase === 'step4'">
      <view class="back-btn" @tap="goToStep3">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-section">
        <text class="step-label">情绪急救 · 第 4 步</text>
        <text class="main-title" style="font-size:44rpx">想记录点什么吗？</text>
        <text class="sub-text">写下此刻的感受，让情绪流过笔尖</text>
      </view>
      <view class="card-container">
        <textarea class="note-textarea" placeholder="写下此刻的感受..." @input="onNoteInput" :value="note" maxlength="-1" />
        <view class="rating-section">
          <text class="rating-label">现在感觉好些了吗？</text>
          <view class="stars">
            <view
              :class="'star ' + (rating > idx ? 'active' : '')"
              v-for="(item, idx) in [1,2,3,4,5]" :key="idx"
              @tap.stop="setRating" :data-idx="idx"
            >★</view>
          </view>
        </view>
        <view class="save-btn" @tap="saveAndExit" hover-class="save-btn-hover">
          <text class="save-btn-text">保存并完成</text>
        </view>
      </view>
      <view class="pagination-container">
        <view class="pagination-track">
          <view class="dot"></view><view class="dot"></view><view class="dot"></view><view class="dot active"></view><view class="dot"></view>
        </view>
      </view>
    </block>

    <!-- ====== STEP 5: 完成 ====== -->
    <block v-else-if="phase === 'step5'">
      <view class="header-section" style="margin-top:40rpx">
        <text class="step-label">情绪急救 · 完成</text>
        <text class="main-title" style="font-size:44rpx">你照顾了此刻的自己</text>
      </view>
      <view class="card-container">
        <view class="done-icon-wrap">
          <view class="done-glow-ring"></view>
          <text class="done-icon">🌿</text>
        </view>
        <text class="card-title">急救完成</text>
        <text class="coin-earned">+1 ❤️</text>

        <view class="done-buttons">
          <view class="done-btn" @tap="deepDialogue">
            <text class="done-btn-text">深入聊聊</text>
          </view>
          <view class="done-btn done-btn-ghost" @tap="goBack">
            <text class="done-btn-text-ghost">返回首页</text>
          </view>
        </view>

        <view v-if="recommendedLesson" class="recommend-link" @tap="goRecommendedLesson">
          <text>📖 推荐：{{recommendedLesson.lessonTitle}} →</text>
        </view>

        <view class="crisis-card" v-if="showCrisis">
          <text class="crisis-text">💛 心理援助热线：400-161-9995</text>
        </view>
      </view>
      <view class="pagination-container">
        <view class="pagination-track">
          <view class="dot"></view><view class="dot"></view><view class="dot"></view><view class="dot"></view><view class="dot active"></view>
        </view>
      </view>
    </block>

  </view>
</template>

<script>
import guides from '@/data/guides'
import courses from '@/data/courses'
import * as coins from '@/utils/coins'
import { formatDate } from '@/utils/util'

function svgDataUri(svg) {
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

const ARROW_SVG = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
    '<path d="M9 18L15 12L9 6" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)

const PERSON_SVG = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" fill="none">' +
    '<circle cx="100" cy="48" r="26" stroke="#A68A5E" stroke-width="2.5"/>' +
    '<path d="M100 74 L100 148" stroke="#A68A5E" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M100 95 L68 125 L65 138" stroke="#A68A5E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M100 95 L128 102 L115 122" stroke="#A68A5E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M100 148 L78 200" stroke="#A68A5E" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M100 148 L122 200" stroke="#A68A5E" stroke-width="2.5" stroke-linecap="round"/>' +
  '</svg>'
)

export default {
  data() {
    return {
      phase: 'step1',
      arrowSvgUri: ARROW_SVG,
      personSvgUri: PERSON_SVG,

      emotionOptions: [
        { value: 'anxiety', label: '焦虑/恐惧', icon: '😰' },
        { value: 'anger', label: '愤怒/烦躁', icon: '😤' },
        { value: 'low', label: '无力/低落', icon: '😔' },
        { value: 'tangled', label: '纠结/内耗', icon: '😵‍💫' }
      ],
      emotionLabel: '',
      selectedEmotion: '',
      stepIndex: 0,
      totalSteps: 0,
      steps: [],
      currentStep: {},
      selectedOptions: {},
      note: '',
      rating: 0,
      startTime: null,
      showCrisis: false,
      recommendedLesson: null
    }
  },

  onLoad(options) {
    this.startTime = Date.now()
    if (options && options.emotion) {
      this.startWithEmotion(options.emotion)
    }
  },

  methods: {
    /* ====== 阶段导航 ====== */

    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    goToStep1() {
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      this.phase = 'step1'
    },
    goToStep3() {
      this.phase = 'step3'
      this.stepIndex = 0
      this.currentStep = this.resolveStep(this.steps[0], null)
    },

    /* ====== Step 1 → Step 2 ====== */
    onStep1Action() {
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      this.phase = 'step2'
    },

    /* ====== Step 2: 情绪选择 → Step 3 ====== */
    onEmotionSelect(e) {
      const emotion = e.currentTarget.dataset.value
      this.startWithEmotion(emotion)
    },

    startWithEmotion(emotion) {
      const emotionLabels = { anxiety: '焦虑', anger: '愤怒', low: '低落', tangled: '纠结' }
      const steps = guides[emotion].steps
      const showCrisis = emotion === 'low'
      if (showCrisis) {
        uni.showModal({
          title: '💛 我在这里',
          content: '你选择面对此刻的感受，这已经很有勇气。\n\n如果你感到非常痛苦，请不要一个人承受。可以拨打心理援助热线：\n\n📞 全国心理援助热线：400-161-9995\n📞 北京心理危机研究与干预中心：010-82951332',
          showCancel: false,
          confirmText: '好的，继续'
        })
      }
      this.selectedEmotion = emotion
      this.emotionLabel = emotionLabels[emotion] || emotion
      this.phase = 'step3'
      this.steps = steps
      this.totalSteps = steps.length
      this.stepIndex = 0
      this.currentStep = this.resolveStep(steps[0], null)
      this.selectedOptions = {}
      this.showCrisis = showCrisis
      this.recommendedLesson = this.findLessonForEmotion(emotion)
    },

    /* ====== Step 3: 引导步骤 ====== */
    resolveStep(step, previousOption) {
      if (typeof step.text === 'object') {
        const branchText = step.text[previousOption]
        return {
          text: branchText || Object.values(step.text)[0],
          options: step.options || [],
          showNext: !(step.options && step.options.length > 0)
        }
      }
      return {
        text: step.text,
        options: step.options || [],
        showNext: !(step.options && step.options.length > 0)
      }
    },

    onGuideSelect(e) {
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      const value = e.currentTarget.dataset.value
      const stepIndex = this.stepIndex
      const key = `${stepIndex}`
      const selectedOptions = { ...this.selectedOptions, [key]: value }

      if (stepIndex < this.steps.length - 1) {
        const nextStep = this.resolveStep(this.steps[stepIndex + 1], value)
        this.selectedOptions = selectedOptions
        this.stepIndex = stepIndex + 1
        this.currentStep = nextStep
      } else {
        // 所有引导步骤完成 → Step 4
        this.selectedOptions = selectedOptions
        this.phase = 'step4'
      }
    },

    onGuideNext() {
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      const stepIndex = this.stepIndex
      if (stepIndex < this.steps.length - 1) {
        const nextStep = this.resolveStep(this.steps[stepIndex + 1], null)
        this.stepIndex = stepIndex + 1
        this.currentStep = nextStep
      } else {
        this.phase = 'step4'
      }
    },

    onGuideBack() {
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      const stepIndex = this.stepIndex
      if (stepIndex > 0) {
        const prevStep = this.resolveStep(this.steps[stepIndex - 1], null)
        this.stepIndex = stepIndex - 1
        this.currentStep = prevStep
      } else {
        // 回到情绪选择
        this.phase = 'step2'
        this.stepIndex = 0
        this.selectedEmotion = ''
        this.selectedOptions = {}
      }
    },

    /* ====== Step 4: 记录 → Step 5 ====== */
    onNoteInput(e) { this.note = e.detail.value },

    setRating(e) { this.rating = parseInt(e.currentTarget.dataset.idx) + 1 },

    addCoin(amount) {
      return coins.addCoins(amount, '情绪急救')
    },

    saveAndExit() {
      const recoveryMinutes = Math.round((Date.now() - this.startTime) / 60000)
      const entry = {
        emotionType: this.selectedEmotion,
        trigger: '',
        bodyPart: Object.values(this.selectedOptions).join(','),
        completedSteps: true,
        recoveryMinutes,
        note: this.note,
        rating: this.rating,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      }
      const local = uni.getStorageSync('pendingEntries') || []
      local.push(entry)
      uni.setStorageSync('pendingEntries', local)
      this.addCoin(1)
      uni.showToast({ title: '+1 ❤️', icon: 'success' })
      this.phase = 'step5'
    },

    /* ====== Step 5: 完成 ====== */

    findLessonForEmotion(emotion) {
      const recs = {
        anxiety: { path: 'presence', lessonIndex: 1, lessonTitle: '回到身体' },
        anger: { path: 'surrender', lessonIndex: 1, lessonTitle: '观察内在抗拒' },
        low: { path: 'openness', lessonIndex: 1, lessonTitle: '感受的流动' },
        tangled: { path: 'surrender', lessonIndex: 2, lessonTitle: '放手与信任' }
      }
      const rec = recs[emotion]
      if (!rec) return null
      const lesson = courses[rec.path]?.lessons[rec.lessonIndex]
      if (!lesson) return null
      if (uni.getStorageSync(`lesson_${rec.path}_${lesson.id}`)) return null
      return { ...rec, path: rec.path }
    },

    goRecommendedLesson() {
      const rec = this.recommendedLesson
      if (!rec) return
      uni.navigateTo({
        url: `/pages/learning/lesson/index?path=${rec.path}&lessonIndex=${rec.lessonIndex}`
      })
    },

    deepDialogue() {
      uni.navigateTo({ url: '/pages/chat/index' })
    },

    onShareAppMessage() {
      const today = formatDate(new Date())
      if (uni.getStorageSync('shareRewardDate') !== today) {
        uni.setStorageSync('shareRewardDate', today)
        this.addCoin(1)
      }
      return { title: '刚完成了一次情绪急救 🌿 推荐「此刻」给你', path: '/pages/quick/index' }
    }
  }
}
</script>

<style scoped>
/* ====== 情绪急救 — 完整5步统一设计 ====== */

.container {
  min-height: 100vh;
  background: #FDFBF7;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 32rpx;
  box-sizing: border-box;
}

/* ====== 返回按钮 ====== */
.back-btn {
  width: 80rpx;
  height: 80rpx;
  background: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  margin-top: 40rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.back-btn:active {
  opacity: 0.7;
}
.back-icon {
  font-size: 40rpx;
  color: #4A3B32;
  line-height: 1;
  margin-top: -4rpx;
}

/* ====== 顶部文本区 ====== */
.header-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}

.step-label {
  font-family: 'PingFang SC', sans-serif;
  font-weight: 400;
  font-size: 26rpx;
  line-height: 36rpx;
  color: #8C7D75;
  text-align: center;
  margin-bottom: 20rpx;
  letter-spacing: 2rpx;
}

.main-title {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-weight: 600;
  font-size: 52rpx;
  line-height: 1.4;
  color: #4A3B32;
  text-align: center;
  margin-bottom: 20rpx;
}

.sub-text {
  font-family: 'PingFang SC', sans-serif;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 1.6;
  color: #8C7D75;
  text-align: center;
  padding: 0 48rpx;
}

.sub-text-mini {
  font-family: 'PingFang SC', sans-serif;
  font-weight: 400;
  font-size: 24rpx;
  color: #8C7D75;
  text-align: center;
  margin-top: -12rpx;
}

/* ====== 核心交互卡片 ====== */
.card-container {
  width: 100%;
  background: #FFFFFF;
  border-radius: 48rpx;
  padding: 48rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.03);
  box-sizing: border-box;
}

/* Step 1 插画 */
.illustration-area {
  width: 240rpx;
  height: 240rpx;
  margin-bottom: 32rpx;
}

/* Step 1 卡片文字 */
.card-title {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-weight: 600;
  font-size: 38rpx;
  color: #4A3B32;
  text-align: center;
  margin-bottom: 8rpx;
}
.card-subtitle {
  font-family: 'PingFang SC', sans-serif;
  font-weight: 400;
  font-size: 26rpx;
  color: #8C7D75;
  text-align: center;
  margin-bottom: 36rpx;
}

/* ====== D. 金色圆形行动按钮 ====== */
.action-btn {
  width: 112rpx;
  height: 112rpx;
  background: #C69C6D;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(198, 156, 109, 0.35);
  transition: transform 0.2s ease;
}
.action-btn-hover {
  transform: scale(0.92);
  opacity: 0.9;
}
.action-icon {
  width: 44rpx;
  height: 44rpx;
}

/* ====== STEP 2: 情绪选择网格 ====== */
.emotion-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  width: 100%;
  justify-content: center;
}
.emotion-card {
  width: calc(50% - 10rpx);
  background: #FAF8F5;
  border-radius: 28rpx;
  padding: 36rpx 16rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  transition: transform 0.15s;
  box-sizing: border-box;
}
.emotion-card-hover {
  transform: scale(0.94);
  background: #F5F0EA;
}
.emotion-card-icon {
  font-size: 64rpx;
  display: block;
  line-height: 1;
}
.emotion-card-label {
  font-size: 28rpx;
  color: #4A3B32;
  font-weight: 500;
  display: block;
}

/* ====== STEP 3: 引导文本与选项 ====== */
.guide-text-wrap {
  width: 100%;
  max-height: 520rpx;
  overflow-y: auto;
  margin-bottom: 32rpx;
}
.guide-text {
  font-family: 'PingFang SC', sans-serif;
  font-size: 28rpx;
  color: #4A3B32;
  line-height: 2;
  white-space: pre-line;
  display: block;
}

.guide-options {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.guide-option {
  width: 100%;
  background: #FAF8F5;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  text-align: center;
  transition: transform 0.15s;
  box-sizing: border-box;
}
.guide-option-hover {
  transform: scale(0.96);
  background: #F5F0EA;
}
.guide-option-text {
  font-size: 28rpx;
  color: #4A3B32;
  font-weight: 500;
  display: block;
}

/* ====== STEP 4: 记录 ====== */
.note-textarea {
  width: 100%;
  height: 200rpx;
  background: #FAF8F5;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  font-size: 28rpx;
  color: #4A3B32;
  line-height: 1.8;
  box-sizing: border-box;
  border: none;
  margin-bottom: 24rpx;
}
.note-textarea::placeholder {
  color: #C4BDB6;
}

.rating-section {
  width: 100%;
  text-align: center;
  margin-bottom: 32rpx;
}
.rating-label {
  font-size: 26rpx;
  color: #8C7D75;
  display: block;
  margin-bottom: 20rpx;
}
.stars {
  display: flex;
  justify-content: center;
  gap: 16rpx;
}
.star {
  font-size: 64rpx;
  color: #E8E0D8;
  line-height: 1;
  padding: 8rpx;
  transition: transform 0.15s, color 0.2s;
  display: inline-block;
}
.star.active {
  color: #C69C6D;
  transform: scale(1.1);
}
.star:active {
  transform: scale(0.8);
}

.save-btn {
  width: 100%;
  background: #C69C6D;
  border-radius: 48rpx;
  padding: 28rpx 0;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(198, 156, 109, 0.3);
  transition: transform 0.2s;
}
.save-btn-hover {
  transform: scale(0.96);
  opacity: 0.9;
}
.save-btn-text {
  font-size: 30rpx;
  color: #FFF;
  font-weight: 600;
  display: block;
}

/* ====== STEP 5: 完成 ====== */
.done-icon-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.done-glow-ring {
  position: absolute;
  width: 160rpx;
  height: 160rpx;
  background: radial-gradient(circle, rgba(198,156,109,0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: celebratePulse 1.4s ease-out infinite;
}
@keyframes celebratePulse {
  0% { transform: scale(0.8); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0.4; }
}
.done-icon {
  font-size: 80rpx;
  display: block;
  position: relative;
  z-index: 1;
  animation: bounceIn 0.5s ease-out both;
}

.coin-earned {
  font-family: 'PingFang SC', sans-serif;
  font-size: 32rpx;
  color: #C69C6D;
  font-weight: 600;
  text-align: center;
  margin-bottom: 36rpx;
  display: block;
}

.done-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.done-btn {
  width: 100%;
  background: #C69C6D;
  border-radius: 48rpx;
  padding: 28rpx 0;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(198, 156, 109, 0.3);
  transition: transform 0.2s;
}
.done-btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}
.done-btn-ghost {
  background: transparent;
  box-shadow: none;
  border: 2rpx solid #C69C6D;
}
.done-btn-ghost:active {
  background: rgba(198, 156, 109, 0.06);
}
.done-btn-text {
  font-size: 30rpx;
  color: #FFF;
  font-weight: 600;
  display: block;
}
.done-btn-text-ghost {
  font-size: 30rpx;
  color: #C69C6D;
  font-weight: 500;
  display: block;
}

.recommend-link {
  padding: 20rpx 0;
  text-align: center;
}
.recommend-link text {
  font-size: 26rpx;
  color: #C69C6D;
  font-weight: 500;
}
.recommend-link:active {
  opacity: 0.6;
}

.crisis-card {
  width: 100%;
  background: rgba(198, 156, 109, 0.08);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 8rpx;
  text-align: center;
  box-sizing: border-box;
}
.crisis-text {
  font-size: 24rpx;
  color: #C69C6D;
  line-height: 1.7;
  display: block;
}

/* ====== 底部进度条 ====== */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
  margin-bottom: 40rpx;
}
.pagination-track {
  display: flex;
  gap: 16rpx;
}
.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #E0DCD5;
}
.dot.active {
  background: #C69C6D;
}

/* ====== 动画 ====== */
@keyframes bounceIn {
  0% { transform: scale(0); }
  60% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
</style>
