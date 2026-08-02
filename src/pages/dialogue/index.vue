<template>
  <view class="page-bg"></view>
  <view class="page-glow"></view>

  <view :class="'container ' + themeClass">
    <!-- Header -->
    <view class="letter-header">
      <view class="letter-back" @tap="goBack">
        <text class="letter-back-icon">✕</text>
      </view>
      <text class="letter-header-icon">💌</text>
      <text class="letter-header-title">此刻信箱</text>
      <text class="daily-badge" v-if="!isPremium">免费 {{dailyRemaining}}/5</text>
      <text class="daily-badge premium" v-if="isPremium">无限</text>
    </view>

    <!-- Compose phase -->
    <view class="letter-body" v-if="phase === 'compose'">
      <view class="letter-paper">
        <text class="letter-salutation">给此刻的信：</text>
        <text class="letter-guide" v-if="showGuideText && !letterContent">今天发生了什么？或者你心里在想什么？</text>
        <textarea
          class="letter-textarea"
          placeholder="说说你此刻的感受……\n不用组织语言，想到什么写什么"
          :value="letterContent"
          @input="onInput"
          maxlength="-1"
          auto-height
        />
        <view class="letter-paper-footer">
          <text class="letter-paper-count">{{letterContent.length}} 字</text>
        </view>
      </view>

      <view class="letter-suggestions" v-if="!letterContent">
        <text class="letter-suggestions-label">不知从何说起？</text>
        <view class="letter-suggestion-tags">
          <view class="suggestion-tag" @tap="sendQuickMsg" data-msg="最近压力很大，睡不好">
            <text>😰 最近压力很大</text>
          </view>
          <view class="suggestion-tag" @tap="sendQuickMsg" data-msg="我感觉很累，什么都不想做">
            <text>😔 感觉很累</text>
          </view>
          <view class="suggestion-tag" @tap="sendQuickMsg" data-msg="我在做一个重要的决定，很纠结">
            <text>🤔 在做重要决定</text>
          </view>
          <view class="suggestion-tag" @tap="sendQuickMsg" data-msg="有人让我很生气，我忍不了">
            <text>😤 有人让我生气</text>
          </view>
        </view>
      </view>

      <view class="letter-send-area" v-if="letterContent.trim()">
        <view class="btn btn-primary btn-md" @tap="sendLetter">📮 好了，发出去</view>
      </view>

      <view class="upgrade-banner" v-if="showUpgrade">
        <text class="upgrade-icon">✦</text>
        <view class="upgrade-info">
          <text class="upgrade-title">今日免费额度已达上限</text>
          <text class="upgrade-desc">订阅后无限使用此刻信箱。每天 5 封免费额度，写完了明天继续。</text>
        </view>
      </view>
    </view>

    <!-- Sent phase -->
    <view class="letter-body" v-if="phase === 'sent'">
      <view class="letter-paper sent">
        <text class="letter-salutation">你写给此刻的信：</text>
        <text class="letter-sent-text">{{sentLetter}}</text>
      </view>

      <view class="reply-section">
        <text class="reply-label">回信</text>

        <view class="empathy-msg" v-if="currentReplyIndex >= 0">
          <text class="empathy-text">{{replyParts[0]}}</text>
        </view>
        <view class="empathy-msg" v-if="currentReplyIndex >= 1">
          <text class="empathy-text">{{replyParts[1]}}</text>
        </view>
        <view class="empathy-msg" v-if="currentReplyIndex >= 2">
          <text class="empathy-text">{{replyParts[2]}}</text>
        </view>

        <text class="empathy-loading" v-if="loading && currentReplyIndex >= 2">. . .</text>

        <view class="reply-content" v-if="reply">
          <text class="reply-text">{{reply}}</text>
        </view>

        <view class="practice-recommend" v-if="recommendedPractice && reply">
          <view class="practice-recommend-divider">推荐练习</view>
          <view class="practice-recommend-btn" @tap="goPractice">
            <text class="practice-recommend-icon">🌬️</text>
            <text class="practice-recommend-label">{{recommendedPractice.label}}</text>
            <text class="practice-recommend-arrow">→</text>
          </view>
        </view>
      </view>

      <view class="letter-actions" v-if="reply">
        <view class="btn btn-outline btn-md" @tap="writeAnother">再写一封</view>
        <view class="btn btn-primary btn-md" @tap="goBack">完成</view>
      </view>
    </view>

    <!-- Check-in overlay -->
    <view :class="'checkin-overlay ' + (checkinPhase === 'show' ? 'visible' : '')" v-if="checkinPhase" @tap.stop="closeCheckin">
      <view class="checkin-card" @tap.stop="">
        <text class="checkin-emoji">🔥</text>
        <text class="checkin-title">今日已签到</text>
        <text class="checkin-streak">连续 {{checkinStreak}} 天</text>

        <view class="checkin-stats">
          <view class="checkin-stat">
            <text class="checkin-stat-num">{{checkinStats.totalSessions}}</text>
            <text class="checkin-stat-label">急救</text>
          </view>
          <view class="checkin-stat">
            <text class="checkin-stat-num">{{checkinStats.totalDialogues}}</text>
            <text class="checkin-stat-label">信件</text>
          </view>
          <view class="checkin-stat">
            <text class="checkin-stat-num">{{checkinStats.streakDays}}</text>
            <text class="checkin-stat-label">连续天数</text>
          </view>
        </view>

        <view class="checkin-milestone" v-if="checkinBonus > 0">
          <text class="checkin-milestone-text">🎉 里程碑奖励 +{{checkinBonus}} ❤️</text>
        </view>

        <view class="btn btn-primary btn-md" @tap="closeCheckin">继续</view>
      </view>
    </view>
  </view>
