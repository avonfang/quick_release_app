<template>
  <view class="page-bg"></view>
  <view class="page-glow"></view>

  <view class="container">

    <!-- ====== READY ====== -->
    <block v-if="phase === 'ready'">
      <view class="header">
        <view class="header-btn" @tap="finish">
          <text class="header-btn-icon">✕</text>
        </view>
        <text class="header-title">呼吸练习</text>
        <view class="header-btn"></view>
      </view>

      <view class="preview-area">
        <view class="preview-ring preview-ring-3"></view>
        <view class="preview-ring preview-ring-2"></view>
        <view class="preview-ring preview-ring-1"></view>
        <view class="preview-center">
          <text class="preview-center-icon">{{currentPattern.icon}}</text>
        </view>
      </view>

      <text class="pattern-name">{{currentPattern.name}}</text>
      <text class="pattern-desc">{{currentPattern.desc}}</text>

      <scroll-view class="chip-scroll" scroll-x enable-flex>
        <view
          :class="'chip ' + (selectedPattern === key ? 'active' : '') + (item.premium && !isPremium ? ' locked' : '')"
          v-for="(patternItem, key) in patternList" :key="patternItem.key"
          :data-key="patternItem.key" @tap="selectPattern"
        >
          <text class="chip-icon">{{patternItem.premium && !isPremium ? '🔒' : patternItem.icon}}</text>
          <text class="chip-label">{{patternItem.name}}</text>
        </view>
      </scroll-view>

      <view class="round-selector">
        <text class="round-label">轮次</text>
        <view class="round-btns">
          <view
            :class="'round-btn ' + (targetRounds === n ? 'active' : '')"
            v-for="n in [3, 6, 9]" :key="n"
            :data-n="n" @tap="setTarget"
          >
            <text class="round-btn-text">{{n}}</text>
          </view>
        </view>
      </view>

      <view class="start-btn" @tap="start" hover-class="start-btn-hover">
        <text class="start-btn-text">开始练习</text>
      </view>
    </block>

    <!-- ====== RUNNING ====== -->
    <block v-else-if="phase === 'running'">
      <view class="header">
        <view class="header-btn" @tap="finish">
          <text class="header-btn-icon">✕</text>
        </view>
        <text class="header-title">呼吸练习</text>
        <view class="header-btn"></view>
      </view>

      <view class="breath-area">
        <view :class="'breath-glow ' + animClass" :style="{ animationDuration: phaseDuration + 's' }"></view>

        <view class="svg-ring-box">
          <svg class="svg-ring" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
            <circle
              cx="150" cy="150" r="130" fill="none" stroke="#FDFBF7" stroke-width="4" stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="strokeDashoffset"
              style="transition: stroke-dashoffset 0.8s linear;"
            />
          </svg>
        </view>

        <view :class="'center-text-wrap ' + animClass" :style="{ animationDuration: phaseDuration + 's' }">
          <text class="phase-label">{{phaseLabel}}</text>
          <text class="phase-countdown">{{countdown}}</text>
        </view>
      </view>

      <view class="running-footer">
        <text class="round-info">第 {{currentRound}} / {{targetRounds}} 轮</text>
        <view class="end-btn" @tap="finish" hover-class="end-btn-hover">
          <text class="end-btn-text">结束练习</text>
        </view>
      </view>
    </block>

    <!-- ====== DONE ====== -->
    <block v-else-if="phase === 'done'">
      <view class="header">
        <view class="header-btn" @tap="finish">
          <text class="header-btn-icon">✕</text>
        </view>
        <text class="header-title">呼吸练习</text>
        <view class="header-btn"></view>
      </view>

      <view class="done-area">
        <view class="done-glow-ring"></view>
        <text class="done-icon">🌿</text>
      </view>
      <text class="done-title">练习完成</text>
      <text class="done-desc">每一次呼吸，都是回到当下的一步。</text>

      <view class="done-btn" @tap="restart" hover-class="done-btn-hover">
        <text class="done-btn-text">再来一次</text>
      </view>
      <view class="done-btn done-btn-outline" @tap="finish">
        <text class="done-btn-text-outline">完成</text>
      </view>
    </block>

  </view>
