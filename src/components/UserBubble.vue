<template>
  <view class="user-bubble-wrapper">
    <view class="user-bubble">
      <text class="user-text">{{ content }}</text>
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
.user-bubble-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 0 0 0 80px;
  margin-bottom: 16px;
}

.user-bubble {
  max-width: 100%;
  background: $primary-gradient;
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  padding: 14px 20px;
}

.user-text {
  font-size: 15px;
  color: #FFFFFF;
  line-height: 1.7;
  word-break: break-word;
}
/*#endif*/

/*#ifdef MP-WEIXIN*/
.user-bubble-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 0 30rpx 0 120rpx;
  margin-bottom: 24rpx;
}

.user-bubble {
  max-width: 100%;
  background: $primary-gradient;
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  padding: 22rpx 28rpx;
}

.user-text {
  font-size: 28rpx;
  color: #FFFFFF;
  line-height: 1.7;
  word-break: break-word;
}
/*#endif*/
</style>
