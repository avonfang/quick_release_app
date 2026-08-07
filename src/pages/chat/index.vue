<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { onBackPress, onHide, onShow } from '@dcloudio/uni-app'
import { useSessionStore, STAGE_LABELS } from '@/stores/session'
import { createSession, chatWithAI, saveCard } from '@/utils/cloud'

import { isSupported as isVoiceSupported, getState as getVoiceState, getDuration as getVoiceDuration, startRecording, stopRecording, onStateChange } from '@/utils/voice'

import AiBubble from '@/components/AiBubble.vue'
import UserBubble from '@/components/UserBubble.vue'

const store = useSessionStore()
const inputText = ref('')
const isLoading = ref(false)
const isInitializing = ref(true)

// ─── Day/Night theme ───────────────────────────────────────────────────
const isDark = ref(true)
const themeVars = computed(() => {
  if (isDark.value) {
    return {
      '--bg-primary': '#2A231D',
      '--bg-nav': '#2A231D',
      '--bg-input': 'rgba(255, 255, 255, 0.08)',
      '--bg-bubble-ai': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#FDFBF7',
      '--text-secondary': 'rgba(255, 255, 255, 0.4)',
      '--text-placeholder': 'rgba(255, 255, 255, 0.3)',
      '--border': 'rgba(255, 255, 255, 0.06)',
      '--separator': 'rgba(255, 255, 255, 0.08)',
      '--typing-dot': 'rgba(255, 255, 255, 0.3)',
      '--prog-dot': 'rgba(255, 255, 255, 0.12)',
      '--send-btn': 'linear-gradient(135deg, #C69C6D, #B8885A)',
    }
  }
  return {
    '--bg-primary': '#F8F5F0',
    '--bg-nav': '#F8F5F0',
    '--bg-input': '#FFFFFF',
    '--bg-bubble-ai': '#EDE8E0',
    '--text-primary': '#1C1A17',
    '--text-secondary': '#B8AFA4',
    '--text-placeholder': '#C4B8AC',
    '--border': 'rgba(0, 0, 0, 0.05)',
    '--separator': '#E8DDD0',
    '--typing-dot': '#B8AFA4',
    '--prog-dot': 'rgba(0, 0, 0, 0.08)',
    '--send-btn': 'linear-gradient(135deg, #C49A6C, #B8885A)',
  }
})

function updateTheme() {
  const hour = new Date().getHours()
  isDark.value = hour < 6 || hour >= 18
}

const pageStyle = computed(() => ({
  ...themeVars.value,
  height: windowHeight.value + 'px',
}))

const navBarStyle = computed(() => {
  const style: Record<string, string> = {
    paddingTop: (statusBarHeight.value || 20) + 'px',
  }
  if (navRightPadding.value) {
    style.paddingRight = navRightPadding.value + 'rpx'
  }
  return style
})

const isComposing = ref(false) // iOS IME composition state
const scrollToId = ref('')
const scrollRef = ref<HTMLElement | null>(null)
const scrollKey = ref(0)
const fallbackExchanges = ref<Record<string, number>>({})
const confirmTime = ref(0)
const textareaWidth = ref('auto')
const h5TextareaRef = ref<HTMLElement | null>(null)
const showTextarea = ref(true)
const statusBarHeight = ref(0)
const windowHeight = ref(0)
const chatInput = ref('')
const scrollTarget = ref('')
const isStreaming = ref(false)
const streamingContent = ref('')
const streamingDone = ref(false)
let streamTimer: ReturnType<typeof setTimeout> | null = null

// ─── Stage labels ───────────────────────────────────────────────────────
const stageLabels: Record<string, string> = {
  event: '事件',
  emotion: '情绪',
  thought: '自动想法',
  belief: '信念',
  loosen: '松动',
  release: '释放',
  awareness: '觉察',
  action: '行动',
}
const stageOrder = ['event', 'emotion', 'thought', 'belief', 'loosen', 'release', 'awareness', 'action']

// ─── Generation control ────────────────────────────────────────────────
let chatGenerator: { abort: () => void } | null = null
let lastSentText = ''

// ─── Voice input ───────────────────────────────────────────────────
const voiceSupported = ref(false)
const voiceState = ref(getVoiceState())
const voiceDuration = ref(getVoiceDuration())

onMounted(() => {
  onStateChange(() => {
    voiceState.value = getVoiceState()
    voiceDuration.value = getVoiceDuration()
  })
  // 语音功能暂不开放
  voiceSupported.value = false
})

async function toggleVoice() {
  if (voiceState.value === 'idle') {
    try {
      await startRecording()
    } catch {
      // unsupported or permission denied
    }
  } else if (voiceState.value === 'recording') {
    try {
      const text = await stopRecording()
      if (text) inputText.value = text
      await nextTick()
      autoResizeTextarea()
    } catch {
      // error already shown by voice util
    }
  }
}
// ────────────────────────────────────────────────────────────────────

// 计算 textarea 实际可用宽度（微信原生组件需显式设置像素宽度）
function calculateTextareaWidth() {
  //#ifdef MP-WEIXIN
  const sys = uni.getSystemInfoSync()
  // send-btn(72) + gap(16) + input-area padding(24+24) + input-wrap padding(24+24) = 184rpx
  const deduct = 184 * sys.windowWidth / 750
  const w = sys.windowWidth - deduct
  textareaWidth.value = Math.floor(w) + 'px'
  //#endif
}