</template>

<script>
import * as coins from '@/utils/coins'

const PATTERNS = {
  '478': { name: '4-7-8 放松', phases: [{ label: '吸气', sec: 4 }, { label: '屏息', sec: 7 }, { label: '呼气', sec: 8 }], icon: '🌙', desc: '经典的深度放松节奏', premium: false },
  '444': { name: '4-4-4 平衡', phases: [{ label: '吸气', sec: 4 }, { label: '屏息', sec: 4 }, { label: '呼气', sec: 4 }], icon: '⚖️', desc: '均衡的呼吸节奏', premium: false },
  'box': { name: '箱式呼吸', phases: [{ label: '吸气', sec: 4 }, { label: '屏息', sec: 4 }, { label: '呼气', sec: 4 }, { label: '屏息', sec: 4 }], icon: '🧊', desc: '方形的稳定节奏', premium: false },
  'coherent': { name: '谐振呼吸', phases: [{ label: '吸气', sec: 5 }, { label: '呼气', sec: 5 }], icon: '🌊', desc: '让心率和呼吸同步', premium: true },
  'fire': { name: '火呼吸', phases: [{ label: '吸气', sec: 2 }, { label: '屏息', sec: 1 }, { label: '呼气', sec: 4 }, { label: '屏息', sec: 1 }], icon: '🔥', desc: '激活能量的节奏', premium: true }
}

const SVG_RADIUS = 130
const CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS  // ≈ 816.8

