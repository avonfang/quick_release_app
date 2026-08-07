<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  quickAIResponse,
  saveQuickRecord,
  QUICK_EMOTIONS,
} from '@/utils/quick-record'
import type { QuickRecord } from '@/utils/quick-record'

// ── Inline typewriter ──
const displayed = ref('')
const isTyping = ref(false)
let _twTimer: ReturnType<typeof setInterval> | null = null

function twStart(text: string) {
  twStop()
  displayed.value = ''
  isTyping.value = true
  let i = 0
  const chars = [...text]
  _twTimer = setInterval(() => {
    if (i < chars.length) {
      displayed.value += chars[i]
      i++
      scrollNow()
    } else {
      twStop()
    }
  }, 40)
}

function twStop() {
  if (_twTimer) { clearInterval(_twTimer); _twTimer = null }
  isTyping.value = false
}

function twComplete(text: string) {
  twStop()
  displayed.value = text
}

onBeforeUnmount(twStop)

type State = 'idle' | 'emotion' | 'intensity' | 'event' | 'thought' | 'factOrWorry' | 'sending' | 'result'

interface Message {
  id: number
  role: 'ai' | 'user'
  content: string
}

const state = ref<State>('idle')
const messages = ref<Message[]>([])
const form = reactive({
  emotion: '',
  intensity: 5,
  event: '',
  thought: '',
  factOrWorry: '' as 'fact' | 'worry' | '',
})
const aiResponse = ref('')
const inputText = ref('')
const scrollTopVal = ref(0)
const saving = ref(false)

// ── Day/Night theme ──
const isDark = ref(true)
const themeVars = computed(() => {
  if (isDark.value) {
    return {
      '--qc-bg': '#2A231D',
      '--qc-text': '#FDFBF7',
      '--qc-bubble-ai': 'rgba(255,255,255,0.08)',
      '--qc-border': 'rgba(255,255,255,0.06)',
      '--qc-card': 'rgba(255,255,255,0.04)',
      '--qc-dim': 'rgba(255,255,255,0.25)',
      '--qc-placeholder': 'rgba(255,255,255,0.18)',
      '--qc-accent': 'linear-gradient(135deg, #C69C6D, #B8885A)',
      '--qc-accent-solid': '#C69C6D',
    }
  }
  return {
    '--qc-bg': '#F8F5F0',
    '--qc-text': '#1C1A17',
    '--qc-bubble-ai': '#EDE8E0',
    '--qc-border': 'rgba(0,0,0,0.05)',
    '--qc-card': '#FFFFFF',
    '--qc-dim': '#B8AFA4',
    '--qc-placeholder': '#C4B8AC',
    '--qc-accent': 'linear-gradient(135deg, #C49A6C, #B8885A)',
    '--qc-accent-solid': '#C49A6C',
  }
})

function updateTheme() {
  const hour = new Date().getHours()
  isDark.value = hour < 6 || hour >= 18
}

const statusBarHeight = ref(20)
const windowHeight = ref(0)
const rpxRatio = ref(0.5)  // px per rpx
const scrollViewHeight = ref(0)

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = (sys as any).statusBarHeight || 20
    windowHeight.value = (sys as any).windowHeight || 0
    rpxRatio.value = ((sys as any).windowWidth || 375) / 750
  } catch { /* use default */ }
  updateTheme()
  startFlow()
})

function calcScrollHeight() {
  const navH = statusBarHeight.value + 88 * rpxRatio.value
  const inputH = (state.value === 'event' || state.value === 'thought') ? 54 : 0
  scrollViewHeight.value = windowHeight.value - navH - inputH
}

function startFlow() {
  state.value = 'emotion'
  calcScrollHeight()
}

function scrollToBottom() {
  // Increment scroll-top to a very large value; scroll-view clamps to max
  scrollTopVal.value += 99999
}

function scrollNow() {
  scrollTopVal.value += 99999
}

// Auto-scroll on state or message changes (flush:'post' ensures DOM is ready)
watch(
  () => [state.value, messages.value.length] as const,
  () => {
    calcScrollHeight()
    scrollToBottom()
  },
  { flush: 'post' }
)

let _msgId = 0
function addMsg(role: 'ai' | 'user', content: string) {
  messages.value.push({ id: ++_msgId, role, content })
}

function onSelectEmotion(emotion: string) {
  if (state.value !== 'emotion') return
  form.emotion = emotion
  addMsg('ai', '嗨，你现在感觉怎么样？选一个最贴近此刻心情的吧')
  const emoji = QUICK_EMOTIONS.find(e => e.value === emotion)?.emoji || ''
  addMsg('user', `${emoji} ${emotion}`)
  state.value = 'intensity'
}

