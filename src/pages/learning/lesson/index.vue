<template>
  <view class="page-bg"></view>
  <view class="page-glow"></view>

  <view :class="'container ' + themeClass">
    <!-- Header -->
    <view class="lesson-header">
      <view class="lesson-header-top">
        <view class="header-back-btn" @tap="goBack">
          <text class="header-back-icon">✕</text>
        </view>
        <text class="lesson-num">第 {{lessonIndex + 1}} / {{total}} 课</text>
      </view>
      <text class="lesson-title">{{lesson.title}}</text>
      <text class="lesson-subtitle" v-if="lesson.subtitle">{{lesson.subtitle}}</text>
    </view>

    <!-- Swipeable cards -->
    <view class="card-area">
      <view class="slide-card" v-for="(item, index) in slides" :key="index">
        <view :class="'slide-card-inner ' + (currentSlide === index ? 'active' : '')">
          <view class="slide-icon">{{item.icon}}</view>
          <view class="slide-type-label">{{item.type === 'concept' ? '理解' : '练习'}}</view>
          <view class="slide-text-wrap" @longpress="saveQuote" :data-text="item.text">
            <text class="slide-text">{{item.text}}</text>
          </view>

          <view class="slide-actions" v-if="item.type === 'practice' && currentSlide === index">
            <view class="btn btn-primary btn-lg" @tap="startPractice" v-if="!isCompleted">开始练习 →</view>
            <view class="btn btn-primary btn-lg" @tap="markComplete" v-if="!isCompleted">
              标记完成
            </view>
            <view class="btn btn-primary btn-lg" v-if="isCompleted && hasNext" @tap="nextLesson">下一课 →</view>
            <view class="btn btn-outline btn-lg" @tap="goBack">
              {{isCompleted ? '✓ 已完成 · 返回探索' : '返回探索'}}
            </view>
          </view>
        </view>
      </view>

      <view class="slide-dots">
        <view :class="'slide-dot ' + (currentSlide === index ? 'active' : '')" v-for="(item, index) in slides" :key="index" :data-index="index" @tap="goSlide"></view>
      </view>
    </view>

    <view class="nav-zones">
      <view class="nav-zone-left" @tap="prevSlide" v-if="currentSlide > 0">
        <text class="nav-arrow">‹</text>
      </view>
      <view class="nav-zone-right" @tap="nextSlide" v-if="currentSlide < totalSlides - 1">
        <text class="nav-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
import courses from '@/data/courses'
import util from '@/utils/util'

export default {
  data() {
    return {
      path: '',
      lessonIndex: 0,
      lesson: {},
      slides: [],
      currentSlide: 0,
      totalSlides: 0,
      isCompleted: false,
      hasNext: false,
      themeClass: 'theme-default'
    }
  },

  onLoad(options) {
    const theme = uni.getStorageSync('appTheme') || 'default'
    this.themeClass = 'theme-' + theme
    const path = options.path || 'presence'
    const lessonIndex = parseInt(options.lessonIndex) || 0
    this.loadLesson(path, lessonIndex)
  },

  onShow() {
    const { path, lesson } = this
    if (lesson && lesson.id) {
      const completed = uni.getStorageSync(`lesson_${path}_${lesson.id}`) || false
      if (completed !== this.isCompleted) {
        this.isCompleted = completed
      }
    }
  },

  methods: {
    loadLesson(path, lessonIndex) {
      const course = courses[path]
      if (!course) return
      const lesson = course.lessons[lessonIndex]

      // Split concept into cards by double newlines
      const conceptCards = lesson.concept.split(/\n\n+/).filter(s => s.trim())
      const slides = conceptCards.map((text, i) => ({
        type: 'concept',
        text: text.trim(),
        icon: i === 0 ? '💡' : i === conceptCards.length - 1 ? '🎯' : '📌'
      }))

      // Practice is the final card
      slides.push({
        type: 'practice',
        text: lesson.practice,
        icon: '🧘'
      })

      this.path = path
      this.lessonIndex = lessonIndex
      this.lesson = lesson
      this.slides = slides
      this.currentSlide = 0
      this.totalSlides = slides.length
      this.total = course.lessons.length
      this.hasNext = lessonIndex < course.lessons.length - 1
      this.isCompleted = uni.getStorageSync(`lesson_${path}_${lesson.id}`) || false

      uni.setNavigationBarTitle({ title: course.title })
    },

    nextSlide() {
      if (this.currentSlide < this.totalSlides - 1) {
        this.currentSlide = this.currentSlide + 1
        uni.vibrateShort({ type: 'light' }).catch(() => {})
      }
    },

    prevSlide() {
      if (this.currentSlide > 0) {
        this.currentSlide = this.currentSlide - 1
        uni.vibrateShort({ type: 'light' }).catch(() => {})
      }
    },

    goSlide(e) {
      const index = parseInt(e.currentTarget.dataset.index)
      if (index !== this.currentSlide) {
        this.currentSlide = index
      }
    },

    startPractice() {
      const { path, lesson } = this
      uni.setStorageSync('practiceText', lesson.practice)
      uni.navigateTo({
        url: `/pages/practice/index?path=${path}&lessonId=${lesson.id}`
      })
    },

    markComplete() {
      const { path, lesson } = this
      const rewarded = util.completeLesson(path, lesson.id)
      if (!rewarded) return
      this.isCompleted = true
      uni.showToast({ title: '+2 ❤️', icon: 'success' })
    },

    nextLesson() {
      const { path, lessonIndex } = this
      this.loadLesson(path, lessonIndex + 1)
    },

    goBack() {
      uni.navigateBack()
    },

    // Long-press on slide text → save as bookmark
    saveQuote(e) {
      const text = e.currentTarget.dataset.text
      if (!text) return
      uni.vibrateShort({ type: 'light' }).catch(() => {})

      const quotes = uni.getStorageSync('savedQuotes') || []
      // Don't save duplicates
      if (quotes.some(q => q.text === text)) {
        uni.showToast({ title: '已收藏过', icon: 'none' })
        return
      }

      const { lesson, path } = this
      quotes.unshift({
        text: text.slice(0, 200),
        lesson: lesson.title,
        path,
        time: new Date().toISOString()
      })
      uni.setStorageSync('savedQuotes', quotes.slice(0, 100))
      uni.showToast({ title: '✨ 已收藏', icon: 'none' })
    }
  }
}
</script>

