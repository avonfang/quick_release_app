<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { deleteCard, getMergedRecords } from '@/utils/cloud'
import { isLoggedIn } from '@/utils/api'

interface HistoryRecord {
  _id: string
  sessionId: string
  createdAt: number
  event: string
  belief: string
  status: string
}

const records = ref<HistoryRecord[]>([])
const loading = ref(true)
const refresherTriggered = ref(false)
const swipedId = ref('')
// 每个项的 translateX 偏移量（rpx）
const translates = reactive<Record<string, number>>({})
const DELETE_WIDTH = 180

let touchStartX = 0
let touchStartY = 0

const getTranslate = (id: string) => translates[id] ?? 0

/** 获取历史记录列表（合并本地 + 服务端） */
const loadHistory = async () => {
  loading.value = true
  try {
    const merged = await getMergedRecords()
    records.value = merged
  } catch (err) {
    console.error('获取历史记录失败:', err)
  } finally {
    loading.value = false
    refresherTriggered.value = false
  }
}

/** 格式化时间戳为日期字符串 */
const formatDate = (ts: number): string => {
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

/** 返回上一页 */
const goBack = () => {
  uni.navigateBack()
}

/** 关闭所有滑出的删除按钮 */
const closeAll = () => {
  swipedId.value = ''
  records.value.forEach(r => { translates[r._id] = 0 })
}

const getClientX = (e: any): number => {
  return e.touches ? e.touches[0].clientX : e.clientX
}

const getClientY = (e: any): number => {
  return e.touches ? e.touches[0].clientY : e.clientY
}

const onSwipeStart = (e: any, itemId: string) => {
  touchStartX = getClientX(e)
  touchStartY = getClientY(e)
  // 收起其他项的删除按钮
  records.value.forEach(r => {
    if (r._id !== itemId) translates[r._id] = 0
  })
}

const onSwipeEnd = (e: any, itemId: string) => {
  const clientX = getClientX(e)
  const clientY = getClientY(e)
  const deltaX = clientX - touchStartX
  const deltaY = clientY - touchStartY

  // 竖滑忽略，不干扰 scroll-view 滚动
  if (Math.abs(deltaY) > Math.abs(deltaX)) return

  if (deltaX < -DELETE_WIDTH / 2) {
    swipedId.value = itemId
    translates[itemId] = -DELETE_WIDTH
  } else {
    swipedId.value = ''
    translates[itemId] = 0
  }
}

const onDelete = (item: HistoryRecord) => {
  uni.showModal({
    title: '删除记录',
    content: '确定要删除这条觉察记录吗？',
    success: async (res) => {
      if (res.confirm) {
        const ok = await deleteCard(item._id)
        if (ok) {
          records.value = records.value.filter(r => r._id !== item._id)
          delete translates[item._id]
          swipedId.value = ''
          uni.showToast({ title: '已删除', icon: 'success', duration: 1500 })
        } else {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

/** 查看觉察卡片详情 / 继续对话 */
const viewDetail = (item: HistoryRecord) => {
  if (swipedId.value) {
    closeAll()
    return
  }
  if (item.status === 'in_progress') {
    uni.setStorageSync('resumeSessionId', item.sessionId)
    uni.switchTab({ url: '/pages/chat/index' })
  } else {
    uni.navigateTo({
      url: `/pages/card/index?sessionId=${item.sessionId}&recordId=${item._id}`
    })
  }
}

/** 前往心理洞察 */
const goInsight = () => {
  uni.switchTab({ url: '/pages/insight/index' })
}

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/index' })
    return
  }
  loadHistory()
})
</script>

<template>
  <view class="container" @tap="closeAll">
    <!-- 自定义导航栏 -->
    <view class="navbar" :style="{ paddingTop: 'calc(var(--status-bar-height) + 10rpx)' }">
      <view class="navbar-back" @tap="goBack">
        <text class="back-arrow">←</text>
      </view>
      <text class="navbar-title">我的记录</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-icon" />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="records.length === 0" class="empty-container">
      <text class="empty-icon">📋</text>
      <text class="empty-title">还没有觉察记录</text>
      <text class="empty-desc">完成一次觉察后，记录会出现在这里</text>
    </view>

    <!-- 洞察入口 -->
    <view v-if="records.length >= 3" class="insight-banner" @tap="goInsight" hover-class="insight-banner-hover">
      <view class="insight-banner-inner">
        <view class="insight-badge">🧠</view>
        <view class="insight-banner-body">
          <text class="insight-banner-title">你的心理洞察</text>
          <text class="insight-banner-desc">基于{{ records.length }}次记录的模式分析</text>
        </view>
        <text class="insight-banner-arrow">→</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <scroll-view
      v-if="records.length > 0"
      class="list-scroll"
      scroll-y
      refresher-enabled
      :refresher-triggered="refresherTriggered"
      @refresherrefresh="loadHistory"
    >
      <view
        class="swipe-wrap"
        v-for="item in records"
        :key="item._id"
        @touchstart="onSwipeStart($event, item._id)"
        @touchend="onSwipeEnd($event, item._id)"
      >
        <!-- 删除按钮（隐藏在右侧） -->
        <view class="swipe-delete" @tap.stop="onDelete(item)">
          <text class="swipe-delete-icon">🗑</text>
          <text class="swipe-delete-text">删除</text>
        </view>

        <!-- 可滑动的内容 -->
        <view
          class="swipe-content"
          :style="{ transform: 'translateX(' + (translates[item._id] ?? 0) + 'rpx)' }"
          @tap="viewDetail(item)"
        >
          <view class="list-item" :class="{ 'item-in-progress': item.status === 'in_progress' }">
            <view class="item-header">
              <text class="item-date">{{ formatDate(item.createdAt) }}</text>
              <text v-if="item.status === 'in_progress'" class="item-badge">进行中</text>
              <text v-else class="item-badge item-badge-done">已完成</text>
            </view>
            <view class="item-body">
              <text class="item-event">{{ item.event || '(尚未记录事件)' }}</text>
              <text class="item-belief">{{ item.belief || '' }}</text>
            </view>
            <view class="item-arrow">
              <text class="arrow-icon">›</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #F3F0EA;
}

/* ===== 导航栏 ===== */
.navbar {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding-left: 20rpx;
  padding-right: 30rpx;
  padding-bottom: 10rpx;
  background-color: #F3F0EA;
  flex-shrink: 0;
}

.navbar-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
}

.back-arrow {
  font-size: 36rpx;
  color: #1C1A17;
  font-weight: 300;
  line-height: 1;
}

.navbar-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1C1A17;
  margin-left: 6rpx;
}

/* ===== 加载状态 ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding-bottom: 160rpx;
}

.loading-icon {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #E0D8CC;
  border-top-color: #8A7E72;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 26rpx;
  color: #8A7E72;
}

/* ===== 空状态 ===== */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding-bottom: 160rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1C1A17;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #8A7E72;
  text-align: center;
  line-height: 1.5;
  padding: 0 60rpx;
}

