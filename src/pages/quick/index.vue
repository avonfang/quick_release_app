<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  quickAIResponse,
  saveQuickRecord,
  hasRecordToday,
  getPatternSummary,
  QUICK_EMOTIONS,
} from '@/utils/quick-record'
import type { QuickRecord, PatternSummary } from '@/utils/quick-record'
import { useQuickForm, type QuickState } from '@/composables/useQuickForm'

import StepEmotion from '@/components/quick/StepEmotion.vue'
import StepEvent from '@/components/quick/StepEvent.vue'
import StepThought from '@/components/quick/StepThought.vue'
import StepFactWorry from '@/components/quick/StepFactWorry.vue'
import StepSending from '@/components/quick/StepSending.vue'
import StepResult from '@/components/quick/StepResult.vue'
import StepIndicator from '@/components/quick/StepIndicator.vue'
import QuickChat from '@/components/QuickChat.vue'

// ── State machine ──
const { state, form, canGoBack, currentStep, totalSteps, transition, goBack, goBackToStep, reset, restoreDraft } =
  useQuickForm()

// ── AI ──
const aiResponse = ref('')
const isSending = ref(false)

// ── Evening reminder ──
const showReminder = ref(false)

// ── Pattern summary ──
const _updateKey = ref(0)
const patternSummary = computed<PatternSummary>(() => (
  _updateKey.value,
  getPatternSummary(14)
))

// ── Init ──
onMounted(() => {
  if (!hasRecordToday()) {
    const hour = new Date().getHours()
    if (hour >= 20 || hour < 1) {
      showReminder.value = true
    }
  }

  const restored = restoreDraft()
  if (!restored) {
    transition('emotion')
  }
})

// ── Submitting ──
async function handleSubmit(fw: 'fact' | 'worry') {
  form.factOrWorry = fw
  if (isSending.value) return

  isSending.value = true
  transition('sending')

  try {
    const reply = await quickAIResponse(
      form.event.trim(),
      form.emotion,
      form.thought.trim(),
      fw,
    )
    aiResponse.value = reply

    const record: QuickRecord = {
      id: 'q_' + Date.now(),
      emotion: form.emotion,
      intensity: form.intensity,
      event: form.event.trim(),
      thought: form.thought.trim(),
      isFactOrWorry: fw,
      timestamp: Date.now(),
      aiResponse: reply,
    }
    saveQuickRecord(record)
    _updateKey.value++
    transition('result')
  } catch {
    aiResponse.value = '谢谢你的记录。'
    transition('result')
  } finally {
    isSending.value = false
  }
}

function handleReset() {
  reset()
  transition('emotion')
}

// ── Navigation ──
const goChat = () => uni.navigateTo({ url: '/pages/chat/index' })
const goInsight = () => uni.navigateTo({ url: '/pages/insight/index' })
const goHome = () => uni.switchTab({ url: '/pages/index/index' })
</script>