</template>

<script>
import dialogue from '@/data/dialogue'
import coins from '@/utils/coins'

const DAILY_FREE_LIMIT = 5

export default {
  data() {
    return {
      phase: 'compose', // compose | sent | upgrade | checkMood
      letterContent: '',
      sentLetter: '',
      reply: '',
      replyParts: [],
      currentReplyIndex: -1,
      loading: false,
      detectedEmotion: null,
      recommendedPractice: null,
      dailyRemaining: DAILY_FREE_LIMIT,
      isPremium: false,
      showUpgrade: false,
      themeClass: 'theme-default',
      showGuideText: true,
      checkinPhase: '',
      checkinStreak: 0,
      checkinStats: { totalSessions: 0, totalDialogues: 0, streakDays: 0 },
      checkinBonus: 0
    }
  },

  _practiceStats: null, // In-memory buffer for practice stats

  onLoad() {
    const theme = uni.getStorageSync('appTheme') || 'default'

    // Load practice stats into memory once
    this._practiceStats = uni.getStorageSync('emotionPracticeStats') || {}

    const history = uni.getStorageSync('dialogueHistory') || []
    this.themeClass = 'theme-' + theme
    this.showGuideText = history.length === 0
    this.checkDailyLimit()
  },

  onShow() {
    const theme = uni.getStorageSync('appTheme') || 'default'
    this.themeClass = 'theme-' + theme
  },

  onHide() {
    // Flush practice stats buffer to storage
    if (this._practiceStats) {
      uni.setStorageSync('emotionPracticeStats', this._practiceStats)
    }
  },

  methods: {
    onInput(e) {
      this.letterContent = e.detail.value
    },

    sendQuickMsg(e) {
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      const msg = e.currentTarget.dataset.msg
      this.letterContent = msg
      this.sendLetter()
    },

    checkDailyLimit() {
      const today = new Date().toLocaleDateString('zh-CN')
      const lastDate = uni.getStorageSync('dailyMsgDate') || ''
      const isPremium = uni.getStorageSync('isPremium') || false

      if (lastDate !== today) {
        uni.setStorageSync('dailyMsgDate', today)
        uni.setStorageSync('dailyMsgCount', 0)
        this.dailyRemaining = DAILY_FREE_LIMIT
        this.isPremium = isPremium
        this.showUpgrade = false
      } else {
        const count = uni.getStorageSync('dailyMsgCount') || 0
        const remaining = isPremium ? 999 : Math.max(0, DAILY_FREE_LIMIT - count)
        this.dailyRemaining = remaining
        this.isPremium = isPremium
        this.showUpgrade = remaining <= 0 && !isPremium
      }
    },

    sendLetter() {
      const text = this.letterContent.trim()
      if (!text || this.loading) return

      if (!this.isPremium && this.dailyRemaining <= 0) {
        this.showUpgrade = true
        return
      }

      const count = (uni.getStorageSync('dailyMsgCount') || 0) + 1
      uni.setStorageSync('dailyMsgCount', count)

      const emotion = dialogue.detectEmotion(text)

      const practice = this.getSmartRecommendation(emotion)

      this.phase = 'sent'
      this.sentLetter = text
      this.letterContent = ''
      this.loading = true
      this.detectedEmotion = emotion
      this.reply = ''
      this.replyParts = []
      this.currentReplyIndex = -1
      this.recommendedPractice = practice
      this.dailyRemaining = this.isPremium ? 999 : Math.max(0, DAILY_FREE_LIMIT - count)

      this.saveLetter(text)
      this.startEmpathySequence()
    },

    // Personalized practice recommendation based on user's history
    getSmartRecommendation(emotion) {
      const stats = this._practiceStats || {}
      const emotionStats = stats[emotion]

      // Default recommendations
      const defaultMap = {
        anxiety: { label: '4-7-8 呼吸 · 3 分钟', page: 'breath' },
        anger: { label: '箱式呼吸 · 4 分钟', page: 'breath' },
        low: { label: '身体扫描练习', page: 'practice' },
        tangled: { label: '观察思维练习', page: 'practice' }
      }

      if (!emotionStats) return defaultMap[emotion] || null

      const breathCount = emotionStats.breath || 0
      const practiceCount = emotionStats.practice || 0

      if (breathCount >= practiceCount) {
        if (emotion === 'anxiety') return { label: '4-7-8 呼吸 · 3 分钟', page: 'breath' }
        if (emotion === 'anger') return { label: '箱式呼吸 · 4 分钟', page: 'breath' }
        return { label: '478 呼吸 · 3 分钟', page: 'breath' }
      } else {
        if (emotion === 'low') return { label: '身体扫描练习', page: 'practice' }
        if (emotion === 'tangled') return { label: '观察思维练习', page: 'practice' }
        return { label: '回到身体练习', page: 'practice' }
      }
    },

    startEmpathySequence() {
      const emotion = this.detectedEmotion
      const emotionLabel = emotion === 'anxiety' ? '焦虑' : emotion === 'anger' ? '愤怒' : emotion === 'low' ? '低落' : '纠结'

      const empathyMessages = [
        '我在看……',
        `我感受到你的「${emotionLabel}」了`,
        '让我想想怎么回你'
      ]

      this.replyParts = empathyMessages
      this.currentReplyIndex = -1

      empathyMessages.forEach((_, idx) => {
        setTimeout(() => {
          this.currentReplyIndex = idx
          if (idx === empathyMessages.length - 1) {
            setTimeout(() => this.generateReplyMessage(), 400)
          }
        }, idx * 700)
      })
    },

    generateReplyMessage() {
      const reply = dialogue.generateReply([{ role: 'user', content: this.sentLetter }])
      this.reply = reply
      this.loading = false
    },

    saveLetter(text) {
      const history = uni.getStorageSync('dialogueHistory') || []
      history.unshift({
        id: Date.now(),
        type: 'letter',
        messageCount: 1,
        preview: text.slice(0, 40),
        createdAt: new Date().toISOString()
      })
      uni.setStorageSync('dialogueHistory', history.slice(0, 50))
    },

    goPractice() {
      const practice = this.recommendedPractice
      if (!practice) return

      // Track in-memory -- flushed to storage in onHide
      const emotion = this.detectedEmotion
      if (emotion) {
        if (!this._practiceStats[emotion]) {
          this._practiceStats[emotion] = { breath: 0, practice: 0 }
        }
        if (practice.page === 'breath') this._practiceStats[emotion].breath++
        else this._practiceStats[emotion].practice++
      }

      if (practice.page === 'breath') {
        uni.navigateTo({ url: '/pages/breath/index' })
      } else {
        uni.navigateTo({ url: '/pages/practice/index' })
      }
    },

    writeAnother() {
      this.phase = 'compose'
      this.sentLetter = ''
      this.reply = ''
      this.replyParts = []
      this.currentReplyIndex = -1
      this.detectedEmotion = null
      this.recommendedPractice = null
    },

    goBack() {
      // Mood check: how does user feel now?
      uni.showActionSheet({
        itemList: ['😊 好多了', '😐 差不多', '😔 还是不太好'],
        success: (res) => {
          const moodMap = { 0: 'better', 1: 'same', 2: 'worse' }
          const mood = moodMap[res.tapIndex]

          const records = uni.getStorageSync('moodAfterLetter') || []
          records.push({
            emotion: this.detectedEmotion,
            mood,
            timestamp: Date.now()
          })
          uni.setStorageSync('moodAfterLetter', records.slice(-50))

          this.showCheckinAchievement(mood)
        },
        fail: () => this.showCheckinAchievement()
      })
    },

    showCheckinAchievement(mood) {
      const streakInfo = this.doCheckIn()

      const entries = uni.getStorageSync('pendingEntries') || []
      const dialogues = uni.getStorageSync('dialogueHistory') || []

      this.checkinPhase = 'show'
      this.checkinStreak = streakInfo.streakDays
      this.checkinBonus = streakInfo.bonus
      this.checkinStats = {
        totalSessions: entries.length,
        totalDialogues: dialogues.length,
        streakDays: streakInfo.streakDays
      }
    },

    closeCheckin() {
      this.checkinPhase = ''
      uni.navigateBack()
    },

    // Silent check-in, returns { streakDays, bonus }
    doCheckIn() {
      const lastDate = uni.getStorageSync('lastCheckInDate') || ''
      const today = new Date().toLocaleDateString('zh-CN')
      if (lastDate === today) {
        const streakDays = uni.getStorageSync('streakDays') || 0
        return { streakDays, bonus: 0 }
      }

      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('zh-CN')
      const prevStreak = uni.getStorageSync('streakDays') || 0
      const streakDays = lastDate === yesterday ? prevStreak + 1 : 1

      uni.setStorageSync('lastCheckInDate', today)
      uni.setStorageSync('streakDays', streakDays)

      // Check milestone bonus
      let bonus = 0
      if (streakDays === 3) bonus = 5
      else if (streakDays === 7) bonus = 10
      else if (streakDays === 30) bonus = 30

      if (bonus > 0) {
        coins.addCoins(bonus, `连续 ${streakDays} 天里程碑`)
      }

      return { streakDays, bonus }
    }
  }
}
</script>

