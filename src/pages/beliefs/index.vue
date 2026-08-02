<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getStatistics } from '@/utils/cloud'
import { isLoggedIn } from '@/utils/api'

interface BeliefItem {
  _id: string
  belief: string
  count: number
}

const beliefs = ref<BeliefItem[]>([])
const loading = ref(true)
const statusBarHeight = ref(20)

onMounted(async () => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/index' })
    return
  }
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 20
  } catch { /* fallback */ }

  try {
    let userId = 'anonymous'
    try { userId = uni.getStorageSync('userId') || 'anonymous' } catch { /* ok */ }
    const data = await getStatistics(userId)
    beliefs.value = data.beliefs || []
  } catch (err) {
    console.error('获取信念统计失败:', err)
  } finally {
    loading.value = false
  }
})

// ─── 排序 ──────────────────────────────────────────────────
const sortedBeliefs = computed(() =>
  [...beliefs.value].sort((a, b) => b.count - a.count)
)

const maxCount = computed(() =>
  Math.max(...sortedBeliefs.value.map(b => b.count), 1)
)

// ─── 频率分组 ──────────────────────────────────────────────
const highFrequencyBeliefs = computed(() =>
  sortedBeliefs.value.filter(b => b.count >= 3)
)
const commonBeliefs = computed(() =>
  sortedBeliefs.value.filter(b => b.count === 2)
)
const occasionalBeliefs = computed(() =>
  sortedBeliefs.value.filter(b => b.count === 1)
)

// ─── 汇总统计 ──────────────────────────────────────────────
const totalUnique = computed(() => sortedBeliefs.value.length)
const totalOccurrences = computed(() =>
  sortedBeliefs.value.reduce((sum, b) => sum + b.count, 0)
)

const getBarWidth = (count: number): string =>
  (count / maxCount.value) * 100 + '%'

const goBack = () => uni.navigateBack()
</script>

<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="goBack" hover-class="nav-hover">
          <text class="nav-back-icon">←</text>
        </view>
        <text class="nav-title">我的信念</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="state-wrap">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="beliefs.length === 0" class="state-wrap">
      <text class="empty-icon">💭</text>
      <text class="empty-title">还没有记录信念</text>
      <text class="empty-desc">当你完成觉察后，出现的信念会在这里统计</text>
    </view>

    <!-- 信念统计列表 -->
    <view
      v-else
      class="list-wrap"
      :style="{ paddingTop: (statusBarHeight + 44) + 'px' }"
    >
      <!-- 汇总头部 -->
      <view class="summary-header">
        <text class="summary-title">你的信念模式</text>
        <view class="summary-stats">
          <view class="summary-stat">
            <text class="summary-stat-num">{{ totalUnique }}</text>
            <text class="summary-stat-label">核心信念</text>
          </view>
          <view class="summary-stat">
            <text class="summary-stat-num">{{ totalOccurrences }}</text>
            <text class="summary-stat-label">累计出现</text>
          </view>
          <view class="summary-stat">
            <text class="summary-stat-num">{{ beliefs.length }}</text>
            <text class="summary-stat-label">涉及记录</text>
          </view>
        </view>
      </view>

      <!-- 高频信念 -->
      <view v-if="highFrequencyBeliefs.length" class="belief-group">
        <view class="group-header">
          <text class="group-title">高频信念</text>
          <view class="group-badge"><text class="group-badge-text">反复出现</text></view>
        </view>
        <view
          class="list-item"
          v-for="(belief, index) in highFrequencyBeliefs"
          :key="belief._id"
        >
          <view class="item-header">
            <text class="item-rank">{{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1 }}</text>
            <text class="item-text">{{ belief.belief }}</text>
            <view class="item-meta">
              <text class="item-count">{{ belief.count }} 次</text>
              <view class="item-tag">高频</view>
            </view>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: getBarWidth(belief.count) }" />
          </view>
        </view>
      </view>

      <!-- 常见信念 -->
      <view v-if="commonBeliefs.length" class="belief-group">
        <view class="group-header">
          <text class="group-title">常见信念</text>
        </view>
        <view
          class="list-item"
          v-for="(belief, index) in commonBeliefs"
          :key="belief._id"
        >
          <view class="item-header">
            <text class="item-rank item-rank--plain">{{ highFrequencyBeliefs.length + index + 1 }}</text>
            <text class="item-text">{{ belief.belief }}</text>
            <view class="item-meta">
              <text class="item-count">{{ belief.count }} 次</text>
            </view>
          </view>
          <view class="progress-bar">
            <view class="progress-fill progress-fill--mid" :style="{ width: getBarWidth(belief.count) }" />
          </view>
        </view>
      </view>

      <!-- 偶尔出现 -->
      <view v-if="occasionalBeliefs.length" class="belief-group">
        <view class="group-header">
          <text class="group-title">偶尔出现</text>
        </view>
        <view
          class="list-item"
          v-for="(belief, index) in occasionalBeliefs"
          :key="belief._id"
        >
          <view class="item-header">
            <text class="item-rank item-rank--plain">{{ highFrequencyBeliefs.length + commonBeliefs.length + index + 1 }}</text>
            <text class="item-text">{{ belief.belief }}</text>
            <view class="item-meta">
              <text class="item-count">{{ belief.count }} 次</text>
            </view>
          </view>
          <view class="progress-bar">
            <view class="progress-fill progress-fill--low" :style="{ width: getBarWidth(belief.count) }" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #F3F0EA;
}

