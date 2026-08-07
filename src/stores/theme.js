import { defineStore } from 'pinia'
import { ref } from 'vue'

const THEMES = {
  default: {
    name: 'default',
    label: '暖金',
    accent: '#C49A6C',
    accentLight: 'rgba(196, 154, 108, 0.15)',
    cardBg: '#3E342B',
  },
  ocean: {
    name: 'ocean',
    label: '深海',
    accent: '#6B9DBF',
    accentLight: 'rgba(107, 157, 191, 0.15)',
    cardBg: '#2A3540',
  },
  forest: {
    name: 'forest',
    label: '森林',
    accent: '#7BA07B',
    accentLight: 'rgba(123, 160, 123, 0.15)',
    cardBg: '#2D362D',
  },
}

export { THEMES }

export const useThemeStore = defineStore('theme', () => {
  const current = ref('default')

  function init() {
    try {
      const saved = uni.getStorageSync('appTheme')
      if (saved && THEMES[saved]) {
        current.value = saved
      }
    } catch (_) { /* ignore */ }
    applyGlobally()
  }

  function setTheme(name) {
    if (!THEMES[name]) return
    current.value = name
    uni.setStorageSync('appTheme', name)
    applyGlobally()
  }

  function applyGlobally() {
    const t = THEMES[current.value] || THEMES.default
    const vars = {}
    vars['--theme-accent'] = t.accent
    vars['--theme-accent-light'] = t.accentLight
    vars['--theme-card-bg'] = t.cardBg
    try {
      uni.setPageStyle && uni.setPageStyle({ style: vars })
    } catch (_) { /* ignore */ }
    if (typeof document !== 'undefined') {
      var root = document.documentElement
      Object.keys(vars).forEach(function (k) {
        root.style.setProperty(k, vars[k])
      })
    }
  }

  return { current, init, setTheme, applyGlobally }
})