<style scoped>
/* 此刻信箱 -- 沉浸深色风格 */

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
  display: flex; flex-direction: column;
  min-height: 100vh;
  padding: 40rpx 40rpx 0;
  color: #FDFBF7;
}

/* Header */
.letter-header {
  display: flex; align-items: center; gap: 8rpx;
  padding-bottom: 16rpx;
}
.letter-back {
  width: 60rpx; height: 60rpx;
  display: flex; align-items: center; justify-content: center;
  margin-left: -12rpx;
}
.letter-back-icon { font-size: 36rpx; color: rgba(255,255,255,0.5); }
.letter-back:active { opacity: 0.6; }
.letter-header-icon { font-size: 32rpx; }
.letter-header-title { font-size: 32rpx; font-weight: 600; color: #FDFBF7; flex: 1; }
.daily-badge {
  font-size: 22rpx; color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.06);
  padding: 4rpx 16rpx; border-radius: 40rpx;
}
.daily-badge.premium { color: #C69C6D; background: rgba(198,156,109,0.12); font-weight: 600; }

/* Letter body */
.letter-body { flex: 1; padding: 8rpx 0; overflow-y: auto; }

/* Letter paper */
.letter-paper {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 32rpx; padding: 40rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
  position: relative;
}
.letter-paper::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6rpx;
  background: #C69C6D; border-radius: 32rpx 32rpx 0 0;
}
.letter-salutation {
  font-size: 24rpx; color: rgba(255,255,255,0.4);
  display: block; margin-bottom: 24rpx; letter-spacing: 2rpx;
}
.letter-textarea {
  width: 100%; min-height: 240rpx; font-size: 28rpx;
  color: #FDFBF7; line-height: 1.9; background: transparent;
  border: none; padding: 0;
  font-family: -apple-system, "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif;
}
.letter-textarea::placeholder { color: rgba(255,255,255,0.25); }
.letter-guide {
  font-size: 28rpx; color: rgba(255,255,255,0.25);
  display: block; margin-bottom: 24rpx; line-height: 1.8; font-style: italic;
  padding: 8rpx 0;
}
.letter-paper-footer { text-align: right; margin-top: 16rpx; }
.letter-paper-count { font-size: 24rpx; color: rgba(255,255,255,0.3); }

