/**
 * 快速记录 — 日常轻量情绪记录（4步引导流）
 */
export interface QuickRecord {
  id: string
  /** 情绪值 */
  emotion: string
  /** 情绪强度 1-10 */
  intensity: number
  /** 今天发生了什么 */
  event: string
  /** 我注意到我在想 */
  thought: string
  /** 更像事实还是担心 */
  isFactOrWorry: 'fact' | 'worry' | ''
  /** 记录时间戳 */
  timestamp: number
  /** AI 回应全文 */
  aiResponse: string
}

import { saveCard, getToken } from './cloud'

const STORAGE_KEY = 'quickRecords'

/** 获取所有快速记录 */
export function getQuickRecords(): QuickRecord[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY) || '[]'
    return JSON.parse(raw)
  } catch { return [] }
}

/** 保存一条快速记录 */
export function saveQuickRecord(r: QuickRecord) {
  try {
    const list = getQuickRecords()
    list.unshift(r)
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(list))
    // 更新"最近记录日期"用于提醒判断
    uni.setStorageSync('lastRecordDate', new Date().toDateString())
  } catch {}

  // 如果已登录，同步到服务端（作为一条轻量卡片）
  if (getToken()) {
    let userId = 'anonymous'
    try { userId = uni.getStorageSync('userId') || 'anonymous' } catch {}
    saveCard({
      sessionId: 'quick_' + r.id,
      userId,
      event: r.event || undefined,
      emotion: `${r.emotion}（${r.intensity}/10）`,
      thought: r.thought || undefined,
    }).catch(e => console.warn('Quick record sync failed:', e))
  }
}

/** 今天是否已经记录过 */
export function hasRecordToday(): boolean {
  try {
    const last = uni.getStorageSync('lastRecordDate')
    return last === new Date().toDateString()
  } catch { return false }
}

// ─── 情绪选项 ──────────────────────────────────────────────────
export interface EmotionOption {
  emoji: string
  label: string
  value: string
}

export const QUICK_EMOTIONS: EmotionOption[] = [
  { emoji: '😊', label: '开心', value: '开心' },
  { emoji: '😌', label: '平静', value: '平静' },
  { emoji: '😰', label: '焦虑', value: '焦虑' },
  { emoji: '😤', label: '烦躁', value: '烦躁' },
  { emoji: '😔', label: '疲惫', value: '疲惫' },
  { emoji: '😢', label: '难过', value: '难过' },
]

// ─── AI 快速回应 ────────────────────────────────────────────────
const QUICK_PROMPT = `你是一位温暖、敏锐的陪伴者。用户刚完成一次情绪觉察记录。

你需要回复三部分（用空行分隔）：

第一部分 — 共情回应
用一句话回应用户的情绪，让对方感到被理解。

第二部分 — 自动想法识别
根据用户描述的场景和想法，指出一个可能的自动想法。用"也许你心里有这样一个声音："开头。

第三部分 — 温和问题
提一个温和的探索问题，帮助用户更深入地看见自己。

示例回复：
那一刻被问住确实让人紧张，尤其在完全没有准备的时候。

也许你心里有这样一个声音："如果回答不上来，大家会觉得我不够好。"

这个声音出现的时候，你身体哪个部位感受最明显？

要求：
- 语气自然，像朋友一样
- 不要评价或说教
- 不要用"我理解你"这种套话
- 只输出回复文本，不要任何前缀`

const API_BASE = typeof window !== 'undefined' ? '/api' : 'https://sumeru.online/api'

