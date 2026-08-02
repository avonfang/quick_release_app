<template>
  <view class="page-bg"></view>
  <view class="page-glow"></view>

  <view class="container">
    <view class="page-header">
      <text class="page-title">探索</text>
      <text class="page-subtitle">三条觉醒之路</text>
    </view>

    <view :class="'path-card ' + item.key" v-for="(item, index) in paths" :key="item.key" @tap="openPath" :data-key="item.key">
      <view class="path-accent"></view>
      <view class="path-body">
        <view class="path-header">
          <text class="path-icon">{{item.icon}}</text>
          <view class="path-info">
            <text class="path-title">{{item.title}}</text>
            <text class="path-subtitle">{{item.subtitle}}</text>
          </view>
        </view>
        <view class="path-progress">
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: item.progressPercent + '%' }"></view>
          </view>
          <text class="progress-text">{{item.progress}}/{{item.total}}</text>
        </view>
        <text class="path-source">{{item.source}}</text>
      </view>
    </view>
  </view>
</template>

<script>
import * as courses from '@/data/courses'

export default {
  data() {
    return {
      paths: [],
      themeClass: 'theme-default'
    }
  },

  onShow() {
    const theme = uni.getStorageSync('appTheme') || 'default'
    this.themeClass = 'theme-' + theme
    this.loadProgress()
  },

  methods: {
    loadProgress() {
      const paths = Object.entries(courses).map(([key, course]) => {
        const cache = uni.getStorageSync(`progress_${key}`) || 0
        return {
          key,
          ...course,
          total: course.lessons.length,
          progress: cache,
          progressPercent: Math.round((cache / course.lessons.length) * 100)
        }
      })
      this.paths = paths
    },

    openPath(e) {
      const key = e.currentTarget.dataset.key
      uni.navigateTo({ url: `/pages/learning/lesson/index?path=${key}&lessonIndex=0` })
    }
  }
}
</script>

<style scoped>
/* 探索 -- 沉浸深色风格 */

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

.page-header { margin-bottom: 40rpx; }
.page-title {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-size: 56rpx; font-weight: 700; color: #FDFBF7;
  display: block; letter-spacing: 4rpx;
}
.page-subtitle {
  font-size: 26rpx; color: rgba(255,255,255,0.4);
  display: block; margin-top: 8rpx; letter-spacing: 2rpx;
}

/* Path cards */
.path-card {
  display: flex;
  background: rgba(255,255,255,0.04);
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.06);
  transition: transform 0.2s;
}
.path-card:active { transform: scale(0.97); }

.path-accent {
  width: 8rpx; flex-shrink: 0;
}
.path-card.presence .path-accent { background: #C4A06A; }
.path-card.surrender .path-accent { background: #C69C6D; }
.path-card.openness .path-accent { background: #B8A5C4; }

.path-body { flex: 1; padding: 28rpx 28rpx 24rpx; }

.path-header { display: flex; align-items: center; gap: 16rpx; }
.path-icon { font-size: 56rpx; display: block; line-height: 1; }
.path-info { flex: 1; }
.path-title {
  font-size: 34rpx; font-weight: 700; color: #FDFBF7;
  display: block; letter-spacing: 1rpx;
}
.path-subtitle {
  font-size: 26rpx; color: rgba(255,255,255,0.5);
  display: block; margin-top: 4rpx;
}

.path-progress { display: flex; align-items: center; gap: 12rpx; margin-top: 24rpx; }
.progress-bar { flex: 1; height: 8rpx; background: rgba(255,255,255,0.08); border-radius: 4rpx; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4rpx; transition: width 0.6s; }
.path-card.presence .progress-fill { background: #C4A06A; }
.path-card.surrender .progress-fill { background: #C69C6D; }
.path-card.openness .progress-fill { background: #B8A5C4; }
.progress-text {
  font-size: 24rpx; color: rgba(255,255,255,0.4);
  min-width: 70rpx; text-align: right; font-weight: 500;
}

.path-source {
  font-size: 22rpx; color: rgba(255,255,255,0.25);
  display: block; margin-top: 16rpx; padding-top: 16rpx;
  border-top: 2rpx solid rgba(255,255,255,0.06);
}
</style>