// ─── Fallback messages ─────────────────────────────────────────────────────
const fallbackMessages: Record<string, string> = {
  event: '我听到了。当时具体发生了什么，能跟我说说吗？',
  emotion: '我感受到了。这种情绪对你来说熟悉吗？',
  thought: '我理解了。这句话背后好像有一个你一直相信的信念？',
  belief: '这个信念在你生命中已经存在很久了吗？',
  loosen: '这句话是绝对事实，还是一个你习惯相信的想法？',
  release: '现在感受一下这个信念在身体里的感觉，你能允许它存在吗？',
  awareness: '也许我们可以一起看看，如果不完全相信这个信念，会怎样？',
  action: '在这个新的视角下，下一步最小的行动是什么？',
}

// ─── Computed: Messages ───────────────────────────────────────────────────
const displayMessages = computed(() => {
  const result: any[] = []
  let prevStage = ''
  store.messages.forEach((msg: any) => {
    const msgStage = (msg as any).stage || ''
    if (msgStage && msgStage !== prevStage) {
      result.push({
        type: 'separator',
        stage: msgStage,
        label: STAGE_LABELS[msgStage] || msgStage,
      })
      prevStage = msgStage
    }
    result.push({
      type: 'message',
      msg,
      role: msg.role || '',
    })
  })
  return result
})

// ─── Journal: current step for nav ────────────────────────────────────
const currentStep = computed(() => {
  const idx = stageOrder.indexOf(store.stage)
  return idx >= 0 ? idx + 1 : 1
})

// ─── Streaming: character-by-character reveal ─────────────────────────
function startStreaming(fullText: string, stage: string) {
  if (streamTimer) clearInterval(streamTimer)
  streamingContent.value = ''
  streamingDone.value = false
  isStreaming.value = true

  let i = 0
  const chars = [...fullText] // handle emoji / CJK properly
  streamTimer = setInterval(() => {
    if (i >= chars.length) {
      clearInterval(streamTimer!)
      streamTimer = null
      streamingDone.value = true
      isStreaming.value = false
      // Add to store once streaming finishes
      store.addMessage({ role: 'assistant', content: fullText, stage })
      streamingContent.value = ''
      scrollToBottom()
      return
    }
    // Reveal 2-4 chars per tick for natural feel
    const chunk = chars.slice(i, i + 3).join('')
    streamingContent.value += chunk
    i += 3
    scrollToBottom()
  }, 30)
}

function cancelStreaming() {
  if (streamTimer) clearInterval(streamTimer)
  streamTimer = null
  isStreaming.value = false
  streamingContent.value = ''
  streamingDone.value = false
}

// ─── Streaming: submit message ────────────────────────────────────────
async function submitChatMessage() {
  const text = chatInput.value.trim()
  if (!text || isLoading.value || isStreaming.value) return

  chatInput.value = ''
  const stage = store.stage

  store.addMessage({ role: 'user', content: text, stage })
  captureStageData(stage, text)
  isLoading.value = true
  await nextTick()
  scrollToBottom()

  try {
    const history = store.messages.map(m => ({ role: m.role, content: m.content }))
    const { promise, abort } = chatWithAI(stage, text, history)
    chatGenerator = { abort }

    const reply = await promise
    chatGenerator = null
    isLoading.value = false

    const cleanReply = reply.split('\n').filter((l: string) => !l.includes('【信念】')).join('\n').replace('【过渡】', '').trim()

    // Start character-by-character reveal
    startStreaming(cleanReply, stage)

    if (reply.includes('【过渡】')) {
      store.advanceStage()
    } else if (stage === 'event' && userMsgCount('event') >= 2) {
      store.advanceStage()
    }
    fallbackExchanges.value[stage] = 0
  } catch (e: any) {
    chatGenerator = null
    isLoading.value = false
    if (e?.name === 'AbortError') return

    const count = (fallbackExchanges.value[stage] || 0) + 1
    fallbackExchanges.value[stage] = count
    let reply = fallbackMessages[stage] || '请继续说说你的感受。'
    if (count >= 2) {
      fallbackExchanges.value[stage] = 0
      reply += '\n\n【过渡】'
    }
    const cleanReply = reply.replace('【过渡】', '').trim()
    startStreaming(cleanReply, stage)
    if (reply.includes('【过渡】')) store.advanceStage()
  }
}

// ─── Watch: Save and navigate to card page on completion ────────────
watch(
  () => store.isCompleted,
  async (val) => {
    if (val) {
      const ok = await saveCurrentCard()
      if (ok) {
        uni.showToast({ title: '觉察完成', icon: 'success', duration: 1500 })
        setTimeout(() => {
          uni.navigateTo({ url: '/pages/card/index' })
        }, 1800)
      } else {
        uni.showToast({ title: '保存失败，请重试', icon: 'error' })
      }
    }
  }
)

// ─── 判断是否有实质内容 ────────────────────────────────────────────────
function hasContent(): boolean {
  return store.messages.length > 1 && (store.event || store.emotion || store.thought || store.belief || store.loosen || store.release || store.awareness || store.action)
}

/** 统计当前阶段的用户消息条数 */
function userMsgCount(stage: string): number {
  return store.messages.filter(m => m.role === 'user' && m.stage === stage).length
}

// ─── Auto-save on stage advance ──────────────────────────────────────
watch(() => store.stage, async (newStage, oldStage) => {
  if (oldStage && newStage !== oldStage && !isInitializing.value) {
    await saveCurrentCard('in_progress')
  }
})

