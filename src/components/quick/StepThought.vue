<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  next: []
}>()

const text = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

function goNext() {
  if (props.modelValue.trim()) emit('next')
}
</script>

<template>
  <view class="step">
    <text class="step-label">我注意到我在想：</text>
    <input
      v-model="text"
      class="step-input"
      placeholder="例如：如果讲不好大家会觉得我不专业"
      placeholder-class="step-ph"
    />
    <view
      class="step-btn"
      :class="{ 'step-btn--ready': modelValue.trim() }"
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

.step-input {
  display: block; width: 100%; padding: 0; margin-bottom: 16px; box-sizing: border-box;
  font-size: 15px; color: #1C1A17; line-height: 1.7;
  border: none; outline: none; height: 48px;
  background: transparent; font-family: inherit;
  border-bottom: 1.5px solid #F0ECE6;
}
.step-ph { color: #C4B8AC; font-size: 15px; }

.step-btn {
  height: 44px; border-radius: 60px;
  display: flex; align-items: center; justify-content: center;
  background: #E8E0D8; cursor: pointer;
  transition: all .3s cubic-bezier(.32,.72,0,1);
}
.step-btn--ready { background: linear-gradient(135deg, #C49A6C, #B8885A); }
.step-btn-text { font-size: 14px; font-weight: 600; color: #fff; letter-spacing: 2px; }

@media (max-width: 480px) {
  .step { padding: 24px 18px 20px; }
  .step-label { font-size: 15px; }
  .step-input { font-size: 14px; }
}
</style>
