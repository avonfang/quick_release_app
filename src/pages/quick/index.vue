<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { isLoggedIn } from '@/utils/api'
import {
  quickAIResponse,
  saveQuickRecord,
  hasRecordToday,
  getPatternSummary,
  QUICK_EMOTIONS,
  PatternSummary,
} from '@/utils/quick-record'
import { type QuickRecord } from '@/utils/quick-record'

// ─── Auth guard ────────────────────────────────────────────────
onMounted(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/index' })
  }
})

// ─── 4-step flow state ─────────────────────────────────────────
const step = ref(1)
const selectedEmotion = ref('')
const intensity = ref(5)
const eventText = ref('')
const thoughtText = ref('')
const isFactOrWorry = ref<'fact' | 'worry' | ''>('')
const isSending = ref(false)
const aiResponse = ref('')
const showResponse = ref(false)

// 晚间提醒
const showReminder = ref(false)

// 模式摘要（通过计数器实现 reactive 触发）
const _updateKey = ref(0)
const patternSummary = computed<PatternSummary>(() => (
  _updateKey.value,
  getPatternSummary(14)
))

onMounted(() => {
  if (!hasRecordToday()) {
    const hour = new Date().getHours()
    if (hour >= 20 || hour < 1) {
      showReminder.value = true
    }
  }
})

// ─── Step handlers ─────────────────────────────────────────────
function selectEmotion(e: string) {
  selectedEmotion.value = e
  step.value = 2
}

function setIntensity(v: number) {
  intensity.value = v
}

function goToStep3() {
  if (eventText.value.trim()) step.value = 3
}

function goToStep4() {
  if (thoughtText.value.trim()) step.value = 4
}

async function sendRecord(fw: 'fact' | 'worry') {
  isFactOrWorry.value = fw
  if (isSending.value) return

  isSending.value = true
  showResponse.value = false

  try {
    const reply = await quickAIResponse(
      eventText.value.trim(),
      selectedEmotion.value,
      thoughtText.value.trim(),
      fw,
    )
    aiResponse.value = reply
    showResponse.value = true

    const record: QuickRecord = {
      id: 'q_' + Date.now(),
      emotion: selectedEmotion.value,
      intensity: intensity.value,
      event: eventText.value.trim(),
      thought: thoughtText.value.trim(),
      isFactOrWorry: fw,
      timestamp: Date.now(),
      aiResponse: reply,
    }
    saveQuickRecord(record)
    _updateKey.value++
  } catch {
    aiResponse.value = '谢谢你的记录。'
    showResponse.value = true
  } finally {
    isSending.value = false
  }
}

function resetFlow() {
  step.value = 1
  selectedEmotion.value = ''
  intensity.value = 5
  eventText.value = ''
  thoughtText.value = ''
  isFactOrWorry.value = ''
  showResponse.value = false
  aiResponse.value = ''
}

// ─── Tab navigation ────────────────────────────────────────────
const goChat = () => {
  uni.navigateTo({ url: '/pages/chat/index' })
}
const startDeepSession = goChat
const goHistory = () => {
  uni.navigateTo({ url: '/pages/history/index' })
}
const goInsight = () => {
  uni.navigateTo({ url: '/pages/insight/index' })
}
const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