// ─── Auto-save on hide (app goes to background) ──────────────────────
onHide(() => {
  if (hasContent()) {
    saveCurrentCard('in_progress')
  }
})

// ─── Initialize session ───────────────────────────────────────────────────
async function initSession() {
  isInitializing.value = true
  store.reset()
  try {
    // Obtain a stable user identifier
    let userId = 'anonymous_' + Date.now().toString(36)
    try {
      const userInfo = uni.getStorageSync('userInfo')
      if (userInfo && userInfo.userId) {
        userId = userInfo.userId
      }
    } catch (_) {
      // Storage unavailable; use fallback id
    }

    // Create a cloud session
    const sid = await createSession(userId)
    store.sessionId = sid
  } catch (e) {
    // Cloud session unavailable — proceed with local session
    console.warn('Cloud session creation failed, using local session.', e)
  }

  // Seed the first AI question
  store.addMessage({
    role: 'assistant',
    content: '此刻有什么想说的吗？你现在感觉怎么样？',
  })

  isInitializing.value = false
  nextTick(() => {
    scrollToBottom()
    calculateTextareaWidth()
  })
}

/** 从本地存储恢复已有会话 */
async function loadSession(sessionId: string) {
  isInitializing.value = true
  try {
    const raw = uni.getStorageSync('cards') || '[]'
    const cards = JSON.parse(raw)
    const card = cards.find((c: any) => c.sessionId === sessionId)
    if (!card) {
      console.warn('Resume session not found, starting new session')
      initSession()
      return
    }

    store.reset()
    store.sessionId = card.sessionId

    if (card.messages && card.messages.length > 0) {
      store.messages = card.messages
    }

    if (card.event) store.setEvent(card.event)
    if (card.emotion) store.setEmotion(card.emotion)
    if (card.thought) store.setThought(card.thought)
    if (card.belief) store.setBelief(card.belief)
    if (card.loosen) store.setLoosen(card.loosen)
    if (card.release) store.setRelease(card.release)
    if (card.awareness) store.setAwareness(card.awareness)
    if (card.action) store.setAction(card.action)

    // 从最后一条消息推断当前阶段
    const lastMsg = card.messages?.[card.messages.length - 1]
    if (lastMsg?.stage) {
      store.setStage(lastMsg.stage)
    }

    store.isCompleted = false
  } catch (e) {
    console.warn('Failed to resume session, starting new session', e)
    initSession()
    return
  } finally {
    isInitializing.value = false
    nextTick(() => {
      scrollToBottom()
      calculateTextareaWidth()
    })
  }
}

// ─── Capture user input into the session store for the card ──────────────
// 规则：只在以下情况更新阶段数据：
// 1. 当前阶段还没有数据
// 2. 新的输入比已有数据更长（更具体，避免"是的""对"等确认词覆盖实质内容）
function captureStageData(stage: string, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return

  switch (stage) {
    case 'event':
      if (!store.event || trimmed.length > store.event.length) store.setEvent(trimmed)
      break
    case 'emotion':
      if (!store.emotion || trimmed.length > store.emotion.length) store.setEmotion(trimmed)
      break
    case 'thought':
      if (!store.thought || trimmed.length > store.thought.length) store.setThought(trimmed)
      break
    case 'belief':
      if (!store.belief || trimmed.length > store.belief.length) store.setBelief(trimmed)
      break
    case 'loosen':
      if (!store.loosen || trimmed.length > store.loosen.length) store.setLoosen(trimmed)
      break
    case 'release':
      if (!store.release || trimmed.length > store.release.length) store.setRelease(trimmed)
      break
    case 'awareness':
      if (!store.awareness || trimmed.length > store.awareness.length) store.setAwareness(trimmed)
      break
    case 'action':
      if (!store.action || trimmed.length > store.action.length) store.setAction(trimmed)
      break
  }
}

