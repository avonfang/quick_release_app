<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { QUICK_EMOTIONS } from '@/utils/quick-record'
import { useTypewriter } from '@/composables/useTypewriter'

const props = defineProps<{
  emotion: string
  intensity: number
  event: string
  thought: string
  aiResponse: string
}>()

const emit = defineEmits<{
  reset: []
}>()

const { displayed, isTyping, isDone, start, complete } = useTypewriter(35)

function startTyping() {
  if (props.aiResponse) start(props.aiResponse)
}

onMounted(startTyping)
watch(() => props.aiResponse, startTyping)

function tapResponse() {
  if (isTyping.value) {
    complete(props.aiResponse)
  }
}

const emotionGradient: Record<string, string> = {
  '开心': 'linear-gradient(135deg, #F5E6D3, #EDD9C4)',
  '平静': 'linear-gradient(135deg, #E3E8E0, #D4DDD0)',
  '焦虑': 'linear-gradient(135deg, #F0E0D8, #E8D0C8)',
  '烦躁': 'linear-gradient(135deg, #F0D8D0, #E8C8C0)',
  '疲惫': 'linear-gradient(135deg, #E0DCD8, #D8D0C8)',
  '难过': 'linear-gradient(135deg, #E0D8E0, #D0C8D0)',
}
</script>

<template>
  <view class="result">
    <view class="result-emotion-wrap" :style="{ background: emotionGradient[emotion] || '#F5F3F0' }">
      <text class="result-emotion">{{ QUICK_EMOTIONS.find(e => e.value === emotion)?.emoji }}</text>
      <text class="result-emotion-label">{{ emotion }} · {{ intensity }}/10</text>
    </view>
    <view class="result-body">
      <view class="result-section">
        <text class="result-section-label">事件</text>
        <text class="result-section-text">{{ event }}</text>
      </view>
      <view class="result-section">
        <text class="result-section-label">内心声音</text>
        <text class="result-section-text">我注意到我在想：{{ thought }}</text>
      </view>
      <view class="result-divider"></view>
      <view class="result-ai" @tap="tapResponse">
        <view class="result-ai-avatar">AI</view>
        <text class="result-ai-text" style="white-space: pre-line">{{ displayed }}</text>
        <text v-if="isTyping" class="result-cursor">|</text>
      </view>
    </view>
    <view class="result-actions">
      <view class="result-btn" @tap="emit('reset')">
        <text class="result-btn-text">再记一条</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.result { }
.result-emotion-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 24px 24px 20px;
}
.result-emotion { font-size: 32px; }
.result-emotion-label { font-size: 13px; color: #6A6258; font-weight: 500; }
.result-body { padding: 0 24px 24px; }
.result-section { margin-bottom: 12px; }
.result-section-label { font-size: 11px; color: #B8AFA4; letter-spacing: 1px; display: block; margin-bottom: 4px; }
.result-section-text { font-size: 14px; color: #1C1A17; line-height: 1.6; }
.result-divider { height: 1px; background: #F0ECE6; margin: 16px 0; }
.result-ai {
  display: flex; gap: 10px; align-items: flex-start;
  background: #F8F5F0; border-radius: 12px; padding: 14px 16px;
  cursor: pointer;
}
.result-ai-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; color: #fff;
  flex-shrink: 0; margin-top: 2px;
}
.result-ai-text { font-size: 14px; color: #1C1A17; line-height: 1.8; flex: 1; }
.result-cursor {
  font-size: 14px; color: #C49A6C;
  animation: blink .8s infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.result-actions { display: flex; justify-content: center; padding: 0 24px 20px; }
.result-btn { cursor: pointer; padding: 8px 24px; }
.result-btn-text { font-size: 13px; color: #C49A6C; font-weight: 500; }

@media (max-width: 480px) {
  .result-emotion-wrap { padding: 20px 18px 16px; }
  .result-body { padding: 0 18px 20px; }
  .result-actions { padding: 0 18px 16px; }
}
</style>