<style scoped>
/* 课程 -- 沉浸深色风格 */

.page-bg {
  position: fixed; inset: 0;
  background: linear-gradient(180deg, #5C4F42 0%, #3E342B 50%, #2A231D 100%);
  z-index: 0;
}
.page-glow {
  position: fixed; top: 50%; left: 50%;
  width: 600rpx; height: 600rpx;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(198, 156, 109, 0.10) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none; z-index: 0;
}

.container {
  position: relative; z-index: 1;
  min-height: 100vh;
  padding: 40rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex; flex-direction: column;
  color: #FDFBF7;
}

/* Header */
.lesson-header { padding: 8rpx 0 24rpx; flex-shrink: 0; }
.lesson-header-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.header-back-btn { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; margin-left: -12rpx; }
.header-back-icon { font-size: 36rpx; color: rgba(255,255,255,0.5); }
.header-back-btn:active { opacity: 0.6; }
.lesson-num {
  font-size: 24rpx; color: #C69C6D; letter-spacing: 2rpx;
  display: block; font-weight: 500;
}
.lesson-title { font-size: 42rpx; font-weight: 600; color: #FDFBF7; display: block; margin-top: 4rpx; }
.lesson-subtitle { font-size: 28rpx; color: rgba(255,255,255,0.4); display: block; margin-top: 4rpx; }

/* Card area */
.card-area { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: center; min-height: 0; }

/* Slide cards */
.slide-card { position: absolute; inset: 0; pointer-events: none; }
.slide-card-inner {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 32rpx; padding: 48rpx 40rpx;
  border: 2rpx solid rgba(255,255,255,0.06);
  height: 100%; display: flex; flex-direction: column;
  opacity: 0; transform: translateX(40rpx);
  transition: opacity 0.3s ease, transform 0.3s ease;
  overflow-y: auto; pointer-events: none;
}
.slide-card-inner.active { opacity: 1; transform: translateX(0); pointer-events: auto; }

.slide-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.slide-type-label {
  font-size: 24rpx; color: #C69C6D; font-weight: 600;
  letter-spacing: 2rpx; display: block; margin-bottom: 24rpx;
}
.slide-text-wrap { flex: 1; display: flex; flex-direction: column; }
.slide-text {
  font-size: 30rpx; color: rgba(255,255,255,0.7); line-height: 2;
  display: block; white-space: pre-line; flex: 1;
}

/* Actions */
.slide-actions { margin-top: 24rpx; display: flex; flex-direction: column; gap: 16rpx; flex-shrink: 0; }

/* Navigation dots */
.slide-dots {
  display: flex; justify-content: center; gap: 12rpx;
  padding: 24rpx 0; flex-shrink: 0; z-index: 2; position: relative;
}
.slide-dot {
  width: 14rpx; height: 14rpx; border-radius: 50%;
  background: rgba(255,255,255,0.12);
  transition: background 0.2s, transform 0.2s;
}
.slide-dot.active { background: #C69C6D; transform: scale(1.3); }

/* Tap zones */
.nav-zones { position: fixed; inset: 0; display: flex; pointer-events: none; z-index: 1; }
.nav-zone-left, .nav-zone-right {
  flex: 1; display: flex; align-items: center; justify-content: center; pointer-events: auto;
}
.nav-arrow {
  font-size: 80rpx; color: rgba(255,255,255,0.3); opacity: 0.3;
  width: 100rpx; height: 100rpx;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s;
}
.nav-zone-left:active .nav-arrow, .nav-zone-right:active .nav-arrow { opacity: 0.6; }

/* Buttons */
.btn-primary {
  background: #C69C6D; color: #FDFBF7; border: none;
  border-radius: 40rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.btn-primary:active { opacity: 0.8; }
.btn-outline {
  background: transparent; color: rgba(255,255,255,0.5); border: 2rpx solid rgba(255,255,255,0.15);
  border-radius: 40rpx; font-weight: 500;
  display: flex; align-items: center; justify-content: center;
}
.btn-ghost {
  background: transparent; color: rgba(255,255,255,0.5); border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 40rpx; font-weight: 500;
  display: flex; align-items: center; justify-content: center;
}
.btn-lg { padding: 24rpx 48rpx; font-size: 28rpx; }
</style>