// ─── Send message ─────────────────────────────────────────────────────────
async function sendMessage() {
  if (isComposing.value) return

  // Pressing Enter triggers @confirm first; if sendMessage is called
  // within 500ms of @confirm, it's the Enter key — block it.
  if (Date.now() - confirmTime.value < 500) {
    confirmTime.value = 0
    return
  }

  const text = inputText.value.trim()
  if (!text || isLoading.value || isInitializing.value) return

  inputText.value = ''
  lastSentText = text  // save for undo

  //#ifdef MP-WEIXIN
  showTextarea.value = false
  await nextTick()
  showTextarea.value = true
  //#endif

  isLoading.value = true

  // Stage at the time the user is sending
  const currentStage = store.stage

  try {
    // 1. Store user message
    store.addMessage({ role: 'user', content: text })
    // 2. Capture stage data for the card page
    captureStageData(currentStage, text)
    await nextTick(); scrollToBottom()

    // 3. Build history payload
    const history = store.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 4. Call AI via DeepSeek (supports abort)
    const { promise, abort } = chatWithAI(
      currentStage,
      text,
      history
    )
    chatGenerator = { abort }

    const reply = await promise
    chatGenerator = null

    // 5. Capture 【信念】marker (system signal, not shown to user)
    const beliefLine = reply.split('\n').find((l: string) => l.includes('【信念】'))
    if (beliefLine && currentStage === 'belief') {
      const belief = beliefLine.replace('【信念】', '').trim()
      if (belief) store.setBelief(belief)
    }

    // 6. Check if AI signals stage transition
    const shouldAdvance = reply.includes('【过渡】')
    const cleanReply = reply
      .split('\n')
      .filter((l: string) => !l.includes('【信念】'))
      .join('\n')
      .replace('【过渡】', '')
      .trim()

    // 7. Store AI reply
    store.addMessage({ role: 'assistant', content: cleanReply })
    await nextTick(); scrollToBottom()

    // API 恢复后重置 fallback 计数
    fallbackExchanges.value[currentStage] = 0

    // 8. Auto-advance if AI signals transition
    if (shouldAdvance) {
      store.advanceStage()
    } else if (currentStage === 'event' && userMsgCount('event') >= 2) {
      // 事件阶段超过 2 轮用户消息 → 强制推进
      store.advanceStage()
    }
  } catch (e: any) {
    chatGenerator = null
    if (e?.name === 'AbortError') {
      // 用户主动停止 — 不做任何处理，stopGeneration 已清理
      return
    }

    console.error('Chat error:', e)

    // Fallback: count exchanges per stage, auto-advance after 2
    const count = (fallbackExchanges.value[currentStage] || 0) + 1
    fallbackExchanges.value[currentStage] = count
    let reply = fallbackMessages[currentStage] || '请继续说说你的感受。'
    if (count >= 2) {
      fallbackExchanges.value[currentStage] = 0
      reply += '\n\n【过渡】'
    }

    const shouldAdvance = reply.includes('【过渡】')
    const cleanReply = reply.replace('【过渡】', '').trim()
    store.addMessage({ role: 'assistant', content: cleanReply })
    await nextTick(); scrollToBottom()

    if (shouldAdvance) {
      store.advanceStage()
    } else if (currentStage === 'event' && userMsgCount('event') >= 2) {
      store.advanceStage()
    }
  } finally {
    isLoading.value = false
    chatGenerator = null
  }
}

/** 停止 AI 生成并撤回上一条消息 */
function stopGeneration() {
  // Stop API call if in progress
  if (chatGenerator && isLoading.value) {
    chatGenerator.abort()
    chatGenerator = null

    const msgs = store.messages
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
      msgs.pop()
    }
    inputText.value = lastSentText
    lastSentText = ''
    isLoading.value = false
    return
  }

  // Stop streaming reveal
  if (isStreaming.value) {
    cancelStreaming()
    // Save whatever was streamed so far to store
    if (streamingContent.value) {
      store.addMessage({ role: 'assistant', content: streamingContent.value, stage: store.stage })
    }
    streamingContent.value = ''
  }
}

// 修改：H5 用 @compositionstart/@compositionend，MP 不需要

// ─── Save current session data to localStorage ──────────────────────────
async function saveCurrentCard(status: string = 'completed') {
  let userId = 'anonymous'
  try { userId = uni.getStorageSync('userId') || 'anonymous' } catch {}
  try {
    await saveCard({
      sessionId: store.sessionId,
      userId,
      event: store.event || undefined,
      emotion: store.emotion || undefined,
      thought: store.thought || undefined,
      belief: store.belief || undefined,
      loosen: store.loosen || undefined,
      release: store.release || undefined,
      awareness: store.awareness || undefined,
      action: store.action || undefined,
      messages: store.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        stage: m.stage,
        timestamp: m.timestamp,
      })),
      status,
    })
    return true
  } catch (e) {
    console.warn('saveCard error:', e)
    return false
  }
}

// ─── Scroll helpers ───────────────────────────────────────────────────────
function scrollToBottom(forceH5 = false) {
  // H5: scroll the container element directly
  const el = scrollRef.value
  if (el && !forceH5) {
    el.scrollTop = el.scrollHeight
    return
  }
  // MP: increment key so scroll-into-view always sees a new value
  scrollKey.value++
}
// Auto-scroll whenever a new message is added
watch(() => store.messages.length, () => {
  if (!isInitializing.value) scrollToBottom()
}, { flush: 'post' })

// ─── Auto-resize H5 textarea ──────────────────────────────────────────
function autoResizeTextarea() {
  //#ifdef H5
  const el = h5TextareaRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }
  //#endif
}

watch(inputText, () => {
  autoResizeTextarea()
})

// ─── MP textarea input handler ───────────────────────────────────────
function onMpInput(e: any) {
  //#ifdef MP-WEIXIN
  inputText.value = e.detail.value
  //#endif
}

