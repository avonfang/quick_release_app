<template>
<view class="page-bg"></view>
<view class="page-glow"></view>

<view class="container">
  <!-- Header -->
  <view class="page-header">
    <text class="page-title">此刻 · Being</text>
    <view class="header-right">
      <view class="streak-badge" @tap="goProfile">
        <text class="streak-icon">🔥</text>
        <text class="streak-text">{{streakDays}} 天</text>
      </view>
      <view class="header-user" @tap="goProfile">
        <text class="header-user-icon">👤</text>
      </view>
    </view>
  </view>

  <!-- Mood card -->
  <view class="mood-card">
    <image class="mood-bg" src="/static/images/mood-bg.jpg" mode="aspectFill" />
    <view class="mood-overlay"></view>
    <view class="mood-content">
      <text class="mood-time">{{timeGreeting}}</text>
      <text class="mood-quote">{{dailyQuote}}</text>
    </view>
    <view class="mood-footer">
      <text class="mood-focus">本周专注 {{weeklyMinutes}} 分钟</text>
    </view>
  </view>

  <!-- Emotion section -->
  <view class="emotion-section">
    <text class="section-title">此刻的你，感受如何？</text>
    <text class="section-subtitle">选择情绪，获得专属练习</text>

    <view class="emotion-grid">
      <view :class="['emotion-btn', { active: selectedEmotion === 'anxiety' }]" data-emotion="anxiety" @tap="onEmotionTap">
        <text class="emotion-emoji">😟</text>
        <text class="emotion-label">焦虑</text>
      </view>
      <view :class="['emotion-btn', { active: selectedEmotion === 'anger' }]" data-emotion="anger" @tap="onEmotionTap">
        <text class="emotion-emoji">😡</text>
        <text class="emotion-label">愤怒</text>
      </view>
      <view :class="['emotion-btn', { active: selectedEmotion === 'low' }]" data-emotion="low" @tap="onEmotionTap">
        <text class="emotion-emoji">😔</text>
        <text class="emotion-label">低落</text>
      </view>
      <view :class="['emotion-btn', { active: selectedEmotion === 'tangled' }]" data-emotion="tangled" @tap="onEmotionTap">
        <text class="emotion-emoji">🌀</text>
        <text class="emotion-label">纠结</text>
      </view>
    </view>

    <!-- 5th option: unsure -->
    <view :class="['emotion-btn-uncertain', { active: selectedEmotion === 'unsure' }]" data-emotion="unsure" @tap="onEmotionTap">
      <text class="emotion-emoji">🤔</text>
      <text class="emotion-label">唔，不太确定...</text>
    </view>

    <!-- Hint text -->
    <text class="emotion-hint">我们会根据你的选择匹配最合适的练习。如果感受不符，随时可以重新选择。</text>
  </view>

  <!-- Quick-Awareness Card -->
  <view class="quick-card" @tap="goQuick">
    <text class="quick-icon">⚡</text>
    <view class="quick-info">
      <text class="quick-title">快速觉察</text>
      <text class="quick-desc">用 AI 引导，四步记录此刻的情绪</text>
    </view>
    <text class="quick-arrow">→</text>
  </view>

  <!-- Practice card -->
  <view :class="['practice-card', { linked: selectedEmotion }]">
    <view class="practice-body" @tap="onPracticeTap">
      <text class="practice-badge">{{practiceContent.badge}}</text>
      <text class="practice-title">{{practiceContent.title}}</text>
      <text class="practice-desc">{{practiceContent.desc}}</text>

      <!-- Practice state label -->
      <view class="practice-state" v-if="practiceState">
        <text class="practice-state-icon">{{practiceState.icon}}</text>
        <text class="practice-state-label">{{practiceState.label}}</text>
      </view>

      <!-- Duration chips -->
      <view class="duration-row">
        <view :class="['duration-chip', { active: selectedDuration === 'short' }]" data-duration="short" @tap.stop="onDurationSelect">
          <text class="duration-chip-label">1 分钟</text>
          <text class="duration-chip-desc">快速</text>
        </view>
        <view :class="['duration-chip', { active: selectedDuration === 'medium' }]" data-duration="medium" @tap.stop="onDurationSelect">
          <text class="duration-chip-label">3 分钟</text>
          <text class="duration-chip-desc">适中</text>
        </view>
        <view :class="['duration-chip', { active: selectedDuration === 'long' }]" data-duration="long" @tap.stop="onDurationSelect">
          <text class="duration-chip-label">5 分钟</text>
          <text class="duration-chip-desc">深入</text>
        </view>
      </view>

      <view class="practice-btn">
        <text>{{practiceContent.cta}}</text>
        <text class="practice-btn-arrow">→</text>
      </view>
    </view>
  </view>

  <!-- Quick entries -->
  <view class="quick-section">
    <text class="section-title-sm">热门推荐</text>
    <scroll-view class="quick-scroll" scroll-x enable-flex>
      <view :class="['quick-chip', item.key]" v-for="(item, index) in quickEntries" :key="item.key" :data-key="item.key" @tap="onQuickEntry">
        <text class="quick-icon">{{item.icon}}</text>
        <text class="quick-label">{{item.label}}</text>
      </view>
    </scroll-view>
  </view>

  <onboarding-guide v-if="showOnboarding" />
  <transition-guide v-if="showTransition" />
