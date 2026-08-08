import { SYSTEM_PROMPT, BELIEF_EXTRACTION_PROMPT } from '@/utils/prompt'

/**
 * DeepSeek API 配置 — 通过服务器代理调用（API key 在服务端，不暴露给客户端）
 */
const DEEPSEEK_CONFIG = {
  MODEL: 'deepseek-v4-flash',
  TIMEOUT: 60000,
}

/**
 * 创建新的对话 session（本地模式，无需云函数）
 */
export async function createSession(userId: string): Promise<string> {
  const sessionId = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
  return sessionId
}

/**
 * 通过 DeepSeek API 获取 AI 回复
 * 若未配置 API key，会抛出错误（由调用方 catch 并降级为本地回复）
 */
export function chatWithAI(
  stage: string,
  userInput: string,
  history: Array<{ role: string; content: string }>
): { promise: Promise<string>; abort: () => void } {
  const { MODEL, TIMEOUT } = DEEPSEEK_CONFIG

  // stage label for system prompt prefix
  const stageLabels: Record<string, string> = {
    event: '事件',
    emotion: '情绪',
    thought: '自动想法',
    belief: '信念',
    loosen: '松动',
    release: '释放',
    awareness: '觉察',
    action: '行动',
  }
  const stageLabel = stageLabels[stage] || stage

  // 各阶段过渡语（仅在当前阶段可见，避免 AI 提前生成后续阶段内容）
  const TRANSITION_INSTRUCTIONS: Record<string, string> = {
    event: '推进到情绪阶段时，过渡语必须包含："对于这件事，你当下的感受是什么？"',
    emotion: '推进到自动想法阶段时，过渡语必须包含："这种[情绪]的感觉出现时，你脑子里在对自己说什么？"',
    thought: '推进到信念阶段时，过渡语必须包含："这个想法背后，好像有一个你一直相信的信念？"',
    belief: '推进到松动阶段时，过渡语必须包含："当你看到这个信念的时候，你心里是什么感觉？"',
    loosen: '推进到释放阶段时，过渡语必须包含："现在感受一下这个信念在你身体里的感觉，它在哪个位置？"',
    release: '推进到觉察阶段时，过渡语必须包含："放下它之后，现在再看那件事，有什么不一样吗？"',
    awareness: '推进到行动阶段时，过渡语必须包含："在这个新的视角下，你觉得下一步最小的行动是什么？"',
  }

  // 信念阶段加入专门的信念提取指令
  let systemContent = `[当前阶段：${stageLabel}]\n${SYSTEM_PROMPT}`
  const transition = TRANSITION_INSTRUCTIONS[stage]
  if (transition) {
    systemContent += `\n\n== 阶段推进指令 ==\n${transition}`
  }
  if (stage === 'belief') {
    systemContent += `\n\n${BELIEF_EXTRACTION_PROMPT}`
  }

  // Avoid duplicating userInput if it's already the last entry in history
  const lastHistoryMsg = history[history.length - 1]
  const alreadyInHistory = lastHistoryMsg && lastHistoryMsg.role === 'user' && lastHistoryMsg.content === userInput

  const apiMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemContent },
    ...history,
    ...(alreadyInHistory ? [] : [{ role: 'user', content: userInput }]),
  ]

  let requestTask: any = null

  const promise = new Promise<string>((resolve, reject) => {
    requestTask = uni.request({
      url: API_BASE + '/chat',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        model: MODEL,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1024,
      },
      timeout: TIMEOUT,
      sslVerify: true,
      success: (res: any) => {
        if (res.statusCode !== 200) {
          reject(new Error(`DeepSeek API error: ${res.statusCode}`))
          return
        }
        const data = res.data as any
        const reply = data?.choices?.[0]?.message?.content
        if (!reply) {
          reject(new Error('DeepSeek returned empty reply'))
          return
        }
        resolve(reply)
      },
      fail: (err: any) => {
        if (err.errMsg === 'request:fail abort') {
          const e = new Error('Aborted') as any; e.name = 'AbortError'; reject(e)
        } else {
          reject(new Error(err.errMsg || 'Request failed'))
        }
      },
    })
  })

  return {
    promise,
    abort: () => {
      if (requestTask) requestTask.abort()
    },
  }
}

/**
 * 保存卡片到本地存储（支持更新已有记录）
 * @param status 'in_progress' | 'completed'，默认 'completed'
 */
