<script setup lang="ts">
import { QUICK_EMOTIONS } from '@/utils/quick-record'

import { computed } from 'vue'

const props = defineProps<{
  emotion: string
  intensity: number
}>()

const emit = defineEmits<{
  'update:emotion': [value: string]
  'update:intensity': [value: number]
  next: []
}>()

const canGoNext = computed(() => !!props.emotion)

function selectEmotion(e: string) {
  emit('update:emotion', e)
}

function goNext() {
  if (canGoNext.value) emit('next')
}
</script>

<template>
  <view class="step">
    <text class="step-label">你现在的感受更接近哪一种？</text>
    <view class="step-emotions">
      <view
        v-for="e in QUICK_EMOTIONS"
        :key="e.value"
        class="step-emotion-item"
        :class="{ 'step-emotion-item--active': emotion === e.value }"
        @tap="selectEmotion(e.value)"
      >
        <text class="step-emotion-emoji">{{ e.emoji }}</text>
        <text class="step-emotion-label">{{ e.label }}</text>
      </view>
    </view>
    <text class="step-sub">强度</text>
    <view class="step-intensity">
      <view
        v-for="i in 10"
        :key="i"
        class="step-intensity-dot"
        :class="{ 'step-intensity-dot--on': i <= intensity }"
        @tap="emit('update:intensity', i)"
      >
        <text class="step-intensity-text" :class="{ 'step-intensity-text--on': i <= intensity }">{{ i }}</text>
      </view>
    </view>
    <view
      class="step-btn"
      :class="{ 'step-btn--ready': canGoNext }"
      @tap="goNext"
    >
      <text class="step-btn-text">继续</text>
    </view>
  </view>
</template>

<style scoped>
.step { padding: 28px 24px 24px; }
.step-label {
  display: block; font-size: 16px; font-weight: 600; color: #1C1A17;
  margin-bottom: 20px; letter-spacing: .3px; line-height: 1.5;
}

.step-emotions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.step-emotion-item {
  display: flex; align-items: center; gap: 4px;
  padding: 10px 16px; border-radius: 30px;
  background: #F5F3F0; cursor: pointer;
  transition: all .2s cubic-bezier(.32,.72,0,1);
  border: 1.5px solid transparent;
}
.step-emotion-item:active { transform: scale(.94); }
.step-emotion-item--active {
  background: #fff; border-color: #C49A6C;
  box-shadow: 0 0 0 1px rgba(196,154,108,.2);
}
.step-emotion-emoji { font-size: 18px; }
.step-emotion-label { font-size: 13px; color: #6A6258; font-weight: 500; }
.step-emotion-item--active .step-emotion-label { color: #1C1A17; }

.step-sub { font-size: 12px; color: #B8AFA4; display: block; margin-bottom: 10px; letter-spacing: 1px; }
.step-intensity { display: flex; gap: 4px; }
.step-intensity-dot {
  flex: 1; text-align: center; padding: 8px 0; border-radius: 8px;
  background: #F5F3F0; cursor: pointer; transition: all .2s ease;
}
.step-intensity-dot--on { background: #C49A6C; }
.step-intensity-text { font-size: 12px; color: #B8AFA4; font-weight: 500; }
.step-intensity-text--on { color: #fff; }

.step-btn {
  height: 44px; border-radius: 60px; margin-top: 20px;
  display: flex; align-items: center; justify-content: center;
  background: #E8E0D8; cursor: pointer;
  transition: all .3s cubic-bezier(.32,.72,0,1);
}
.step-btn--ready { background: linear-gradient(135deg, #C49A6C, #B8885A); }
.step-btn-text { font-size: 14px; font-weight: 600; color: #fff; letter-spacing: 2px; }

@media (max-width: 480px) {
  .step { padding: 24px 18px 20px; }
  .step-label { font-size: 15px; }
  .step-emotion-item { padding: 8px 12px; }
  .step-emotion-emoji { font-size: 16px; }
  .step-emotion-label { font-size: 12px; }
}
</style>