// ─── H5 Textarea keydown: Ctrl+Enter to send ─────────────────────────
function onTextareaKeydown(e: KeyboardEvent) {
  if (isComposing.value) return
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    sendMessage()
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────
function goBack() {
  if (hasContent()) {
    saveCurrentCard('in_progress')
  }
  store.reset()
  uni.switchTab({ url: '/pages/index/index' })
}

async function endSession() {
  const has = hasContent()
  if (has) {
    await saveCurrentCard('in_progress')
  }

  uni.showModal({
    title: '结束觉察',
    content: has ? '当前觉察记录已自动保存。确定要结束吗？' : '确定要结束当前的觉察对话吗？',
    success: (res) => {
      if (res.confirm) {
        store.reset()
        uni.switchTab({ url: '/pages/index/index' })
      }
    },
  })
}

// ─── 导航栏右间距：避免被微信胶囊菜单遮挡 ──────────────────────────
const navRightPadding = ref(0)

function calcNavRightPadding() {
  //#ifdef MP-WEIXIN
  try {
    const menu = uni.getMenuButtonBoundingClientRect()
    if (menu) {
      const sys = uni.getSystemInfoSync()
      // 从屏幕右缘到菜单按钮左缘的距离，+ 20px 缓冲
      const px = sys.windowWidth - menu.left + 20
      // 转 rpx（uni-app 以 750rpx 为设计宽度）
      navRightPadding.value = Math.ceil(px / sys.windowWidth * 750)
    }
  } catch { /* fallback */ }
  //#endif
}

// ─── Lifecycle ────────────────────────────────────────────────────────────
onMounted(() => {
  updateTheme()
  calcNavRightPadding()
  calculateTextareaWidth()

  //#ifdef MP-WEIXIN
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  windowHeight.value = sys.windowHeight || 0
  //#endif

  const sid = uni.getStorageSync('resumeSessionId')
  if (sid) {
    uni.removeStorageSync('resumeSessionId')
    loadSession(sid)
    return
  }

  initSession()
})

onBeforeUnmount(() => {
  cancelStreaming()
})

// 从历史列表恢复会话（页面已挂载时 switchTab 触发）
onShow(() => {
  updateTheme()
  const sid = uni.getStorageSync('resumeSessionId')
  if (sid) {
    uni.removeStorageSync('resumeSessionId')
    loadSession(sid)
  }
})

// 原生返回（Android 物理键 / 浏览器回退）→ 停止生成 + 自动保存
onBackPress(() => {
  if (chatGenerator) {
    chatGenerator.abort()
    chatGenerator = null
  }
  cancelStreaming()
  if (hasContent()) {
    saveCurrentCard('in_progress')
  }
  store.reset()
  uni.switchTab({ url: '/pages/index/index' })
  return true
})
</script>

<template>
  <!-- ============================================================
       H5 — Journal-style Awareness Dialogue
       ============================================================ -->
  <!--#ifdef H5-->
  <view class="h5-page">
    <!-- Film grain texture -->
    <view class="h5-grain"></view>

    <!-- ====== Top ====== -->
    <view class="h5-top">
      <view class="h5-top-inner">
        <view class="h5-top-back" @tap="goBack">
          <text class="h5-top-back-icon">←</text>
        </view>
        <text class="h5-top-title">觉察书写</text>
        <view style="width:44px"></view>
      </view>
    </view>

    <!-- ====== Loading ====== -->
    <view v-if="isInitializing" class="h5-loading">
      <view class="h5-loading-ring"></view>
      <text class="h5-loading-text">正在准备...</text>
    </view>

    <!-- ====== Messages ====== -->
    <view
      v-else
      class="h5-scroll"
      ref="scrollRef"
    >
      <view class="h5-scroll-inner">
        <view class="h5-scroll-pad-top" />

        <template v-for="(item, idx) in displayMessages" :key="idx">
          <!-- Stage Transition -->
          <view
            v-if="item.type === 'separator'"
            :id="'sep-' + item.stage"
            class="h5-stage-tag"
          >
            <text class="h5-stage-tag-text">{{ item.label }}</text>
          </view>

          <!-- AI Message -->
          <view v-else-if="item.role === 'assistant'" class="h5-msg h5-msg--ai">
            <view class="h5-msg-avatar">AI</view>
            <view class="h5-msg-card">
              <text class="h5-msg-text">{{ item.msg.content }}</text>
            </view>
          </view>

          <!-- User Message -->
          <view v-else class="h5-msg h5-msg--user">
            <view class="h5-msg-bubble">
              <text class="h5-msg-text h5-msg-text--user">{{ item.msg.content }}</text>
            </view>
          </view>
        </template>

        <!-- Typing indicator -->
        <view v-if="isLoading" class="h5-typing">
          <view class="h5-typing-avatar">AI</view>
          <view class="h5-typing-card">
            <view class="h5-typing-dot"></view>
            <view class="h5-typing-dot"></view>
            <view class="h5-typing-dot"></view>
          </view>
        </view>

        <view class="h5-scroll-pad-bottom" />
        <view id="scroll-bottom" class="h5-scroll-anchor" />
      </view>
    </view>

    <!-- ====== Input ====== -->
    <view class="h5-input" :class="{ 'h5-input--hidden': isInitializing }">
      <view class="h5-input-inner">
        <view
          v-if="voiceSupported"
          class="h5-voice-btn"
          :class="{
            'h5-voice-btn--recording': voiceState === 'recording',
            'h5-voice-btn--busy': voiceState === 'transcribing',
          }"
          @tap="toggleVoice"
        >
          <!--#ifdef H5-->
          <svg class="h5-voice-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="9" y="1" width="6" height="13" rx="3"/>
            <path d="M5 11a7 7 0 0 0 14 0"/>
            <line x1="12" y1="20" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <!--#endif-->
          <!--#ifdef MP-WEIXIN-->
          <image class="h5-voice-btn-img" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235A4E42' stroke-width='2' stroke-linecap='round'%3E%3Crect x='9' y='1' width='6' height='13' rx='3'/%3E%3Cpath d='M5 11a7 7 0 0 0 14 0'/%3E%3Cline x1='12' y1='20' x2='12' y2='23'/%3E%3Cline x1='8' y1='23' x2='16' y2='23'/%3E%3C/svg%3E" mode="aspectFit" />
          <!--#endif-->
          <text v-if="voiceState === 'recording'" class="h5-voice-duration">{{ voiceDuration }}″</text>
        </view>
        <textarea
          v-model="inputText"
          ref="h5TextareaRef"
          class="h5-input-field"
          placeholder="写下你此刻的感受..."
          placeholder-class="h5-input-placeholder"
          :disabled="isLoading || isInitializing"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
          @keydown="onTextareaKeydown"
        />
        <view
          v-if="isLoading"
          class="h5-input-btn h5-input-btn--stop"
          @tap="stopGeneration"
        >
          <text class="h5-input-btn-icon h5-stop-icon">■</text>
        </view>
        <view
          v-else
          class="h5-input-btn"
          :class="{ 'h5-input-btn--off': !inputText.trim() || isInitializing }"
          @tap="sendMessage"
        >
          <text class="h5-input-btn-icon">⟶</text>
        </view>
      </view>
    </view>
  </view>