/* ── 导航栏 ── */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #F3F0EA;
}
.nav-inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 30rpx;
}
.nav-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
}
.nav-hover { opacity: 0.6; }
.nav-back-icon { font-size: 40rpx; color: #1C1A17; line-height: 1; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #1C1A17; margin-left: 12rpx; }

/* ── 状态容器 ── */
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 360rpx;
  padding-left: 60rpx;
  padding-right: 60rpx;
  min-height: 100vh;
  box-sizing: border-box;
}
.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #E8E0D6;
  border-top-color: #C49A6C;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}
.loading-text { font-size: 28rpx; color: #8A7E72; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 32rpx; font-weight: 600; color: #1C1A17; margin-bottom: 16rpx; }
.empty-desc { font-size: 26rpx; color: #8A7E72; text-align: center; line-height: 1.6; }

/* ── 列表容器 ── */
.list-wrap {
  padding-left: 30rpx;
  padding-right: 30rpx;
  padding-bottom: 40rpx;
  box-sizing: border-box;
}

/* ── 汇总头部 ── */
.summary-header {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 28rpx;
  text-align: center;
}
.summary-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1C1A17;
  margin-bottom: 24rpx;
  display: block;
}
.summary-stats {
  display: flex;
  justify-content: center;
  gap: 40rpx;
}
.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.summary-stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #C49A6C;
}
.summary-stat-label {
  font-size: 22rpx;
  color: #B8AFA4;
}

/* ── 信念分组 ── */
.belief-group {
  margin-bottom: 28rpx;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}
.group-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #8A7E72;
}
.group-badge {
  background: rgba(196, 154, 108, 0.15);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.group-badge-text {
  font-size: 20rpx;
  color: #C49A6C;
  font-weight: 500;
}

/* ── 列表项卡片 ── */
.list-item {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx 30rpx;
  margin-bottom: 16rpx;
}
.list-item:last-child { margin-bottom: 0; }

.item-header {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 18rpx;
}
.item-rank {
  font-size: 36rpx;
  width: 52rpx;
  flex-shrink: 0;
  text-align: center;
  line-height: 1.4;
}
.item-rank--plain {
  font-size: 30rpx;
  font-weight: 600;
  color: #B8AFA4;
  line-height: 1.5;
}
.item-text {
  flex: 1;
  font-size: 28rpx;
  color: #1C1A17;
  line-height: 1.5;
  word-break: break-word;
}
.item-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}
.item-count {
  font-size: 24rpx;
  color: #8A7E72;
  white-space: nowrap;
}
.item-tag {
  background: #C49A6C;
  color: #FFFFFF;
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  white-space: nowrap;
  line-height: 1.4;
}

/* ── 进度条 ── */
.progress-bar {
  width: 100%;
  height: 8rpx;
  background: #F0EBE4;
  border-radius: 8rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #D4A96A, #C49A6C);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}
.progress-fill--mid {
  background: linear-gradient(90deg, #D4C8B8, #C4B8AC);
}
.progress-fill--low {
  background: #E0D8CC;
}
</style>

<style>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
