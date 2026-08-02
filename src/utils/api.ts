/**
 * API 请求工具 — 自动附带 JWT token
 */
// H5 使用相对路径（由 nginx 代理）
// 小程序使用 HTTPS（VPS 已配置 Let's Encrypt 证书）
const BASE_URL = typeof window !== 'undefined' ? '/api' : 'https://sumeru.online/api'

function getToken(): string | null {
  try { return uni.getStorageSync('token') || null } catch { return null }
}

export function setToken(token: string) {
  uni.setStorageSync('token', token)
}

export function clearToken() {
  try { uni.removeStorageSync('token') } catch {}
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) header.Authorization = `Bearer ${token}`

  const res = await uni.request({
    url: BASE_URL + path,
    method: method as any,
    header,
    data: body,
    timeout: 10000,
  })

  if (res.statusCode >= 400) {
    const data = res.data as any
    throw new Error(data?.error || '请求失败')
  }

  return res.data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: Record<string, unknown>) => request<T>('POST', path, body),
}
