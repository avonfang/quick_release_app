<script setup lang="ts">
const emit = defineEmits<{
  submit: [value: 'fact' | 'worry']
}>()
</script>

<template>
  <view class="step">
    <text class="step-label">这个想法更像事实，还是一种担心？</text>
    <view class="step-fw">
      <view class="step-fw-btn" @tap="emit('submit', 'fact')" hover-class="step-fw-btn--hover">
        <text class="step-fw-icon">◎</text>
        <text class="step-fw-label">更像事实</text>
        <text class="step-fw-desc">有明确的证据支持</text>
      </view>
      <view class="step-fw-btn" @tap="emit('submit', 'worry')" hover-class="step-fw-btn--hover">
        <text class="step-fw-icon">○</text>
        <text class="step-fw-label">更像一种担心</text>
        <text class="step-fw-desc">更多是脑海中的假设</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.step { padding: 28px 24px 24px; }
.step-label {
  display: block; font-size: 16px; font-weight: 600; color: #1C1A17;
  margin-bottom: 20px; letter-spacing: .3px; line-height: 1.5;
}

.step-fw { display: flex; flex-direction: column; gap: 12px; }
.step-fw-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 20px; border-radius: 16px;
  background: #F8F5F0; cursor: pointer; border: 1.5px solid transparent;
  transition: all .2s ease;
}
.step-fw-btn--hover { background: #F0ECE6; border-color: #C49A6C; }
.step-fw-icon { font-size: 24px; color: #C49A6C; }
.step-fw-label { font-size: 15px; font-weight: 600; color: #1C1A17; }
.step-fw-desc { font-size: 12px; color: #B8AFA4; }

@media (max-width: 480px) {
  .step { padding: 24px 18px 20px; }
  .step-label { font-size: 15px; }
  .step-fw-btn { padding: 16px; }
}
</style>