<template>
  <!-- ============================================================
       H5: 4-step guided flow + Pattern Summary
       ============================================================ -->
  <!--#ifdef H5-->
  <view class="h5-page">
    <view class="h5-grain"></view>
    <view class="h5-orb h5-orb--top"></view>
    <view class="h5-orb h5-orb--bottom"></view>

    <view class="h5-scroll">
      <view class="h5-inner">

        <!-- ═══ Brand ═══ -->
        <view class="h5-brand">
          <text class="h5-eyebrow">看见此刻</text>
          <text class="h5-tagline">花三分钟，看见自己</text>
        </view>

        <!-- ═══ Evening Reminder ═══ -->
        <view v-if="showReminder" class="h5-reminder">
          <text class="h5-reminder-text">今晚还没有记录，花一分钟看看今天的心情</text>
          <text class="h5-reminder-close" @tap="showReminder = false">✕</text>
        </view>

        <!-- ═══ Card ═══ -->
        <view class="h5-card">
          <Transition name="step-slide" mode="out-in">
            <StepResult
              v-if="state === 'result'"
              :emotion="form.emotion"
              :intensity="form.intensity"
              :event="form.event"
              :thought="form.thought"
              :aiResponse="aiResponse"
              @reset="handleReset"
            />
            <StepSending v-else-if="state === 'sending'" />
            <StepFactWorry v-else-if="state === 'factOrWorry'" @submit="handleSubmit" />
            <StepThought v-else-if="state === 'thought'" v-model="form.thought" @next="transition('factOrWorry')" />
            <StepEvent v-else-if="state === 'event'" v-model="form.event" @next="transition('thought')" />
            <StepEmotion
              v-else-if="state === 'emotion'"
              :emotion="form.emotion"
              :intensity="form.intensity"
              @update:emotion="form.emotion = $event; transition('event')"
              @update:intensity="form.intensity = $event"
            />
          </Transition>
        </view>

        <!-- ═══ Step indicator + Back ═══ -->
        <view v-if="state !== 'sending' && state !== 'result' && state !== 'idle'" class="h5-nav">
          <StepIndicator
            :currentStep="currentStep"
            :totalSteps="totalSteps"
            :canGoBack="canGoBack"
            @goBackToStep="goBackToStep"
          />
          <view v-if="canGoBack" class="h5-back" @tap="goBack">
            <text class="h5-back-text">← 返回上一步</text>
          </view>
        </view>

        <!-- ═══ Pattern Summary ═══ -->
        <view v-if="patternSummary.recordCount >= 3" class="h5-pattern">
          <view class="h5-pattern-header">
            <text class="h5-pattern-title">最近{{ patternSummary.periodDays }}天的模式</text>
            <view class="h5-pattern-link" @tap="goInsight">
              <text class="h5-pattern-link-text">查看完整分析 →</text>
            </view>
          </view>

          <view class="h5-pattern-section">
            <text class="h5-pattern-section-title">情绪分布</text>
            <view class="h5-pattern-bars">
              <view
                v-for="item in patternSummary.emotionDistribution.slice(0, 4)"
                :key="item.label"
                class="h5-pattern-bar-item"
              >
                <view class="h5-pattern-bar-header">
                  <text class="h5-pattern-bar-label">{{ item.label }}</text>
                  <text class="h5-pattern-bar-count">{{ item.count }}次</text>
                </view>
                <view class="h5-pattern-bar-track">
                  <view class="h5-pattern-bar-fill" :style="{ width: item.pct + '%' }"></view>
                </view>
              </view>
            </view>
          </view>

          <view v-if="patternSummary.commonThoughts.length" class="h5-pattern-section">
            <text class="h5-pattern-section-title">反复出现的想法</text>
            <view class="h5-pattern-thoughts">
              <view
                v-for="(t, i) in patternSummary.commonThoughts"
                :key="i"
                class="h5-pattern-thought"
              >
                <text class="h5-pattern-thought-icon">💭</text>
                <text class="h5-pattern-thought-text">{{ t }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ═══ Deep Mode Link ═══ -->
        <view class="h5-deep" @tap="goChat">
          <text class="h5-deep-text">进行一次完整的觉察对话 →</text>
        </view>

        <!-- ═══ Home Link ═══ -->
        <view class="h5-home" @tap="goHome">
          <text class="h5-home-text">← 回到首页</text>
        </view>

        <view class="h5-spacer"></view>
      </view>
    </view>
  </view>
  <!--#endif-->

  <!-- ============================================================
       MP-WEIXIN: conversational quick awareness
       ============================================================ -->
  <!--#ifdef MP-WEIXIN-->
  <QuickChat />
  <!--#endif-->
</template>

<style scoped lang="scss">
/* =============================================================
   H5: 4-step guided flow + Pattern Summary
   ============================================================= */
/*#ifdef H5*/
.h5-page {
  position: relative;
  min-height: 100vh;
  background: #FCF9F5;
  overflow: hidden;
}

.h5-grain {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E");
  background-repeat: repeat; background-size: 256px 256px;
}

.h5-orb {
  position: absolute; border-radius: 50%; pointer-events: none; z-index: 0;
}
.h5-orb--top { top: -180px; right: -120px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(196,154,108,.08) 0%, transparent 70%); }
.h5-orb--bottom { bottom: -100px; left: -160px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(180,160,130,.05) 0%, transparent 70%); }

.h5-scroll { position: relative; z-index: 2; height: 100vh; height: 100dvh; overflow-y: auto; }

.h5-inner {
  max-width: 480px; margin: 0 auto;
  padding: 40px 24px 40px; box-sizing: border-box;
}

