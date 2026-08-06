<script setup lang="ts">
import { computed } from 'vue'

defineProps<{
  currentStep: number
  totalSteps: number
  canGoBack: boolean
}>()

const emit = defineEmits<{
  goBackToStep: [step: number]
}>()
</script>

<template>
  <view class="steps">
    <view
      v-for="s in totalSteps"
      :key="s"
      class="steps-dot"
      :class="{
        'steps-dot--active': s <= currentStep,
        'steps-dot--current': s === currentStep,
        'steps-dot--clickable': s < currentStep,
      }"
      @tap="s < currentStep ? emit('goBackToStep', s) : undefined"
    ></view>
  </view>
</template>

<style scoped>
.steps { display: flex; justify-content: center; gap: 8px; margin-top: 16px; }
.steps-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #E0D8CC;
  transition: all .3s ease;
}
.steps-dot--active { background: #C49A6C; }
.steps-dot--current { width: 20px; border-radius: 4px; }
.steps-dot--clickable { cursor: pointer; }
</style>