</view>

<!-- Confirm dialog overlay -->
<view class="confirm-overlay" v-if="showConfirm" @tap.stop="onConfirmCancel">
  <view class="confirm-card" @tap.stop="">
    <text class="confirm-emoji">{{confirmInfo.emoji}}</text>
    <text class="confirm-title">{{confirmInfo.title}}</text>
    <text class="confirm-desc">{{confirmInfo.desc}}</text>
    <view class="confirm-practice">
      <text class="confirm-practice-label">推荐练习</text>
      <text class="confirm-practice-name">{{confirmInfo.practiceName}}</text>
    </view>
    <view class="confirm-actions">
      <view class="btn btn-primary btn-md" @tap="onConfirmStart">开始练习</view>
      <view class="btn btn-ghost btn-md" @tap="onConfirmCancel">再想想</view>
    </view>
  </view>
</view>
</template>

<script>
const QUOTES = [
  '这一刻，就是你拥有的一切',
  '呼吸，是回到当下的锚',
  '觉察，即是改变的开始',
  '不需要完美，只需要真实',
  '情绪来了，也会走',
  '你已经在努力了，这本身就值得肯定',
  '每一步，都在回家的路上',
  '静下来，才能听见内心的声音',
  '今天的你，比昨天更靠近自己',
  '温柔地对待自己，就像对待最好的朋友'
]

const PRACTICE_MAP = {
  anxiety: {
    badge: '焦虑安抚',
    title: '4-7-8 呼吸',
    desc: '延长呼气，激活副交感神经，让紧绷慢慢松开',
    cta: '开始练习'
  },
  anger: {
    badge: '愤怒降温',
    title: '箱式呼吸',
    desc: '规整呼吸节奏，给情绪一个缓冲的空间',
    cta: '开始练习'
  },
  low: {
    badge: '温和陪伴',
    title: '身体扫描',
    desc: '从身体感受入手，不着急改变，只是陪伴',
    cta: '开始练习'
  },
  tangled: {
    badge: '思维梳理',
    title: '观察思维',
    desc: '退后一步，看清思维的流动，不再被带走',
    cta: '开始练习'
  },
  unsure: {
    badge: '探索',
    title: '3 分钟安定身心',
    desc: '不确定也没关系，先回到呼吸，和自己待一会儿',
    cta: '开始探索'
  }
}