function onCustomEmotion() {
  const text = inputText.value.trim()
  if (!text || state.value !== 'emotion') return
  form.emotion = text
  addMsg('ai', '嗨，你现在感觉怎么样？选一个最贴近此刻心情的吧')
  addMsg('user', text)
  inputText.value = ''
  state.value = 'intensity'
}

function onSelectIntensity(v: number) {
  if (state.value !== 'intensity') return
  form.intensity = v
  addMsg('ai', `嗯。这种${form.emotion}的感受，强度大概是？1 是很轻微，10 是非常强烈。`)
  addMsg('user', `强度 ${v}/10`)
  state.value = 'event'
}

function onSubmitEvent() {
  const text = inputText.value.trim()
  if (!text || state.value !== 'event') return
  form.event = text
  addMsg('ai', '今天发生了什么，让你有这种感觉？')
  addMsg('user', text)
  inputText.value = ''
  state.value = 'thought'
}

function onSubmitThought() {
  const text = inputText.value.trim()
  if (!text || state.value !== 'thought') return
  form.thought = text
  addMsg('ai', '当这件事发生的时候，你脑子里出现了什么想法？试着用「我注意到我在想...」来表达。')
  addMsg('user', `我注意到我在想：${text}`)
  inputText.value = ''
  state.value = 'factOrWorry'
}

async function onSelectFactWorry(fw: 'fact' | 'worry') {
  if (state.value !== 'factOrWorry' || saving.value) return
  form.factOrWorry = fw
  addMsg('ai', '这个想法——它更像一件事实，还是更像一种担心？')
  addMsg('user', fw === 'fact' ? '更像事实' : '更像一种担心')
  state.value = 'sending'
  saving.value = true

  try {
    const reply = await quickAIResponse(form.event, form.emotion, form.thought, fw)
    aiResponse.value = reply
    saveQuickRecord({
      id: 'q_' + Date.now(),
      emotion: form.emotion,
      intensity: form.intensity,
      event: form.event,
      thought: form.thought,
      isFactOrWorry: fw,
      timestamp: Date.now(),
      aiResponse: reply,
    })
  } catch {
    aiResponse.value = '谢谢你的记录。'
  }

  state.value = 'result'
  saving.value = false
  nextTick(() => {
    twStart(aiResponse.value)
  })
}

function resetFlow() {
  twStop()
  messages.value = []
  form.emotion = ''
  form.intensity = 5
  form.event = ''
  form.thought = ''
  form.factOrWorry = ''
  aiResponse.value = ''
  inputText.value = ''
  state.value = 'emotion'
}

function tapResultText() {
  if (isTyping.value) twComplete(aiResponse.value)
}

const goChat = () => uni.navigateTo({ url: '/pages/chat/index' })
const goHome = () => uni.switchTab({ url: '/pages/index/index' })
</script>

