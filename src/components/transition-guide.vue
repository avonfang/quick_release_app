<template>
<view :class="['overlay', phase]" @tap.stop="dismiss">
  <view class="guide-card">
    <text class="title">更新了什么</text>

    <view class="change-list">
      <view class="change-item">
        <text class="change-icon">🌿</text>
        <text class="change-label">首页极简</text>
        <text class="change-desc">打开即选情绪</text>
      </view>
      <view class="change-item">
        <text class="change-icon">💌</text>
        <text class="change-label">此刻信箱</text>
        <text class="change-desc">给自己写信</text>
      </view>
      <view class="change-item">
        <text class="change-icon">🔥</text>
        <text class="change-label">签到奖励</text>
        <text class="change-desc">完成后自动签到</text>
      </view>
    </view>

    <view class="streak-line" v-if="streakDays > 0">
      <text class="streak-text">🔥 你已连续 {{streakDays}} 天</text>
    </view>

    <view :class="['btn btn-primary btn-lg', canDismiss ? '' : 'btn-disabled']" @tap.stop="dismiss">
      <text v-if="!canDismiss">请稍候…</text>
      <text v-if="canDismiss">继续</text>
    </view>
  </view>
</view>
</template>

<script>
const MIN_DWELL = 1500

export default {
  props: {
    streakDays: { type: Number, default: 0 }
  },

  data() {
    return { phase: 'enter', canDismiss: false }
  },

  mounted() {
    setTimeout(() => this.phase = 'show', 100)
    this._timer = setTimeout(() => {
      this.canDismiss = true
    }, MIN_DWELL)
  },

  beforeDestroy() {
    if (this._timer) clearTimeout(this._timer)
  },

  methods: {
    dismiss() {
      if (!this.canDismiss) return
      uni.setStorageSync('hasSeenV5Guide', true)
      this.$emit('finish')
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(29, 26, 19, 0.7);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12rpx);
  opacity: 0; transition: opacity 0.4s ease;
}
.overlay.show { opacity: 1; }

.guide-card {
  background: var(--card); border-radius: var(--radius-md);
  width: 560rpx; padding: var(--space-32) var(--space-24) var(--space-24);
  box-shadow: var(--shadow-lg); text-align: center;
}

.title {
  font-size: var(--text-title); font-weight: 600; color: var(--text);
  display: block; margin-bottom: var(--space-24);
}

.change-list { display: flex; gap: var(--space-8); margin-bottom: var(--space-24); }
.change-item {
  flex: 1; background: var(--bg); border-radius: var(--radius-sm);
  padding: var(--space-12) var(--space-4); text-align: center;
}
.change-icon { font-size: 48rpx; display: block; margin-bottom: var(--space-4); }
.change-label { font-size: var(--text-caption); font-weight: 600; color: var(--text); display: block; }
.change-desc { font-size: 20rpx; color: var(--text-tertiary); display: block; margin-top: var(--space-1); }

.streak-line { margin-bottom: var(--space-20); }
.streak-text { font-size: var(--text-body); color: var(--gold); font-weight: 500; }

.btn-disabled { opacity: 0.5; }
</style>
