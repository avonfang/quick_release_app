Component({
  data: {
    active: -1,
    isDark: true,
    tabs: [
      { icon: '🏠', label: '首页', pagePath: '/pages/index/index' },
      { icon: '🧘', label: '练习', pagePath: '/pages/practice/index' },
      { icon: '🔍', label: '探索', pagePath: '/pages/learning/index' },
      { icon: '👤', label: '我的', pagePath: '/pages/profile/index' }
    ]
  },

  lifetimes: {
    attached() {
      this.updateTheme()
      this.syncActive()
    }
  },

  pageLifetimes: {
    show() {
      this.updateTheme()
      this.syncActive()
    }
  },

  methods: {
    updateTheme() {
      const hour = new Date().getHours()
      this.setData({ isDark: hour < 6 || hour >= 18 })
    },

    syncActive() {
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      if (!page) return
      const route = '/' + page.route
      const idx = this.data.tabs.findIndex(t => route === t.pagePath)
      this.setData({ active: idx })
    },

    switchTab(e) {
      const idx = e.currentTarget.dataset.index
      const tab = this.data.tabs[idx]
      if (idx === this.data.active) return
      this.setData({ active: idx })

      wx.nextTick(() => {
        wx.switchTab({ url: tab.pagePath })
      })
    }
  }
})