<template>
  <view class="qc-page" :style="{ ...themeVars, height: windowHeight + 'px' }">
    <!-- Nav -->
    <view class="qc-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="qc-nav-inner">
        <view class="qc-nav-left" @tap="goHome">
          <text class="qc-nav-back-icon">←</text>
          <text class="qc-nav-back-label">觉察</text>
        </view>
        <view class="qc-nav-center">
          <text class="qc-nav-title">看见此刻</text>
        </view>
        <view class="qc-nav-right">
        </view>
      </view>
    </view>

    <!-- Messages -->
    <scroll-view
      class="qc-scroll"
      :style="{ height: scrollViewHeight + 'px' }"
      scroll-y
      :scroll-top="scrollTopVal"
      :scroll-with-animation="true"
      :enhanced="true"
      :show-scrollbar="false"
    >
      <view class="qc-scroll-inner">
        <!-- ═══ History messages ═══ -->
        <template v-for="msg in messages" :key="msg.id">
          <view v-if="msg.role === 'ai'" class="qc-msg qc-msg--ai">
            <view class="qc-bubble qc-bubble--ai">
              <text class="qc-bubble-text">{{ msg.content }}</text>
            </view>
          </view>
          <view v-else class="qc-msg qc-msg--user">
            <view class="qc-bubble qc-bubble--user">
              <text class="qc-bubble-text qc-bubble-text--user">{{ msg.content }}</text>
            </view>
          </view>
        </template>

        <!-- ═══ Current state ═══ -->

        <!-- Emotion -->
        <template v-if="state === 'emotion'">
          <view class="qc-msg qc-msg--ai">
            <view class="qc-bubble qc-bubble--ai">
              <text class="qc-phase-tag">情绪觉察</text>
              <text class="qc-bubble-text">嗨，你现在感觉怎么样？选一个最贴近此刻心情的吧</text>
            </view>
          </view>
          <view class="qc-chips">
            <view
              v-for="e in QUICK_EMOTIONS"
              :key="e.value"
              class="qc-chip"
              hover-class="qc-chip--hover"
              @tap="onSelectEmotion(e.value)"
            >
              <text class="qc-chip-emoji">{{ e.emoji }}</text>
              <text class="qc-chip-label">{{ e.label }}</text>
            </view>
          </view>
          <view class="qc-custom-emotion">
            <input
              v-model="inputText"
              class="qc-custom-emotion-input"
              placeholder="都不贴切？输入你此刻的感受..."
              placeholder-class="qc-custom-emotion-ph"
              confirm-type="done"
              @confirm="onCustomEmotion"
            />
            <view
              class="qc-send qc-send--small"
              :class="{ 'qc-send--ready': inputText.trim() }"
              hover-class="qc-send--hover"
              @tap="onCustomEmotion"
            >
              <text class="qc-send-text">确定</text>
            </view>
          </view>
        </template>

        <!-- Intensity -->
        <template v-if="state === 'intensity'">
          <view class="qc-msg qc-msg--ai">
            <view class="qc-bubble qc-bubble--ai">
              <text class="qc-bubble-text">嗯。这种{{ form.emotion }}的感受，强度大概是？1 是很轻微，10 是非常强烈。</text>
            </view>
          </view>
          <view class="qc-intensity">
            <view
              v-for="i in 10"
              :key="i"
              class="qc-intensity-dot"
              :class="{ 'qc-intensity-dot--on': i <= form.intensity }"
              hover-class="qc-intensity-dot--hover"
              @tap="onSelectIntensity(i)"
            >
              <text class="qc-intensity-num" :class="{ 'qc-intensity-num--on': i <= form.intensity }">{{ i }}</text>
            </view>
          </view>
        </template>

        <!-- Event -->
        <template v-if="state === 'event'">
          <view class="qc-msg qc-msg--ai">
            <view class="qc-bubble qc-bubble--ai">
              <text class="qc-bubble-text">今天发生了什么，让你有这种感觉？</text>
            </view>
          </view>
        </template>

        <!-- Thought -->
        <template v-if="state === 'thought'">
          <view class="qc-msg qc-msg--ai">
            <view class="qc-bubble qc-bubble--ai">
              <text class="qc-bubble-text">当这件事发生的时候，你脑子里出现了什么想法？试着用「我注意到我在想...」来表达。</text>
            </view>
          </view>
        </template>

        <!-- Fact or Worry -->
        <template v-if="state === 'factOrWorry'">
          <view class="qc-msg qc-msg--ai">
            <view class="qc-bubble qc-bubble--ai">
              <text class="qc-bubble-text">这个想法——它更像一件事实，还是更像一种担心？</text>
            </view>
          </view>
          <view class="qc-fw">
            <view class="qc-fw-btn" hover-class="qc-fw-btn--hover" @tap="onSelectFactWorry('fact')">
              <text class="qc-fw-icon">◎</text>
              <text class="qc-fw-label">更像事实</text>
              <text class="qc-fw-desc">有明确的证据支持</text>
            </view>
            <view class="qc-fw-btn" hover-class="qc-fw-btn--hover" @tap="onSelectFactWorry('worry')">
              <text class="qc-fw-icon">○</text>
              <text class="qc-fw-label">更像一种担心</text>
              <text class="qc-fw-desc">更多是脑海中的假设</text>
            </view>
          </view>
        </template>

        <!-- Sending -->
        <template v-if="state === 'sending'">
          <view class="qc-msg qc-msg--ai">
            <view class="qc-bubble qc-bubble--ai qc-bubble--loading">
              <text class="qc-phase-tag">正在理解...</text>
              <view class="qc-dots">
                <view class="qc-dot"></view>
                <view class="qc-dot"></view>
                <view class="qc-dot"></view>
              </view>
            </view>
          </view>
        </template>

        <!-- Result -->
        <template v-if="state === 'result'">
          <view class="qc-result">
            <view class="qc-result-section">
              <text class="qc-result-label">情绪</text>
              <text class="qc-result-text">{{ form.emotion }} · {{ form.intensity }}/10</text>
            </view>
            <view class="qc-result-section">
              <text class="qc-result-label">事件</text>
              <text class="qc-result-text">{{ form.event }}</text>
            </view>
            <view class="qc-result-section">
              <text class="qc-result-label">内心声音</text>
              <text class="qc-result-text">我注意到我在想：{{ form.thought }}</text>
            </view>
            <view class="qc-result-divider"></view>
            <text class="qc-result-ai" @tap="tapResultText">{{ displayed }}<text v-if="isTyping" class="qc-cursor">|</text></text>
          </view>
          <view class="qc-msg qc-msg--ai">
            <view class="qc-retry" hover-class="qc-retry--hover" @tap="resetFlow">
              <text class="qc-retry-text">再记一条</text>
            </view>
          </view>
          <view class="qc-deep" hover-class="qc-deep--hover" @tap="goChat">
            <text class="qc-deep-text">想深入探索？进行一次完整的觉察对话 →</text>
          </view>
        </template>

      </view>
    </scroll-view>

    <!-- Fixed bottom input -->
    <view v-if="state === 'event' || state === 'thought'" class="qc-input-bar">
      <input
        v-model="inputText"
        class="qc-input"
        :placeholder="state === 'event' ? '比如：下午开会时被突然点名...' : '比如：如果回答不上来大家会觉得我不行...'"
        placeholder-class="qc-input-ph"
        :focus="true"
        cursor-spacing="24"
        confirm-type="send"
        @confirm="state === 'event' ? onSubmitEvent() : onSubmitThought()"
      />
      <view
        class="qc-send"
        :class="{ 'qc-send--ready': inputText.trim() }"
        hover-class="qc-send--hover"
        @tap="state === 'event' ? onSubmitEvent() : onSubmitThought()"
      >
        <text class="qc-send-text">发送</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.qc-page {
  display: flex;
  flex-direction: column;
  background: var(--qc-bg);
  overflow: hidden;
}

