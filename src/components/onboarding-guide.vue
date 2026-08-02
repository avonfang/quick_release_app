<template>
<view class="overlay">
  <view class="guide-card">
    <view class="dots">
      <view :class="['dot', { active: step === 0 }]"></view>
      <view :class="['dot', { active: step === 1 }]"></view>
    </view>

    <view v-if="step === 0" class="guide-content">
      <text class="guide-icon">🌿</text>
      <text class="guide-title">当情绪来了的时候</text>
      <text class="guide-body">焦虑、愤怒、低落、纠结——它们不是敌人。它们是信使。</text>
      <text class="guide-body" style="margin-top: var(--space-8);">「此刻」陪你从情绪中看见自己，而不是被情绪带走。每次只需几分钟。</text>
    </view>

    <view v-if="step === 1" class="guide-content">
      <text class="guide-icon">✦</text>
      <text class="guide-title">三步回到当下</text>
      <view class="step-list">
        <view class="step-item">
          <text class="step-num">1</text>
          <view class="step-info-wrap">
            <text class="step-info-title">觉察</text>
            <text class="step-info-desc">选择你此刻的感受，开始引导式急救</text>
          </view>
        </view>
        <view class="step-item">
          <text class="step-num">2</text>
          <view class="step-info-wrap">
            <text class="step-info-title">平复</text>
            <text class="step-info-desc">跟随引导呼吸与练习，让情绪自然流过</text>
          </view>
        </view>
        <view class="step-item">
          <text class="step-num">3</text>
          <view class="step-info-wrap">
            <text class="step-info-title">成长</text>
            <text class="step-info-desc">记录感受，学习课程，在每一次觉察中积累觉醒</text>
          </view>
        </view>
      </view>
    </view>

    <view class="guide-actions">
      <view v-if="step < 1" class="btn btn-primary btn-lg" @tap="next">开始了解</view>
      <view v-if="step === 1" class="btn btn-primary btn-lg" @tap="startFirstAid">🧘 做第一次急救</view>
      <view v-if="step === 1" class="btn btn-ghost btn-sm" @tap="finish">先随便看看</view>
      <view class="btn btn-ghost btn-sm" @tap="finish" v-if="step < 1">跳过</view>
    </view>
  </view>
</view>
</template>

<script>
export default {
  data() {
    return { step: 0 }
  },

  methods: {
    next() {
      if (this.step < 1) {
        this.step = this.step + 1
      }
    },

    startFirstAid() {
      uni.setStorageSync('hasSeenOnboarding', true)
      this.$emit('finish')
      uni.navigateTo({ url: '/pages/emergency/index' })
    },

    finish() {
      uni.setStorageSync('hasSeenOnboarding', true)
      this.$emit('finish')
    }
  }
}
</script>

<style scoped>
/* Onboarding guide v4 — 8pt grid */
.overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(29, 26, 19, 0.7);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12rpx);
}

.guide-card {
  background: var(--card); border-radius: var(--radius-md);
  width: 600rpx; padding: var(--space-32) var(--space-24) var(--space-24);
  box-shadow: var(--shadow-lg); position: relative;
}

.dots { display: flex; justify-content: center; gap: var(--space-4); margin-bottom: var(--space-24); }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: var(--border); }
.dot.active { width: 36rpx; border-radius: 12rpx; background: var(--primary); }

.guide-content { text-align: center; min-height: 380rpx; }
.guide-icon { font-size: 80rpx; display: block; margin-bottom: var(--space-12); }
.guide-title { font-size: var(--text-title); font-weight: 600; color: var(--text); display: block; }
.guide-desc { font-size: var(--text-body); color: var(--text-secondary); display: block; margin-top: var(--space-4); }
.guide-body { font-size: var(--text-body); color: var(--text-secondary); line-height: 1.8; display: block; text-align: left; margin-top: var(--space-12); }

.step-list { margin-top: var(--space-16); text-align: left; }
.step-item { display: flex; gap: var(--space-8); align-items: flex-start; padding: var(--space-12) 0; border-bottom: 2rpx solid var(--border-light); }
.step-item:last-child { border-bottom: none; }
.step-num { width: 44rpx; height: 44rpx; border-radius: 50%; background: var(--primary); color: #FFF; font-size: var(--text-caption); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: var(--space-2); }
.step-info-wrap { flex: 1; }
.step-info-title { font-size: var(--text-body); font-weight: 600; color: var(--text); display: block; }
.step-info-desc { font-size: var(--text-caption); color: var(--text-secondary); display: block; margin-top: var(--space-1); line-height: 1.6; }
.step-info { font-size: var(--text-body); color: var(--text); line-height: 1.6; flex: 1; }

.guide-actions { margin-top: var(--space-24); display: flex; flex-direction: column; align-items: center; gap: var(--space-8); }
</style>