export default {
  data() {
    return {
      selectedPattern: '478',
      patternList: Object.entries(PATTERNS).map(([key, v]) => ({ key, ...v })),
      currentPattern: PATTERNS['478'],
      phase: 'ready',
      phaseLabel: '',
      countdown: 0,
      currentRound: 1,
      targetRounds: 6,
      isPremium: false,

      /* SVG ring */
      circumference: CIRCUMFERENCE,
      strokeDashoffset: 0,
      animClass: '',
      phaseDuration: 4,
    }
  },

  onLoad() {
    this.refreshState()
  },

  onShow() {
    this.refreshState()
  },

  onUnload() {
    if (this._timer) clearTimeout(this._timer)
  },

  methods: {
    refreshState() {
      const isPremium = uni.getStorageSync('isPremium') || false
      this.isPremium = isPremium
    },

    selectPattern(e) {
      if (this.phase !== 'ready') return
      const key = e.currentTarget.dataset.key
      const pattern = PATTERNS[key]
      if (!pattern) return

      if (pattern.premium && !this.isPremium) {
        uni.showModal({
          title: '高级呼吸模式',
          content: '「' + pattern.name + '」仅限无限版订阅用户使用。',
          confirmText: '查看升级',
          cancelText: '稍后',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/profile/index' })
          }
        })
        return
      }

      uni.vibrateShort({ type: 'light' }).catch(() => {})
      this.selectedPattern = key
      this.currentPattern = pattern
    },

    setTarget(e) {
      const n = parseInt(e.currentTarget.dataset.n)
      uni.vibrateShort({ type: 'light' }).catch(() => {})
      this.targetRounds = n
    },

    start() {
      uni.vibrateShort({ type: 'medium' }).catch(() => {})
      const pattern = PATTERNS[this.selectedPattern]
      const firstPhase = pattern.phases[0]
      const animMap = { '吸气': 'inhale', '屏息': 'hold', '呼气': 'exhale' }
      this.phase = 'running'
      this.currentRound = 1
      this.countdown = firstPhase.sec
      this.strokeDashoffset = 0
      this.phaseLabel = firstPhase.label
      this.animClass = animMap[firstPhase.label] || ''
      this.phaseDuration = firstPhase.sec
      this.currentPhaseIndex = 0
      this.$nextTick(() => this.runTimer())
    },

    runTimer() {
      const pattern = this.currentPattern
      const idx = this.currentPhaseIndex
      const phase = pattern.phases[idx]
      const totalSec = phase.sec
      const startedAt = Date.now()

      // haptic at phase transitions
      const label = phase.label
      const animMap = { '吸气': 'inhale', '屏息': 'hold', '呼气': 'exhale' }
      if (label === '吸气') uni.vibrateShort({ type: 'medium' }).catch(() => {})
      else if (label === '屏息') uni.vibrateShort({ type: 'light' }).catch(() => {})
      else if (label === '呼气') uni.vibrateShort({ type: 'heavy' }).catch(() => {})

      const tick = () => {
        const now = Date.now()
        const elapsed = (now - startedAt) / 1000
        const remaining = totalSec - elapsed

        if (remaining <= 0) {
          const finalOffset = label === '吸气' ? 0 : CIRCUMFERENCE
          this.countdown = 0
          this.strokeDashoffset = finalOffset
          this.nextPhase()
          return
        }

        // SVG ring direction
        const progress = remaining / totalSec
        let strokeDashoffset
        if (label === '吸气') {
          strokeDashoffset = progress * CIRCUMFERENCE
        } else {
          strokeDashoffset = (1 - progress) * CIRCUMFERENCE
        }

        const newCountdown = Math.ceil(remaining)
        this.strokeDashoffset = strokeDashoffset
        if (newCountdown !== this.countdown) this.countdown = newCountdown

        // self-correct: stay aligned to 100ms boundaries
        const drift = (now - startedAt) - Math.floor((now - startedAt) / 100) * 100
        this._timer = setTimeout(tick, Math.max(30, 100 - drift))
      }

      this._timer = setTimeout(tick, 100)
    },

    nextPhase() {
      const pattern = this.currentPattern
      let nextIdx = this.currentPhaseIndex + 1
      const animMap = { '吸气': 'inhale', '屏息': 'hold', '呼气': 'exhale' }

      function initialOffsetFor(label) {
        // 吸气从空开始，呼气/屏息从满开始
        return label === '吸气' ? CIRCUMFERENCE : 0
      }

      if (nextIdx >= pattern.phases.length) {
        const round = this.currentRound + 1
        if (round > this.targetRounds) {
          this.phase = 'done'
          this.currentRound = this.currentRound
          this.giveReward()
          return
        }
        const firstPhase = pattern.phases[0]
        this.currentRound = round
        this.currentPhaseIndex = 0
        this.countdown = firstPhase.sec
        this.strokeDashoffset = initialOffsetFor(firstPhase.label)
        this.phaseLabel = firstPhase.label
        this.animClass = animMap[firstPhase.label] || ''
        this.phaseDuration = firstPhase.sec
      } else {
        const nextPhase = pattern.phases[nextIdx]
        this.currentPhaseIndex = nextIdx
        this.countdown = nextPhase.sec
        this.strokeDashoffset = initialOffsetFor(nextPhase.label)
        this.phaseLabel = nextPhase.label
        this.animClass = animMap[nextPhase.label] || ''
        this.phaseDuration = nextPhase.sec
      }

      this.runTimer()
    },

    giveReward() {
      coins.addCoins(1, '呼吸练习')
    },

    finish() {
      if (this._timer) clearTimeout(this._timer)
      uni.navigateBack()
    },

    restart() {
      this.phase = 'ready'
      this.countdown = 0
      this.strokeDashoffset = 0
      this.currentRound = 1
      this.phaseLabel = ''
    },

    onShareAppMessage() {
      coins.addCoins(1, '分享呼吸')
      return { title: '刚做完一组呼吸，心很静 🧘', path: '/pages/breath/index' }
    }
  }
}
</script>