export async function saveCard(data: {
  sessionId: string
  userId: string
  event?: string
  emotion?: string
  thought?: string
  belief?: string
  loosen?: string
  release?: string
  awareness?: string
  action?: string
  /** 完整对话消息记录 */
  messages?: Array<{ id: number; role: string; content: string; stage: string; timestamp: string }>
  /** 记录状态 */
  status?: string
}): Promise<boolean> {
  try {
    const now = Date.now()
    const recordStatus = data.status || 'completed'
    const isCompleted = recordStatus === 'completed'

    const raw = uni.getStorageSync('cards') || '[]'
    const cards: any[] = JSON.parse(raw)

    // 检查是否已存在同一 session 的记录 → 更新
    const existingIndex = cards.findIndex((c: any) => c.sessionId === data.sessionId)
    let savedCard: any

    if (existingIndex >= 0) {
      const existing = cards[existingIndex]
      savedCard = {
        ...existing,
        ...data,
        _id: existing._id,
        createdAt: existing.createdAt,
        completedAt: isCompleted ? now : (existing.completedAt || undefined),
        status: recordStatus,
        updatedAt: now,
      }
      // 替换并移到最前
      cards.splice(existingIndex, 1)
      cards.unshift(savedCard)
    } else {
      savedCard = {
        ...data,
        _id: 'card_' + now + '_' + Math.random().toString(36).substring(2, 8),
        createdAt: now,
        completedAt: isCompleted ? now : undefined,
        status: recordStatus,
      }
      cards.unshift(savedCard)
    }

    uni.setStorageSync('cards', JSON.stringify(cards))

    // 如果已登录，异步同步到服务端
    if (getToken()) {
      uploadRecords([savedCard]).then(() => {
        markCardsSynced([savedCard._id])
      }).catch(e => console.warn('Server save failed:', e))
    }

    return true
  } catch (err) {
    throw new Error('保存到本地存储失败')
  }
}

/**
 * 删除一张卡片（本地 + 服务端）
 */
export async function deleteCard(cardId: string): Promise<boolean> {
  let localDeleted = false
  // 从本地删除
  try {
    const raw = uni.getStorageSync('cards') || '[]'
    const cards = JSON.parse(raw)
    const filtered = cards.filter((c: any) => c._id !== cardId)
    if (filtered.length !== cards.length) {
      uni.setStorageSync('cards', JSON.stringify(filtered))
      localDeleted = true
    }
  } catch { /* skip */ }

  // 从服务端删除
  let serverDeleted = false
  const token = getToken()
  if (token) {
    try {
      const res = await uni.request({
        url: API_BASE + '/records/' + encodeURIComponent(cardId),
        method: 'DELETE',
        header: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      })
      serverDeleted = res.statusCode === 200
    } catch { /* skip */ }
  }

  return localDeleted || serverDeleted
}

// ─── Server sync ──────────────────────────────────────────────────

const API_BASE = typeof window !== 'undefined' ? '/api' : 'https://sumeru.online/api'

export function getToken(): string | null {
  try { return uni.getStorageSync('token') || null } catch { return null }
}

/** 已登录且有 token */
export function isLoggedIn(): boolean {
  return !!getToken()
}

/** 将本地卡片上传到服务端 */
export async function uploadRecords(records: any[]): Promise<number> {
  const token = getToken()
  if (!token) throw new Error('未登录')
  const res = await uni.request({
    url: API_BASE + '/records/sync',
    method: 'POST',
    header: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    data: { records },
    timeout: 30000,
  })
  if (res.statusCode !== 200) {
    const data = res.data as any
    throw new Error(data?.error || '同步失败')
  }
  return (res.data as any).synced || 0
}

/** 从服务端获取用户的所有记录 */
export async function fetchServerRecords(): Promise<any[]> {
  const token = getToken()
  if (!token) return []
  const res = await uni.request({
    url: API_BASE + '/records',
    method: 'GET',
    header: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  })
  if (res.statusCode !== 200) return []
  return (res.data as any).data || []
}

/** 将本地指定 ID 的卡片标记为已同步 */
function markCardsSynced(ids: string[]) {
  try {
    const raw = uni.getStorageSync('cards') || '[]'
    const cards: any[] = JSON.parse(raw)
    let changed = false
    for (const card of cards) {
      if (ids.includes(card._id)) {
        card._synced = true
        changed = true
      }
    }
    if (changed) uni.setStorageSync('cards', JSON.stringify(cards))
  } catch { /* skip */ }
}

/** 将本地记录同步到服务端（仅同步未标记的卡片） */
export async function syncLocalToServer(): Promise<number> {
  const raw = uni.getStorageSync('cards') || '[]'
  const cards: any[] = JSON.parse(raw)
  const unsynced = cards.filter(c => !c._synced)
  if (unsynced.length === 0) return 0

  const count = await uploadRecords(unsynced)
  if (count > 0) {
    markCardsSynced(unsynced.map(c => c._id))
  }
  return count
}

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : 'https://sumeru.online/api'

function getAuthHeader() {
  const token = getToken()
  return token ? { Authorization: 'Bearer ' + token } : {}
}

/** 同步用户状态（金币、课程进度、签到）到服务端 */
export async function syncUserState(): Promise<boolean> {
  try {
    const state: Record<string, any> = {}
    // Coins
    const coins = uni.getStorageSync('awakeningCoins')
    if (coins != null) state.awakeningCoins = coins
    const ledger = uni.getStorageSync('coinLedger')
    if (ledger) state.coinLedger = ledger
    // Checkin
    const streakDays = uni.getStorageSync('streakDays')
    if (streakDays != null) state.streakDays = streakDays
    const lastCheckInDate = uni.getStorageSync('lastCheckInDate')
    if (lastCheckInDate) state.lastCheckInDate = lastCheckInDate
    // Course progress
    const progress: Record<string, any> = {}
    for (let i = 0; i < uni.getStorageInfoSync().keys.length; i++) {
      const key = uni.getStorageInfoSync().keys[i]
      if (key.startsWith('progress_') || key.startsWith('lesson_')) {
        progress[key] = uni.getStorageSync(key)
      }
    }
    state._progress = progress

    const res = await uni.request({
      url: API_BASE_URL + '/records/state',
      method: 'POST',
      header: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      data: { state },
    })
    return res.statusCode === 200
  } catch { return false }
}

