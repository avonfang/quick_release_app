<template>
  <view class="ai-bubble-wrapper">
    <view class="ai-bubble">
      <text class="ai-text">{{ content }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

<style scoped lang="scss">
/*#ifdef H5*/
.ai-bubble-wrapper {
  display: flex;
  justify-content: flex-start;
  padding: 0 0;
  margin-bottom: 16px;
}

.ai-bubble {
  max-width: 70%;
  background-color: $bubble-ai;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  padding: 14px 20px;
}

.ai-text {
  font-size: 15px;
  color: $text-primary;
  line-height: 1.7;
  word-break: break-word;
}
/*#endif*/

/*#ifdef MP-WEIXIN*/
.ai-bubble-wrapper {
  display: flex;
  justify-content: flex-start;
  padding: 0 30rpx;
  margin-bottom: 24rpx;
}

.ai-bubble {
  max-width: 70%;
  background-color: $bubble-ai;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  padding: 22rpx 28rpx;
}

.ai-text {
  font-size: 28rpx;
  color: $text-primary;
  line-height: 1.7;
  word-break: break-word;
}
/*#endif*/
</style>