// ─── 情绪颜色映射 ──────────────────────────────────────────────
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

        <!-- ═══ 4-Step Card ═══ -->
        <view class="h5-card">

          <!-- ====== Result View ====== -->
          <view v-if="showResponse" class="h5-result">
            <view class="h5-result-emotion-wrap" :style="{ background: emotionGradient[selectedEmotion] || '#F5F3F0' }">
              <text class="h5-result-emotion">{{ QUICK_EMOTIONS.find(e => e.value === selectedEmotion)?.emoji }}</text>
              <text class="h5-result-emotion-label">{{ selectedEmotion }} · {{ intensity }}/10</text>
            </view>
            <view class="h5-result-body">
              <view class="h5-result-section">
                <text class="h5-result-section-label">事件</text>
                <text class="h5-result-section-text">{{ eventText }}</text>
              </view>
              <view class="h5-result-section">
                <text class="h5-result-section-label">内心声音</text>
                <text class="h5-result-section-text">我注意到我在想：{{ thoughtText }}</text>
              </view>
              <view class="h5-result-divider"></view>
              <view class="h5-result-ai">
                <view class="h5-result-ai-avatar">AI</view>
                <text class="h5-result-ai-text" style="white-space: pre-line">{{ aiResponse }}</text>
              </view>
            </view>
            <view class="h5-result-actions">
              <view class="h5-result-btn" @tap="resetFlow">
                <text class="h5-result-btn-text">再记一条</text>
              </view>
            </view>
          </view>

          <!-- ====== Step 1: Emotion + Intensity ====== -->
          <view v-else-if="step === 1" class="h5-step">
            <text class="h5-step-label">你现在的感受更接近哪一种？</text>
            <view class="h5-step-emotions">
              <view
                v-for="e in QUICK_EMOTIONS"
                :key="e.value"
                class="h5-step-emotion-item"
                :class="{ 'h5-step-emotion-item--active': selectedEmotion === e.value }"
                @tap="selectEmotion(e.value)"
              >
                <text class="h5-step-emotion-emoji">{{ e.emoji }}</text>
                <text class="h5-step-emotion-label">{{ e.label }}</text>
              </view>
            </view>
            <!-- Intensity -->
            <text class="h5-step-sub">强度</text>
            <view class="h5-step-intensity">
              <view
                v-for="i in 10"
                :key="i"
                class="h5-step-intensity-dot"
                :class="{ 'h5-step-intensity-dot--on': i <= intensity }"
                @tap="setIntensity(i)"
              >
                <text class="h5-step-intensity-text" :class="{ 'h5-step-intensity-text--on': i <= intensity }">{{ i }}</text>
              </view>
            </view>
          </view>

          <!-- ====== Step 2: Event ====== -->
          <view v-else-if="step === 2" class="h5-step">
            <text class="h5-step-label">今天发生了什么，让你有这种感觉？</text>
            <textarea
              v-model="eventText"
              class="h5-step-textarea"
              placeholder="例如：今天开会时被突然点名..."
              placeholder-class="h5-step-ph"
              maxlength="300"
            />
            <view
              class="h5-step-btn"
              :class="{ 'h5-step-btn--ready': eventText.trim() }"
              @tap="goToStep3"
            >
              <text class="h5-step-btn-text">继续</text>
            </view>
          </view>

          <!-- ====== Step 3: Thought ====== -->
          <view v-else-if="step === 3" class="h5-step">
            <text class="h5-step-label">我注意到我在想：</text>
            <input
              v-model="thoughtText"
              class="h5-step-input"
              placeholder="例如：如果讲不好大家会觉得我不专业"
              placeholder-class="h5-step-ph"
            />
            <view
              class="h5-step-btn"
              :class="{ 'h5-step-btn--ready': thoughtText.trim() }"
              @tap="goToStep4"
            >
              <text class="h5-step-btn-text">继续</text>
            </view>
          </view>

          <!-- ====== Step 4: Fact or Worry ====== -->
          <view v-else-if="step === 4" class="h5-step">
            <text class="h5-step-label">这个想法更像事实，还是一种担心？</text>
            <view class="h5-step-fw">
              <view class="h5-step-fw-btn" @tap="sendRecord('fact')" hover-class="h5-step-fw-btn--hover">
                <text class="h5-step-fw-icon">◎</text>
                <text class="h5-step-fw-label">更像事实</text>
                <text class="h5-step-fw-desc">有明确的证据支持</text>
              </view>
              <view class="h5-step-fw-btn" @tap="sendRecord('worry')" hover-class="h5-step-fw-btn--hover">
                <text class="h5-step-fw-icon">○</text>
                <text class="h5-step-fw-label">更像一种担心</text>
                <text class="h5-step-fw-desc">更多是脑海中的假设</text>
              </view>
            </view>
          </view>

          <!-- ====== Sending ====== -->
          <view v-else-if="isSending" class="h5-step h5-step--center">
            <view class="h5-step-loading"></view>
            <text class="h5-step-loading-text">正在倾听...</text>
          </view>

        </view>

        <!-- ═══ Step indicator ═══ -->
        <view v-if="!showResponse && step <= 4" class="h5-steps">
          <view
            v-for="s in 4"
            :key="s"
            class="h5-steps-dot"
            :class="{ 'h5-steps-dot--active': s <= step, 'h5-steps-dot--current': s === step }"
          ></view>
        </view>

        <!-- ═══ Pattern Summary (when enough data) ═══ -->
        <view v-if="patternSummary.recordCount >= 3" class="h5-pattern">
          <view class="h5-pattern-header">
            <text class="h5-pattern-title">最近{{ patternSummary.periodDays }}天的模式</text>
            <view class="h5-pattern-link" @tap="goInsight">
              <text class="h5-pattern-link-text">查看完整分析 →</text>
            </view>
          </view>

          <!-- 情绪分布 -->
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

          <!-- 常见想法 -->
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
       MP-WEIXIN: original layout (unchanged)
       ============================================================ -->
  <!--#ifdef MP-WEIXIN-->
  <view class="container">
    <view class="ambient-glow ambient-glow--top"></view>
    <view class="ambient-glow ambient-glow--bottom"></view>
    <view class="noise-overlay"></view>

    <view class="top-section">
      <text class="badge">MINDFUL AWARENESS</text>
      <view class="title-block">
        <view class="title-line">看⾒</view>
        <view class="title-line">此刻</view>
      </view>
      <text class="subtitle">当情绪出现时，看看你正在相信什么</text>
      <view class="art-area">
        <view class="particle p1"></view>
        <view class="particle p2"></view>
        <view class="particle p3"></view>
        <view class="ring ring-outer"></view>
        <view class="ring ring-middle"></view>
        <view class="circle-solid">
          <view class="circle-core"></view>
        </view>
      </view>
    </view>

    <view class="bottom-section">
      <view class="cta" @tap="startDeepSession">
        <view class="cta-shine"></view>
        <text class="cta-label">开始一次觉察</text>
      </view>
      <view class="nav-links">
        <view class="nav-item" @tap="goHistory">
          <view class="nav-icon"><text class="nav-emoji">📋</text></view>
          <text class="nav-text">记录</text>
        </view>
        <view class="nav-item" @tap="goInsight">
          <view class="nav-icon"><text class="nav-emoji">🧠</text></view>
          <text class="nav-text">模式</text>
        </view>
      </view>
      <view class="home-link" @tap="goHome">
        <text class="home-link-text">← 回到首页</text>
      </view>
    </view>
  </view>
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