const CONFIRM_MESSAGES = {
  anxiety: {
    emoji: '😟',
    title: '感受到「焦虑」了吗？',
    desc: '我懂你。当我们焦虑时，呼吸往往会变得浅而急促。让我陪你一起，用呼吸找回安稳。',
    practiceName: '4-7-8 呼吸'
  },
  anger: {
    emoji: '😡',
    title: '心里有团火在烧。',
    desc: '愤怒是能量，但不需要被它控制。先给情绪一个缓冲的空间，让呼吸把温度降下来。',
    practiceName: '箱式呼吸'
  },
  low: {
    emoji: '😔',
    title: '今天有点沉，是吗？',
    desc: '没关系的。不想说话、不想动，那就先陪陪自己的身体。不着急改变，只是和这一刻在一起。',
    practiceName: '身体扫描'
  },
  tangled: {
    emoji: '🌀',
    title: '脑子里很乱？',
    desc: '思绪太多的时候，我们需要一个"观察者的位置"。退后一步，看清它们的流动，不再被带走。',
    practiceName: '观察思维'
  },
  unsure: {
    emoji: '🤔',
    title: '不确定也没关系。',
    desc: '不是必须定义自己的感受。有时候只是需要停下来，呼吸，和自己待一会儿。',
    practiceName: '3 分钟安定身心'
  }
}

const DEFAULT_PRACTICE = {
  badge: '情绪急救',
  title: '快速平复情绪',
  desc: '当情绪来袭时，从这里获得即时帮助',
  cta: '开始急救'
}

const QUICK_ENTRIES = [
  { key: 'sleep', icon: '🌙', label: '助眠' },
  { key: 'morning', icon: '☀️', label: '晨间唤醒' },
  { key: 'release', icon: '🌊', label: '情绪释放' },
  { key: 'focus', icon: '🎯', label: '专注力' },
  { key: 'scan', icon: '🫀', label: '身体扫描' }
]

const DURATION_LABELS = {
  short: { minute: 1, label: '1 分钟' },
  medium: { minute: 3, label: '3 分钟' },
  long: { minute: 5, label: '5 分钟' }
}

import OnboardingGuide from '@/components/onboarding-guide.vue'
import TransitionGuide from '@/components/transition-guide.vue'