/* ── Nav ── */
.qc-nav {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: var(--qc-bg);
  border-bottom: 1rpx solid var(--qc-border);
}
.qc-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  position: relative;
}
.qc-nav-left {
  display: flex;
  align-items: center;
  gap: 4rpx;
  min-width: 120rpx;
  z-index: 1;
}
.qc-nav-back-icon {
  font-size: 38rpx;
  color: var(--qc-accent-solid);
}
.qc-nav-back-label {
  font-size: 32rpx;
  color: var(--qc-accent-solid);
}
.qc-nav-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qc-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--qc-text);
  letter-spacing: 4rpx;
  white-space: nowrap;
}
.qc-nav-right {
  min-width: 120rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
}

/* ── Scroll ── */
.qc-scroll {
  flex-shrink: 0;
}
.qc-scroll-inner {
  padding: 16rpx 0 120rpx;
}

/* ── Message rows ── */
.qc-msg {
  display: flex;
  padding: 0 30rpx;
  margin-bottom: 24rpx;
}
.qc-msg--ai { justify-content: flex-start; }
.qc-msg--user { justify-content: flex-end; padding-left: 120rpx; }

/* ── Bubbles ── */
.qc-bubble {
  max-width: 100%;
  padding: 22rpx 28rpx;
  border-radius: 16px;
}
.qc-bubble--ai {
  max-width: 70%;
  background: var(--qc-bubble-ai);
  border-bottom-left-radius: 4px;
}
.qc-bubble--user {
  background: var(--qc-accent);
  border-bottom-right-radius: 4px;
}
.qc-bubble--loading {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 160rpx;
}
.qc-bubble-text {
  font-size: 28rpx;
  color: var(--qc-text);
  line-height: 1.7;
  word-break: break-word;
}
.qc-bubble-text--user {
  color: #fff;
}

/* ── Phase tag in bubble ── */
.qc-phase-tag {
  display: block;
  font-size: 22rpx;
  color: var(--qc-dim);
  letter-spacing: 2rpx;
  margin-bottom: 8rpx;
}