/* ═══ Step container ═══ */
.h5-step { padding: 28px 24px 24px; }
.h5-step--center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; }
.h5-step-label {
  display: block; font-size: 16px; font-weight: 600; color: #1C1A17;
  margin-bottom: 20px; letter-spacing: .3px; line-height: 1.5;
}

/* ── Step 1: Emotions ── */
.h5-step-emotions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.h5-step-emotion-item {
  display: flex; align-items: center; gap: 4px;
  padding: 10px 16px; border-radius: 30px;
  background: #F5F3F0; cursor: pointer;
  transition: all .2s cubic-bezier(.32,.72,0,1);
  border: 1.5px solid transparent;
}
.h5-step-emotion-item:active { transform: scale(.94); }
.h5-step-emotion-item--active {
  background: #fff; border-color: #C49A6C;
  box-shadow: 0 0 0 1px rgba(196,154,108,.2);
}
.h5-step-emotion-emoji { font-size: 18px; }
.h5-step-emotion-label { font-size: 13px; color: #6A6258; font-weight: 500; }
.h5-step-emotion-item--active .h5-step-emotion-label { color: #1C1A17; }

/* ── Step 1: Intensity ── */
.h5-step-sub { font-size: 12px; color: #B8AFA4; display: block; margin-bottom: 10px; letter-spacing: 1px; }
.h5-step-intensity { display: flex; gap: 4px; }
.h5-step-intensity-dot {
  flex: 1; text-align: center; padding: 8px 0; border-radius: 8px;
  background: #F5F3F0; cursor: pointer; transition: all .2s ease;
}
.h5-step-intensity-dot--on { background: #C49A6C; }
.h5-step-intensity-text { font-size: 12px; color: #B8AFA4; font-weight: 500; }
.h5-step-intensity-text--on { color: #fff; }

/* ── Step 2: Textarea ── */
.h5-step-textarea {
  display: block; width: 100%; padding: 0; margin-bottom: 16px; box-sizing: border-box;
  font-size: 15px; color: #1C1A17; line-height: 1.7;
  border: none; outline: none; resize: none; height: 80px;
  background: transparent; font-family: inherit;
}
.h5-step-ph { color: #C4B8AC; font-size: 15px; }

/* ── Step 3: Input ── */
.h5-step-input {
  display: block; width: 100%; padding: 0; margin-bottom: 16px; box-sizing: border-box;
  font-size: 15px; color: #1C1A17; line-height: 1.7;
  border: none; outline: none; height: 48px;
  background: transparent; font-family: inherit;
  border-bottom: 1.5px solid #F0ECE6;
}

/* ── Continue btn ── */
.h5-step-btn {
  height: 44px; border-radius: 60px;
  display: flex; align-items: center; justify-content: center;
  background: #E8E0D8; cursor: pointer;
  transition: all .3s cubic-bezier(.32,.72,0,1);
}
.h5-step-btn--ready { background: linear-gradient(135deg, #C49A6C, #B8885A); }
.h5-step-btn-text { font-size: 14px; font-weight: 600; color: #fff; letter-spacing: 2px; }

/* ── Step 4: Fact or Worry ── */
.h5-step-fw { display: flex; flex-direction: column; gap: 12px; }
.h5-step-fw-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 20px; border-radius: 16px;
  background: #F8F5F0; cursor: pointer; border: 1.5px solid transparent;
  transition: all .2s ease;
}
.h5-step-fw-btn--hover { background: #F0ECE6; border-color: #C49A6C; }
.h5-step-fw-icon { font-size: 24px; color: #C49A6C; }
.h5-step-fw-label { font-size: 15px; font-weight: 600; color: #1C1A17; }
.h5-step-fw-desc { font-size: 12px; color: #B8AFA4; }

/* ═══ Result View ═══ */
.h5-result { }
.h5-result-emotion-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 24px 24px 20px;
}
.h5-result-emotion { font-size: 32px; }
.h5-result-emotion-label { font-size: 13px; color: #6A6258; font-weight: 500; }
.h5-result-body { padding: 0 24px 24px; }
.h5-result-section { margin-bottom: 12px; }
.h5-result-section-label { font-size: 11px; color: #B8AFA4; letter-spacing: 1px; display: block; margin-bottom: 4px; }
.h5-result-section-text { font-size: 14px; color: #1C1A17; line-height: 1.6; }
.h5-result-divider { height: 1px; background: #F0ECE6; margin: 16px 0; }
.h5-result-ai {
  display: flex; gap: 10px; align-items: flex-start;
  background: #F8F5F0; border-radius: 12px; padding: 14px 16px;
}
.h5-result-ai-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; color: #fff;
  flex-shrink: 0; margin-top: 2px;
}
.h5-result-ai-text { font-size: 14px; color: #1C1A17; line-height: 1.8; flex: 1; }
.h5-result-actions { display: flex; justify-content: center; padding: 0 24px 20px; }
.h5-result-btn { cursor: pointer; padding: 8px 24px; }
.h5-result-btn-text { font-size: 13px; color: #C49A6C; font-weight: 500; }

/* ═══ Step indicator ═══ */
.h5-steps { display: flex; justify-content: center; gap: 8px; margin-top: 16px; }
.h5-steps-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #E0D8CC;
  transition: all .3s ease;
}
.h5-steps-dot--active { background: #C49A6C; }
.h5-steps-dot--current { width: 20px; border-radius: 4px; }

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

/* Emotion bars */
.h5-pattern-bars { display: flex; flex-direction: column; gap: 10px; }
.h5-pattern-bar-item { }
.h5-pattern-bar-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.h5-pattern-bar-label { font-size: 13px; color: #1C1A17; }
.h5-pattern-bar-count { font-size: 12px; color: #B8AFA4; }
.h5-pattern-bar-track { height: 6px; background: #F0ECE6; border-radius: 4px; overflow: hidden; }
.h5-pattern-bar-fill { height: 100%; background: linear-gradient(90deg, #C49A6C, #D4B48C); border-radius: 4px; transition: width .6s ease; }

/* Thoughts */
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

/* ═══ Loading ═══ */
.h5-step-loading {
  width: 32px; height: 32px; border: 3px solid #E8E0D8; border-top-color: #C49A6C;
  border-radius: 50%; animation: h5Spin .8s linear infinite;
  margin-bottom: 16px;
}
@keyframes h5Spin { to { transform: rotate(360deg); } }
.h5-step-loading-text { font-size: 13px; color: #B8AFA4; letter-spacing: 2px; }

.h5-spacer { height: 40px; }

/* ── Mobile (max 480px) ── */
@media (max-width: 480px) {
  .h5-inner { padding: 24px 16px 24px; }
  .h5-brand { margin-bottom: 18px; }
  .h5-eyebrow { font-size: 13px; }
  .h5-tagline { font-size: 12px; }
  .h5-step { padding: 24px 18px 20px; }
  .h5-step-label { font-size: 15px; }
  .h5-step-emotion-item { padding: 8px 12px; }
  .h5-step-emotion-emoji { font-size: 16px; }
  .h5-step-emotion-label { font-size: 12px; }
  .h5-step-textarea { font-size: 14px; }
  .h5-step-input { font-size: 14px; }
  .h5-step-fw-btn { padding: 16px; }
  .h5-pattern { padding: 20px 18px; }
  .h5-result-emotion-wrap { padding: 20px 18px 16px; }
  .h5-result-body { padding: 0 18px 20px; }
  .h5-result-actions { padding: 0 18px 16px; }
}

/*#endif*/

/* =============================================================
   MP-WEIXIN — original styles (unchanged)
   ============================================================= */
/*#ifdef MP-WEIXIN*/
.container {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: $bg-color;
  overflow: hidden;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256rpx 256rpx;
}

.ambient-glow {
  position: absolute;
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
}

.ambient-glow--top {
  top: -120rpx;
  right: -80rpx;
  width: 520rpx;
  height: 520rpx;
  background: radial-gradient(circle, rgba(196, 154, 108, 0.12) 0%, transparent 70%);
}

.ambient-glow--bottom {
  bottom: 80rpx;
  left: -120rpx;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(196, 154, 108, 0.06) 0%, transparent 70%);
}

.top-section {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 160rpx 64rpx 0;
}

.badge {
  font-size: 22rpx;
  letter-spacing: 8rpx;
  color: #B8916E;
  font-weight: 600;
  margin-bottom: 32rpx;
}

.title-block {
  margin-bottom: 20rpx;
}

.title-line {
  font-size: 88rpx;
  font-weight: 700;
  color: $text-primary;
  letter-spacing: 12rpx;
  line-height: 1.2;
}

.subtitle {
  font-size: 30rpx;
  color: $text-secondary;
  line-height: 1.7;
  letter-spacing: 1rpx;
  max-width: 540rpx;
}

.art-area {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 80rpx;
  min-height: 280rpx;
}

.circle-solid {
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #E8DDD0, #D4C4B4);
  position: relative;
}

.circle-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #C49A6C, #B8885A);
  opacity: 0.6;
  box-shadow: 0 0 80rpx rgba(196, 154, 108, 0.2);
}

.ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

.ring-middle {
  width: 180rpx;
  height: 180rpx;
  border: 3rpx solid rgba(196, 154, 108, 0.15);
}

.ring-outer {
  width: 230rpx;
  height: 230rpx;
  border: 2rpx solid rgba(196, 154, 108, 0.08);
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: #C49A6C;
}

.p1 { width: 12rpx; height: 12rpx; top: 8%; right: 22%; opacity: 0.15; }
.p2 { width: 8rpx; height: 8rpx; bottom: 18%; left: 8%; opacity: 0.15; }
.p3 { width: 16rpx; height: 16rpx; bottom: 28%; right: 28%; opacity: 0.08; }

.bottom-section {
  position: relative;
  z-index: 1;
  padding: 0 64rpx 80rpx;
}

.cta {
  width: 100%;
  height: 112rpx;
  background: $primary-gradient;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 56rpx rgba(184, 136, 90, 0.3);
  margin-bottom: 48rpx;
  position: relative;
  overflow: hidden;
}

.cta-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.12) 50%, transparent 70%);
  pointer-events: none;
}

.cta-label {
  position: relative;
  z-index: 1;
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
}

.nav-links {
  display: flex;
  justify-content: center;
  gap: 80rpx;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.nav-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(232, 221, 208, 0.5);
  border: 1px solid rgba(232, 221, 208, 0.8);
}

.nav-emoji {
  font-size: 36rpx;
}

.nav-text {
  font-size: 24rpx;
  color: $text-secondary;
  letter-spacing: 2rpx;
}

/* ── Home Link ── */
.home-link {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 48rpx;
  padding: 12rpx 0;
}
.home-link-text {
  font-size: 26rpx;
  color: $text-secondary;
  letter-spacing: 2rpx;
}
/*#endif*/
</style>