export default {
  components: { OnboardingGuide, TransitionGuide },
  data() {
    return {
      selectedEmotion: '',
      streakDays: 0,
      weeklyMinutes: 0,
      dailyQuote: '',
      timeGreeting: '',
      practiceContent: DEFAULT_PRACTICE,
      quickEntries: QUICK_ENTRIES,
      showConfirm: false,
      confirmInfo: {},
      selectedDuration: 'medium',
      practiceState: null,
      practiceCount: 0,
      showOnboarding: false,
      showTransition: false
    }
  },

  onLoad() {
    this.loadDailyQuote()
    this.updateTimeGreeting()
    this.loadPracticeState()
  },

  onShow() {
    this.loadStreakData()
    this.loadWeeklyMinutes()
    this.loadPracticeState()
  },

  onShareAppMessage() {
    return { title: '此刻 · Being — 回到当下的正念练习', path: '/pages/index/index' }
  },

  methods: {
    loadStreakData() {
      const streakDays = uni.getStorageSync('streakDays') || 0
      this.streakDays = streakDays
    },

    loadWeeklyMinutes() {
      const entries = uni.getStorageSync('pendingEntries') || []
      const now = Date.now()
      const weekMs = 7 * 86400000
      let total = 0
      entries.forEach(e => {
        const t = e.timestamp || e.createTime || 0
        if (t > now - weekMs) {
          total += e.recoveryMinutes || 0
        }
      })
      this.weeklyMinutes = total
    },

    loadPracticeState() {
      const count = uni.getStorageSync('practice_completed_count') || 0
      const streak = uni.getStorageSync('streakDays') || 0
      let state = null
      if (count === 0) {
        state = { icon: '🌱', label: '首次练习' }
      } else if (streak >= 7) {
        state = { icon: '🔥', label: `连续 ${streak} 天 · 已完成 ${count} 次` }
      } else if (streak >= 3) {
        state = { icon: '✨', label: `连续 ${streak} 天 · 已完成 ${count} 次` }
      } else {
        state = { icon: '💪', label: `已完成 ${count} 次` }
      }
      this.practiceState = state
      this.practiceCount = count
    },

    loadDailyQuote() {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
      const quote = QUOTES[dayOfYear % QUOTES.length]
      this.dailyQuote = quote
    },

    updateTimeGreeting() {
      const hour = new Date().getHours()
      let greeting = ''
      if (hour < 5) greeting = '夜深了 🌙'
      else if (hour < 12) greeting = '☀️ 早安'
      else if (hour < 14) greeting = '午后时光'
      else if (hour < 18) greeting = '下午好'
      else if (hour < 22) greeting = '🌅 晚上好'
      else greeting = '夜深了 🌙'
      this.timeGreeting = greeting
    },

    onEmotionTap(e) {
      const emotion = e.currentTarget.dataset.emotion
      uni.vibrateShort({ type: 'light' }).catch(() => {})

      if (this.selectedEmotion === emotion) {
        // Deselect
        this.selectedEmotion = ''
        this.practiceContent = DEFAULT_PRACTICE
        return
      }

      this.selectedEmotion = emotion
      this.practiceContent = PRACTICE_MAP[emotion] || DEFAULT_PRACTICE

      // Show confirm dialog
      const confirmInfo = CONFIRM_MESSAGES[emotion] || CONFIRM_MESSAGES.unsure
      this.showConfirm = true
      this.confirmInfo = confirmInfo
    },

    onPracticeTap() {
      // Tapping the practice card body opens confirm too when an emotion is selected
      if (this.selectedEmotion) {
        const confirmInfo = CONFIRM_MESSAGES[this.selectedEmotion] || CONFIRM_MESSAGES.unsure
        this.showConfirm = true
        this.confirmInfo = confirmInfo
      } else {
        uni.navigateTo({ url: '/pages/emergency/index' })
      }
    },

    onConfirmStart() {
      this.showConfirm = false
      const selectedEmotion = this.selectedEmotion
      const selectedDuration = this.selectedDuration

      if (!selectedEmotion || selectedEmotion === 'unsure') {
        uni.setStorageSync('practiceText', '3 分钟安定身心\n\n找一个舒服的姿势坐好。\n\n闭上眼睛，把注意力轻轻放在呼吸上。\n\n吸气——知道自己在吸气。\n呼气——知道自己在呼气。\n\n不需要改变什么，只是观察。\n\n思绪飘走了，没关系，温柔地把注意力带回来。\n\n就这样，和自己安安静静地待一会儿。')
        uni.navigateTo({ url: '/pages/practice/index?path=presence&lessonId=guided' })
        return
      }

      // Add duration param to practice navigation
      const duration = DURATION_LABELS[selectedDuration] || DURATION_LABELS.medium

      if (selectedEmotion === 'anxiety' || selectedEmotion === 'anger') {
        uni.navigateTo({
          url: `/pages/breath/index?duration=${duration.minute}&source=emotion_${selectedEmotion}`
        })
      } else {
        const practiceText = selectedEmotion === 'tangled'
          ? '观察思维\n\n找一个舒服的姿势坐好，闭上眼睛。\n\n想象你坐在一条河边，河上漂着树叶。每一片叶子，都是一个念头。\n\n不要跳进河里，只是看着叶子一片片漂过。\n\n有的叶子大，有的叶子小，有的漂得快，有的慢。\n\n你不需要抓住任何一片，也不需要推开任何一片。\n\n你就是那个观察者。\n\n安静地，和自己待一会儿。'
          : '身体扫描\n\n躺下或坐着，闭上眼睛。\n\n把注意力带到头顶，感受头皮的温度、发丝的重量。\n\n慢慢向下——眉心、眼睑、脸颊、下巴，有没有哪里在紧绷？\n\n只是注意到它，不需要改变什么。\n\n继续向下——颈部、肩膀、手臂、手心。\n\n胸口——感受呼吸的起伏。\n\n腹部——随着吸气轻轻鼓起，呼气自然回落。\n\n臀部、大腿、小腿、脚掌。\n\n全身都在这里，完整、真实。\n\n带着这份觉察，慢慢睁开眼睛。'

        uni.setStorageSync('practiceText', practiceText)
        uni.navigateTo({
          url: `/pages/practice/index?path=presence&lessonId=guided&duration=${duration.minute}`
        })
      }
    },

    onConfirmCancel() {
      this.showConfirm = false
      // Keep the emotion selected so user can see the practice card
    },

    onDurationSelect(e) {
      const duration = e.currentTarget.dataset.duration
      if (duration !== this.selectedDuration) {
        uni.vibrateShort({ type: 'light' }).catch(() => {})
        this.selectedDuration = duration
      }
    },

    goPractice() {
      // Called when tapping the CTA button directly
      // Now handled via onPracticeTap -> confirm dialog flow
      if (this.selectedEmotion) {
        const confirmInfo = CONFIRM_MESSAGES[this.selectedEmotion] || CONFIRM_MESSAGES.unsure
        this.showConfirm = true
        this.confirmInfo = confirmInfo
      } else {
        uni.navigateTo({ url: '/pages/emergency/index' })
      }
    },

    goQuick() {
      uni.navigateTo({ url: '/pages/quick/index' })
    },

    onQuickEntry(e) {
      const key = e.currentTarget.dataset.key
      uni.vibrateShort({ type: 'light' }).catch(() => {})

      switch (key) {
        case 'sleep':
          uni.navigateTo({ url: '/pages/breath/index' })
          break
        case 'morning':
          uni.navigateTo({ url: '/pages/breath/index' })
          break
        case 'release':
          uni.navigateTo({ url: '/pages/emergency/index' })
          break
        case 'focus':
          uni.navigateTo({ url: '/pages/breath/index' })
          break
        case 'scan':
          const bodyScanText = '身体扫描\n\n躺下或坐着，闭上眼睛。\n\n把注意力带到头顶，感受头皮的温度。\n\n慢慢向下扫描全身——眉心、眼睑、脸颊、下巴。\n\n颈部、肩膀、手臂、手心。\n\n胸口、腹部、臀部、大腿、小腿、脚掌。\n\n全身都在这里，完整、真实。'
          uni.setStorageSync('practiceText', bodyScanText)
          uni.navigateTo({ url: '/pages/practice/index?path=presence&lessonId=guided' })
          break
      }
    },

    goEmergency() {
      uni.navigateTo({ url: '/pages/emergency/index' })
    },

    goBreath() {
      uni.navigateTo({ url: '/pages/breath/index' })
    },

    goDialogue() {
      uni.navigateTo({ url: '/pages/dialogue/index' })
    },

    goProfile() {
      uni.switchTab({ url: '/pages/profile/index' })
    },

    onRecommendTap(e) {
      const path = e.currentTarget.dataset.path
      const index = e.currentTarget.dataset.index
      const map = [
        { path: 'presence', lessonIndex: 0 },
        { path: 'openness', lessonIndex: 2 }
      ]
      const rec = map[index] || map[0]
      uni.navigateTo({
        url: `/pages/learning/lesson/index?path=${rec.path}&lessonIndex=${rec.lessonIndex}`
      })
    }
  }
}
</script>

