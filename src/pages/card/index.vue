<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useSessionStore } from '@/stores/session'
import { saveCard } from '@/utils/cloud'
import { isLoggedIn } from '@/utils/api'
import { getActiveSections, COLORS, todayString } from '@/utils/card-share'

const store = useSessionStore()

// 状态栏高度，用于自定义导航栏定位
const statusBarHeight = ref(44)
const pageLoading = ref(true)

// ─── 从本地存储加载卡片 ──────────────────────────────────────
const savedCard = ref<any>(null)

function loadCardById(recordId?: string) {
  try {
    const raw = uni.getStorageSync('cards') || '[]'
    const cards = JSON.parse(raw)
    if (recordId) {
      savedCard.value = cards.find((c: any) => c._id === recordId) || null
      if (!savedCard.value) {
        uni.showToast({ title: '记录未找到', icon: 'none' })
      }
    } else {
      savedCard.value = cards[0] || null
    }
  } catch (_) {
    savedCard.value = null
  }
}

onLoad((query) => {
  loadCardById(query?.recordId as string | undefined)
  pageLoading.value = false
})

onMounted(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/index' })
    return
  }
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 44
  } catch (_e) {
    statusBarHeight.value = 44
  }
})

// ─── 日期 ─────────────────────────────────────────────────────
const today = computed(() => todayString())

// ─── 读取数据：优先 localStorage（已保存的记录），其次 store（刚完成对话） ───
const cardData = computed(() => {
  if (savedCard.value) return savedCard.value
  if (store.event || store.emotion || store.thought || store.belief || store.loosen || store.release || store.awareness || store.action) {
    return store
  }
  return {}
})

const hasData = computed(() => {
  const d = cardData.value
  return !!(d.event || d.emotion || d.thought || d.belief || d.loosen || d.release || d.awareness || d.action)
})

// ─── 格式化显示文本 ───────────────────────────────────────────
const displayText = (val: unknown): string => {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

// ─── 导航 ─────────────────────────────────────────────────────
const goBack = () => {
  uni.navigateBack()
}

/** 卡片状态，用于判断是否可继续对话 */
const cardStatus = computed(() => (cardData.value as any)?.status || 'completed')

/** 继续对话 */
const continueSession = () => {
  const card = cardData.value as any
  if (card?.sessionId) {
    uni.setStorageSync('resumeSessionId', card.sessionId)
    uni.navigateTo({ url: '/pages/chat/index' })
  }
}

// ─── 完整对话展开 ──────────────────────────────────────────────
const showConversation = ref(false)
const conversationMessages = computed(() => {
  return (cardData.value as any)?.messages || []
})

function toggleConversation() {
  showConversation.value = !showConversation.value
}

// ─── 保存到数据库 ────────────────────────────────────────────
const isSaving = ref(false)

const handleSave = async () => {
  if (isSaving.value) return
  isSaving.value = true

  try {
    let userId = 'anonymous'
    try {
      userId = uni.getStorageSync('userId') || 'anonymous'
    } catch {
      userId = 'anonymous'
    }

    const d = cardData.value
    const messages = (d as any)?.messages
    await saveCard({
      sessionId: (cardData.value as any)?.sessionId || store.sessionId,
      userId,
      event: d.event ? displayText(d.event) : undefined,
      emotion: d.emotion ? displayText(d.emotion) : undefined,
      thought: d.thought ? displayText(d.thought) : undefined,
      belief: d.belief ? displayText(d.belief) : undefined,
      loosen: d.loosen ? displayText(d.loosen) : undefined,
      release: d.release ? displayText(d.release) : undefined,
      awareness: d.awareness ? displayText(d.awareness) : undefined,
      action: d.action ? displayText(d.action) : undefined,
      messages: messages || undefined,
    })

    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '保存失败'
    uni.showToast({ title: msg, icon: 'error' })
  } finally {
    isSaving.value = false
  }
}

// ─── 生成图片分享 ────────────────────────────────────────────
const shareLoading = ref(false)

async function handleShareImage() {
  if (!hasData.value || shareLoading.value) return
  shareLoading.value = true

  try {
    //#ifdef H5
    await shareImageH5()
    //#endif
    //#ifdef MP-WEIXIN
    await shareImageMP()
    //#endif
  } catch (e) {
    console.error('Share failed:', e)
    uni.showToast({ title: '生成失败', icon: 'error' })
  } finally {
    shareLoading.value = false
  }
}

//#ifdef H5
async function shareImageH5() {
  const html2canvas = (await import('html2canvas')).default
  const el = document.querySelector('.h5-card-outer') as HTMLElement
  if (!el) throw new Error('Card element not found')

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: COLORS.bg,
    allowTaint: false,
    useCORS: true,
    logging: false,
  })

  canvas.toBlob((blob) => {
    if (!blob) throw new Error('Blob creation failed')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '看见此刻-觉察卡片.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    uni.showToast({ title: '已下载', icon: 'success' })
  }, 'image/png')
}
//#endif

