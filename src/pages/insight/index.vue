<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { isLoggedIn } from '@/utils/api'

onMounted(() => {
  loadUserInfo()
})

// ─── User info ────────────────────────────────────────────────────
const userEmail = ref('')
const recordCount = ref(0)

function loadUserInfo() {
  try {
    const userInfo = uni.getStorageSync('userInfo')
    if (userInfo && userInfo.email) {
      userEmail.value = userInfo.email
    } else if (isLoggedIn()) {
      userEmail.value = '微信用户'
    }
    const cards = JSON.parse(uni.getStorageSync('cards') || '[]')
    recordCount.value = cards.length
  } catch {}
}

// ─── Page state ──────────────────────────────────────────────────
type PageView = 'menu' | 'insight'
const view = ref<PageView>('menu')

// ─── Insight ──────────────────────────────────────────────────────
const loading = ref(false)
const insight = ref<{ mindType: string; coreFinding: string; insight: string; patterns: Array<{ label: string; detail: string }> } | null>(null)
const insightError = ref('')
const copied = ref(false)

async function loadInsight() {
  loading.value = true
  insightError.value = ''
  insight.value = null
  try {
    const { generateInsight } = await import('@/utils/insight')
    const result = await generateInsight()
    if (result) {
      insight.value = result
      view.value = 'insight'
    } else {
      insightError.value = '需要至少 3 条记录才能生成洞察'
    }
  } catch (e) {
    insightError.value = '生成失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

function backToMenu() {
  view.value = 'menu'
}

async function copyInsight() {
  if (!insight.value) return
  const text = `「${insight.value.coreFinding}」\n${insight.value.mindType} · 来自「看见此刻」`
  try {
    await uni.setClipboardData({ data: text })
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

function formatDate() {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

// ─── Account actions ──────────────────────────────────────────────
function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: (res) => {
      if (res.confirm) {
        try { uni.removeStorageSync('token'); uni.removeStorageSync('userInfo') } catch {}
        uni.reLaunch({ url: '/pages/auth/index' })
      }
    },
  })
}

function handleChangePwd() {
  uni.navigateTo({ url: '/pages/auth/index?mode=forgot' })
}

function goBeliefs() {
  uni.navigateTo({ url: '/pages/beliefs/index' })
}
</script>

<template>
  <view class="page">
    <!-- ====== Menu View ====== -->
    <view v-if="view === 'menu'">
      <view class="nav">
        <text class="nav-title">我的</text>
      </view>

      <scroll-view class="scroll" scroll-y>
        <!-- User Card -->
        <view class="user-card">
          <view class="avatar">
            <text class="avatar-text">{{ userEmail ? userEmail.charAt(0).toUpperCase() : '?' }}</text>
          </view>
          <view class="user-info">
            <text class="user-email">{{ userEmail || '未登录' }}</text>
            <text class="user-records">{{ recordCount }} 次觉察记录</text>
          </view>
        </view>

        <!-- Menu -->
        <view class="menu">
          <view class="menu-item" @tap="loadInsight">
            <text class="menu-icon">🧠</text>
            <view class="menu-body">
              <text class="menu-label">心理洞察</text>
              <text class="menu-desc">分析你的情绪模式</text>
            </view>
            <text class="menu-arrow">›</text>
          </view>
          <view class="menu-item" @tap="goBeliefs">
            <text class="menu-icon">💭</text>
            <view class="menu-body">
              <text class="menu-label">我的信念</text>
              <text class="menu-desc">查看你的核心信念频率</text>
            </view>
            <text class="menu-arrow">›</text>
          </view>
          <view class="menu-item" @tap="handleChangePwd">
            <text class="menu-icon">🔑</text>
            <view class="menu-body">
              <text class="menu-label">修改密码</text>
              <text class="menu-desc">重置你的登录密码</text>
            </view>
            <text class="menu-arrow">›</text>
          </view>
          <view class="menu-item menu-item--danger" @tap="handleLogout">
            <text class="menu-icon">🚪</text>
            <view class="menu-body">
              <text class="menu-label menu-label--danger">退出登录</text>
              <text class="menu-desc">退出当前账号</text>
            </view>
            <text class="menu-arrow">›</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ====== Insight View ====== -->
    <view v-else-if="view === 'insight'">
      <view class="nav">
        <view class="nav-back" @tap="backToMenu">
          <text class="nav-back-icon">←</text>
        </view>
        <text class="nav-title">心理洞察</text>
      </view>
      <view v-if="loading" class="loading"><text class="loading-text">分析中...</text></view>
      <view v-else-if="insightError" class="empty"><text>{{ insightError }}</text></view>
      <view v-else-if="insight" class="insight">
        <view class="type">{{ insight.mindType }}</view>
        <text class="finding">{{ insight.coreFinding }}</text>
      </view>
    </view>
  </view>
</template>

<style>
.page { display: flex; flex-direction: column; min-height: 100vh; background: #F3F0EA; }
.nav { display: flex; align-items: center; justify-content: center; height: 88rpx; padding: 0 20rpx; position: relative; }
.nav-back { position: absolute; left: 20rpx; padding: 10rpx; }
.nav-back-icon { font-size: 32rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #1C1A17; }
.scroll { flex: 1; }
.user-card { display: flex; align-items: center; gap: 24rpx; margin: 24rpx 30rpx; padding: 30rpx; background: #fff; border-radius: 20rpx; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: linear-gradient(135deg, #C49A6C, #B8885A); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-text { font-size: 40rpx; font-weight: 700; color: #fff; }
.user-info { display: flex; flex-direction: column; gap: 6rpx; }
.user-email { font-size: 32rpx; font-weight: 600; color: #1C1A17; }
.user-records { font-size: 26rpx; color: #B8AFA4; }
.menu { margin: 8rpx 30rpx 40rpx; }
.menu-item { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 24rpx; background: #fff; border-radius: 16rpx; margin-bottom: 12rpx; }
.menu-icon { font-size: 40rpx; flex-shrink: 0; width: 52rpx; text-align: center; }
.menu-body { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.menu-label { font-size: 30rpx; font-weight: 600; color: #1C1A17; }
.menu-label--danger { color: #D4604A; }
.menu-desc { font-size: 24rpx; color: #B8AFA4; }
.menu-arrow { font-size: 36rpx; color: #C8C0B6; font-weight: 300; }
.loading, .empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.loading-text { font-size: 28rpx; color: #8A7E72; }
.insight { padding: 40rpx; }
.type { font-size: 28rpx; color: #C49A6C; margin-bottom: 20rpx; }
.finding { font-size: 34rpx; font-weight: 600; line-height: 1.6; }
</style>