/** 从服务端加载用户状态并合并到本地 */
export async function loadUserState(): Promise<boolean> {
  try {
    const res = await uni.request({
      url: API_BASE_URL + '/records/state',
      method: 'GET',
      header: getAuthHeader(),
    })
    if (res.statusCode !== 200) return false
    const state = (res.data as any).state
    if (!state || Object.keys(state).length === 0) return true
    // Merge: only set if local doesn't have higher value
    if (state.awakeningCoins != null) {
      const local = uni.getStorageSync('awakeningCoins') || 0
      if (state.awakeningCoins > local) {
        uni.setStorageSync('awakeningCoins', state.awakeningCoins)
      }
    }
    if (state.streakDays != null) {
      const local = uni.getStorageSync('streakDays') || 0
      if (state.streakDays > local) {
        uni.setStorageSync('streakDays', state.streakDays)
      }
    }
    if (state.lastCheckInDate) {
      const local = uni.getStorageSync('lastCheckInDate') || ''
      if (state.lastCheckInDate > local) {
        uni.setStorageSync('lastCheckInDate', state.lastCheckInDate)
      }
    }
    // Coin ledger: merge
    if (state.coinLedger) {
      const local = uni.getStorageSync('coinLedger') || '[]'
      const localArr = typeof local === 'string' ? JSON.parse(local) : local
      const merged = mergeCoinLedgers(localArr, state.coinLedger)
      uni.setStorageSync('coinLedger', JSON.stringify(merged))
    }
    // Course progress
    if (state._progress) {
      Object.entries(state._progress).forEach(([key, val]) => {
        if (!uni.getStorageSync(key)) {
          uni.setStorageSync(key, val)
        }
      })
    }
    return true
  } catch { return false }
}

function mergeCoinLedgers(local: any[], server: any[]): any[] {
  const seen = new Set<string>()
  const merged: any[] = []
  for (const entry of [...server, ...local]) {
    const key = `${entry.time || ''}_${entry.source || ''}_${entry.amount || ''}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(entry)
    }
  }
  merged.sort((a, b) => ((b.time || 0) - (a.time || 0)))
  return merged
}

/** 合并本地和服务端记录（去重，保留较新版本） */
export async function getMergedRecords(): Promise<any[]> {
  const raw = uni.getStorageSync('cards') || '[]'
  const local: any[] = JSON.parse(raw)
  const localMap = new Map<string, any>()
  local.forEach((c: any) => localMap.set(c._id, c))

  // 如果登录了，尝试拉取服务端记录
  const server = await fetchServerRecords()
  for (const r of server) {
    const existing = localMap.get(r._id)
    if (!existing || (r.createdAt || 0) > (existing.createdAt || 0)) {
      localMap.set(r._id, r)
    }
  }

  const merged = Array.from(localMap.values())
  merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return merged
}

/**
 * 从本地存储获取历史记录列表
 */
export async function getHistoryList(userId: string): Promise<{
  code: number
  data: Array<{
    _id: string
    sessionId: string
    createdAt: number
    event: string
    belief: string
    status: string
  }>
}> {
  try {
    const raw = uni.getStorageSync('cards') || '[]'
    const cards = JSON.parse(raw)
    cards.sort((a: any, b: any) => b.createdAt - a.createdAt)
    return {
      code: 0,
      data: cards.map((c: any) => ({
        _id: c._id,
        sessionId: c.sessionId,
        createdAt: c.createdAt,
        event: c.event || '',
        belief: c.belief || '',
        status: c.status || 'completed',
      })),
    }
  } catch (_err) {
    return { code: 0, data: [] }
  }
}

/**
 * 从本地存储统计信念频率和会话数
 */
export async function getStatistics(userId: string): Promise<{
  beliefs: Array<{ _id: string; userId: string; belief: string; count: number }>
  totalSessions: number
}> {
  try {
    const records = await getMergedRecords()

    const beliefCountMap = new Map<string, number>()
    records.forEach((c: any) => {
      if (c.belief) {
        beliefCountMap.set(c.belief, (beliefCountMap.get(c.belief) || 0) + 1)
      }
    })

    const beliefs = Array.from(beliefCountMap.entries()).map(([belief, count], i) => ({
      _id: 'belief_' + i,
      userId,
      belief,
      count,
    }))

    beliefs.sort((a, b) => b.count - a.count)

    return {
      beliefs,
      totalSessions: records.length,
    }
  } catch (_err) {
    return { beliefs: [], totalSessions: 0 }
  }
}