<style scoped>
/* 呼吸练习 -- 沉浸深色风格 */

.page-bg {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #5C4F42 0%, #3E342B 50%, #2A231D 100%);
  z-index: 0;
}
.page-glow {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 600rpx;
  height: 600rpx;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(198, 156, 109, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.container {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40rpx calc(60rpx + env(safe-area-inset-bottom));
  color: #FDFBF7;
}

/* ====== Header ====== */
.header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: calc(96rpx + env(safe-area-inset-top));
  padding-bottom: 24rpx;
}
.header-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.header-btn:active {
  background: rgba(255, 255, 255, 0.08);
}
.header-btn-icon {
  font-size: 32rpx;
  color: #FDFBF7;
  line-height: 1;
}
.header-title {
  font-size: 32rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 4rpx;
}

/* ====== Preview (ready) ====== */
.preview-area {
  position: relative;
  width: 360rpx;
  height: 360rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 40rpx auto 32rpx;
}
.preview-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.preview-ring-3 {
  width: 360rpx; height: 360rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.06);
  animation: breatheIn 4s ease-in-out infinite;
}
.preview-ring-2 {
  width: 300rpx; height: 300rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.10);
  animation: breatheIn 4s ease-in-out infinite 0.3s;
}
.preview-ring-1 {
  width: 240rpx; height: 240rpx;
  background: rgba(255, 255, 255, 0.04);
  animation: breatheIn 4s ease-in-out infinite 0.6s;
}
.preview-center {
  position: absolute;
  width: 160rpx; height: 160rpx;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16rpx);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 32rpx rgba(0, 0, 0, 0.2);
}
.preview-center-icon {
  font-size: 64rpx;
  display: block;
}

@keyframes breatheIn {
  0%, 100% { transform: scale(0.92); opacity: 0.6; }
  50% { transform: scale(1.08); opacity: 1; }
}

/* ====== Pattern info (ready) ====== */
.pattern-name {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-size: 40rpx;
  font-weight: 600;
  color: #FDFBF7;
  display: block;
  margin-bottom: 8rpx;
}
.pattern-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 32rpx;
}

/* ====== Pattern chips ====== */
.chip-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 32rpx;
  padding-bottom: 8rpx;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 48rpx;
  background: rgba(255, 255, 255, 0.06);
  border: 2rpx solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s;
}
.chip:active { transform: scale(0.95); }
.chip.active {
  background: rgba(198, 156, 109, 0.2);
  border-color: rgba(198, 156, 109, 0.5);
}
.chip.locked { opacity: 0.4; }
.chip-icon { font-size: 32rpx; display: inline-block; }
.chip-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}
.chip.active .chip-label { color: #FDFBF7; }

/* ====== Round selector ====== */
.round-selector {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.round-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2rpx;
}
.round-btns {
  display: flex;
  gap: 16rpx;
}
.round-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.round-btn:active { transform: scale(0.92); }
.round-btn.active {
  border-color: #C69C6D;
  background: rgba(198, 156, 109, 0.15);
}
.round-btn-text {
  font-size: 30rpx;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}
.round-btn.active .round-btn-text { color: #C69C6D; }

/* ====== Start button ====== */
.start-btn {
  width: 100%;
  max-width: 400rpx;
  padding: 28rpx 0;
  border-radius: 56rpx;
  background: #C69C6D;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(198, 156, 109, 0.3);
  transition: transform 0.2s;
}
.start-btn-hover {
  transform: scale(0.96);
  opacity: 0.9;
}
.start-btn-text {
  font-size: 32rpx;
  color: #FFF;
  font-weight: 600;
}

/* ====== Running state ====== */
.breath-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
}

.breath-glow {
  position: absolute;
  width: 500rpx;
  height: 500rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(198, 156, 109, 0.2) 0%, transparent 70%);
  transition: transform 0.5s ease-in-out;
}
.breath-glow.inhale {
  animation: glowInhale ease-in-out forwards;
}
.breath-glow.hold {
  animation: glowHold ease-in-out forwards;
}
.breath-glow.exhale {
  animation: glowExhale ease-in-out forwards;
}