<!--#endif-->

  <!-- ============================================================
       MP-WEIXIN — Streaming Chat Bubbles
       ============================================================ -->
  <!--#ifdef MP-WEIXIN-->
  <view class="page" :style="pageStyle">
    <view class="nav-bar" :style="navBarStyle">
      <view class="nav-btn nav-btn-left" @tap="goBack">
        <text class="nav-back-icon">←</text>
        <text class="nav-back-label">返回</text>
      </view>
      <text class="nav-title">一次觉察</text>
      <view class="nav-btn nav-btn-right"></view>
    </view>

    <!-- Progress dots -->
    <view class="progress-bar">
      <view
        v-for="i in 8"
        :key="i"
        class="prog-dot"
        :class="{ active: i === currentStep, done: i < currentStep }"
      ></view>
    </view>

    <view v-if="isInitializing" class="loading-screen">
      <text class="loading-text">正在准备...</text>
    </view>

    <!-- Chat messages -->
    <scroll-view
      v-else
      class="chat-scroll"
      scroll-y
      :scroll-with-animation="true"
      :scroll-into-view="'msg-bottom-' + scrollKey"
      :enhanced="true"
      :show-scrollbar="false"
    >
      <view class="chat-pad-top"></view>

      <!-- Messages -->
      <template v-for="(item, idx) in displayMessages" :key="idx">
        <!-- Stage Separator -->
        <view v-if="item.type === 'separator'" class="stage-tag">
          <text class="stage-tag-text">{{ item.label }}</text>
        </view>

        <!-- AI Message -->
        <view v-else-if="item.role === 'assistant'" class="msg-row msg-row--ai">
          <AiBubble :content="item.msg.content" :timestamp="item.msg.timestamp" />
        </view>

        <!-- User Message -->
        <view v-else class="msg-row msg-row--user">
          <UserBubble :content="item.msg.content" :stage="item.msg.stage" />
        </view>
      </template>

      <!-- Typing indicator (waiting for API) -->
      <view v-if="isLoading && !isStreaming" class="msg-row msg-row--ai">
        <view class="stream-bubble">
          <view class="stream-dots">
            <view class="stream-dot"></view>
            <view class="stream-dot"></view>
            <view class="stream-dot"></view>
          </view>
        </view>
      </view>

      <!-- Streaming bubble (active character reveal) -->
      <view v-if="isStreaming" class="msg-row msg-row--ai">
        <view class="stream-bubble">
          <text class="stream-text">{{ streamingContent }}</text>
          <text class="stream-cursor" v-if="!streamingDone">|</text>
        </view>
      </view>

      <view class="chat-pad-bottom"></view>
      <view :id="'msg-bottom-' + scrollKey" class="scroll-anchor"></view>
    </scroll-view>

    <!-- Input area -->
    <view class="input-bar">
      <view class="input-wrap">
        <textarea
          v-model="chatInput"
          class="chat-input"
          placeholder="写下你的感受..."
          placeholder-class="chat-input-ph"
          :disabled="isLoading || isStreaming"
          :cursor-spacing="12"
          :adjust-position="true"
          :hold-keyboard="true"
          auto-height
          @confirm="submitChatMessage"
        />
      </view>
      <view class="input-right">
        <view
          v-if="isLoading || isStreaming"
          class="send-btn send-btn--stop"
          @tap="stopGeneration"
        >
          <text class="send-icon stop-icon">■</text>
        </view>
        <view
          v-else
          class="send-btn"
          :class="{ 'send-btn--off': !chatInput.trim() }"
          @tap="submitChatMessage"
        >
          <text class="send-icon">↑</text>
        </view>
      </view>
    </view>
  </view>
  <!--#endif-->
</template>

<style scoped lang="scss">
/* =============================================================
   H5 — Journal-style Awareness Dialogue
   ============================================================= */
/*#ifdef H5*/
.h5-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: #F8F5F0;
  overflow: hidden;
}

/* ── Grain overlay ── */
.h5-grain {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.008'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
}

/* ── All content sits above grain ── */
.h5-top,
.h5-scroll,
.h5-input {
  position: relative;
  z-index: 1;
}

/* =================================================================
   Top bar — minimal, detached
   ================================================================= */
.h5-top {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 36px 20px 8px;
}

.h5-top-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  width: 100%;
  max-width: 680px;
  padding: 0 4px;
}

.h5-top-back {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: opacity 0.25s ease;
  opacity: 0.55;
}
.h5-top-back:hover { opacity: 1; }

.h5-top-back-icon {
  font-size: 24px;
  color: #1C1A17;
  font-weight: 400;
}