<style scoped>
/* 首页 — 沉浸深色风格 */

.page-bg {
  position: fixed; inset: 0;
  background: linear-gradient(180deg, #5C4F42 0%, #3E342B 50%, #2A231D 100%);
  z-index: 0;
}
.page-glow {
  position: fixed; top: 50%; left: 50%;
  width: 600rpx; height: 600rpx;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(198, 156, 109, 0.10) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none; z-index: 0;
}

.container {
  position: relative; z-index: 1;
  min-height: 100vh;
  padding: calc(120rpx + env(safe-area-inset-top)) 40rpx calc(160rpx + env(safe-area-inset-bottom));
  color: #FDFBF7;
}

/* ====== Header ====== */
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 32rpx;
}
.page-title {
  font-family: 'Songti SC', 'Noto Serif CJK SC', Georgia, serif;
  font-size: 48rpx; font-weight: 700; color: #C69C6D;
  letter-spacing: 2rpx;
}
.header-right { display: flex; align-items: center; gap: 16rpx; }
.streak-badge {
  display: flex; align-items: center; gap: 6rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 40rpx; padding: 10rpx 20rpx;
}
.streak-badge:active { opacity: 0.6; }
.streak-icon { font-size: 28rpx; }
.streak-text { font-size: 26rpx; color: #FDFBF7; font-weight: 600; }
.header-user {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
}
.header-user:active { opacity: 0.6; }
.header-user-icon { font-size: 36rpx; }

/* ====== Mood card ====== */
.mood-card {
  border-radius: 32rpx;
  height: 400rpx;
  margin-bottom: 40rpx;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.mood-bg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.mood-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(42,35,29,0.25) 0%, rgba(42,35,29,0.60) 100%);
}
.mood-content {
  position: relative; z-index: 1;
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  padding: 40rpx;
}
.mood-time {
  font-size: 30rpx; color: rgba(255,255,255,0.7);
  display: block; margin-bottom: 12rpx; letter-spacing: 2rpx;
}
.mood-quote {
  font-size: 34rpx; color: #FDFBF7;
  display: block; text-align: center; line-height: 1.6;
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  letter-spacing: 2rpx;
  text-shadow: 0 2rpx 16rpx rgba(0,0,0,0.25);
}
.mood-footer {
  position: relative; z-index: 1;
  padding: 0 40rpx 24rpx;
  display: flex; justify-content: center;
}
.mood-focus {
  font-size: 24rpx; color: rgba(255,255,255,0.5);
  letter-spacing: 1rpx; background: rgba(0,0,0,0.2);
  padding: 8rpx 20rpx; border-radius: 40rpx;
}

