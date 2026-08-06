<template>
  <view class="page-bg"></view>
  <view class="page-glow"></view>

  <view :class="'container ' + themeClass">
    <view class="page-header">
      <text class="page-title">我的</text>
      <text class="page-subtitle">练习报告与成长</text>
    </view>

    <!-- User account section -->
    <view class="account-card">
      <view class="account-header">
        <text class="account-icon">👤</text>
        <text class="account-title">账户</text>
      </view>

      <!-- Not logged in -->
      <view v-if="!isLoggedIn" class="account-login-area">
        <text class="account-hint">登录后可同步数据到云端</text>
        <view class="btn btn-primary btn-md" @tap="goLogin">登录 / 注册</view>
      </view>

      <!-- Logged in -->
      <view v-if="isLoggedIn" class="account-info-area">
        <view class="account-row">
          <text class="account-label">邮箱</text>
          <text class="account-value">{{userEmail}}</text>
        </view>
        <view class="account-actions">
          <view class="btn btn-outline btn-sm" @tap="showChangePwd">修改密码</view>
          <view class="btn btn-outline btn-sm danger" @tap="handleLogout">退出登录</view>
        </view>
      </view>
    </view>

    <!-- Change password modal -->
    <view class="shop-overlay" :class="{ visible: changePwdVisible }" v-if="changePwdVisible" @tap.stop="closeChangePwd">
      <view class="shop-card" @tap.stop="">
        <text class="shop-title">修改密码</text>
        <input
          class="pwd-input"
          type="password"
          v-model="oldPassword"
          placeholder="当前密码"
          placeholder-style="color: rgba(255,255,255,0.3)"
          maxlength="50"
        />
        <input
          class="pwd-input"
          type="password"
          v-model="newPassword"
          placeholder="新密码（至少6位）"
          placeholder-style="color: rgba(255,255,255,0.3)"
          maxlength="50"
        />
        <text v-if="pwdError" class="pwd-error">{{pwdError}}</text>
        <view class="btn btn-primary btn-md" @tap="submitChangePwd" :style="{ opacity: pwdLoading ? 0.6 : 1 }">确认修改</view>
        <view class="btn btn-ghost btn-sm" @tap="closeChangePwd" style="margin-top: 12rpx;">取消</view>
      </view>
    </view>
    <!-- Quick nav: 记录 & 模式 -->
    <view class="quick-nav">
      <view class="quick-nav-item" @tap="goHistory">
        <text class="quick-nav-icon">📋</text>
        <text class="quick-nav-label">记录</text>
        <text class="quick-nav-arrow">→</text>
      </view>
      <view class="quick-nav-item" @tap="goInsight">
        <text class="quick-nav-icon">🧠</text>
        <text class="quick-nav-label">模式</text>
        <text class="quick-nav-arrow">→</text>
      </view>
    </view>

    <view class="hero-card">
      <text class="hero-greeting">我的练习报告</text>
      <text class="hero-name">此刻</text>
      <text class="hero-streak">🔥 连续练习 {{streakDays}} 天</text>
    </view>

    <!-- Milestone badge -->
    <view class="milestone-card" v-if="milestone">
      <text class="milestone-emoji">{{milestone.emoji}}</text>
      <view class="milestone-info">
        <text class="milestone-label">{{milestone.label}}</text>
        <text class="milestone-desc">{{milestone.desc}}</text>
      </view>
    </view>
    <view class="milestone-card next" v-if="nextMilestone">
      <text class="milestone-emoji">⏳</text>
      <view class="milestone-info">
        <text class="milestone-label">下一个里程碑：{{nextMilestone.label}}</text>
        <text class="milestone-desc">还需 {{nextMilestone.remain}} 天</text>
      </view>
    </view>

    <!-- ❤️ Coins + Shop entry -->
    <view class="coins-section">
      <view class="coins-icon-bg">❤️</view>
      <view class="coins-info">
        <text class="coins-amount">{{awakeningCoins}}</text>
        <text class="coins-rule">急救 +1 · 课程 +2 · 呼吸 +1 · 签到 + 里程碑奖励</text>
      </view>
      <view class="btn btn-primary btn-sm" @tap.stop="openShop">❤️ 商店</view>
    </view>

    <!-- Shop modal -->
    <view :class="'shop-overlay ' + (shopVisible ? 'visible' : '')" v-if="shopVisible" @tap.stop="closeShop">
      <view class="shop-card" @tap.stop="">
        <text class="shop-title">❤️ 心意商店</text>
        <text class="shop-balance">余额：{{awakeningCoins}} ❤️</text>

        <view :class="'shop-item ' + (shopItems.ocean.owned ? 'owned' : '')" @tap.stop="buyShopItem" data-key="ocean">
          <text class="shop-item-icon">🌊</text>
          <view class="shop-item-info">
            <text class="shop-item-name">海洋主题</text>
            <text class="shop-item-desc">蓝色调主题，永久解锁</text>
          </view>
          <text class="shop-item-price" v-if="!shopItems.ocean.owned">20 ❤️</text>
          <text class="shop-item-owned" v-if="shopItems.ocean.owned">已拥有</text>
        </view>

        <view :class="'shop-item ' + (shopItems.forest.owned ? 'owned' : '')" @tap.stop="buyShopItem" data-key="forest">
          <text class="shop-item-icon">🌿</text>
          <view class="shop-item-info">
            <text class="shop-item-name">森林主题</text>
            <text class="shop-item-desc">绿色调主题，永久解锁</text>
          </view>
          <text class="shop-item-price" v-if="!shopItems.forest.owned">20 ❤️</text>
          <text class="shop-item-owned" v-if="shopItems.forest.owned">已拥有</text>
        </view>

        <view :class="'shop-item ' + (shopItems.trial.owned ? 'owned' : '')" @tap.stop="buyShopItem" data-key="trial">
          <text class="shop-item-icon">💌</text>
          <view class="shop-item-info">
            <text class="shop-item-name">此刻·陪伴体验（7天）</text>
            <text class="shop-item-desc">解锁全部高级功能</text>
          </view>
          <text class="shop-item-price" v-if="!shopItems.trial.owned">50 ❤️</text>
          <text class="shop-item-owned" v-if="shopItems.trial.owned">已激活</text>
        </view>

        <view class="btn btn-ghost btn-md" @tap.stop="closeShop">关闭</view>
      </view>
    </view>

    <!-- Premium card -->
    <view class="premium-card" v-if="!isPremium">
      <view class="premium-header">
        <text class="premium-icon">💌</text>
        <text class="premium-title">此刻 · 陪伴</text>
      </view>
      <text class="premium-desc">无限使用此刻信箱 · 高级呼吸模式 · 每周专属练习 · 优先新内容</text>
      <view class="premium-price-row">
        <text class="premium-amount">¥9.9<text class="premium-unit">/月</text></text>
        <view class="btn btn-primary btn-md" @tap.stop="buyPremium">订阅</view>
      </view>
    </view>

    <!-- Section: 练习概览 -->
    <text class="section-header">练习概览</text>

    <!-- Stats -->
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-num">{{totalSessions}}</text>
        <text class="stat-label">急救次数</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{totalDialogues}}</text>
        <text class="stat-label">信件次数</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{avgRecovery}}<text class="stat-unit">min</text></text>
        <text class="stat-label">平均恢复</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{totalLessons}}</text>
        <text class="stat-label">完成课程</text>
      </view>
    </view>

    <!-- Section: 情绪数据 -->
    <text class="section-header">情绪数据</text>

    <!-- Emotion distribution -->
    <view class="glass-card">
      <text class="card-title">本周情绪分布</text>
      <view class="bar-row" v-for="(item, index) in emotionDistribution" :key="item.type">
        <text class="bar-label">{{item.label}}</text>
        <view class="bar-track">
          <view class="bar-fill" :style="{ width: item.percent + '%', background: item.color }"></view>
        </view>
        <text class="bar-count">{{item.count}}次</text>
      </view>
    </view>

    <!-- Week trend -->
    <view class="glass-card">
      <text class="card-title">周趋势对比</text>
      <view class="trend-bars">
        <view class="trend-col">
          <view class="trend-bar" :style="{ height: weekData.current * 40 + 20 + 'rpx' }">
            <text class="trend-num">{{weekData.current}}</text>
          </view>
          <text class="trend-label">本周</text>
        </view>
        <view class="trend-col">
          <view class="trend-bar prev" :style="{ height: weekData.previous * 40 + 20 + 'rpx' }">
            <text class="trend-num">{{weekData.previous}}</text>
          </view>
          <text class="trend-label">上周</text>
        </view>
        <view class="trend-arrow">
          <text v-if="weekData.trend === 'up'">📈</text>
          <text v-else-if="weekData.trend === 'down'">📉</text>
          <text v-else>➡️</text>
        </view>
      </view>
    </view>

    <!-- Weekly report -->
    <view class="glass-card" v-if="weekReport">
      <text class="card-title">本周简报</text>
      <view class="report-row">
        <text class="report-label">急救次数</text>
        <text class="report-value">{{weekReport.thisTotal}} 次</text>
      </view>
      <view class="report-row" v-if="weekReport.topEmotion">
        <text class="report-label">主要情绪</text>
        <text class="report-value">{{weekReport.topEmotionIcon}} {{weekReport.topEmotion}}</text>
      </view>
      <view class="report-row">
        <text class="report-label">较上周</text>
        <text :class="'report-value ' + (weekReport.change > 0 ? 'up' : 'down')">
          {{weekReport.change > 0 ? '+' : ''}}{{weekReport.change}} 次
        </text>
      </view>
    </view>

    <!-- Section: 成长 -->
    <text class="section-header">成长</text>

    <!-- Achievements -->
    <view class="glass-card" v-if="achievements.length > 0">
      <text class="card-title">成就</text>
      <view class="achievement-grid">
        <view class="achievement-item" v-for="(item, index) in achievements" :key="item.id">
          <text class="achieve-icon">{{item.icon}}</text>
          <text class="achieve-label">{{item.label}}</text>
        </view>
      </view>
    </view>

    <!-- Saved quotes -->
    <view class="glass-card" v-if="savedQuotes.length > 0">
      <text class="card-title">📖 我的收藏</text>
      <view class="quote-list">
        <view class="quote-item" v-for="(item, index) in savedQuotes" :key="item.time">
          <text class="quote-text">「{{item.text}}」</text>
          <view class="quote-footer">
            <text class="quote-source">{{item.lesson}}</text>
            <text class="quote-time">{{formatTime(item.time)}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Insight -->
    <view class="glass-card">
      <text class="card-title">数据洞察</text>
      <text class="insight-text">{{insight}}</text>
    </view>

    <!-- Coin ledger -->
    <view class="glass-card" v-if="coinLedger.length > 0">
      <text class="card-title">❤️ 心意明细</text>
      <view class="ledger-list">
        <view class="ledger-item" v-for="(item, index) in coinLedger" :key="item.time">
          <text class="ledger-source">{{item.source}}</text>
          <text class="ledger-time">{{formatTime(item.time)}}</text>
          <text class="ledger-amount">+{{item.amount}}</text>
        </view>
      </view>
    </view>

    <!-- Export -->
    <view class="export-area">
      <view class="btn btn-outline btn-md" @tap="exportData">导出日志数据</view>
    </view>
  </view>
</template>

<script>
import * as util from '@/utils/util'
import * as report from '@/utils/report'
import * as coins from '@/utils/coins'
import { isLoggedIn, clearToken, api } from '@/utils/api'

export default {
  data() {
    return {
      streakDays: 0,
      totalSessions: 0,
      avgRecovery: 0,
      totalLessons: 0,
      totalDialogues: 0,
      awakeningCoins: 0,
      emotionDistribution: [],
      insight: '加载中...',
      milestone: null,
      weekData: { current: 0, previous: 0, trend: 'same' },
      nextMilestone: null,
      achievements: [],
      weekReport: null,
      isPremium: false,
      themeClass: 'theme-default',
      coinLedger: [],
      savedQuotes: [],
      shopVisible: false,
      shopItems: {},
      isLoggedIn: false,
      userEmail: '',
      changePwdVisible: false,
      oldPassword: '',
      newPassword: '',
      pwdError: '',
      pwdLoading: false
    }
  },

  onShow() {
    const isPremium = uni.getStorageSync('isPremium') || false
    const theme = uni.getStorageSync('appTheme') || 'default'
    this.isPremium = isPremium
    this.themeClass = 'theme-' + theme
    this.isLoggedIn = isLoggedIn()
    if (this.isLoggedIn) {
      const userInfo = uni.getStorageSync('userInfo') || {}
      this.userEmail = userInfo.email || ''
    }
    this.loadReport()
  },

  methods: {
    loadReport() {
      const entries = uni.getStorageSync('pendingEntries') || []
      const dialogues = uni.getStorageSync('dialogueHistory') || []

      const totalSessions = entries.length
      const totalDialogues = dialogues.length
      const avgRecovery = entries.length
        ? Math.round(entries.reduce((s, e) => s + (e.recoveryMinutes || 0), 0) / entries.length)
        : 0

      const counts = {}
      entries.forEach(e => { counts[e.emotionType] = (counts[e.emotionType] || 0) + 1 })
      const maxCount = Math.max(...Object.values(counts), 1)
      const emotionDistribution = Object.entries(counts).map(([type, count]) => ({
        type,
        label: util.EMOTION_MAP[type]?.label || type,
        color: util.EMOTION_MAP[type]?.color || '#999',
        count,
        percent: Math.round(count / maxCount * 100)
      }))

      let totalLessons = 0;
      ['presence', 'surrender', 'openness'].forEach(p => {
        totalLessons += uni.getStorageSync(`progress_${p}`) || 0
      })

      const streakDays = uni.getStorageSync('streakDays') || 0
      const milestone = this.getMilestone(streakDays)
      const nextMilestone = this.getNextMilestone(streakDays)
      const weekData = this.getWeekTrend(entries)
      const achievements = report.getAchievements(entries, streakDays)
      const weekReport = report.getWeekReport(entries)

      const coinLedger = coins.getLedger()
      const savedQuotes = uni.getStorageSync('savedQuotes') || []
      const purchasedThemes = uni.getStorageSync('purchasedThemes') || []
      const isPremium = uni.getStorageSync('isPremium') || false

      this.totalSessions = totalSessions
      this.totalDialogues = totalDialogues
      this.avgRecovery = avgRecovery
      this.totalLessons = totalLessons
      this.awakeningCoins = uni.getStorageSync('awakeningCoins') || 0
      this.emotionDistribution = emotionDistribution
      this.insight = report.generateInsight(entries, streakDays, totalLessons, totalDialogues)
      this.streakDays = streakDays
      this.milestone = milestone
      this.nextMilestone = nextMilestone
      this.weekData = weekData
      this.achievements = achievements
      this.weekReport = weekReport
      this.coinLedger = coinLedger.slice(0, 20)
      this.savedQuotes = savedQuotes.slice(0, 20)
      this.isPremium = isPremium
      this.shopItems = {
        ocean: { owned: purchasedThemes.includes('ocean') },
        forest: { owned: purchasedThemes.includes('forest') },
        trial: { owned: isPremium }
      }
    },

    getMilestone(days) {
      if (days >= 30) return { emoji: '👑', label: '连续练习 30 天', desc: '坚持一个月，了不起的旅程' }
      if (days >= 7) return { emoji: '🌟', label: '连续练习 7 天', desc: '坚持一周了，继续走下去' }
      if (days >= 3) return { emoji: '✨', label: '连续练习 3 天', desc: '好的开始，前三天是最难的' }
      return null
    },

    getNextMilestone(days) {
      if (days < 3) return { days: 3, label: '连续练习 3 天 ✨', remain: 3 - days }
      if (days < 7) return { days: 7, label: '连续练习 7 天 🌟', remain: 7 - days }
      if (days < 30) return { days: 30, label: '连续练习 30 天 👑', remain: 30 - days }
      return null
    },

    getWeekTrend(entries) {
      const now = Date.now()
      const weekMs = 7 * 86400000
      let current = 0, previous = 0

      entries.forEach(e => {
        const t = e.timestamp || e.createTime || (e.createdAt ? new Date(e.createdAt).getTime() : 0)
        if (t > now - weekMs) current++
        else if (t > now - 2 * weekMs) previous++
      })

      let trend = 'same'
      if (current > previous) trend = 'up'
      else if (current < previous) trend = 'down'
      return { current, previous, trend }
    },

    buyPremium() {
      uni.showModal({
        title: '此刻 · 陪伴',
        content: '¥9.9/月 — 无限使用此刻信箱 · 高级呼吸模式 · 每周专属练习\n\n微信支付开通后即可订阅。点击确认模拟激活 30 天。',
        success: (res) => {
          if (res.confirm) {
            uni.setStorageSync('isPremium', true)
            this.isPremium = true
            uni.showToast({ title: '此刻 · 陪伴已激活 ✓', icon: 'success' })
          }
        }
      })
    },

    formatTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      const now = new Date()
      const diffDays = Math.floor((now - d) / 86400000)
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      return util.formatDate(d)
    },

    openShop() {
      const purchasedThemes = uni.getStorageSync('purchasedThemes') || []
      const isPremium = uni.getStorageSync('isPremium') || false
      this.shopVisible = true
      this.shopItems = {
        ocean: { owned: purchasedThemes.includes('ocean') },
        forest: { owned: purchasedThemes.includes('forest') },
        trial: { owned: isPremium }
      }
    },

    closeShop() {
      this.shopVisible = false
    },

    buyShopItem(e) {
      const key = e.currentTarget.dataset.key
      const prices = { ocean: 20, forest: 20, trial: 50 }
      const price = prices[key]
      const coins = this.awakeningCoins
      if (coins < price) {
        uni.showToast({ title: `还差 ${price - coins} ❤️`, icon: 'none' })
        return
      }

      if (key === 'trial') {
        uni.setStorageSync('isPremium', true)
        coins.addCoins(-price, '购买7天陪伴体验')
        this.isPremium = true
        this.shopVisible = false
        uni.showToast({ title: '💌 7天陪伴已激活', icon: 'success' })
        return
      }

      // Theme purchase
      const purchasedThemes = uni.getStorageSync('purchasedThemes') || []
      if (purchasedThemes.includes(key)) {
        uni.showToast({ title: '已拥有', icon: 'none' })
        return
      }
      purchasedThemes.push(key)
      uni.setStorageSync('purchasedThemes', purchasedThemes)
      // Auto-apply the theme
      uni.setStorageSync('appTheme', key)
      coins.addCoins(-price, `解锁${key === 'ocean' ? '海洋' : '森林'}主题`)

      this.awakeningCoins = uni.getStorageSync('awakeningCoins') || 0
      this.themeClass = 'theme-' + key
      this.shopVisible = false
      uni.showToast({ title: `✨ ${key === 'ocean' ? '🌊 海洋' : '🌿 森林'}主题已解锁`, icon: 'success' })
    },

    goHistory() {
      uni.navigateTo({ url: '/pages/history/index' })
    },

    goInsight() {
      uni.navigateTo({ url: '/pages/insight/index' })
    },

    goLogin() {
      uni.navigateTo({ url: '/pages/auth/index' })
    },

    showChangePwd() {
      this.oldPassword = ''
      this.newPassword = ''
      this.pwdError = ''
      this.changePwdVisible = true
    },

    closeChangePwd() {
      this.changePwdVisible = false
    },

    async submitChangePwd() {
      if (!this.oldPassword || !this.newPassword) {
        this.pwdError = '请填写当前密码和新密码'
        return
      }
      if (this.newPassword.length < 6) {
        this.pwdError = '新密码至少6位'
        return
      }
      this.pwdLoading = true
      this.pwdError = ''
      try {
        await api.post('/auth/change-password', {
          oldPassword: this.oldPassword,
          newPassword: this.newPassword,
        })
        uni.showToast({ title: '密码已修改', icon: 'success' })
        this.changePwdVisible = false
      } catch (e) {
        this.pwdError = e instanceof Error ? e.message : '修改失败'
      } finally {
        this.pwdLoading = false
      }
    },

    handleLogout() {
      uni.showModal({
        title: '退出登录',
        content: '退出后本地数据不会丢失，但需要重新登录才能同步到云端。',
        success: (res) => {
          if (res.confirm) {
            clearToken()
            uni.removeStorageSync('userInfo')
            this.isLoggedIn = false
            this.userEmail = ''
            uni.showToast({ title: '已退出', icon: 'none' })
          }
        }
      })
    },

    exportData() {
      const entries = uni.getStorageSync('pendingEntries') || []
      const dialogues = uni.getStorageSync('dialogueHistory') || []

      let text = '=== 此刻 · 我的练习日志 ===\n'
      text += `导出时间：${new Date().toLocaleString('zh-CN')}\n`
      text += `连续练习：${this.streakDays} 天\n`
      text += `急救次数：${entries.length} 次\n`
      text += `信件次数：${dialogues.length} 次\n`
      text += `完成课程：${this.totalLessons} 课\n`
      text += `❤️ 心意：${this.awakeningCoins}\n\n`

      if (entries.length > 0) {
        text += '--- 情绪急救记录 ---\n'
        entries.forEach((e, i) => {
          const label = util.EMOTION_MAP[e.emotionType]?.label || e.emotionType
          const date = e.createdAt ? new Date(e.createdAt).toLocaleString('zh-CN') : '未知时间'
          text += `${i + 1}. [${date}] ${label}`
          if (e.recoveryMinutes) text += ` · 恢复 ${e.recoveryMinutes} 分钟`
          if (e.rating) text += ` · ${'★'.repeat(e.rating)}`
          if (e.note) text += `\n   笔记：${e.note}`
          text += '\n'
        })
        text += '\n'
      }

      if (dialogues.length > 0) {
        text += '--- 此刻信箱记录 ---\n'
        dialogues.forEach((d, i) => {
          const date = d.createdAt ? new Date(d.createdAt).toLocaleString('zh-CN') : '未知时间'
          text += `${i + 1}. [${date}]`
          if (d.preview) text += ` 「${d.preview}」`
          text += '\n'
        })
      }

      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
        }
      })
    }
  }
}
</script>