.h5-top-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  font-weight: 600;
  color: #1C1A17;
  letter-spacing: 2px;
  white-space: nowrap;
}


/* =================================================================
   Loading
   ================================================================= */
.h5-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.h5-loading-ring {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #E8E0D8;
  border-top-color: #C49A6C;
  animation: h5Spin 0.8s linear infinite;
}

@keyframes h5Spin { to { transform: rotate(360deg); } }

.h5-loading-text {
  font-size: 13px;
  color: #B8AFA4;
  letter-spacing: 2px;
}

/* =================================================================
   Scroll / Messages
   ================================================================= */
.h5-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px;
  display: flex;
  justify-content: center;
}

.h5-scroll-inner {
  width: 100%;
  max-width: 680px;
  box-sizing: border-box;
  padding: 0 4px;
}

.h5-scroll-pad-top { height: 20px; }
.h5-scroll-pad-bottom { height: 180px; }

/* ── Stage tag ── */
.h5-stage-tag {
  display: flex;
  justify-content: center;
  padding: 32px 0 16px;
}

.h5-stage-tag-text {
  font-size: 11px;
  color: #B8AFA4;
  letter-spacing: 2px;
  font-weight: 500;
}

/* ── Message row ── */
.h5-msg {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.h5-msg--user {
  justify-content: flex-end;
}

/* Avatar (AI only) */
.h5-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  flex-shrink: 0;
  margin-top: 4px;
}

/* ── AI card ── */
.h5-msg-card {
  background: #FFFFFF;
  border-radius: 4px 16px 16px 16px;
  padding: 18px 24px;
  box-shadow:
    0 2px 8px rgba(28, 26, 23, 0.04),
    0 1px 2px rgba(28, 26, 23, 0.02);
  max-width: 520px;
}

.h5-msg-text {
  font-size: 15px;
  color: #1C1A17;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── User bubble ── */
.h5-msg-bubble {
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  border-radius: 16px 4px 16px 16px;
  padding: 14px 22px;
  max-width: 480px;
}

.h5-msg-text--user {
  color: #FFFFFF;
  font-weight: 450;
}

/* ── Typing ── */
.h5-typing {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.h5-typing-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  flex-shrink: 0;
  margin-top: 4px;
}

.h5-typing-card {
  background: #FFFFFF;
  border-radius: 4px 16px 16px 16px;
  padding: 18px 24px;
  display: flex;
  gap: 6px;
  align-items: center;
  box-shadow:
    0 2px 8px rgba(28, 26, 23, 0.04),
    0 1px 2px rgba(28, 26, 23, 0.02);
}

.h5-typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #D4C8B8;
  animation: h5Typing 1.4s ease-in-out infinite;
}
.h5-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.h5-typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes h5Typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-5px); opacity: 1; }
}

.h5-scroll-anchor { height: 1px; }

/* =================================================================
   Input Area — redesigned: rounded rectangle for multi-line textarea
   ================================================================= */
.h5-input {
  flex-shrink: 0;
  padding: 8px 20px 24px;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  box-sizing: border-box;
}

.h5-input--hidden { display: none; }

.h5-input-inner {
  position: relative;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 14px 54px 14px 54px;
  box-sizing: border-box;
  box-shadow:
    0 2px 12px rgba(28, 26, 23, 0.04),
    0 1px 2px rgba(28, 26, 23, 0.02);
}

.h5-input-field {
  display: block;
  width: 100%;
  font-size: 15px;
  color: #1C1A17;
  line-height: 1.7;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  overflow-y: auto;
  font-family: inherit;
  min-height: 22px;
  max-height: 200px;
}

