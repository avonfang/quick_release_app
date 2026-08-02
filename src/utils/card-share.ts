/**
 * 卡片分享 — 共享常量与工具函数
 * H5（html2canvas）和 MP（Canvas 2D）共用同一套设计常量
 */

/** 卡片各区块配置 */
export const CARD_SECTIONS = [
  { key: 'event', icon: '📌', label: '触发事件', bg: '#F5F3F0' },
  { key: 'emotion', icon: '💧', label: '情绪感受', bg: 'rgba(240,230,225,0.6)' },
  { key: 'thought', icon: '💬', label: '自动想法', bg: 'rgba(225,235,235,0.5)' },
  { key: 'belief', icon: '💭', label: '核心信念', bg: 'rgba(196,154,108,0.06)' },
  { key: 'loosen', icon: '🎉', label: '松动信念', bg: 'rgba(230,220,200,0.4)' },
  { key: 'release', icon: '🕊', label: '释放练习', bg: 'rgba(220,230,240,0.4)' },
  { key: 'awareness', icon: '👁', label: '新的看见', bg: '#F5F3F0' },
  { key: 'action', icon: '🎯', label: '下一步行动', bg: 'rgba(245,243,240,0.5)' },
]

/** 品牌色 */
export const COLORS = {
  primary: '#C49A6C',
  primaryGradient: 'linear-gradient(135deg, #C49A6C, #B8885A)',
  bg: '#FCF9F5',
  cardBg: '#FFFFFF',
  textPrimary: '#1C1A17',
  textSecondary: '#8A7E72',
  textLight: '#B8AFA4',
  divider: '#E8DDD0',
}

/** 格式化卡片字段显示 */
export function displayText(val: unknown): string {
  return (typeof val === 'string' && val) ? val : ''
}

/** 取今天的日期字符串 */
export function todayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

/** 获取卡片中有数据的区块列表 */
export function getActiveSections(cardData: Record<string, any>): Array<{ key: string; icon: string; label: string; bg: string; text: string }> {
  return CARD_SECTIONS
    .filter(s => cardData[s.key])
    .map(s => ({ ...s, text: displayText(cardData[s.key]) }))
}