/* ═══ Brand ═══ */
.h5-brand { text-align: center; margin-bottom: 24px; }
.h5-eyebrow {
  display: block; font-size: 14px; font-weight: 600; color: #1C1A17; letter-spacing: 4px;
  font-family: "Noto Serif SC", "Songti SC", Georgia, serif; margin-bottom: 6px;
}
.h5-tagline { display: block; font-size: 13px; color: #9A8E82; letter-spacing: 1px; }

/* ═══ Evening Reminder ═══ */
.h5-reminder {
  display: flex; align-items: center; gap: 12px;
  background: rgba(196,154,108,.08); border: 1px solid rgba(196,154,108,.15);
  border-radius: 12px; padding: 12px 16px; margin-bottom: 20px;
}
.h5-reminder-text { flex: 1; font-size: 13px; color: #8A7E72; line-height: 1.5; }
.h5-reminder-close { font-size: 14px; color: #C4B8AC; cursor: pointer; padding: 4px; }

/* ═══ Card ═══ */
.h5-card {
  background: #fff; border-radius: 20px; overflow: hidden;
  box-shadow: 0 2px 16px rgba(28,26,23,.04);
}

/* ═══ Step transition ═══ */
.step-slide-enter-active,
.step-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.step-slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.step-slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

/* ═══ Navigation bar (indicator + back) ═══ */
.h5-nav {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  margin-top: 16px;
}
.h5-back { cursor: pointer; padding: 6px 0; }
.h5-back:active { opacity: .6; }
.h5-back-text { font-size: 13px; color: #B8AFA4; letter-spacing: 1px; }

/* ═══ Pattern Summary ═══ */
.h5-pattern {
  margin-top: 28px; background: #fff; border-radius: 20px;
  padding: 24px; box-shadow: 0 2px 16px rgba(28,26,23,.04);
}
.h5-pattern-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.h5-pattern-title { font-size: 15px; font-weight: 600; color: #1C1A17; }
.h5-pattern-link { cursor: pointer; }
.h5-pattern-link-text { font-size: 12px; color: #C49A6C; }
.h5-pattern-section { margin-bottom: 20px; }
.h5-pattern-section:last-child { margin-bottom: 0; }
.h5-pattern-section-title { font-size: 11px; color: #B8AFA4; letter-spacing: 1px; display: block; margin-bottom: 12px; }

.h5-pattern-bars { display: flex; flex-direction: column; gap: 10px; }
.h5-pattern-bar-item { }
.h5-pattern-bar-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.h5-pattern-bar-label { font-size: 13px; color: #1C1A17; }
.h5-pattern-bar-count { font-size: 12px; color: #B8AFA4; }
.h5-pattern-bar-track { height: 6px; background: #F0ECE6; border-radius: 4px; overflow: hidden; }
.h5-pattern-bar-fill { height: 100%; background: linear-gradient(90deg, #C49A6C, #D4B48C); border-radius: 4px; transition: width .6s ease; }

.h5-pattern-thoughts { display: flex; flex-direction: column; gap: 8px; }
.h5-pattern-thought {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; background: #F8F5F0; border-radius: 10px;
}
.h5-pattern-thought-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.h5-pattern-thought-text { font-size: 13px; color: #6A6258; line-height: 1.5; }

/* ═══ Deep Mode Link ═══ */
.h5-deep { text-align: center; margin-top: 24px; cursor: pointer; padding: 8px 0; }
.h5-deep:active { opacity: .6; }
.h5-deep-text { font-size: 13px; color: #B8AFA4; letter-spacing: 1px; }

/* ═══ Home Link ═══ */
.h5-home { text-align: center; margin-top: 12px; cursor: pointer; padding: 8px 0; }
.h5-home:active { opacity: .6; }
.h5-home-text { font-size: 13px; color: #B8AFA4; letter-spacing: 1px; }

.h5-spacer { height: 40px; }

@media (max-width: 480px) {
  .h5-inner { padding: 24px 16px 24px; }
  .h5-brand { margin-bottom: 18px; }
  .h5-eyebrow { font-size: 13px; }
  .h5-tagline { font-size: 12px; }
  .h5-pattern { padding: 20px 18px; }
}
/*#endif*/

/* =============================================================
   MP-WEIXIN — styles in QuickChat component
   ============================================================= */
</style>