<style scoped>
/* 我的 -- 沉浸深色风格 */

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

/* Page header */
.page-header { margin-bottom: 32rpx; }
.page-title {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-size: 56rpx; font-weight: 700; color: #FDFBF7;
  display: block; letter-spacing: 4rpx;
}
.page-subtitle {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  display: block; margin-top: 8rpx; letter-spacing: 2rpx;
}

/* Hero card */
.hero-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 32rpx; padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
  position: relative; overflow: hidden;
}
.hero-card::after {
  content: '🧘'; position: absolute; right: 0rpx; bottom: -10rpx;
  font-size: 180rpx; opacity: 0.06; pointer-events: none;
}
.hero-greeting { font-size: 28rpx; color: rgba(255,255,255,0.5); display: block; }
.hero-name { font-size: 52rpx; font-weight: 700; display: block; margin-top: 4rpx; color: #FDFBF7; letter-spacing: -1rpx; }
.hero-streak { font-size: 28rpx; color: rgba(255,255,255,0.5); display: block; margin-top: 8rpx; }

/* Milestone cards */
.milestone-card {
  display: flex; align-items: center; gap: 16rpx;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 24rpx; padding: 24rpx;
  margin-bottom: 12rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
}
.milestone-card.next {
  background: rgba(255,255,255,0.02);
  border: 2rpx dashed rgba(255,255,255,0.1);
}
.milestone-emoji { font-size: 48rpx; display: block; }
.milestone-info { flex: 1; }
.milestone-label { font-size: 30rpx; font-weight: 600; color: #FDFBF7; display: block; }
.milestone-desc { font-size: 24rpx; color: rgba(255,255,255,0.4); display: block; margin-top: 4rpx; }

/* Coins section */
.coins-section {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 24rpx; padding: 24rpx;
  display: flex; align-items: center; gap: 16rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
}
.coins-icon-bg {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: rgba(198, 156, 109, 0.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; flex-shrink: 0;
}
.coins-info { flex: 1; }
.coins-amount { font-size: 48rpx; font-weight: 700; color: #C69C6D; display: block; line-height: 1; }
.coins-rule { font-size: 22rpx; color: rgba(255,255,255,0.3); display: block; margin-top: 4rpx; }

/* Shop modal */
.shop-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 40rpx;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s;
}
.shop-overlay.visible { opacity: 1; pointer-events: auto; }
.shop-card {
  background: rgba(42, 35, 29, 0.95);
  backdrop-filter: blur(30rpx);
  -webkit-backdrop-filter: blur(30rpx);
  border-radius: 32rpx; padding: 40rpx 32rpx;
  width: 100%; max-width: 600rpx;
  border: 2rpx solid rgba(255,255,255,0.08);
}
.shop-title { font-size: 36rpx; font-weight: 700; color: #FDFBF7; display: block; text-align: center; }
.shop-balance { font-size: 26rpx; color: rgba(255,255,255,0.4); display: block; text-align: center; margin: 8rpx 0 24rpx; }
.shop-item {
  display: flex; align-items: center; gap: 12rpx;
  padding: 20rpx 16rpx; border-radius: 20rpx;
  margin-bottom: 12rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(255,255,255,0.04);
}
.shop-item.owned { opacity: 0.5; }
.shop-item-icon { font-size: 40rpx; display: block; }
.shop-item-info { flex: 1; }
.shop-item-name { font-size: 28rpx; font-weight: 600; color: #FDFBF7; display: block; }
.shop-item-desc { font-size: 22rpx; color: rgba(255,255,255,0.4); display: block; margin-top: 2rpx; }
.shop-item-price { font-size: 28rpx; color: #C69C6D; font-weight: 600; display: block; }
.shop-item-owned { font-size: 24rpx; color: rgba(255,255,255,0.3); display: block; }

/* Account card */
.account-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 24rpx; padding: 28rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
}
.account-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.account-icon { font-size: 32rpx; }
.account-title { font-size: 28rpx; font-weight: 600; color: #FDFBF7; }
.account-login-area { display: flex; align-items: center; justify-content: space-between; }
.account-hint { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.account-info-area { }
.account-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid rgba(255,255,255,0.06); margin-bottom: 16rpx; }
.account-label { font-size: 24rpx; color: rgba(255,255,255,0.4); }
.account-value { font-size: 26rpx; color: #FDFBF7; }
.account-actions { display: flex; gap: 16rpx; }
.pwd-input {
  width: 100%; height: 80rpx; box-sizing: border-box;
  background: rgba(255,255,255,0.06); border-radius: 16rpx;
  padding: 0 24rpx; font-size: 28rpx; color: #FDFBF7;
  margin-bottom: 16rpx;
}
.pwd-error { font-size: 24rpx; color: #D4786A; display: block; margin-bottom: 12rpx; text-align: center; }
.btn-outline.danger { border-color: rgba(212,120,106,0.3); color: #D4786A; }

/* Quick Nav: 记录 & 模式 */
.quick-nav {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.quick-nav-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 20rpx;
  padding: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
  transition: all 0.15s;
}
.quick-nav-item:active {
  transform: scale(0.97);
  background: rgba(255,255,255,0.06);
}
.quick-nav-icon { font-size: 36rpx; }
.quick-nav-label {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #FDFBF7;
}
.quick-nav-arrow {
  font-size: 28rpx;
  color: rgba(255,255,255,0.3);
}

/* Buttons (dark theme overrides) */
.btn-primary {
  background: #C69C6D; color: #FDFBF7; border: none;
  border-radius: 40rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.btn-primary:active { opacity: 0.8; }
.btn-ghost {
  background: transparent; color: rgba(255,255,255,0.5); border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 40rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.btn-outline {
  background: transparent; color: rgba(255,255,255,0.5); border: 2rpx solid rgba(255,255,255,0.15);
  border-radius: 40rpx; font-weight: 500;
  display: inline-flex; align-items: center; justify-content: center;
}
.btn-sm { padding: 16rpx 28rpx; font-size: 26rpx; }
.btn-md { padding: 20rpx 40rpx; font-size: 28rpx; }

/* Premium card */
.premium-card {
  background: linear-gradient(135deg, rgba(198, 156, 109, 0.12) 0%, rgba(255,255,255,0.04) 100%);
  border-radius: 24rpx; padding: 28rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(198, 156, 109, 0.15);
}
.premium-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.premium-icon { font-size: 32rpx; }
.premium-title { font-size: 32rpx; font-weight: 600; color: #FDFBF7; }
.premium-desc { font-size: 26rpx; color: rgba(255,255,255,0.4); display: block; line-height: 1.8; margin-bottom: 16rpx; }
.premium-price-row { display: flex; align-items: center; justify-content: space-between; }
.premium-amount { font-size: 42rpx; font-weight: 700; color: #C69C6D; }
.premium-unit { font-size: 26rpx; color: rgba(255,255,255,0.3); font-weight: 400; }

/* Section headers */
.section-header {
  font-size: 34rpx; font-weight: 700; color: #FDFBF7;
  display: block; margin-top: 40rpx; margin-bottom: 16rpx;
  letter-spacing: 1rpx;
}
.section-header:first-of-type { margin-top: 8rpx; }

/* Stats grid */
.stats-grid { display: flex; gap: 12rpx; margin-bottom: 24rpx; }
.stat-card {
  flex: 1;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 24rpx; padding: 32rpx 12rpx;
  text-align: center;
  border: 2rpx solid rgba(255,255,255,0.06);
  position: relative; overflow: hidden;
}
.stat-num { font-size: 44rpx; font-weight: 700; color: #FDFBF7; display: block; }
.stat-unit { font-size: 22rpx; color: rgba(255,255,255,0.4); font-weight: 600; }
.stat-label { font-size: 22rpx; color: rgba(255,255,255,0.4); display: block; margin-top: 4rpx; letter-spacing: 0.5rpx; }

/* Glass card unified */
.glass-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 24rpx; padding: 28rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
}
.card-title { font-size: 26rpx; color: rgba(255,255,255,0.5); font-weight: 600; letter-spacing: 1rpx; display: block; margin-bottom: 16rpx; }

/* Emotion bars */
.bar-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.bar-label { width: 80rpx; font-size: 24rpx; color: #FDFBF7; font-weight: 500; display: block; }
.bar-track { flex: 1; height: 12rpx; background: rgba(255,255,255,0.08); border-radius: 6rpx; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 6rpx; transition: width 0.6s; }
.bar-count { font-size: 22rpx; color: rgba(255,255,255,0.3); width: 60rpx; text-align: right; display: block; }

/* Trend bars */
.trend-bars { display: flex; align-items: flex-end; justify-content: center; gap: 40rpx; padding: 32rpx 0; }
.trend-col { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.trend-bar { width: 80rpx; background: #C69C6D; border-radius: 8rpx 8rpx 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 12rpx; min-height: 40rpx; }
.trend-bar.prev { background: rgba(255,255,255,0.12); }
.trend-num { font-size: 28rpx; color: #FDFBF7; font-weight: 600; }
.trend-label { font-size: 24rpx; color: rgba(255,255,255,0.4); }
.trend-arrow { font-size: 48rpx; padding-bottom: 8rpx; }

/* Report rows */
.report-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid rgba(255,255,255,0.06); }
.report-row:last-child { border-bottom: none; }
.report-label { font-size: 28rpx; color: rgba(255,255,255,0.5); }
.report-value { font-size: 28rpx; color: #FDFBF7; font-weight: 500; }
.report-value.up { color: #D4786A; }
.report-value.down { color: #C69C6D; }

/* Achievements */
.achievement-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.achievement-item { display: flex; align-items: center; gap: 8rpx; background: rgba(255,255,255,0.06); border-radius: 40rpx; padding: 8rpx 20rpx; }
.achieve-icon { font-size: 28rpx; }
.achieve-label { font-size: 24rpx; color: #FDFBF7; }

/* Quotes */
.quote-list { max-height: 500rpx; overflow-y: auto; }
.quote-item { padding: 20rpx 0; border-bottom: 2rpx solid rgba(255,255,255,0.06); }
.quote-item:last-child { border-bottom: none; }
.quote-text { font-size: 28rpx; color: rgba(255,255,255,0.5); line-height: 1.8; display: block; font-style: italic; }
.quote-footer { display: flex; justify-content: space-between; margin-top: 8rpx; }
.quote-source { font-size: 24rpx; color: #C69C6D; font-weight: 500; }
.quote-time { font-size: 22rpx; color: rgba(255,255,255,0.3); }

/* Ledger */
.ledger-list { max-height: 320rpx; overflow-y: auto; }
.ledger-item { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; border-bottom: 2rpx solid rgba(255,255,255,0.06); }
.ledger-item:last-child { border-bottom: none; }
.ledger-source { flex: 1; font-size: 28rpx; color: #FDFBF7; }
.ledger-time { font-size: 22rpx; color: rgba(255,255,255,0.3); width: 80rpx; text-align: right; }
.ledger-amount { font-size: 28rpx; color: #C69C6D; font-weight: 600; width: 60rpx; text-align: right; }

/* Insight */
.insight-text { font-size: 28rpx; color: rgba(255,255,255,0.5); line-height: 2; display: block; white-space: pre-line; }

/* Export */
.export-area { text-align: center; padding: 32rpx 0 80rpx; }

/* Theme accent overrides */
.theme-ocean .coins-amount,
.theme-ocean .shop-item-price,
.theme-ocean .premium-amount,
.theme-ocean .trend-bar,
.theme-ocean .quote-source,
.theme-ocean .ledger-amount { color: #6B9DBF; }
.theme-ocean .trend-bar { background: #6B9DBF; }
.theme-ocean .coins-icon-bg { background: rgba(107,157,191,0.15); }
.theme-ocean .premium-card { border-color: rgba(107,157,191,0.15); background: linear-gradient(135deg, rgba(107,157,191,0.12) 0%, rgba(255,255,255,0.04) 100%); }
.theme-ocean .btn-primary { background: #6B9DBF; }

.theme-forest .coins-amount,
.theme-forest .shop-item-price,
.theme-forest .premium-amount,
.theme-forest .trend-bar,
.theme-forest .quote-source,
.theme-forest .ledger-amount { color: #7CA68D; }
.theme-forest .trend-bar { background: #7CA68D; }
.theme-forest .coins-icon-bg { background: rgba(124,166,141,0.15); }
.theme-forest .premium-card { border-color: rgba(124,166,141,0.15); background: linear-gradient(135deg, rgba(124,166,141,0.12) 0%, rgba(255,255,255,0.04) 100%); }
.theme-forest .btn-primary { background: #7CA68D; }
</style>