/* ===== 洞察入口横幅 ===== */
.insight-banner {
  margin: 20rpx 30rpx 0;
}
.insight-banner-inner {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  cursor: pointer;
}
.insight-banner-hover { opacity: .9; }
.insight-badge {
  font-size: 40rpx;
  flex-shrink: 0;
}
.insight-banner-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.insight-banner-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.insight-banner-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,.75);
}
.insight-banner-arrow {
  font-size: 32rpx;
  color: rgba(255,255,255,.8);
  flex-shrink: 0;
  font-weight: 300;
}

/* ===== 列表区域 ===== */
.list-scroll {
  flex: 1;
  height: 0;
  padding: 20rpx 30rpx 40rpx;
  box-sizing: border-box;
}

/* ===== 左滑删除容器 ===== */
.swipe-wrap {
  position: relative;
  margin-bottom: 20rpx;
  overflow: hidden;
  border-radius: 16rpx;
}

.swipe-delete {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 180rpx;
  background: #D4604A;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  border-radius: 16rpx;
}

.swipe-delete-icon {
  font-size: 36rpx;
}

.swipe-delete-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
}

.swipe-content {
  position: relative;
  z-index: 1;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

/* ===== 列表项 ===== */
.list-item {
  display: flex;
  flex-direction: column;
  padding: 28rpx 30rpx;
  position: relative;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.item-date {
  font-size: 22rpx;
  color: #B8AFA4;
}

.item-badge {
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  background: #F3F0EA;
  color: #B8AFA4;
  font-weight: 500;
}

.item-badge-done {
  background: #E8F0E8;
  color: #7A9E7A;
}

.item-in-progress {
  opacity: 0.85;
}

.item-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding-right: 36rpx;
}

.item-event {
  font-size: 30rpx;
  font-weight: 600;
  color: #1C1A17;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-belief {
  font-size: 26rpx;
  color: #8A7E72;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 右侧箭头 */
.item-arrow {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
}

.arrow-icon {
  font-size: 36rpx;
  color: #C8C0B6;
  font-weight: 300;
  line-height: 1;
}
</style>
