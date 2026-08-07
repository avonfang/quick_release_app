import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 7 阶段状态机：event → emotion → thought → belief → loosen → awareness → action
 */
const STAGES = ['event', 'emotion', 'thought', 'belief', 'loosen', 'release', 'awareness', 'action']

export const STAGE_LABELS = {
  event: '记录事件',
  emotion: '感知情绪',
  thought: '识别想法',
  belief: '深挖信念',
  loosen: '松动信念',
  release: '释放练习',
  awareness: '获得觉察',
  action: '制定行动',
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
}

export const useSessionStore = defineStore('session', () => {
  // ─── state ────────────────────────────────────────────────────────────────
  const sessionId = ref(generateSessionId())
  const stage = ref(STAGES[0])
  const messages = ref([])
  const event = ref(null)
  const emotion = ref(null)
  const thought = ref(null)
  const belief = ref(null)
  const loosen = ref(null)
  const release = ref(null)
  const awareness = ref(null)
  const action = ref(null)
  const isCompleted = ref(false)

  // ─── getters ──────────────────────────────────────────────────────────────
  const currentStageIndex = computed(() => STAGES.indexOf(stage.value))

  const totalStages = computed(() => STAGES.length)

  const stageLabel = computed(() => STAGE_LABELS[stage.value] || stage.value)

  // ─── actions ──────────────────────────────────────────────────────────────
  function addMessage(msg) {
    if (!msg) {
      console.warn('addMessage called with undefined msg')
      return
    }
    messages.value.push({
      id: Date.now(),
      role: msg.role || 'user',
      content: msg.content,
      stage: stage.value,
      timestamp: new Date().toISOString(),
    })
  }

  function setStage(newStage) {
    if (STAGES.includes(newStage)) {
      stage.value = newStage
    }
  }

  function setEvent(data) {
    event.value = data
  }

  function setEmotion(data) {
    emotion.value = data
  }

  function setThought(data) {
    thought.value = data
  }

  function setBelief(data) {
    belief.value = data
  }

  function setLoosen(data) {
    loosen.value = data
  }

  function setRelease(data) {
    release.value = data
  }

  function setAwareness(data) {
    awareness.value = data
  }

  function setAction(data) {
    action.value = data
  }

  /**
   * 推进到下一阶段。
   * 当前为最后一个阶段（action）时设置 isCompleted = true。
   * 如果已经完成则不再推进。
   */
  function advanceStage() {
    if (isCompleted.value) return

    const nextIndex = currentStageIndex.value + 1
    if (nextIndex >= STAGES.length) {
      isCompleted.value = true
      return
    }

    stage.value = STAGES[nextIndex]
  }

  /**
   * 重置整个会话，回到初始状态。
   */
  function reset() {
    sessionId.value = generateSessionId()
    stage.value = STAGES[0]
    messages.value = []
    event.value = null
    emotion.value = null
    thought.value = null
    belief.value = null
    loosen.value = null
    release.value = null
    awareness.value = null
    action.value = null
    isCompleted.value = false
  }

  return {
    // state
    sessionId,
    stage,
    messages,
    event,
    emotion,
    thought,
    belief,
    loosen,
    release,
    awareness,
    action,
    isCompleted,
    // getters
    currentStageIndex,
    totalStages,
    stageLabel,
    // actions
    addMessage,
    setStage,
    setEvent,
    setEmotion,
    setThought,
    setBelief,
    setLoosen,
    setRelease,
    setAwareness,
    setAction,
    advanceStage,
    reset,
  }
})