export async function quickAIResponse(
  event: string,
  emotion: string,
  thought: string,
  isFactOrWorry: string,
): Promise<string> {
  const userContent = [
    `情绪：${emotion}`,
    `事件：${event}`,
    `想法：${thought}`,
    isFactOrWorry ? `这个想法更像：${isFactOrWorry === 'fact' ? '事实' : '一种担心'}` : '',
  ].filter(Boolean).join('\n')

  try {
    const res = await uni.request({
      url: API_BASE + '/chat',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        messages: [
          { role: 'system', content: QUICK_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 512,
      },
      timeout: 60000,
    })

    if (res.statusCode !== 200) throw new Error('API error')

    const data = res.data as any
    const reply = data?.choices?.[0]?.message?.content
    if (!reply) throw new Error('Empty reply')

    return reply.trim()
  } catch {
    return getFallbackResponse(emotion, event, thought)
  }
}

function getFallbackResponse(emotion: string, event: string, thought: string): string {
  const empathy: Record<string, string> = {
    '开心': '那种开心是很真实的。',
    '平静': '平静的时刻值得被记住。',
    '焦虑': '焦虑在告诉你这件事你在乎。',
    '烦躁': '烦躁有时候是一种信号。',
    '疲惫': '今天辛苦了。',
    '难过': '难过也可以，不必一直坚强。',
  }
  const e = empathy[emotion] || '谢谢你的记录。'
  const thoughtLine = thought ? `\n\n也许你心里有这样一个声音："${thought}"` : ''
  return `${e}${thoughtLine}\n\n这个声音如果会说话，它会告诉你什么？`
}

// ─── 模式摘要工具 ──────────────────────────────────────────────
export interface PatternSummary {
  topEmotion: { label: string; count: number }
  emotionDistribution: Array<{ label: string; count: number; pct: number }>
  commonThoughts: string[]
  recordCount: number
  periodDays: number
  factCount: number
  worryCount: number
  avgIntensity: number
}

/** 从最近的快速记录生成模式摘要 */
export function getPatternSummary(days = 14): PatternSummary {
  const records = getQuickRecords()
  if (records.length === 0) {
    return { topEmotion: { label: '', count: 0 }, emotionDistribution: [], commonThoughts: [], recordCount: 0, periodDays: days, factCount: 0, worryCount: 0, avgIntensity: 0 }
  }

  const cutoff = Date.now() - days * 86400000
  const recent = records.filter(r => r.timestamp >= cutoff)

  // 情绪分布
  const emotionCount = new Map<string, number>()
  recent.forEach(r => {
    emotionCount.set(r.emotion, (emotionCount.get(r.emotion) || 0) + 1)
  })
  const total = recent.length
  const distribution = Array.from(emotionCount.entries())
    .map(([value, count]) => ({
      label: QUICK_EMOTIONS.find(e => e.value === value)?.label || value,
      count,
      pct: Math.round(count / total * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // 常见想法（有内容的想法，去重，取前 3）
  const thoughtSet = new Set<string>()
  recent.forEach(r => {
    if (r.thought && r.thought.length > 2) thoughtSet.add(r.thought)
  })
  const commonThoughts = Array.from(thoughtSet).slice(0, 3)

  // Fact/worry ratio
  let factCount = 0
  let worryCount = 0
  recent.forEach(r => {
    if (r.isFactOrWorry === 'fact') factCount++
    else if (r.isFactOrWorry === 'worry') worryCount++
  })

  // Average intensity
  const avgIntensity = total > 0
    ? Math.round(recent.reduce((s, r) => s + r.intensity, 0) / total * 10) / 10
    : 0

  return {
    topEmotion: distribution[0] || { label: '', count: 0 },
    emotionDistribution: distribution,
    commonThoughts,
    recordCount: recent.length,
    periodDays: days,
    factCount,
    worryCount,
    avgIntensity,
  }
}

/** 按周分组统计强度趋势 */
export interface IntensityTrend {
  weeks: Array<{
    label: string
    avgIntensity: number
    count: number
    topEmotion: string
  }>
}

export function getIntensityTrend(weeks = 4): IntensityTrend {
  const records = getQuickRecords()
  const now = Date.now()
  const weekData: Array<{ sum: number; count: number; emotions: Record<string, number> }> = []

  for (let w = 0; w < weeks; w++) {
    const weekStart = now - (w + 1) * 7 * 86400000
    const weekEnd = now - w * 7 * 86400000
    const weekRecords = records.filter(r => r.timestamp >= weekStart && r.timestamp < weekEnd)

    let sum = 0
    const emotions: Record<string, number> = {}
    weekRecords.forEach(r => {
      sum += r.intensity
      emotions[r.emotion] = (emotions[r.emotion] || 0) + 1
    })

    let topEmotion = ''
    let topCount = 0
    Object.entries(emotions).forEach(([k, v]) => {
      if (v > topCount) { topCount = v; topEmotion = k }
    })

    const d = new Date(weekEnd - 86400000)
    weekData.push({
      sum,
      count: weekRecords.length,
      emotions,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      topEmotion,
    })
  }

  return {
    weeks: weekData.reverse().map(w => ({
      label: w.label,
      avgIntensity: w.count > 0 ? Math.round(w.sum / w.count * 10) / 10 : 0,
      count: w.count,
      topEmotion: w.topEmotion,
    })),
  }
}

/** 获取事实/担心比率趋势 */
export function getFactWorryRatio(days = 30): { factPct: number; worryPct: number; total: number } {
  const records = getQuickRecords()
  const cutoff = Date.now() - days * 86400000
  const recent = records.filter(r => r.timestamp >= cutoff && r.isFactOrWorry)

  const total = recent.length
  if (total === 0) return { factPct: 0, worryPct: 0, total: 0 }

  const factCount = recent.filter(r => r.isFactOrWorry === 'fact').length
  return {
    factPct: Math.round(factCount / total * 100),
    worryPct: Math.round((total - factCount) / total * 100),
    total,
  }
}