/* ====== Emotion section ====== */
.emotion-section { margin-bottom: 32rpx; }
.section-title {
  font-size: 36rpx; font-weight: 700; color: #FDFBF7;
  display: block; margin-bottom: 8rpx;
}
.section-subtitle {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  display: block; margin-bottom: 24rpx;
}
.emotion-grid { display: flex; gap: 16rpx; }
.emotion-btn {
  flex: 1;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 24rpx; padding: 24rpx 8rpx;
  display: flex; flex-direction: column;
  align-items: center; gap: 12rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
  transition: all 0.2s;
}
.emotion-btn:active { transform: scale(0.94); }
.emotion-btn.active {
  background: rgba(198,156,109,0.10);
  border-color: #C69C6D;
  box-shadow: 0 0 24rpx rgba(198,156,109,0.08);
  transform: translateY(-4rpx);
}
.emotion-emoji { font-size: 52rpx; display: block; line-height: 1; }
.emotion-label {
  font-size: 26rpx; color: rgba(255,255,255,0.5);
  font-weight: 500; display: block;
}
.emotion-btn.active .emotion-label { color: #FDFBF7; }

/* 5th option: uncertain */
.emotion-btn-uncertain {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  background: rgba(255,255,255,0.03);
  border: 2rpx dashed rgba(255,255,255,0.10);
  border-radius: 24rpx; padding: 20rpx;
  margin-top: 16rpx;
  transition: all 0.2s;
}
.emotion-btn-uncertain:active { transform: scale(0.97); }
.emotion-btn-uncertain.active {
  border-color: #C69C6D;
  background: rgba(198,156,109,0.06);
  border-style: solid;
}
.emotion-btn-uncertain .emotion-emoji { font-size: 36rpx; }
.emotion-btn-uncertain .emotion-label {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  font-weight: 400;
}
.emotion-btn-uncertain.active .emotion-label { color: #FDFBF7; }

/* Hint text */
.emotion-hint {
  display: block;
  font-size: 22rpx; color: rgba(255,255,255,0.25);
  text-align: center;
  margin-top: 16rpx;
  line-height: 1.5;
}

/* ====== Quick-Awareness Card ====== */
.quick-card {
  display: flex; align-items: center; gap: 24rpx;
  margin: 32rpx 32rpx 0; padding: 32rpx;
  background: linear-gradient(135deg, #3A3229, #2A231D);
  border: 1rpx solid rgba(196,160,106,.35);
  border-radius: 24rpx;
}
.quick-icon { font-size: 56rpx; }
.quick-info { flex: 1; display: flex; flex-direction: column; }
.quick-title { color: #E8DFD0; font-size: 34rpx; font-weight: 600; }
.quick-desc { color: #C4C0B8; font-size: 24rpx; margin-top: 8rpx; }
.quick-arrow { color: #C4A06A; font-size: 36rpx; }

/* ====== Practice card ====== */
.practice-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 32rpx; padding: 40rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
  transition: all 0.3s;
  margin-bottom: 40rpx;
}
.practice-card:active { transform: scale(0.98); }
.practice-card.linked {
  border-color: rgba(198,156,109,0.3);
  background: rgba(198,156,109,0.04);
}
.practice-badge {
  font-size: 28rpx; color: rgba(255,255,255,0.4);
  display: block; margin-bottom: 12rpx;
}
.practice-card.linked .practice-badge { color: #C69C6D; }
.practice-title {
  font-size: 38rpx; font-weight: 700; color: #FDFBF7;
  display: block; margin-bottom: 8rpx; line-height: 1.3;
}
.practice-desc {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  display: block; margin-bottom: 32rpx;
}

/* Practice state */
.practice-state {
  display: flex; align-items: center; gap: 8rpx;
  margin-bottom: 24rpx;
}
.practice-state-icon { font-size: 28rpx; }
.practice-state-label {
  font-size: 24rpx; color: rgba(255,255,255,0.4);
  font-weight: 400;
}

/* Duration chips */
.duration-row {
  display: flex; gap: 12rpx;
  margin-bottom: 28rpx;
}
.duration-chip {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(255,255,255,0.08);
  border-radius: 20rpx; padding: 16rpx 8rpx;
  transition: all 0.2s;
}
.duration-chip:active { transform: scale(0.94); }
.duration-chip.active {
  background: rgba(198,156,109,0.10);
  border-color: #C69C6D;
}
.duration-chip-label {
  font-size: 26rpx; color: rgba(255,255,255,0.6);
  font-weight: 600;
}
.duration-chip.active .duration-chip-label { color: #FDFBF7; }
.duration-chip-desc {
  font-size: 20rpx; color: rgba(255,255,255,0.25);
}
.duration-chip.active .duration-chip-desc { color: rgba(198,156,109,0.6); }

.practice-btn {
  display: inline-flex; align-items: center; gap: 8rpx;
  padding: 20rpx 36rpx;
  border-radius: 40rpx;
  background: #C69C6D; color: #FDFBF7;
  font-size: 28rpx; font-weight: 600;
}
.practice-btn:active { opacity: 0.85; }
.practice-btn-arrow { font-size: 32rpx; }

/* ====== Quick entries ====== */
.quick-section { margin-bottom: 24rpx; }
.section-title-sm {
  font-size: 30rpx; font-weight: 600; color: rgba(255,255,255,0.7);
  display: block; margin-bottom: 16rpx;
}
.quick-scroll {
  display: flex; flex-direction: row;
  white-space: nowrap;
  padding-bottom: 8rpx;
}
.quick-chip {
  display: inline-flex; align-items: center; gap: 10rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(255,255,255,0.06);
  border-radius: 40rpx;
  padding: 20rpx 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.quick-chip:active { transform: scale(0.94); }
.quick-icon { font-size: 36rpx; }
.quick-label { font-size: 26rpx; color: #FDFBF7; font-weight: 500; }

/* ====== Confirm overlay ====== */
.confirm-overlay {
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
.confirm-card {
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
.confirm-emoji { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
.confirm-title {
  font-size: 36rpx; font-weight: 700; color: #FDFBF7;
  display: block; text-align: center; margin-bottom: 16rpx;
}
.confirm-desc {
  font-size: 28rpx; color: rgba(255,255,255,0.6);
  display: block; text-align: center; line-height: 1.7;
  margin-bottom: 32rpx;
}
.confirm-practice {
  display: flex; flex-direction: column; align-items: center;
  gap: 6rpx; margin-bottom: 36rpx;
  padding: 20rpx 32rpx;
  background: rgba(198,156,109,0.06);
  border-radius: 20rpx;
  width: 100%;
}
.confirm-practice-label {
  font-size: 22rpx; color: rgba(255,255,255,0.3);
  letter-spacing: 2rpx;
}
.confirm-practice-name {
  font-size: 30rpx; color: #C69C6D; font-weight: 600;
}
.confirm-actions {
  display: flex; flex-direction: column; gap: 16rpx;
  width: 100%;
}
.confirm-actions .btn-primary {
  width: 100%; padding: 24rpx;
  font-size: 30rpx; border-radius: 40rpx;
}
.confirm-actions .btn-ghost {
  width: 100%; padding: 20rpx;
  font-size: 26rpx; border-radius: 40rpx;
  color: rgba(255,255,255,0.35);
  border: none;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
