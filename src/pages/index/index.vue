<template>
<view class="theme-root" :class="isDark ? 'theme-dark' : 'theme-light'">
<view class="page-bg"></view>
<view class="page-glow"></view>

<view class="container">
  <!-- Header -->
  <view class="page-header">
    <text class="page-title">此刻 · Being</text>
    <view class="header-right">
      <view class="checkin-btn" :class="{ checked: checkedInToday }" @tap="doCheckin">
        <text class="checkin-icon">{{checkedInToday ? '✅' : '☀️'}}</text>
        <text class="checkin-text">{{checkedInToday ? '已签到' : '签到'}}</text>
      </view>
      <view class="header-user" @tap="goProfile">
        <text class="header-user-icon">👤</text>
      </view>
    </view>
  </view>

  <!-- Mood card -->
  <view class="mood-card">
    <view class="mood-gradient"></view>
    <view class="mood-content">
      <text class="mood-time">{{timeGreeting}}</text>
      <text class="mood-quote">{{dailyQuote}}</text>
    </view>
    <view class="mood-footer">
      <view class="mood-stat" @tap="goProfile">
        <text class="mood-stat-icon">🔥</text>
        <text class="mood-stat-text">{{streakDays}} 天</text>
      </view>
      <view class="mood-stat">
        <text class="mood-stat-icon">⏱</text>
        <text class="mood-stat-text">{{weeklyMinutes}} 分钟</text>
      </view>
    </view>
  </view>

  <!-- Quick-Awareness Card — time-aware copy -->
  <view class="quick-card" @tap="goQuick">
    <view class="quick-glow"></view>
    <text class="quick-icon">⚡</text>
    <view class="quick-info">
      <text class="quick-title">{{quickAwarenessTitle}}</text>
      <text class="quick-desc">{{quickAwarenessDesc}}</text>
    </view>
    <text class="quick-arrow">→</text>
  </view>

  <!-- Emotion section — tap to start directly, no confirm dialog -->
  <view class="emotion-section">
    <text class="section-title">此刻的你，感受如何？</text>
    <text class="section-subtitle">选择一个最贴近的情绪，直接开始练习</text>

    <view class="emotion-grid">
      <view class="emotion-btn" data-emotion="anxiety" @tap="onEmotionTap">
        <text class="emotion-emoji">😟</text>
        <text class="emotion-label">焦虑</text>
        <text class="emotion-tip">4-7-8 呼吸</text>
      </view>
      <view class="emotion-btn" data-emotion="anger" @tap="onEmotionTap">
        <text class="emotion-emoji">😡</text>
        <text class="emotion-label">愤怒</text>
        <text class="emotion-tip">箱式呼吸</text>
      </view>
      <view class="emotion-btn" data-emotion="low" @tap="onEmotionTap">
        <text class="emotion-emoji">😔</text>
        <text class="emotion-label">低落</text>
        <text class="emotion-tip">身体扫描</text>
      </view>
      <view class="emotion-btn" data-emotion="tangled" @tap="onEmotionTap">
        <text class="emotion-emoji">🌀</text>
        <text class="emotion-label">纠结</text>
        <text class="emotion-tip">观察思维</text>
      </view>
    </view>

    <view class="emotion-btn-uncertain" data-emotion="unsure" @tap="onEmotionTap">
      <text class="emotion-emoji">🤔</text>
      <text class="emotion-label">不太确定，先安顿一下</text>
    </view>
  </view>

  <!-- 为你推荐 — personalized -->
  <view class="recommend-section" v-if="recommendations.length > 0">
    <text class="section-title-sm">{{recSectionTitle}}</text>
    <scroll-view class="rec-scroll" scroll-x enable-flex>
      <view class="rec-chip" v-for="(item, index) in recommendations" :key="item.key" :data-rec="item" @tap="onRecTap">
        <text class="rec-icon">{{item.icon}}</text>
        <view class="rec-info">
          <text class="rec-label">{{item.label}}</text>
          <text class="rec-desc">{{item.desc}}</text>
        </view>
      </view>
    </scroll-view>
  </view>

  <onboarding-guide v-if="showOnboarding" />
  <transition-guide v-if="showTransition" />
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
      streakDays: 0,
      weeklyMinutes: 0,
      dailyQuote: '',
      timeGreeting: '',
      checkedInToday: false,
      quickAwarenessTitle: '快速觉察',
      quickAwarenessDesc: '用 AI 引导，四步记录此刻的情绪',
      recSectionTitle: '为你推荐',
      recommendations: [],
      showOnboarding: false,
      showTransition: false,
      isDark: true
    }
  },

  onLoad() {
    this.loadDailyQuote()
    this.updateTimeGreeting()
    this.updateTheme()
  },

  onShow() {
    this.updateTheme()
    this.loadStreakData()
    this.loadWeeklyMinutes()
    this.updateCheckinState()
    this.updateQuickAwarenessCopy()
    this.buildRecommendations()
  },

  onShareAppMessage() {
    return { title: '此刻 · Being — 回到当下的正念练习', path: '/pages/index/index' }
  },

  methods: {
    loadStreakData() {
      this.streakDays = uni.getStorageSync('streakDays') || 0
    },

    loadWeeklyMinutes() {
      const entries = uni.getStorageSync('pendingEntries') || []
      const now = Date.now()
      const weekMs = 7 * 86400000
      let total = 0
      entries.forEach(e => {
        const t = e.timestamp || e.createTime || 0
        if (t > now - weekMs) total += e.recoveryMinutes || 0
      })
      this.weeklyMinutes = total
    },

    loadDailyQuote() {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
      this.dailyQuote = QUOTES[dayOfYear % QUOTES.length]
    },

    updateTimeGreeting() {
      const hour = new Date().getHours()
      if (hour < 5) this.timeGreeting = '夜深了 🌙'
      else if (hour < 12) this.timeGreeting = '☀️ 早安'
      else if (hour < 14) this.timeGreeting = '午后时光'
      else if (hour < 18) this.timeGreeting = '下午好'
      else if (hour < 22) this.timeGreeting = '🌅 晚上好'
      else this.timeGreeting = '夜深了 🌙'
    },

    // ─── Check-in ──────────────────────────────────────────────
    updateCheckinState() {
      const lastDate = uni.getStorageSync('lastCheckInDate') || ''
      const today = this.formatDateStr(new Date())
      this.checkedInToday = lastDate === today
    },

    doCheckin() {
      if (this.checkedInToday) {
        uni.showToast({ title: '今日已签到 ✅', icon: 'none' })
        return
      }
      const today = this.formatDateStr(new Date())
      const lastDate = uni.getStorageSync('lastCheckInDate') || ''
      let streak = uni.getStorageSync('streakDays') || 0

      // Check if streak continues
      const yesterday = this.formatDateStr(new Date(Date.now() - 86400000))
      if (lastDate === yesterday) {
        streak += 1
      } else if (lastDate !== today) {
        streak = 1
      }

      uni.setStorageSync('lastCheckInDate', today)
      uni.setStorageSync('streakDays', streak)
      this.streakDays = streak
      this.checkedInToday = true

      // Add check-in coin
      const coins = uni.getStorageSync('awakeningCoins') || 0
      uni.setStorageSync('awakeningCoins', coins + 1)
      const ledger = uni.getStorageSync('coinLedger') || []
      ledger.unshift({
        amount: 1,
        source: '每日签到',
        balance: coins + 1,
        time: new Date().toISOString()
      })
      uni.setStorageSync('coinLedger', ledger.slice(0, 500))

      uni.showToast({ title: `签到成功！连续 ${streak} 天 🔥`, icon: 'success' })
    },

    formatDateStr(d) {
      const y = d.getFullYear()
      const m = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      return `${y}-${m}-${day}`
    },

    // ─── Quick Awareness time-aware copy ───────────────────────
    updateQuickAwarenessCopy() {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 9) {
        this.quickAwarenessTitle = '晨间觉察'
        this.quickAwarenessDesc = '用 3 分钟开启清醒而专注的一天'
      } else if (hour >= 20 || hour < 1) {
        this.quickAwarenessTitle = '一次觉察'
        this.quickAwarenessDesc = '今天有什么在你心里留下了痕迹？'
      } else {
        this.quickAwarenessTitle = '快速觉察'
        this.quickAwarenessDesc = '用 AI 引导，四步记录此刻的情绪'
      }
    },

    // ─── Emotion → direct navigation (no confirm dialog) ──────
    onEmotionTap(e) {
      const emotion = e.currentTarget.dataset.emotion
      uni.vibrateShort({ type: 'light' }).catch(() => {})

      if (emotion === 'unsure') {
        uni.setStorageSync('practiceText',
          '3 分钟安定身心\n\n找一个舒服的姿势坐好。\n\n闭上眼睛，把注意力轻轻放在呼吸上。\n\n吸气——知道自己在吸气。\n呼气——知道自己在呼气。\n\n不需要改变什么，只是观察。\n\n思绪飘走了，没关系，温柔地把注意力带回来。\n\n就这样，和自己安安静静地待一会儿。')
        uni.navigateTo({ url: '/pages/practice/index?path=presence&lessonId=guided' })
        return
      }

      if (emotion === 'anxiety' || emotion === 'anger') {
        const dur = DURATION_LABELS.medium
        uni.navigateTo({ url: `/pages/breath/index?duration=${dur.minute}&source=emotion_${emotion}` })
      } else {
        const practiceText = emotion === 'tangled'
          ? '观察思维\n\n找一个舒服的姿势坐好，闭上眼睛。\n\n想象你坐在一条河边，河上漂着树叶。每一片叶子，都是一个念头。\n\n不要跳进河里，只是看着叶子一片片漂过。\n\n有的叶子大，有的叶子小，有的漂得快，有的慢。\n\n你不需要抓住任何一片，也不需要推开任何一片。\n\n你就是那个观察者。\n\n安静地，和自己待一会儿。'
          : '身体扫描\n\n躺下或坐着，闭上眼睛。\n\n把注意力带到头顶，感受头皮的温度、发丝的重量。\n\n慢慢向下——眉心、眼睑、脸颊、下巴，有没有哪里在紧绷？\n\n只是注意到它，不需要改变什么。\n\n继续向下——颈部、肩膀、手臂、手心。\n\n胸口——感受呼吸的起伏。\n\n腹部——随着吸气轻轻鼓起，呼气自然回落。\n\n臀部、大腿、小腿、脚掌。\n\n全身都在这里，完整、真实。\n\n带着这份觉察，慢慢睁开眼睛。'
        uni.setStorageSync('practiceText', practiceText)
        uni.navigateTo({ url: `/pages/practice/index?path=presence&lessonId=guided&duration=3` })
      }
    },

    // ─── Personalized recommendations ──────────────────────────
    buildRecommendations() {
      const hour = new Date().getHours()
      const entries = uni.getStorageSync('pendingEntries') || []
      const practiceCount = uni.getStorageSync('practice_completed_count') || 0
      const recs = []

      // New user guidance
      if (practiceCount < 3) {
        recs.push({ key: 'beginner', icon: '🌱', label: '新手指南', desc: '3 分钟认识正念练习' })
      }

      // Time-based
      if (hour >= 22 || hour < 1) {
        recs.push({ key: 'sleep', icon: '🌙', label: '睡前放松', desc: '放下今日，安心入眠' })
      } else if (hour >= 6 && hour < 9) {
        recs.push({ key: 'morning', icon: '☀️', label: '晨间唤醒', desc: '用呼吸激活身体' })
      }

      // Top emotion in last 7 days
      const weekMs = 7 * 86400000
      const now = Date.now()
      const recentEntries = entries.filter(e => {
        const t = e.timestamp || e.createTime || 0
        return t > now - weekMs
      })
      if (recentEntries.length > 0) {
        const counts = {}
        recentEntries.forEach(e => { counts[e.emotionType] = (counts[e.emotionType] || 0) + 1 })
        const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        if (topType === 'anxiety') {
          recs.push({ key: 'anxiety_relief', icon: '😟', label: '焦虑安抚', desc: '最近出现较多，试试 4-7-8 呼吸' })
        } else if (topType === 'low') {
          recs.push({ key: 'body_scan', icon: '🫀', label: '身体扫描', desc: '温和陪伴低落的时刻' })
        } else if (topType === 'anger') {
          recs.push({ key: 'release', icon: '🌊', label: '情绪释放', desc: '让愤怒的能量安全流过' })
        } else if (topType === 'tangled') {
          recs.push({ key: 'focus', icon: '🎯', label: '理清思路', desc: '观察思维，不被念头带走' })
        }
      }

      // Continue last practice
      if (recentEntries.length > 0) {
        recs.push({ key: 'emergency', icon: '🧘', label: '情绪急救', desc: '随时可用的快速平复工具' })
      }

      // Always include one general entry if list is short
      if (recs.length < 3) {
        if (!recs.find(r => r.key === 'emergency')) {
          recs.push({ key: 'emergency', icon: '🧘', label: '情绪急救', desc: '当情绪来袭时的即时帮助' })
        }
        if (!recs.find(r => r.key === 'breath')) {
          recs.push({ key: 'breath', icon: '🫁', label: '呼吸练习', desc: '回到当下最简单的方式' })
        }
      }

      this.recommendations = recs.slice(0, 5)
    },

    onRecTap(e) {
      const rec = e.currentTarget.dataset.rec
      uni.vibrateShort({ type: 'light' }).catch(() => {})

      switch (rec.key) {
        case 'beginner':
          uni.navigateTo({ url: '/pages/learning/lesson/index?path=presence&lessonIndex=0' })
          break
        case 'sleep':
        case 'morning':
        case 'breath':
          uni.navigateTo({ url: '/pages/breath/index' })
          break
        case 'release':
        case 'emergency':
          uni.navigateTo({ url: '/pages/emergency/index' })
          break
        case 'anxiety_relief':
          uni.navigateTo({ url: '/pages/breath/index?duration=3&source=emotion_anxiety' })
          break
        case 'body_scan': {
          const scanText = '身体扫描\n\n躺下或坐着，闭上眼睛。\n\n把注意力带到头顶，感受头皮的温度。\n\n慢慢向下扫描全身——眉心、脸颊、下巴。\n\n颈部、肩膀、手臂、手心。\n\n胸口、腹部、臀部、大腿、小腿、脚掌。\n\n全身都在这里，完整、真实。'
          uni.setStorageSync('practiceText', scanText)
          uni.navigateTo({ url: '/pages/practice/index?path=presence&lessonId=guided' })
          break
        }
        case 'focus': {
          const focusText = '观察思维\n\n找一个舒服的姿势坐好，闭上眼睛。\n\n想象你坐在一条河边，河上漂着树叶。\n\n每一片叶子，都是一个念头。\n\n不要跳进河里，只是看着叶子一片片漂过。\n\n你不需要抓住任何一片，也不需要推开任何一片。\n\n你就是那个观察者。'
          uni.setStorageSync('practiceText', focusText)
          uni.navigateTo({ url: '/pages/practice/index?path=presence&lessonId=guided' })
          break
        }
        default:
          uni.navigateTo({ url: '/pages/emergency/index' })
      }
    },

    // ─── Navigation ────────────────────────────────────────────
    goQuick() {
      const hour = new Date().getHours()
      if (hour >= 20 || hour < 1) {
        // 晚上直接进入 AI 对话
        uni.navigateTo({ url: '/pages/chat/index' })
      } else {
        // 白天走四步快速觉察流程
        uni.navigateTo({ url: '/pages/quick/index' })
      }
    },

    goProfile() {
      uni.switchTab({ url: '/pages/profile/index' })
    },

    // ─── Day/Night Theme ────────────────────────────────────────
    updateTheme() {
      const hour = new Date().getHours()
      this.isDark = hour < 6 || hour >= 18
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
.checkin-btn {
  display: flex; align-items: center; gap: 6rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 40rpx; padding: 10rpx 20rpx;
  transition: all 0.2s;
}
.checkin-btn:active { transform: scale(0.94); }
.checkin-btn.checked { background: rgba(198,156,109,0.12); }
.checkin-icon { font-size: 28rpx; }
.checkin-text { font-size: 24rpx; color: #FDFBF7; font-weight: 500; }
.checkin-btn.checked .checkin-text { color: #C69C6D; }
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
  height: 360rpx;
  margin-bottom: 24rpx;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #4A3F34 0%, #352E26 40%, #2A231D 100%);
}
.mood-gradient {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(198,156,109,0.12) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 80%, rgba(180,160,130,0.06) 0%, transparent 50%);
}
.mood-content {
  position: relative; z-index: 1;
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  padding: 40rpx 40rpx 20rpx;
}
.mood-time {
  font-size: 28rpx; color: rgba(255,255,255,0.6);
  display: block; margin-bottom: 12rpx; letter-spacing: 2rpx;
}
.mood-quote {
  font-size: 34rpx; color: #FDFBF7;
  display: block; text-align: center; line-height: 1.6;
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  letter-spacing: 2rpx;
}
.mood-footer {
  position: relative; z-index: 1;
  padding: 0 40rpx 24rpx;
  display: flex; justify-content: center; gap: 24rpx;
}
.mood-stat {
  display: flex; align-items: center; gap: 6rpx;
  background: rgba(0,0,0,0.2);
  padding: 8rpx 20rpx; border-radius: 40rpx;
}
.mood-stat-icon { font-size: 24rpx; }
.mood-stat-text { font-size: 24rpx; color: rgba(255,255,255,0.6); }

/* ====== Quick-Awareness Card ====== */
.quick-card {
  display: flex; align-items: center; gap: 20rpx;
  margin-bottom: 32rpx; padding: 28rpx 28rpx;
  background: linear-gradient(135deg, rgba(198,160,106,0.15), rgba(42,35,29,0.8));
  border: 1rpx solid rgba(196,160,106,.3);
  border-radius: 24rpx;
  position: relative; overflow: hidden;
}
.quick-card:active { transform: scale(0.98); }
.quick-glow {
  position: absolute; top: -20rpx; right: -20rpx;
  width: 120rpx; height: 120rpx;
  background: radial-gradient(circle, rgba(196,160,106,0.2), transparent 70%);
  pointer-events: none;
}
.quick-icon { font-size: 48rpx; position: relative; z-index: 1; }
.quick-info { flex: 1; display: flex; flex-direction: column; position: relative; z-index: 1; }
.quick-title { color: #E8DFD0; font-size: 32rpx; font-weight: 600; }
.quick-desc { color: #C4C0B8; font-size: 24rpx; margin-top: 6rpx; }
.quick-arrow { color: #C4A06A; font-size: 36rpx; position: relative; z-index: 1; }

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
  border-radius: 24rpx; padding: 24rpx 8rpx 20rpx;
  display: flex; flex-direction: column;
  align-items: center; gap: 8rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
  transition: all 0.2s;
}
.emotion-btn:active { transform: scale(0.94); background: rgba(198,156,109,0.10); border-color: #C69C6D; }
.emotion-emoji { font-size: 48rpx; display: block; line-height: 1; }
.emotion-label {
  font-size: 26rpx; color: rgba(255,255,255,0.5);
  font-weight: 500; display: block;
}
.emotion-tip {
  font-size: 20rpx; color: rgba(255,255,255,0.2);
  display: block;
}
.emotion-btn:active .emotion-label { color: #FDFBF7; }
.emotion-btn:active .emotion-tip { color: rgba(198,156,109,0.5); }

/* 5th option: uncertain */
.emotion-btn-uncertain {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  background: rgba(255,255,255,0.03);
  border: 2rpx dashed rgba(255,255,255,0.10);
  border-radius: 24rpx; padding: 22rpx;
  margin-top: 16rpx;
  transition: all 0.2s;
}
.emotion-btn-uncertain:active { transform: scale(0.97); background: rgba(198,156,109,0.06); border-color: #C69C6D; border-style: solid; }
.emotion-btn-uncertain .emotion-emoji { font-size: 36rpx; }
.emotion-btn-uncertain .emotion-label {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  font-weight: 400;
}

/* ====== Personalized recommendations ====== */
.recommend-section { margin-bottom: 24rpx; }
.section-title-sm {
  font-size: 30rpx; font-weight: 600; color: rgba(255,255,255,0.7);
  display: block; margin-bottom: 16rpx;
}
.rec-scroll {
  display: flex; flex-direction: row;
  white-space: nowrap;
  padding-bottom: 8rpx;
}
.rec-chip {
  display: inline-flex; align-items: center; gap: 16rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(255,255,255,0.06);
  border-radius: 20rpx;
  padding: 20rpx 28rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  transition: transform 0.15s;
  min-width: 320rpx;
}
.rec-chip:active { transform: scale(0.96); background: rgba(255,255,255,0.06); }
.rec-icon { font-size: 40rpx; flex-shrink: 0; }
.rec-info { display: flex; flex-direction: column; }
.rec-label { font-size: 26rpx; color: #FDFBF7; font-weight: 600; }
.rec-desc { font-size: 22rpx; color: rgba(255,255,255,0.35); margin-top: 4rpx; }

/* ====== Light Theme Overrides ====== */
.theme-light .page-bg {
  background: #F8F5F0;
}
.theme-light .page-glow {
  background: radial-gradient(circle, rgba(196,156,109,0.06) 0%, transparent 70%);
}
.theme-light .container {
  color: #1C1A17;
}

/* header */
.theme-light .page-title {
  color: #B8885A;
}
.theme-light .checkin-btn {
  background: rgba(0,0,0,0.04);
}
.theme-light .checkin-text {
  color: #5A4E42;
}
.theme-light .checkin-btn.checked {
  background: rgba(196,156,109,0.12);
}
.theme-light .checkin-btn.checked .checkin-text {
  color: #B8885A;
}
.theme-light .header-user {
  background: rgba(0,0,0,0.04);
}

/* mood card */
.theme-light .mood-card {
  background: linear-gradient(135deg, #FFFBF5, #F5EDE0, #E8DDD0);
}
.theme-light .mood-time {
  color: #9A8E82;
}
.theme-light .mood-quote {
  color: #1C1A17;
}
.theme-light .mood-stat {
  background: rgba(0,0,0,0.04);
}
.theme-light .mood-stat-text {
  color: #9A8E82;
}

/* quick card */
.theme-light .quick-card {
  background: linear-gradient(135deg, rgba(196,160,106,0.08), rgba(255,251,245,0.9));
  border-color: rgba(196,160,106,0.25);
}
.theme-light .quick-title {
  color: #5A4E42;
}
.theme-light .quick-desc {
  color: #9A8E82;
}
.theme-light .quick-arrow {
  color: #B8885A;
}

/* emotion section */
.theme-light .section-title {
  color: #1C1A17;
}
.theme-light .section-subtitle {
  color: #9A8E82;
}
.theme-light .emotion-btn {
  background: #FFFFFF;
  border-color: rgba(0,0,0,0.06);
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}
.theme-light .emotion-btn:active {
  background: rgba(196,156,109,0.08);
  border-color: #C49A6C;
}
.theme-light .emotion-label {
  color: #5A4E42;
}
.theme-light .emotion-tip {
  color: #C4B8AC;
}
.theme-light .emotion-btn:active .emotion-label {
  color: #1C1A17;
}
.theme-light .emotion-btn-uncertain {
  background: rgba(0,0,0,0.02);
  border-color: rgba(0,0,0,0.08);
}
.theme-light .emotion-btn-uncertain .emotion-label {
  color: #9A8E82;
}

/* recommendations */
.theme-light .section-title-sm {
  color: #5A4E42;
}
.theme-light .rec-chip {
  background: #FFFFFF;
  border-color: rgba(0,0,0,0.06);
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}
.theme-light .rec-chip:active {
  background: #F5F3F0;
}
.theme-light .rec-label {
  color: #1C1A17;
}
.theme-light .rec-desc {
  color: #9A8E82;
}

</style>
