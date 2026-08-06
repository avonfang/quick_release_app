<script setup lang="ts">
const emit = defineEmits<{
  reset: []
}>()
</script>

<template>
  <view class="step step--center">
    <view class="step-loading"></view>
    <text class="step-loading-text">正在倾听...</text>
  </view>
</template>

<style scoped>
.step--center {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 200px;
}
.step-loading {
  width: 32px; height: 32px; border: 3px solid #E8E0D8; border-top-color: #C49A6C;
  border-radius: 50%; animation: spin .8s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.step-loading-text { font-size: 13px; color: #B8AFA4; letter-spacing: 2px; }
</style>