@keyframes glowInhale {
  0% { transform: scale(0.85); opacity: 0.3; }
  100% { transform: scale(1.25); opacity: 0.6; }
}
@keyframes glowExhale {
  0% { transform: scale(1.25); opacity: 0.6; }
  100% { transform: scale(0.85); opacity: 0.3; }
}
@keyframes glowHold {
  0% { transform: scale(1.1); opacity: 0.4; }
  100% { transform: scale(1.05); opacity: 0.35; }
}

.svg-ring-box {
  width: 420rpx;
  height: 420rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.svg-ring {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 20rpx rgba(253, 251, 247, 0.15));
}

.center-text-wrap {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.5s ease-in-out;
}
.center-text-wrap.inhale {
  animation: textRise ease-in-out forwards;
}
.center-text-wrap.exhale {
  animation: textFall ease-in-out forwards;
}
.center-text-wrap.hold {
  animation: textStill ease-in-out forwards;
}

@keyframes textRise {
  0% { transform: scale(0.95) translateY(8rpx); }
  100% { transform: scale(1.08) translateY(-8rpx); }
}
@keyframes textFall {
  0% { transform: scale(1.08) translateY(-8rpx); }
  100% { transform: scale(0.95) translateY(8rpx); }
}
@keyframes textStill {
  0% { transform: scale(1.03); }
  100% { transform: scale(1.0); }
}

.phase-label {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-size: 56rpx;
  font-weight: 600;
  color: #FDFBF7;
  display: block;
  margin-bottom: 12rpx;
  letter-spacing: 8rpx;
}
.phase-countdown {
  font-size: 40rpx;
  font-weight: 200;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  text-align: center;
}

/* ====== Running footer ====== */
.running-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}
.round-info {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
  display: block;
  margin-bottom: 24rpx;
  letter-spacing: 2rpx;
}

.end-btn {
  width: 100%;
  max-width: 400rpx;
  padding: 24rpx 0;
  border-radius: 56rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.15);
  text-align: center;
  background: transparent;
  transition: all 0.2s;
}
.end-btn-hover {
  background: rgba(255, 255, 255, 0.05);
  transform: scale(0.97);
}
.end-btn-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

/* ====== Done state ====== */
.done-area {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 120rpx auto 32rpx;
}
.done-glow-ring {
  position: absolute;
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, rgba(198, 156, 109, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: celebratePulse 1.4s ease-out infinite;
}
@keyframes celebratePulse {
  0% { transform: scale(0.8); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
  100% { transform: scale(1); opacity: 0.3; }
}
.done-icon {
  font-size: 88rpx;
  display: block;
  position: relative;
  z-index: 1;
  animation: bounceIn 0.5s ease-out both;
}
@keyframes bounceIn {
  0% { transform: scale(0); }
  60% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.done-title {
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  font-size: 44rpx;
  font-weight: 600;
  color: #FDFBF7;
  display: block;
  margin-bottom: 12rpx;
}
.done-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 64rpx;
  text-align: center;
}

.done-btn {
  width: 100%;
  max-width: 400rpx;
  padding: 28rpx 0;
  border-radius: 56rpx;
  background: #C69C6D;
  text-align: center;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(198, 156, 109, 0.3);
  transition: transform 0.2s;
}
.done-btn-hover {
  transform: scale(0.96);
  opacity: 0.9;
}
.done-btn-outline {
  background: transparent;
  box-shadow: none;
  border: 2rpx solid rgba(255, 255, 255, 0.15);
  margin-bottom: 0;
}
.done-btn-text {
  font-size: 30rpx;
  color: #FFF;
  font-weight: 600;
  display: block;
}
.done-btn-text-outline {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  display: block;
}
</style>