.h5-input-placeholder { color: #C4B8AC; font-size: 15px; }

.h5-input-btn {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.25s ease, transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}

.h5-input-btn:hover {
  transform: scale(1.04);
}

.h5-input-btn:active {
  transform: scale(0.94);
}

.h5-input-btn--off {
  opacity: 0.3;
  cursor: default;
}
.h5-input-btn--off:hover { transform: none; }

.h5-input-btn--stop {
  background: #D4604A;
}
.h5-input-btn--stop:hover { transform: none; }

.h5-stop-icon {
  font-size: 14px;
}

.h5-voice-btn {
  position: absolute;
  left: 7px;
  bottom: 7px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #F0ECE6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.h5-voice-btn:active { background: #E0D8CC; }

.h5-voice-btn--recording {
  background: #E84F4F;
  animation: h5VoicePulse 1s ease-in-out infinite;
}
.h5-voice-btn--busy {
  background: #D4C8B8;
  pointer-events: none;
}

.h5-voice-btn-svg {
  width: 20px;
  height: 20px;
  color: #5A4E42;
}
.h5-voice-btn--recording .h5-voice-btn-svg {
  color: #FFFFFF;
}
.h5-voice-btn--busy .h5-voice-btn-svg {
  display: none;
}

.h5-voice-btn-img {
  width: 20px;
  height: 20px;
}

.h5-voice-duration {
  position: absolute;
  left: 48px;
  font-size: 13px;
  color: #E84F4F;
  font-weight: 600;
  white-space: nowrap;
}

@keyframes h5VoicePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}


.h5-input-btn-icon {
  font-size: 16px;
  color: #fff;
  font-weight: 300;
}


/* ── Mobile responsive ── */
@media (max-width: 480px) {
  .h5-top {
    padding: 16px 16px 4px;
  }
  .h5-top-title {
    font-size: 15px;
    letter-spacing: 1px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
  }
  .h5-scroll {
    padding: 0 16px;
  }
  .h5-msg-card {
    padding: 14px 18px;
    max-width: calc(100vw - 80px);
  }
  .h5-msg-text {
    font-size: 14px;
  }
  .h5-msg-bubble {
    padding: 12px 18px;
    max-width: calc(100vw - 40px);
  }
  .h5-stage {
    padding: 28px 0 20px;
  }
  .h5-input {
    padding: 6px 16px 20px;
  }
  .h5-input-inner {
    padding: 12px 48px 12px 16px;
    border-radius: 14px;
  }
  .h5-input-field {
    font-size: 14px;
    max-height: 160px;
    min-height: 20px;
  }
  .h5-input-btn {
    width: 36px;
    height: 36px;
    right: 6px;
    bottom: 6px;
  }
  .h5-input-btn-icon {
    font-size: 14px;
  }
  .h5-scroll-pad-bottom { height: 140px; }
}
/*#endif*/

/* =============================================================
   MP-WEIXIN — Streaming Chat Bubbles
   ============================================================= */
/*#ifdef MP-WEIXIN*/
.page {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  overflow: hidden;
}

/* ── Navigation Bar ────────────────────────────────────────────────────── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  padding-left: 20rpx;
  padding-bottom: 10rpx;
  background-color: var(--bg-nav);
  flex-shrink: 0;
  border-bottom: 1rpx solid var(--border);
}

.nav-btn {
  display: flex;
  align-items: center;
  padding: 10rpx;
  min-width: 100rpx;
}

.nav-btn-left { justify-content: flex-start; }
.nav-btn-right { justify-content: flex-end; }

.nav-back-icon {
  font-size: 38rpx;
  color: var(--text-primary);
  margin-right: 8rpx;
}

.nav-back-label {
  font-size: 32rpx;
  color: var(--text-primary);
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.nav-step-hint {
  font-size: 24rpx;
  color: var(--text-secondary);
  letter-spacing: 2rpx;
}

/* ── Progress Dots ─────────────────────────────────────────────────────── */
.progress-bar {
  display: flex;
  justify-content: center;
  gap: 12rpx;
  padding: 16rpx 0;
  flex-shrink: 0;
}

.prog-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--prog-dot);
  transition: all 0.3s;
}

.prog-dot.active {
  background: #C69C6D;
  box-shadow: 0 0 0 6rpx rgba(198, 156, 109, 0.15);
}

.prog-dot.done {
  background: #C69C6D;
  opacity: 0.5;
}

/* ── Loading Screen ─────────────────────────────────────────────────────── */
.loading-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 28rpx;
  color: var(--text-secondary);
}

/* ── Chat Scroll ────────────────────────────────────────────────────────── */
.chat-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 24rpx;
}

.chat-pad-top { height: 20rpx; }
.chat-pad-bottom { height: 20rpx; }

/* ── Stage separator ──────────────────────────────────────────────────── */
.stage-tag {
  display: flex;
  justify-content: center;
  padding: 32rpx 0 16rpx;
}
.stage-tag-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 2rpx;
  font-weight: 500;
}

/* ── Message Rows ──────────────────────────────────────────────────────── */
.msg-row {
  display: flex;
  margin-bottom: 20rpx;
}

.msg-row--ai {
  justify-content: flex-start;
}

.msg-row--user {
  justify-content: flex-end;
}

/* ── Streaming Bubble ─────────────────────────────────────────────────── */
.stream-bubble {
  max-width: 580rpx;
  background: var(--bg-bubble-ai);
  border-radius: 4rpx 24rpx 24rpx 24rpx;
  padding: 22rpx 28rpx;
}

.stream-dots {
  display: flex;
  gap: 10rpx;
  padding: 8rpx 0;
}

.stream-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: var(--typing-dot);
  animation: streamDotBounce 1.4s ease-in-out infinite;
}

.stream-dot:nth-child(1) { animation-delay: 0s; }
.stream-dot:nth-child(2) { animation-delay: 0.2s; }
.stream-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes streamDotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-8rpx); opacity: 1; }
}

.stream-text {
  font-size: 28rpx;
  color: var(--text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.stream-cursor {
  font-size: 28rpx;
  color: #C69C6D;
  font-weight: 300;
  animation: cursorBlink 0.7s ease-in-out infinite;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── Input Bar ─────────────────────────────────────────────────────────── */
.input-bar {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom, 0px));
  background: var(--bg-primary);
  border-top: 1rpx solid var(--border);
}

.input-wrap {
  flex: 1;
  background: var(--bg-input);
  border-radius: 20rpx;
  padding: 14rpx 24rpx;
}

.chat-input {
  display: block;
  width: 100%;
  font-size: 28rpx;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.6;
}

.chat-input-ph {
  color: var(--text-placeholder);
  font-size: 28rpx;
}

.input-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.send-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: var(--send-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.send-btn--off {
  opacity: 0.3;
}

.send-btn--stop {
  background: #D4604A;
}

.send-icon {
  font-size: 28rpx;
  color: #fff;
  font-weight: 300;
}

.stop-icon {
  font-size: 22rpx;
}



/* ── Scroll Anchor ─────────────────────────────────────────────────────── */
.scroll-anchor {
  height: 1rpx;
}
/*#endif*/
</style>