//#ifdef MP-WEIXIN
function drawWrappedText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const chars = text.split('')
  let line = ''
  let lineY = y
  for (const char of chars) {
    const testLine = line + char
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, lineY)
      line = char
      lineY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) ctx.fillText(line, x, lineY)
  return lineY + lineHeight
}

async function shareImageMP() {
  // 1. 请求相册权限
  const hasPermission = await requestAlbumPermission()
  if (!hasPermission) {
    uni.showToast({ title: '需要相册权限', icon: 'none' })
    return
  }

  // 2. 获取系统信息
  const sys = uni.getSystemInfoSync()
  const dpr = sys.pixelRatio || 2
  const winWidth = sys.windowWidth || 375
  const rpx = (px: number) => (px / 750) * winWidth

  // 3. 计算内容高度
  const sections = getActiveSections(cardData.value)
  const sectionCount = sections.length
  const contentH = 200 + sectionCount * 160 + 120
  const canvasH = Math.max(800, contentH)
  const logW = winWidth
  const logH = canvasH

  // 4. 获取 canvas
  const nodeRes = await new Promise<any>((resolve, reject) => {
    uni.createSelectorQuery().select('#shareCanvas').node((res) => {
      if (res && res.node) resolve(res.node)
      else reject(new Error('Canvas node not found'))
    }).exec()
  })
  const canvas = nodeRes as any
  canvas.width = logW * dpr
  canvas.height = logH * dpr

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // 5. 绘制背景
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, logW, logH)

  // 6. 绘制卡片白底
  const margin = rpx(30)
  const cardX = margin
  const cardY = rpx(40)
  const cardW = logW - margin * 2
  let currentY = cardY

  ctx.fillStyle = COLORS.cardBg
  roundRect(ctx, cardX, currentY, cardW, contentH - rpx(80), rpx(16))
  ctx.fill()

  // 7. 绘制金线
  currentY += rpx(36)
  ctx.fillStyle = COLORS.primary
  ctx.fillRect(cardX + rpx(40), currentY, rpx(60), rpx(6))
  currentY += rpx(24)

  // 8. 标题
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = `bold ${rpx(34)}px PingFang SC, sans-serif`
  ctx.fillText('今天的觉察', cardX + rpx(40), currentY)
  currentY += rpx(32)
  ctx.fillStyle = COLORS.textLight
  ctx.font = `${rpx(22)}px PingFang SC, sans-serif`
  ctx.fillText(todayString(), cardX + rpx(40), currentY)
  currentY += rpx(40)

  // 9. 各区块
  for (const sec of sections) {
    const secX = cardX + rpx(24)
    const secW = cardW - rpx(48)
    // 背景
    ctx.fillStyle = sec.bg
    roundRect(ctx, secX, currentY, secW, rpx(110), rpx(12))
    ctx.fill()
    // 标签
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = `${rpx(22)}px PingFang SC, sans-serif`
    ctx.fillText(`${sec.icon} ${sec.label}`, secX + rpx(20), currentY + rpx(32))
    // 内容
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = `${rpx(28)}px PingFang SC, sans-serif`
    const textEnd = drawWrappedText(ctx, sec.text, secX + rpx(20), currentY + rpx(62), secW - rpx(40), rpx(42))
    currentY = textEnd + rpx(20)
  }

  // 10. 金句
  currentY += rpx(16)
  ctx.fillStyle = COLORS.divider
  ctx.fillRect(cardX + rpx(80), currentY, cardW - rpx(160), 2)
  currentY += rpx(24)
  ctx.fillStyle = COLORS.textSecondary
  ctx.font = `italic ${rpx(24)}px PingFang SC, sans-serif`
  const quoteY = drawWrappedText(ctx, '当你看见一个信念时\n你已经不完全被它控制', cardX + rpx(40), currentY, cardW - rpx(80), rpx(36))
  currentY = quoteY + rpx(16)

  // 11. 品牌水印
  ctx.fillStyle = COLORS.textLight
  ctx.font = `${rpx(20)}px PingFang SC, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('来自 看见此刻', logW / 2, contentH - rpx(30))

  // 12. 导出图片
  const tempRes = await new Promise<any>((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvas,
      success: resolve,
      fail: reject,
    })
  })

  await uni.saveImageToPhotosAlbum({ filePath: tempRes.tempFilePath })
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function requestAlbumPermission(): Promise<boolean> {
  try {
    await uni.authorize({ scope: 'scope.writePhotosAlbum' })
    return true
  } catch {
    const modalRes = await uni.showModal({
      title: '需要相册权限',
      content: '请开启相册权限以保存分享图片',
      confirmText: '去设置',
    })
    if (modalRes.confirm) {
      await uni.openSetting()
      const setting = await uni.getSetting()
      return setting.authSetting['scope.writePhotosAlbum'] === true
    }
    return false
  }
}
//#endif

</script>

<template>
  <!--#ifdef H5-->
  <view class="h5-page">
    <view class="h5-grain"></view>
    <view class="h5-orb h5-orb--t"></view>
    <view class="h5-orb h5-orb--b"></view>

    <!-- Nav -->
    <view class="h5-nav">
      <view class="h5-nav-btn" @tap="goBack">
        <text class="h5-nav-back-icon">←</text>
        <text class="h5-nav-back-text">返回</text>
      </view>
      <text class="h5-nav-title">觉察</text>
      <view class="h5-nav-btn h5-nav-right"><!-- spacer --></view>
    </view>

    <!-- Content -->
    <scroll-view class="h5-scroll" scroll-y>
      <view v-if="pageLoading" class="h5-empty">
        <view class="h5-loading-icon" />
        <text class="h5-empty-desc">加载中...</text>
      </view>
      <view v-else-if="!hasData" class="h5-empty">
        <text class="h5-empty-icon">🧘</text>
        <text class="h5-empty-title">还没有觉察记录</text>
        <text class="h5-empty-desc">完成一次完整的觉察对话后，你的卡片会自动呈现在这里</text>
        <view class="h5-empty-btn" @tap="goBack">
          <text class="h5-empty-btn-text">去完成一次觉察</text>
        </view>
      </view>

      <view v-else class="h5-content">
        <!-- Card with double-bezel architecture -->
        <view class="h5-card-outer">
          <view class="h5-card-inner">
            <view class="h5-card-accent"></view>

            <view class="h5-card-header">
              <text class="h5-card-title">今天的觉察</text>
              <text class="h5-card-date">{{ today }}</text>
            </view>

            <view v-if="cardData.event" class="h5-section">
              <view class="h5-section-label"><text class="h5-section-icon">📌</text><text class="h5-section-label-text">触发事件</text></view>
              <view class="h5-section-content"><text class="h5-section-text">{{ displayText(cardData.event) }}</text></view>
            </view>

            <view v-if="cardData.emotion" class="h5-section h5-section--emotion">
              <view class="h5-section-label"><text class="h5-section-icon">💧</text><text class="h5-section-label-text">情绪感受</text></view>
              <view class="h5-section-content"><text class="h5-section-text">{{ displayText(cardData.emotion) }}</text></view>
            </view>

            <view v-if="cardData.thought" class="h5-section h5-section--thought">
              <view class="h5-section-label"><text class="h5-section-icon">💬</text><text class="h5-section-label-text">自动想法</text></view>
              <view class="h5-section-content"><text class="h5-section-text">{{ displayText(cardData.thought) }}</text></view>
            </view>

            <view v-if="cardData.belief" class="h5-section h5-section--belief">
              <view class="h5-section-label"><text class="h5-section-icon">💭</text><text class="h5-section-label-text">核心信念</text></view>
              <view class="h5-section-content"><text class="h5-section-text">{{ displayText(cardData.belief) }}</text></view>
            </view>

            <view v-if="cardData.loosen" class="h5-section h5-section--loosen">
              <view class="h5-section-label"><text class="h5-section-icon">🫳</text><text class="h5-section-label-text">松动信念</text></view>
              <view class="h5-section-content"><text class="h5-section-text">{{ displayText(cardData.loosen) }}</text></view>
            </view>

            <view v-if="cardData.release" class="h5-section h5-section--release">
              <view class="h5-section-label"><text class="h5-section-icon">🕊</text><text class="h5-section-label-text">释放练习</text></view>
              <view class="h5-section-content"><text class="h5-section-text">{{ displayText(cardData.release) }}</text></view>
            </view>

            <view v-if="cardData.awareness" class="h5-section h5-section--awareness">
              <view class="h5-section-label"><text class="h5-section-icon">👁</text><text class="h5-section-label-text">新的看见</text></view>
              <view class="h5-section-content"><text class="h5-section-text h5-section-text--italic">{{ displayText(cardData.awareness) }}</text></view>
            </view>

            <view v-if="cardData.action" class="h5-section h5-section--action">
              <view class="h5-section-label"><text class="h5-section-icon">🎯</text><text class="h5-section-label-text">下一步行动</text></view>
              <view class="h5-section-content"><text class="h5-section-text">{{ displayText(cardData.action) }}</text></view>
            </view>
          </view>
        </view>

        <!-- 完整对话 -->
        <view v-if="conversationMessages.length" class="h5-conversation">
          <view class="h5-conv-toggle" @tap="toggleConversation">
            <text class="h5-conv-toggle-text">{{ showConversation ? '收起完整对话' : '查看完整对话' }}</text>
            <text class="h5-conv-toggle-arrow" :class="{ 'h5-conv-toggle-arrow--open': showConversation }">›</text>
          </view>
          <view v-if="showConversation" class="h5-conv-body">
            <view
              v-for="msg in conversationMessages"
              :key="msg.id"
              class="h5-conv-msg"
              :class="{ 'h5-conv-msg--ai': msg.role === 'assistant', 'h5-conv-msg--user': msg.role === 'user' }"
            >
              <text class="h5-conv-role">{{ msg.role === 'assistant' ? 'AI' : '你' }}</text>
              <text class="h5-conv-content">{{ msg.content }}</text>
            </view>
          </view>
        </view>

        <view class="h5-quote">
          <view class="h5-quote-line"></view>
          <text class="h5-quote-text">当你看见一个信念时\n你已经不完全被它控制</text>
        </view>

        <view class="h5-actions">
          <view
            v-if="cardStatus === 'in_progress'"
            class="h5-btn-resume"
            @tap="continueSession"
          >
            <text class="h5-btn-resume-text">继续对话</text>
          </view>
          <view class="h5-btn-primary-outer">
            <view class="h5-btn-primary-inner" :disabled="isSaving" @tap="handleSave">
              <text class="h5-btn-primary-text">保存记录</text>
            </view>
          </view>
          <view class="h5-btn-share" :class="{ 'h5-btn-share--loading': shareLoading }" @tap="handleShareImage">
            <text class="h5-btn-share-text">{{ shareLoading ? '生成中...' : '📤 生成图片分享' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
  <!--#endif-->

  <!--#ifdef MP-WEIXIN-->
  <view class="page">
    <view
      class="nav-bar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="nav-inner">
        <view class="nav-left" @tap="goBack">
          <text class="nav-back-icon">←</text>
          <text class="nav-back-text">返回</text>
        </view>
        <text class="nav-title">觉察</text>
        <view class="nav-right"><!-- spacer --></view>
      </view>
    </view>

    <!-- ========== 可滚动内容区域 ========== -->
    <scroll-view
      class="scroll-area"
      scroll-y
      show-scrollbar
      :style="{ paddingTop: statusBarHeight + 88 + 'px' }"
    >
      <!-- ── 加载状态 ── -->
      <view v-if="pageLoading" class="empty-state">
        <view class="loading-icon" />
        <text class="loading-text">加载中...</text>
      </view>
      <!-- ── 空状态 ── -->
      <view v-else-if="!hasData" class="empty-state">
        <view class="empty-icon">🧘</view>
        <text class="empty-title">还没有觉察记录</text>
        <text class="empty-desc">
          完成一次完整的觉察对话后，{{"\n"}}你的卡片会自动呈现在这里
        </text>
        <view class="empty-btn" @tap="goBack">
          <text class="empty-btn-text">去完成一次觉察</text>
        </view>
      </view>

      <!-- ── 卡片内容 ── -->
      <view v-else class="content-wrapper">
        <!-- 卡片主体 -->
        <view class="card">
          <!-- 顶部金色装饰线 -->
          <view class="card-accent" />

          <!-- 卡片标题 -->
          <view class="card-header">
            <text class="card-title">今天的觉察</text>
            <text class="card-date">{{ today }}</text>
          </view>

          <!-- 区块 1：触发事件 -->
          <view v-if="cardData.event" class="section section-event">
            <view class="section-label">
              <text class="section-icon">📌</text>
              <text class="section-label-text">触发事件</text>
            </view>
            <view class="section-content">
              <text class="section-text">{{ displayText(cardData.event) }}</text>
            </view>
          </view>

          <!-- 区块 2：情绪 -->
          <view v-if="cardData.emotion" class="section section-emotion">
            <view class="section-label">
              <text class="section-icon">💧</text>
              <text class="section-label-text">情绪感受</text>
            </view>
            <view class="section-content">
              <text class="section-text">{{ displayText(cardData.emotion) }}</text>
            </view>
          </view>

          <!-- 区块 3：自动想法 -->
          <view v-if="cardData.thought" class="section section-thought">
            <view class="section-label">
              <text class="section-icon">💬</text>
              <text class="section-label-text">自动想法</text>
            </view>
            <view class="section-content">
              <text class="section-text">{{ displayText(cardData.thought) }}</text>
            </view>
          </view>

          <!-- 区块 4：出现的信念 -->
          <view v-if="cardData.belief" class="section section-belief">
            <view class="section-label">
              <text class="section-icon">💭</text>
              <text class="section-label-text">核心信念</text>
            </view>
            <view class="section-content">
              <text class="section-text">{{ displayText(cardData.belief) }}</text>
            </view>
          </view>

          <!-- 区块 5：松动 -->
          <view v-if="cardData.loosen" class="section section-loosen">
            <view class="section-label">
              <text class="section-icon">🫳</text>
              <text class="section-label-text">松动信念</text>
            </view>
            <view class="section-content">
              <text class="section-text">{{ displayText(cardData.loosen) }}</text>
            </view>
          </view>

          <!-- 区块 6：释放 -->
          <view v-if="cardData.release" class="section section-release">
            <view class="section-label">
              <text class="section-icon">🕊</text>
              <text class="section-label-text">释放练习</text>
            </view>
            <view class="section-content">
              <text class="section-text">{{ displayText(cardData.release) }}</text>
            </view>
          </view>

          <!-- 区块 7：新的看见 -->
          <view v-if="cardData.awareness" class="section section-awareness">
            <view class="section-label">
              <text class="section-icon">👁</text>
              <text class="section-label-text">新的看见</text>
            </view>
            <view class="section-content">
              <text class="section-text section-text-italic">{{ displayText(cardData.awareness) }}</text>
            </view>
          </view>

          <!-- 区块 8：下一步行动 -->
          <view v-if="cardData.action" class="section section-action">
            <view class="section-label">
              <text class="section-icon">🎯</text>
              <text class="section-label-text">下一步行动</text>
            </view>
            <view class="section-content">
              <text class="section-text">{{ displayText(cardData.action) }}</text>
            </view>
          </view>
        </view>

        <!-- 完整对话 -->
        <view v-if="conversationMessages.length" class="conv-section">
          <view class="conv-toggle" @tap="toggleConversation">
            <text class="conv-toggle-text">{{ showConversation ? '收起完整对话' : '查看完整对话' }}</text>
            <text class="conv-toggle-arrow" :class="{ 'conv-toggle-arrow--open': showConversation }">›</text>
          </view>
          <view v-if="showConversation" class="conv-body">
            <view
              v-for="msg in conversationMessages"
              :key="msg.id"
              class="conv-msg"
              :class="{ 'conv-msg--ai': msg.role === 'assistant', 'conv-msg--user': msg.role === 'user' }"
            >
              <text class="conv-role">{{ msg.role === 'assistant' ? 'AI' : '你' }}</text>
              <text class="conv-content">{{ msg.content }}</text>
            </view>
          </view>
        </view>

        <!-- 底部金句 -->
        <view class="quote-section">
          <view class="quote-line" />
          <text class="quote-text">
            当你看见一个信念时{ "\n" }你已经不完全被它控制
          </text>
        </view>

        <!-- 底部按钮组 -->
        <view class="button-group">
          <button
            v-if="cardStatus === 'in_progress'"
            class="btn-resume"
            @tap="continueSession"
          >
            继续对话
          </button>
          <button
            class="btn-primary"
            :disabled="isSaving"
            :loading="isSaving"
            @tap="handleSave"
          >
            保存记录
          </button>
          <button
            class="btn-secondary"
            :disabled="shareLoading"
            :loading="shareLoading"
            @tap="handleShareImage"
          >
            {{ shareLoading ? '生成中...' : '📤 生成图片分享' }}
          </button>
        </view>
      </view>
    </scroll-view>

    <!-- 隐藏画布（用于生成分享图片） -->
    <canvas
      id="shareCanvas"
      type="2d"
      style="width: 375px; height: 600px; position: fixed; left: -9999px; top: 0; pointer-events: none;"
    ></canvas>
  </view>
  <!--#endif-->
</template>

<style scoped>
/* =============================================================
   H5 — Editorial Card
   ============================================================= */
/*#ifdef H5*/
.h5-page {
  position: relative;
  min-height: 100vh;
  background: #FCF9F5;
  overflow: hidden;
}

.h5-grain {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.012'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}

.h5-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
.h5-orb--t { top: -160px; right: -100px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(196,154,108,0.06) 0%, transparent 70%); }
.h5-orb--b { bottom: -80px; left: -120px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(200,180,150,0.04) 0%, transparent 70%); }

.h5-nav {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
}

.h5-nav-btn { display: flex; align-items: center; gap: 4px; min-width: 80px; cursor: pointer; opacity: 0.7; transition: opacity 0.3s; }
.h5-nav-btn:active { opacity: 1; }
.h5-nav-back-icon { font-size: 18px; color: #1C1A17; }
.h5-nav-back-text { font-size: 14px; color: #8A7E72; }
.h5-nav-title { font-size: 15px; font-weight: 600; color: #1C1A17; text-align: center; }
.h5-nav-right { justify-content: flex-end; }
.h5-nav-save { font-size: 14px; color: #C49A6C; font-weight: 500; }
.h5-nav-disabled { opacity: 0.35; pointer-events: none; }

.h5-scroll {
  position: relative;
  z-index: 5;
  height: calc(100vh - 56px);
  overflow-y: auto;
}

/* ── Empty state ── */
.h5-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 40px 80px;
}
.h5-empty-icon { font-size: 52px; margin-bottom: 20px; }
.h5-loading-icon { width: 32px; height: 32px; border: 3px solid #E0D8CC; border-top-color: #8A7E72; border-radius: 50%; animation: h5-spin 0.8s linear infinite; margin-bottom: 16px; }
@keyframes h5-spin { to { transform: rotate(360deg); } }
.h5-empty-title { font-size: 18px; font-weight: 600; color: #1C1A17; margin-bottom: 12px; }
.h5-empty-desc { font-size: 14px; color: #8A7E72; line-height: 1.6; text-align: center; margin-bottom: 32px; }
.h5-empty-btn { background: linear-gradient(135deg, #C49A6C, #B8885A); padding: 14px 40px; border-radius: 30px; box-shadow: 0 4px 20px rgba(196,154,108,0.25); cursor: pointer; }
.h5-empty-btn:active { transform: scale(0.97); }
.h5-empty-btn-text { color: #fff; font-size: 15px; font-weight: 500; }

/* ── Card ── */
.h5-content {
  max-width: 560px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}

/* Double-bezel card */
.h5-card-outer {
  padding: 2px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(196,154,108,0.06), rgba(200,180,150,0.1));
}

.h5-card-inner {
  background: #fff;
  border-radius: 22px;
  overflow: hidden;
}

.h5-card-accent { height: 4px; background: linear-gradient(90deg, #C49A6C, #D4B48C, #C49A6C); }

.h5-card-header { display: flex; flex-direction: column; align-items: center; padding: 32px 32px 24px; gap: 6px; }
.h5-card-title { font-size: 20px; font-weight: 700; color: #1C1A17; letter-spacing: 2px; }
.h5-card-date { font-size: 12px; color: #B8AFA4; letter-spacing: 1px; }

/* ── Sections ── */
.h5-section { margin: 0 20px 16px; padding: 18px 22px; border-radius: 12px; }
.h5-section-label { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.h5-section-icon { font-size: 16px; }
.h5-section-label-text { font-size: 13px; font-weight: 600; color: #1C1A17; }
.h5-section-content { padding-left: 0; }
.h5-section-text { font-size: 15px; color: #1C1A17; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.h5-section-text--italic { font-style: italic; color: #5A4E42; }

.h5-section { background: #F5F3F0; }
.h5-section--emotion { background: rgba(240, 230, 225, 0.6); }
.h5-section--thought { background: rgba(225, 235, 235, 0.5); }
.h5-section--belief { background: rgba(196, 154, 108, 0.06); border-left: 3px solid #C49A6C; border-radius: 0 12px 12px 0; }
.h5-section--loosen { background: rgba(230, 220, 200, 0.4); }
.h5-section--release { background: rgba(220, 230, 240, 0.4); }
.h5-section--awareness { background: #F5F3F0; }
.h5-section--action { background: rgba(245, 243, 240, 0.5); border: 1px solid #E8DDD0; }

/* ── Conversation toggle ── */
.h5-conversation { margin: 0 4px 8px; }
.h5-conv-toggle { display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; padding: 12px 0; opacity: 0.6; transition: opacity 0.2s; }
.h5-conv-toggle:active { opacity: 1; }
.h5-conv-toggle-text { font-size: 13px; color: #8A7E72; }
.h5-conv-toggle-arrow { font-size: 16px; color: #C49A6C; transition: transform 0.2s ease; }
.h5-conv-toggle-arrow--open { transform: rotate(90deg); }
.h5-conv-body { border-top: 1px solid #F0ECE6; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; max-height: 400px; overflow-y: auto; }
.h5-conv-msg { display: flex; gap: 10px; }
.h5-conv-msg--user { flex-direction: row-reverse; }
.h5-conv-role { font-size: 11px; font-weight: 600; color: #B8AFA4; flex-shrink: 0; margin-top: 2px; min-width: 20px; text-align: center; }
.h5-conv-content { font-size: 14px; color: #1C1A17; line-height: 1.6; background: #F8F5F0; border-radius: 8px; padding: 10px 14px; max-width: 80%; white-space: pre-wrap; word-break: break-word; }
.h5-conv-msg--user .h5-conv-content { background: linear-gradient(135deg, #C49A6C, #B8885A); color: #fff; }

/* ── Quote ── */
.h5-quote { display: flex; flex-direction: column; align-items: center; margin-top: 40px; margin-bottom: 32px; }
.h5-quote-line { width: 32px; height: 1px; background: #D4C8B8; margin-bottom: 16px; }
.h5-quote-text { font-size: 14px; color: #8A7E72; line-height: 1.8; text-align: center; font-style: italic; letter-spacing: 1px; white-space: pre-line; }

/* ── Actions ── */
.h5-actions { padding: 0 4px 20px; }

.h5-btn-primary-outer {
  padding: 2px;
  border-radius: 28px;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
}

.h5-btn-primary-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  border-radius: 26px;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.h5-btn-primary-inner:active { transform: scale(0.97); }
.h5-btn-primary-text { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 3px; }

.h5-btn-share {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border: 1px solid #E0D8CC;
  border-radius: 24px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  margin-top: 12px;
}
.h5-btn-share:active { transform: scale(0.97); }
.h5-btn-share--loading { opacity: 0.6; pointer-events: none; }
.h5-btn-share-text { font-size: 15px; color: #8A7E72; font-weight: 500; letter-spacing: 1px; }

.h5-btn-resume {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border: 1px solid #C49A6C;
  border-radius: 24px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  margin-bottom: 12px;
}
.h5-btn-resume:active { transform: scale(0.97); }
.h5-btn-resume-text { font-size: 15px; color: #C49A6C; font-weight: 600; letter-spacing: 1px; }

/* ── Mobile responsive ── */
@media (max-width: 480px) {
  .h5-content {
    padding: 16px 16px 40px;
  }
  .h5-card-header {
    padding: 24px 24px 20px;
  }
  .h5-card-title {
    font-size: 18px;
  }
  .h5-section {
    margin: 0 14px 12px;
    padding: 14px 16px;
  }
  .h5-section-text {
    font-size: 14px;
  }
  .h5-empty {
    padding: 80px 24px 60px;
  }
  .h5-empty-title {
    font-size: 16px;
  }
  .h5-empty-desc {
    font-size: 13px;
  }
  .h5-btn-primary-inner {
    height: 48px;
  }
  .h5-btn-primary-text {
    font-size: 15px;
  }
}
/*#endif*/

/* =============================================================
   MP-WEIXIN — original styles (unchanged)
   ============================================================= */
/*#ifdef MP-WEIXIN*/
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #F3F0EA;
}

/* =============================================================
   自定义导航栏
   ============================================================= */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #F3F0EA;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 30rpx;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-width: 120rpx;
  padding: 10rpx 0;
}

.nav-back-icon {
  font-size: 36rpx;
  color: #1C1A17;
  line-height: 1;
}

.nav-back-text {
  font-size: 28rpx;
  color: #8A7E72;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #1C1A17;
}

.nav-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 120rpx;
  padding: 10rpx 0;
}

.nav-save-text {
  font-size: 28rpx;
  color: #C49A6C;
  font-weight: 500;
}

.nav-right-disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* =============================================================
   可滚动区域
   ============================================================= */
.scroll-area {
  flex: 1;
  padding: 0 30rpx 60rpx;
  box-sizing: border-box;
}

/* =============================================================
   空状态
   ============================================================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx 100rpx;
}

.loading-icon { width: 48rpx; height: 48rpx; border: 4rpx solid #E0D8CC; border-top-color: #8A7E72; border-radius: 50%; animation: mp-spin 0.8s linear infinite; margin-bottom: 20rpx; }
@keyframes mp-spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: #8A7E72; }
.empty-icon {
  font-size: 96rpx;
  margin-bottom: 32rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1C1A17;
  margin-bottom: 20rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #8A7E72;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 48rpx;
}

.empty-btn {
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  padding: 24rpx 60rpx;
  border-radius: 48rpx;
  box-shadow: 0 6rpx 24rpx rgba(196, 154, 108, 0.35);
}

.empty-btn-text {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* =============================================================
   卡片容器
   ============================================================= */
.content-wrapper {
  padding-top: 20rpx;
  padding-bottom: 40rpx;
}

.card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow:
    0 4rpx 20rpx rgba(28, 26, 23, 0.06),
    0 1rpx 4rpx rgba(28, 26, 23, 0.04);
}

/* 顶部金色装饰线 */
.card-accent {
  height: 6rpx;
  background: linear-gradient(90deg, #C49A6C, #D4B48C, #C49A6C);
}

/* 卡片头部 */
.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36rpx 36rpx 28rpx;
  gap: 8rpx;
}

.card-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1C1A17;
  letter-spacing: 2rpx;
}

.card-date {
  font-size: 24rpx;
  color: #B8AFA4;
  letter-spacing: 1rpx;
}

/* =============================================================
   内容区块 - 通用
   ============================================================= */
.section {
  margin: 0 28rpx 20rpx;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.section-icon {
  font-size: 28rpx;
}

.section-label-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #1C1A17;
}

.section-content {
  padding-left: 0;
}

.section-text {
  font-size: 28rpx;
  color: #1C1A17;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/* =============================================================
   区块 1：触发事件 - 暖灰背景
   ============================================================= */
.section-event {
  background-color: #F5F3F0;
}

/* =============================================================
   区块 2：情绪 - 柔和粉灰背景
   ============================================================= */
.section-emotion {
  background-color: rgba(240, 230, 225, 0.6);
}

/* =============================================================
   区块 3：自动想法 - 浅青灰背景
   ============================================================= */
.section-thought {
  background-color: rgba(225, 235, 235, 0.5);
}

/* =============================================================
   区块 4：出现的信念 - 暖金色左边框高亮
   ============================================================= */
.section-belief {
  background-color: rgba(196, 154, 108, 0.06);
  border-left: 4rpx solid #C49A6C;
  border-radius: 0 16rpx 16rpx 0;
}

/* =============================================================
   区块 5：松动 - 浅暖黄背景
   ============================================================= */
.section-loosen {
  background-color: rgba(230, 220, 200, 0.4);
}

/* =============================================================
   区块 6：释放 - 浅蓝灰背景
   ============================================================= */
.section-release {
  background-color: rgba(220, 230, 240, 0.4);
}

/* =============================================================
   区块 3：新的看见 - 暖灰背景，斜体
   ============================================================= */
.section-awareness {
  background-color: #F5F3F0;
}

.section-text-italic {
  font-style: italic;
  color: #5A4E42;
}

/* =============================================================
   区块 4：下一步行动 - 暖灰边框背景
   ============================================================= */
.section-action {
  background-color: rgba(245, 243, 240, 0.5);
  border: 2rpx solid #E8DDD0;
}

/* =============================================================
   完整对话
   ============================================================= */
.conv-section { margin: 0 10rpx 8rpx; }
.conv-toggle { display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 20rpx 0; opacity: 0.6; }
.conv-toggle-text { font-size: 26rpx; color: #8A7E72; }
.conv-toggle-arrow { font-size: 32rpx; color: #C49A6C; transition: transform 0.2s ease; }
.conv-toggle-arrow--open { transform: rotate(90deg); }
.conv-body { border-top: 2rpx solid #F0ECE6; padding: 24rpx 28rpx; display: flex; flex-direction: column; gap: 20rpx; max-height: 600rpx; overflow-y: auto; }
.conv-msg { display: flex; gap: 14rpx; }
.conv-msg--user { flex-direction: row-reverse; }
.conv-role { font-size: 22rpx; font-weight: 600; color: #B8AFA4; flex-shrink: 0; margin-top: 4rpx; min-width: 40rpx; text-align: center; }
.conv-content { font-size: 28rpx; color: #1C1A17; line-height: 1.6; background: #F5F3F0; border-radius: 12rpx; padding: 18rpx 24rpx; max-width: 80%; white-space: pre-wrap; word-break: break-word; }
.conv-msg--user .conv-content { background: linear-gradient(135deg, #C49A6C, #B8885A); color: #fff; }

/* =============================================================
   底部金句
   ============================================================= */
.quote-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 48rpx;
  margin-bottom: 40rpx;
  padding: 0 40rpx;
}

.quote-line {
  width: 60rpx;
  height: 2rpx;
  background-color: #D4C8B8;
  margin-bottom: 24rpx;
}

.quote-text {
  font-size: 26rpx;
  color: #8A7E72;
  line-height: 1.8;
  text-align: center;
  font-style: italic;
  letter-spacing: 2rpx;
  white-space: pre-line;
}

/* =============================================================
   按钮组
   ============================================================= */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 0 10rpx 40rpx;
}

.btn-resume {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  background-color: transparent;
  border: 2rpx solid #C49A6C;
  border-radius: 32rpx;
  color: #C49A6C;
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 3rpx;
  line-height: 96rpx;
  padding: 0;
  margin: 0;
}
.btn-resume::after { border: none; }

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 108rpx;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  border: none;
  border-radius: 32rpx;
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  box-shadow: 0 8rpx 32rpx rgba(196, 154, 108, 0.35);
  /* 覆盖 uni-app button 默认样式 */
  line-height: 108rpx;
  padding: 0;
  margin: 0;
}

.btn-primary::after {
  border: none;
}

.btn-primary[disabled] {
  opacity: 0.6;
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  background-color: rgba(196, 154, 108, 0.08);
  border: 2rpx solid rgba(196, 154, 108, 0.25);
  border-radius: 32rpx;
  color: #8A7E72;
  font-size: 28rpx;
  font-weight: 500;
  letter-spacing: 2rpx;
  /* 覆盖 uni-app button 默认样式 */
  line-height: 96rpx;
  padding: 0;
  margin: 0;
}

.btn-secondary::after {
  border: none;
}
/*#endif*/
</style>
