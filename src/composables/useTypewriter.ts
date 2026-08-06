import { ref, onBeforeUnmount } from 'vue'

export function useTypewriter(speed = 40) {
  const displayed = ref('')
  const isTyping = ref(false)
  const isDone = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  function start(text: string) {
    stop()
    displayed.value = ''
    isTyping.value = true
    isDone.value = false
    let i = 0
    const chars = [...text]
    timer = setInterval(() => {
      if (i < chars.length) {
        displayed.value += chars[i]
        i++
      } else {
        stop()
        isDone.value = true
      }
    }, speed)
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null }
    isTyping.value = false
  }

  function complete(text: string) {
    stop()
    displayed.value = text
    isDone.value = true
  }

  onBeforeUnmount(stop)

  return { displayed, isTyping, isDone, start, stop, complete }
}
