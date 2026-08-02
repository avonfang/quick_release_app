<template>
  <view class="quick-options" v-if="visible">
    <view class="options-list">
      <view
        v-for="(opt, idx) in options"
        :key="idx"
        class="option-tag"
        @tap="handleSelect(opt)"
      >
        <text class="option-text">{{ opt }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { QUICK_EMOTIONS, QUICK_THOUGHTS } from '@/utils/prompt'

const props = defineProps<{
  stage: string
  dismissKey?: number
}>()

const emit = defineEmits<{
  (e: 'select', value: string): void
}>()

const dismissed = ref(false)

// 阶段变化时重置（新阶段重新显示选项）
watch(() => props.stage, () => {
  dismissed.value = false
})

// 父组件通知收起（用户自己输入时）
watch(() => props.dismissKey, () => {
  if (props.dismissKey && props.dismissKey > 0) {
    dismissed.value = true
  }
})

const visible = computed(() => {
  if (dismissed.value) return false
  return props.stage === 'emotion' || props.stage === 'thought'
})

const options = computed(() => {
  if (props.stage === 'emotion') return QUICK_EMOTIONS
  if (props.stage === 'thought') return QUICK_THOUGHTS
  return []
})

function handleSelect(opt: string) {
  dismissed.value = true
  emit('select', opt)
}
</script>

<style scoped lang="scss">
/*#ifdef H5*/
.quick-options {
  padding: 8px 0 6px;
  background-color: $bg-color;
  flex-shrink: 0;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-tag {
  background-color: #FFFFFF;
  border: 1px solid $divider;
  border-radius: 30px;
  padding: 8px 18px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.option-tag:active {
  background-color: $bubble-ai;
}

.option-text {
  font-size: 14px;
  color: $text-primary;
}
/*#endif*/

/*#ifdef MP-WEIXIN*/
.quick-options {
  padding: 12rpx 30rpx 8rpx;
  background-color: $bg-color;
  flex-shrink: 0;
}

.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.option-tag {
  background-color: #FFFFFF;
  border: 1rpx solid $divider;
  border-radius: 30rpx;
  padding: 14rpx 30rpx;
  transition: background-color 0.15s;
}

.option-tag:active {
  background-color: $bubble-ai;
}

.option-text {
  font-size: 26rpx;
  color: $text-primary;
}
/*#endif*/
</style>
