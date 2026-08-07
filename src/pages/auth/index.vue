<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api, setToken, isLoggedIn } from '@/utils/api'
import { syncLocalToServer } from '@/utils/cloud'

const mode = ref<'login' | 'register' | 'forgot' | 'reset'>('login')

// 如果已有 token，直接跳首页避免重复登录
onMounted(() => {
  if (isLoggedIn()) {
    uni.switchTab({ url: '/pages/profile/index' })
  }
})

onLoad((query) => {
  if (query.mode === 'forgot' || query.mode === 'reset') {
    mode.value = query.mode
  }
  if (query.token) {
    resetToken.value = query.token
  }
})
const email = ref('')
const password = ref('')
const resetToken = ref('')
const resetEmail = ref('')
const loading = ref(false)
const error = ref('')
const successMsg = ref('')

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}

function showForgot() {
  resetEmail.value = email.value || ''
  mode.value = 'forgot'
  error.value = ''
  successMsg.value = ''
}

function backToLogin() {
  mode.value = 'login'
  error.value = ''
  successMsg.value = ''
}

async function handleWechatLogin() {
  loading.value = true
  error.value = ''
  try {
    const { code } = await uni.login()
    const data = await api.post<{ token: string; user: { id: number } }>('/auth/wx-login', { code })
    setToken(data.token)
    uni.setStorageSync('userInfo', { userId: String(data.user.id) })
    try { await syncLocalToServer() } catch (e) { console.warn('Sync failed:', e) }
    uni.switchTab({ url: '/pages/profile/index' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '微信登录失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!email.value.trim() || !password.value) {
    error.value = '请填写邮箱和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const endpoint = mode.value === 'login' ? '/auth/login' : '/auth/register'
    const data = await api.post<{ token: string; user: { id: number; email: string } }>(endpoint, {
      email: email.value.trim(),
      password: password.value,
    })

    setToken(data.token)
    uni.setStorageSync('userInfo', { userId: String(data.user.id), email: data.user.email })

    // 同步本地记录到服务端
    try { await syncLocalToServer() } catch (e) { console.warn('Sync failed:', e) }

    uni.switchTab({ url: '/pages/profile/index' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    loading.value = false
  }
}

async function sendReset() {
  if (!resetEmail.value.trim()) {
    error.value = '请输入邮箱'
    return
  }
  loading.value = true
  error.value = ''
  successMsg.value = ''
  try {
    const data = await api.post<{ message: string; resetUrl?: string }>('/auth/forgot-password', {
      email: resetEmail.value.trim(),
    })
    if (data.resetUrl) {
      try { uni.setClipboardData({ data: data.resetUrl }) } catch {}
      successMsg.value = data.message + '\n\n重置链接已复制到剪贴板，请在浏览器中打开完成重置。'
    } else {
      successMsg.value = data.message
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '请求失败'
  } finally {
    loading.value = false
  }
}

async function doReset() {
  if (!password.value || password.value.length < 6) {
    error.value = '密码至少6位'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await api.post('/auth/reset-password', {
      token: resetToken.value,
      password: password.value,
    })
    successMsg.value = '密码重置成功！请用新密码登录'
    setTimeout(() => backToLogin(), 1500)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '重置失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="grain"></view>

    <view class="inner">
      <!-- Branding -->
      <view class="brand">
        <text class="brand-eyebrow">MINDFUL AWARENESS</text>
        <text class="brand-title">看见此刻</text>
        <text class="brand-sub">觉察你的情绪，发现背后的信念</text>
      </view>

      <!-- Form -->
      <view class="card">
        <!-- Tabs: only show in login/register mode -->
        <view v-if="mode === 'login' || mode === 'register'" class="tabs">
          <text
            class="tab"
            :class="{ 'tab--active': mode === 'login' }"
            @tap="mode = 'login'"
          >登录</text>
          <text
            class="tab"
            :class="{ 'tab--active': mode === 'register' }"
            @tap="mode = 'register'"
          >注册</text>
        </view>

        <!-- ====== Login / Register ====== -->
        <view v-if="mode === 'login' || mode === 'register'" class="form">
          <input
            v-model="email"
            class="input"
            type="email"
            placeholder="邮箱"
            inputmode="email"
            placeholder-class="input-ph"
            maxlength="100"
            :disabled="loading"
          />
          <input
            v-model="password"
            class="input"
            type="password"
            :placeholder="mode === 'register' ? '密码（至少6位）' : '密码'"
            placeholder-class="input-ph"
            maxlength="50"
            :disabled="loading"
            @confirm="submit"
          />

          <text v-if="error" class="error">{{ error }}</text>

          <view
            class="btn"
            :class="{ 'btn--loading': loading }"
            @tap="submit"
          >
            <text class="btn-text">{{ mode === 'login' ? '登录' : '注册' }}</text>
          </view>

          <!-- Forgot password link -->
          <text v-if="mode === 'login'" class="forgot-link" @tap="showForgot">忘记密码？</text>

          <!--#ifdef MP-WEIXIN-->
          <view class="wx-section">
            <view class="wx-divider">
              <text class="wx-divider-line"></text>
              <text class="wx-divider-text">或</text>
              <text class="wx-divider-line"></text>
            </view>
            <view class="wx-btn" :class="{ 'wx-btn--loading': loading }" @tap="handleWechatLogin">
              <text class="wx-btn-icon">ⓦ</text>
              <text class="wx-btn-text">微信一键登录</text>
            </view>
          </view>
          <!--#endif-->
        </view>

        <!-- ====== Forgot Password ====== -->
        <view v-else-if="mode === 'forgot'" class="form">
          <text class="form-title">重置密码</text>
          <text class="form-desc">输入注册邮箱，重置链接将复制到剪贴板，请在浏览器中打开完成重置。</text>
          <input
            v-model="resetEmail"
            class="input"
            type="email"
            placeholder="输入邮箱"
            inputmode="email"
            placeholder-class="input-ph"
            maxlength="100"
            :disabled="loading"
          />
          <text v-if="error" class="error">{{ error }}</text>
          <text v-if="successMsg && !resetToken" class="success">{{ successMsg }}</text>
          <view
            class="btn"
            :class="{ 'btn--loading': loading }"
            @tap="sendReset"
          >
            <text class="btn-text">发送重置链接</text>
          </view>
          <text class="back-link" @tap="backToLogin">← 返回登录</text>
        </view>

        <!-- ====== Reset Password ====== -->
        <view v-else-if="mode === 'reset'" class="form">
          <text class="form-title">设置新密码</text>
          <input
            v-model="password"
            class="input"
            type="password"
            placeholder="新密码（至少6位）"
            placeholder-class="input-ph"
            maxlength="50"
            :disabled="loading"
            @confirm="doReset"
          />
          <text v-if="error" class="error">{{ error }}</text>
          <text v-if="successMsg" class="success">{{ successMsg }}</text>
          <view
            class="btn"
            :class="{ 'btn--loading': loading }"
            @tap="doReset"
          >
            <text class="btn-text">重置密码</text>
          </view>
          <text class="back-link" @tap="backToLogin">← 返回登录</text>
        </view>

        <view class="footer">
          <text class="footer-text">
            {{ mode === 'login' ? '还没有账号？' : mode === 'register' ? '已有账号？' : '' }}
          </text>
          <text class="footer-link" @tap="toggleMode" v-if="mode === 'login' || mode === 'register'">
            {{ mode === 'login' ? '注册' : '登录' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  position: relative;
  min-height: 100vh;
  background: #F8F5F0;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.grain {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.008'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

.inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 24px;
  box-sizing: border-box;
  min-height: 100vh;
}

/* Brand */
.brand {
  text-align: center;
  margin-bottom: 40px;
}

.brand-eyebrow {
  display: block;
  font-size: 10px;
  letter-spacing: 5px;
  color: #B8916E;
  font-weight: 600;
  margin-bottom: 16px;
}

.brand-title {
  display: block;
  font-size: 40px;
  font-weight: 700;
  color: #1C1A17;
  letter-spacing: 8px;
  font-family: "Noto Serif SC", "Songti SC", Georgia, serif;
  margin-bottom: 10px;
}

.brand-sub {
  display: block;
  font-size: 13px;
  color: #9A8E82;
  letter-spacing: 1px;
}

/* Card */
.card {
  background: #fff;
  border-radius: 16px;
  padding: 32px 28px;
  box-shadow: 0 2px 12px rgba(28,26,23,0.04);
}

.tabs {
  display: flex;
  gap: 24px;
  margin-bottom: 28px;
  justify-content: center;
}

.tab {
  font-size: 16px;
  font-weight: 600;
  color: #B8AFA4;
  cursor: pointer;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab--active {
  color: #1C1A17;
  border-bottom-color: #C49A6C;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input {
  height: 48px;
  background: #F5F3F0;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 15px;
  color: #1C1A17;
  border: none;
  outline: none;
  box-sizing: border-box;
}

.input-ph {
  color: #C4B8AC;
  font-size: 15px;
}

.error {
  font-size: 13px;
  color: #D4604A;
  text-align: center;
}

.btn {
  height: 48px;
  background: linear-gradient(135deg, #C49A6C, #B8885A);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 4px;
}

.btn:active {
  opacity: 0.85;
}

.btn--loading {
  opacity: 0.6;
  pointer-events: none;
}

.btn-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
}

.footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 24px;
}

.footer-text {
  font-size: 13px;
  color: #9A8E82;
}

.footer-link {
  font-size: 13px;
  color: #C49A6C;
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 480px) {
  .inner {
    padding: 24px 20px;
  }
  .brand-title {
    font-size: 32px;
    letter-spacing: 6px;
  }
  .card {
    padding: 28px 20px;
  }
}

/*#ifdef MP-WEIXIN*/
.wx-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}
.wx-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.wx-divider-line {
  flex: 1;
  height: 1px;
  background: #E8E0D8;
}
.wx-divider-text {
  font-size: 12px;
  color: #C4B8AC;
  flex-shrink: 0;
}
.wx-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  border: 1px solid #C49A6C;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: opacity 0.2s;
}
.wx-btn:active {
  opacity: 0.7;
}
.wx-btn--loading {
  opacity: 0.5;
  pointer-events: none;
}
.wx-btn-icon {
  font-size: 18px;
  color: #07C160;
  font-weight: 700;
}
.wx-btn-text {
  font-size: 15px;
  color: #1C1A17;
  font-weight: 500;
  letter-spacing: 1px;
}
/*#endif*/
</style>
