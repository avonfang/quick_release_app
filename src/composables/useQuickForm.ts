import { reactive, ref, computed, watch } from 'vue'

export type QuickState = 'idle' | 'emotion' | 'event' | 'thought' | 'factOrWorry' | 'sending' | 'result'

export const STATE_ORDER: QuickState[] = ['emotion', 'event', 'thought', 'factOrWorry']

export interface QuickForm {
  emotion: string
  intensity: number
  event: string
  thought: string
  factOrWorry: 'fact' | 'worry' | ''
}

const INITIAL_FORM: QuickForm = {
  emotion: '',
  intensity: 5,
  event: '',
  thought: '',
  factOrWorry: '',
}

export function useQuickForm() {
  const state = ref<QuickState>('idle')
  const history = ref<QuickState[]>([])
  const form = reactive<QuickForm>({ ...INITIAL_FORM })

  const canGoBack = computed(() =>
    history.value.length > 0
    && state.value !== 'sending'
    && state.value !== 'result'
  )

  const currentStep = computed(() => {
    if (state.value === 'sending' || state.value === 'result') return STATE_ORDER.length
    const idx = STATE_ORDER.indexOf(state.value)
    return idx >= 0 ? idx + 1 : 1
  })

  const totalSteps = STATE_ORDER.length

  function transition(to: QuickState) {
    if (state.value !== 'sending') {
      history.value.push(state.value)
    }
    state.value = to
  }

  function goBack() {
    if (!canGoBack.value) return
    const prev = history.value.pop()
    if (prev !== undefined) {
      state.value = prev
    }
  }

  function goBackToStep(stepNumber: number) {
    if (state.value === 'sending') return
    const targetState = STATE_ORDER[stepNumber - 1]
    if (!targetState || state.value === targetState) return

    // Walk back through history until we hit the target
    while (history.value.length > 0 && state.value !== targetState) {
      const prev = history.value.pop()
      if (prev !== undefined) state.value = prev
    }
    // If still not at target (target not in history), just set it directly
    if (state.value !== targetState) {
      state.value = targetState
      history.value = []
    }
  }

  function reset() {
    history.value = []
    state.value = 'idle'
    Object.assign(form, { ...INITIAL_FORM })
    clearDraft()
  }

  // ── Draft persistence ──

  const DRAFT_KEY = 'quickDraft'

  function saveDraft() {
    if (state.value === 'idle' || state.value === 'result' || state.value === 'sending') return
    try {
      uni.setStorageSync(DRAFT_KEY, JSON.stringify({
        emotion: form.emotion,
        intensity: form.intensity,
        event: form.event,
        thought: form.thought,
        factOrWorry: form.factOrWorry,
        _state: state.value,
      }))
    } catch { /* ignore */ }
  }

  function restoreDraft(): boolean {
    try {
      const raw = uni.getStorageSync(DRAFT_KEY)
      if (!raw) return false
      const draft = JSON.parse(raw)
      if (draft._state && draft._state !== 'idle' && draft._state !== 'result') {
        form.emotion = draft.emotion || ''
        form.intensity = draft.intensity || 5
        form.event = draft.event || ''
        form.thought = draft.thought || ''
        form.factOrWorry = draft.factOrWorry || ''
        state.value = draft._state
        return true
      }
    } catch { /* ignore */ }
    return false
  }

  function clearDraft() {
    try { uni.removeStorageSync(DRAFT_KEY) } catch { /* ignore */ }
  }

  // Auto-save on changes
  watch(
    [() => form.emotion, () => form.event, () => form.thought, () => form.intensity, state],
    () => { saveDraft() },
    { deep: false }
  )

  return {
    state, history, form,
    canGoBack, currentStep, totalSteps,
    transition, goBack, goBackToStep, reset,
    restoreDraft, clearDraft,
  }
}
