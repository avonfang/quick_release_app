// 通过服务器代理调用 DeepSeek（API key 不暴露给客户端）
import { getMergedRecords } from './cloud'

interface Card {
  _id: string
  createdAt: number
  event?: string
  emotion?: string
  thought?: string
  belief?: string
  loosen?: string
  release?: string
  awareness?: string
  action?: string
}

export interface InsightResult {
  /** 思维类型标签 */
  mindType: string
  /** 一句洞察总结 */
  insight: string
  /** 模式分析详细 */
  patterns: Array<{ label: string; detail: string }>
  /** 核心发现（最传播力的一句话） */
  coreFinding: string
  /** 原始分析文本 */
  raw: string
}

const MIND_TYPES = [
  '过度责任型', '评价敏感型', '未来担忧型', '关系共情型',
  '完美倾向型', '自我批评型', '控制需求型', '回避冲突型',
]

const INSIGHT_PROMPT = `你是一位有20年经验的心理咨询师。请分析用户的情绪觉察记录，输出以下 JSON 格式的分析结果：

{
  "mindType": "从[过度责任型, 评价敏感型, 未来担忧型, 关系共情型, 完美倾向型, 自我批评型, 控制需求型, 回避冲突型]中选择最匹配的一个",
  "coreFinding": "一句非常精准的洞察句，要让用户觉得'被看穿了'。要求简短、有力、有共鸣。例如：'你对别人很宽容，但对自己非常严格。'",
  "patterns": [
    {"label": "模式一（4字以内）", "detail": "具体分析（20-30字）"},
    {"label": "模式二（4字以内）", "detail": "具体分析（20-30字）"},
    {"label": "模式三（4字以内）", "detail": "具体分析（20-30字）"}
  ],
  "insight": "一段有温度的总结（30-50字），让用户感受到被理解"
}

要求：
1. mindType 必须从列表中选择一个最贴切的
2. coreFinding 要像一句心理咨询师说的洞察——简短、精准、有冲击力
3. patterns 分析要基于记录中的真实内容，不要编造
4. insight 要用温暖、有共鸣的语气
5. 只输出 JSON，不要有其他内容`

/**
 * 从 localStorage + 服务端合并读取所有卡片
 */
async function getCards(): Promise<Card[]> {
  try {
    const merged = await getMergedRecords()
    return merged as Card[]
  } catch {
    try {
      const raw = uni.getStorageSync('cards') || '[]'
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
}

/**
 * 生成洞察报告
 */
export async function generateInsight(): Promise<InsightResult | null> {
  const cards = await getCards()
  if (cards.length < 3) return null

  const API_BASE = typeof window !== 'undefined' ? '/api' : 'https://sumeru.online/api'

  // 把卡片摘要发给 DeepSeek（通过服务端代理）
  const summary = cards.slice(0, 50).map((c, i) =>
    `[记录${i + 1}] 事件：${c.event || '无'}\n情绪：${c.emotion || '无'}\n想法：${c.thought || '无'}\n信念：${c.belief || '无'}\n觉察：${c.awareness || '无'}\n行动：${c.action || '无'}`
  ).join('\n\n')

  try {
    const res = await uni.request({
      url: API_BASE + '/chat',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        messages: [
          { role: 'system', content: INSIGHT_PROMPT },
          { role: 'user', content: `以下是用户的${cards.length}次情绪觉察记录，请分析：\n\n${summary}` },
        ],
        temperature: 0.6,
        max_tokens: 2048,
      },
      timeout: 60000,
    })

    if (res.statusCode !== 200) throw new Error('API error')

    const data = res.data as any
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty reply')

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')

    const parsed = JSON.parse(jsonMatch[0])
    return {
      mindType: parsed.mindType || '未分类',
      insight: parsed.insight || '',
      patterns: parsed.patterns || [],
      coreFinding: parsed.coreFinding || '',
      raw: content,
    }
  } catch (e) {
    console.warn('DeepSeek insight failed, using local fallback', e)
    return generateLocalInsight(cards)
  }
}

/**
 * 本地规则生成简化版洞察（无 API key 时兜底）
 */
function generateLocalInsight(cards: Card[]): InsightResult | null {
  if (cards.length < 3) return null

  // 统计信念关键词
  const beliefCounts = new Map<string, number>()
  cards.forEach(c => {
    if (c.belief) {
      const words = c.belief.split(/[，。！？\s,.;!?]/).filter(w => w.length >= 2)
      words.forEach(w => {
        beliefCounts.set(w, (beliefCounts.get(w) || 0) + 1)
      })
    }
  })

  const sorted = [...beliefCounts.entries()].sort((a, b) => b[1] - a[1])
  const topBelief = sorted[0]?.[0] || ''

  // 简单判断思维类型
  const allText = cards.map(c =>
    [c.event, c.emotion, c.thought, c.belief, c.awareness, c.action].filter(Boolean).join('')
  ).join('')

  let mindType = '评价敏感型'
  if (/责任|应该|必须|扛/.test(allText)) mindType = '过度责任型'
  else if (/焦虑|担心|害怕|万一|坏结果/.test(allText)) mindType = '未来担忧型'
  else if (/别人|他们|他\/她|朋友|家人/.test(allText)) mindType = '关系共情型'
  else if (/完美|不够好|差|失败/.test(allText)) mindType = '完美倾向型'
  else if (/控制|计划|安排|必须/.test(allText)) mindType = '控制需求型'
  else if (/回避|不想|算了|忍/.test(allText)) mindType = '回避冲突型'

  const coreFinding = topBelief
    ? `你的记录反复出现"${topBelief}"这个想法，它在影响你看待自己的方式。`
    : '你的压力大多来自内心对自己的要求，而不是外界的压力。'

  return {
    mindType,
    coreFinding,
    insight: `记录${cards.length}次后，可以看到你习惯性地对自己有较高要求。觉察本身就是改变的开始。`,
    patterns: [
      { label: '核心信念', detail: topBelief || '需要更多记录才能识别' },
      { label: '记录数', detail: `${cards.length}次觉察` },
    ],
    raw: '',
  }
}