/* ── Loading dots ── */
.qc-dots {
  display: flex;
  gap: 12rpx;
}
.qc-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: var(--qc-accent-solid);
  opacity: 0.5;
  animation: qcDotPulse 1.4s ease-in-out infinite;
}
.qc-dot:nth-child(2) { animation-delay: .2s; }
.qc-dot:nth-child(3) { animation-delay: .4s; }
@keyframes qcDotPulse {
  0%, 80%, 100% { opacity: .3; transform: scale(.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* ── Emotion chips ── */
.qc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 0 30rpx;
  margin-bottom: 24rpx;
}
.qc-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 32rpx;
  border-radius: 48rpx;
  background: var(--qc-bubble-ai);
  border: 2rpx solid var(--qc-border);
}
.qc-chip--hover {
  opacity: 0.7;
}
.qc-chip-emoji { font-size: 34rpx; }
.qc-chip-label { font-size: 28rpx; color: var(--qc-text); }

/* ── Custom emotion input ── */
.qc-custom-emotion {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 30rpx;
  margin-bottom: 24rpx;
}
.qc-custom-emotion-input {
  flex: 1;
  height: 80rpx;
  background: var(--qc-bubble-ai);
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: var(--qc-text);
}
.qc-custom-emotion-ph {
  color: var(--qc-placeholder);
  font-size: 28rpx;
}
.qc-send--small {
  width: auto;
  height: 80rpx;
  padding: 0 28rpx;
  border-radius: 20rpx;
  background: var(--qc-bubble-ai);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Intensity bar ── */
.qc-intensity {
  display: flex;
  gap: 8rpx;
  padding: 0 30rpx;
  margin-bottom: 24rpx;
}
.qc-intensity-dot {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  background: var(--qc-bubble-ai);
  display: flex;
  align-items: center;
  justify-content: center;
}
.qc-intensity-dot--hover { opacity: 0.7; }
.qc-intensity-dot--on { background: var(--qc-accent-solid); }
.qc-intensity-num {
  font-size: 24rpx;
  color: var(--qc-dim);
  font-weight: 500;
}
.qc-intensity-num--on { color: #fff; }

/* ── Fact / Worry buttons ── */
.qc-fw {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx;
  margin-bottom: 24rpx;
}
.qc-fw-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 36rpx 24rpx;
  border-radius: 28rpx;
  background: var(--qc-bubble-ai);
  border: 2rpx solid var(--qc-border);
}
.qc-fw-btn--hover { opacity: 0.7; }
.qc-fw-icon { font-size: 44rpx; color: var(--qc-accent-solid); }
.qc-fw-label { font-size: 28rpx; color: var(--qc-text); font-weight: 500; }
.qc-fw-desc { font-size: 22rpx; color: var(--qc-dim); }

/* ── Result ── */
.qc-result {
  background: var(--qc-card);
  border-radius: 16px;
  padding: 28rpx;
  margin: 0 30rpx 24rpx;
}
.qc-result-section { margin-bottom: 20rpx; }
.qc-result-label {
  display: block;
  font-size: 22rpx;
  color: var(--qc-dim);
  letter-spacing: 2rpx;
  margin-bottom: 8rpx;
}
.qc-result-text {
  font-size: 28rpx;
  color: var(--qc-text);
  line-height: 1.7;
}
.qc-result-divider {
  height: 2rpx;
  background: var(--qc-border);
  margin: 28rpx 0;
}
.qc-result-ai {
  font-size: 28rpx;
  color: var(--qc-text);
  line-height: 1.7;
  display: block;
}
.qc-cursor {
  color: var(--qc-accent-solid);
  animation: qcBlink .8s infinite;
}
@keyframes qcBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── Retry ── */
.qc-retry {
  display: flex;
  justify-content: center;
  padding: 12rpx 0;
}
.qc-retry--hover { opacity: .7; }
.qc-retry-text {
  font-size: 28rpx;
  color: var(--qc-accent-solid);
  font-weight: 500;
}

/* ── Deep link ── */
.qc-deep {
  display: flex;
  justify-content: center;
  padding: 20rpx 0 48rpx;
}
.qc-deep--hover { opacity: .7; }
.qc-deep-text {
  font-size: 28rpx;
  color: var(--qc-dim);
  letter-spacing: 2rpx;
}

/* ── Bottom input ── */
.qc-input-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  background: var(--qc-bg);
  border-top: 1rpx solid var(--qc-border);
  flex-shrink: 0;
}
.qc-input {
  flex: 1;
  height: 80rpx;
  background: var(--qc-bubble-ai);
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: var(--qc-text);
}
.qc-input-ph {
  color: var(--qc-placeholder);
  font-size: 28rpx;
}
.qc-send {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: var(--qc-bubble-ai);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qc-send--hover { opacity: .8; }
.qc-send--ready {
  background: var(--qc-accent);
}
.qc-send-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
</style>