/* Sent letter */
.letter-paper.sent { background: rgba(255,255,255,0.04); }
.letter-sent-text {
  font-size: 28rpx; color: #FDFBF7; line-height: 1.9;
  display: block; white-space: pre-wrap;
}

/* Suggestions */
.letter-suggestions { text-align: center; margin-bottom: 24rpx; }
.letter-suggestions-label {
  font-size: 24rpx; color: rgba(255,255,255,0.3);
  display: block; margin-bottom: 16rpx;
}
.letter-suggestion-tags { display: flex; flex-wrap: wrap; gap: 12rpx; justify-content: center; }
.suggestion-tag {
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(255,255,255,0.08);
  border-radius: 40rpx; padding: 16rpx 24rpx;
  font-size: 26rpx; color: rgba(255,255,255,0.5);
  transition: transform 0.12s;
}
.suggestion-tag:active { transform: scale(0.97); }

/* Send area */
.letter-send-area { text-align: center; margin-bottom: 24rpx; }

/* Reply section */
.reply-section { margin-bottom: 24rpx; }
.reply-label {
  font-size: 24rpx; color: rgba(255,255,255,0.3);
  letter-spacing: 2rpx; display: block; margin-bottom: 12rpx;
}

/* Empathy messages */
.empathy-msg {
  margin-bottom: 8rpx;
}
.empathy-text {
  font-size: 28rpx; color: rgba(255,255,255,0.5);
  line-height: 1.8; display: block; font-style: italic;
}
.empathy-loading {
  font-size: 28rpx; color: rgba(255,255,255,0.3);
  display: block; margin: 16rpx 0; letter-spacing: 4rpx;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

/* Reply content */
.reply-content {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 32rpx; padding: 40rpx;
  margin-top: 16rpx;
  border-left: 6rpx solid rgba(198,156,109,0.4);
  border: 2rpx solid rgba(255,255,255,0.06);
  border-left-width: 6rpx;
}
.reply-text {
  font-size: 28rpx; color: #FDFBF7; line-height: 2;
  display: block; white-space: pre-wrap;
}

/* Practice recommendation */
.practice-recommend { margin-top: 16rpx; }
.practice-recommend-divider {
  font-size: 24rpx; color: rgba(255,255,255,0.3);
  text-align: center; display: block; margin-bottom: 12rpx;
  position: relative;
}
.practice-recommend-divider::before,
.practice-recommend-divider::after {
  content: '——'; color: rgba(255,255,255,0.06);
}
.practice-recommend-btn {
  display: flex; align-items: center; gap: 12rpx;
  background: rgba(198,156,109,0.1);
  border-radius: 24rpx; padding: 24rpx;
  border: 2rpx solid rgba(198,156,109,0.12);
  transition: transform 0.12s;
}
.practice-recommend-btn:active { transform: scale(0.97); }
.practice-recommend-icon { font-size: 32rpx; }
.practice-recommend-label { flex: 1; font-size: 28rpx; color: #FDFBF7; font-weight: 500; }
.practice-recommend-arrow { font-size: 32rpx; color: #C69C6D; }

/* Actions */
.letter-actions {
  display: flex; gap: 16rpx;
  justify-content: center; padding-bottom: 40rpx;
}

/* Buttons */
.btn-primary {
  background: #C69C6D; color: #FDFBF7; border: none;
  border-radius: 40rpx; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
.btn-primary:active { opacity: 0.8; }
.btn-outline {
  background: transparent; color: rgba(255,255,255,0.5); border: 2rpx solid rgba(255,255,255,0.15);
  border-radius: 40rpx; font-weight: 500;
  display: inline-flex; align-items: center; justify-content: center;
}
.btn-ghost {
  background: transparent; color: rgba(255,255,255,0.5); border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 40rpx; font-weight: 500;
  display: inline-flex; align-items: center; justify-content: center;
}
.btn-md { padding: 20rpx 40rpx; font-size: 28rpx; }

/* Upgrade banner */
.upgrade-banner {
  display: flex; align-items: flex-start; gap: 12rpx;
  background: rgba(198,156,109,0.08);
  border-radius: 24rpx; padding: 24rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(198,156,109,0.15);
}
.upgrade-icon { font-size: 32rpx; display: block; line-height: 1.4; color: #C69C6D; }
.upgrade-info { flex: 1; }
.upgrade-title { font-size: 28rpx; font-weight: 600; color: #FDFBF7; display: block; }
.upgrade-desc { font-size: 24rpx; color: rgba(255,255,255,0.4); display: block; margin-top: 4rpx; line-height: 1.6; }

/* Check-in overlay */
.checkin-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12rpx);
  opacity: 0; transition: opacity 0.4s ease; pointer-events: none;
}
.checkin-overlay.visible { opacity: 1; pointer-events: auto; }

.checkin-card {
  background: rgba(42,35,29,0.95);
  backdrop-filter: blur(30rpx);
  -webkit-backdrop-filter: blur(30rpx);
  border-radius: 32rpx;
  width: 560rpx; padding: 80rpx 48rpx 48rpx;
  border: 2rpx solid rgba(255,255,255,0.08);
  text-align: center;
}
.checkin-emoji { font-size: 96rpx; display: block; margin-bottom: 16rpx; }
.checkin-title { font-size: 36rpx; font-weight: 600; color: #FDFBF7; display: block; }
.checkin-streak { font-size: 44rpx; font-weight: 700; color: #C69C6D; display: block; margin: 8rpx 0 48rpx; }

.checkin-stats { display: flex; gap: 32rpx; justify-content: center; margin-bottom: 40rpx; }
.checkin-stat { text-align: center; }
.checkin-stat-num { font-size: 36rpx; font-weight: 600; color: #FDFBF7; display: block; }
.checkin-stat-label { font-size: 24rpx; color: rgba(255,255,255,0.4); display: block; margin-top: 4rpx; }

.checkin-milestone { margin-bottom: 24rpx; }
.checkin-milestone-text { font-size: 28rpx; color: #C69C6D; font-weight: 500; }
</style>
