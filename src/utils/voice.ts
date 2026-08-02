/**
 * 语音输入工具
 * 微信小程序：RecorderManager 录音 + 服务端 ASR
 * H5：Web Speech API（SpeechRecognition）
 */

type VoiceState = 'idle' | 'recording' | 'transcribing'

let _state: VoiceState = 'idle'
let _duration = 0
let _timer: ReturnType<typeof setInterval> | null = null
let _listener: ((state: VoiceState) => void) | null = null

//#ifdef MP-WEIXIN
let _recorder: WechatMiniprogram.RecorderManager | null = null
let _tempFilePath = ''
//#endif

//#ifdef H5
let _recognition: SpeechRecognition | null = null
//#endif

export function onStateChange(fn: (state: VoiceState) => void) {
  _listener = fn
}

function notify() {
  _listener?.(_state)
}

export function getState(): VoiceState {
  return _state
}

export function getDuration(): number {
  return _duration
}

export function isSupported(): boolean {
  //#ifdef MP-WEIXIN
  return true
  //#endif
  //#ifdef H5
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  //#endif
  return false
}

//#ifdef MP-WEIXIN
function ensureRecorder() {
  if (_recorder) return
  _recorder = wx.getRecorderManager()
  _recorder.onStop((res) => {
    _tempFilePath = res.tempFilePath
  })
  _recorder.onError(() => {
    _state = 'idle'
    notify()
    uni.showToast({ title: '录音失败', icon: 'error' })
  })
}

function requestPrivacyAuthorize(): Promise<void> {
  return new Promise((resolve) => {
    if (!wx.requestPrivacyAuthorize) {
      resolve()
      return
    }
    wx.requestPrivacyAuthorize({
      success: () => resolve(),
      fail: () => resolve(), // continue anyway
    })
  })
}

function requestRecordPermission(): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record']) {
          resolve()
        } else if (res.authSetting['scope.record'] === false) {
          // 已拒绝过 — 引导用户打开设置
          uni.showModal({
            title: '需要录音权限',
            content: '请在设置中开启麦克风权限，以便使用语音输入功能。',
            success: (modal) => {
              if (modal.confirm) {
                wx.openSetting({
                  success: (setting) => {
                    if (setting.authSetting['scope.record']) {
                      resolve()
                    } else {
                      reject(new Error('Permission denied'))
                    }
                  },
                  fail: () => reject(new Error('Failed to open settings')),
                })
              } else {
                reject(new Error('Permission denied'))
              }
            },
          })
        } else {
          // 从未请求过
          wx.authorize({
            scope: 'scope.record',
            success: () => resolve(),
            fail: () => reject(new Error('Permission denied')),
          })
        }
      },
      fail: () => reject(new Error('Failed to get settings')),
    })
  })
}

function initMpRecorder(): Promise<void> {
  return new Promise((resolve, reject) => {
    ensureRecorder()
    _recorder!.start({
      format: 'pcm',
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 16000,
      duration: 60,
    })
    // No start callback; assume success after a short delay
    setTimeout(() => resolve(), 200)
  })
}

function readAudioBase64(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!_tempFilePath) return reject(new Error('No audio file'))
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: _tempFilePath,
      encoding: 'base64',
      success: (res) => resolve(res.data as string),
      fail: () => reject(new Error('Failed to read audio file')),
    })
  })
}

async function uploadAudio(): Promise<string> {
  const token = getToken()
  const audioBase64 = await readAudioBase64()
  return new Promise((resolve, reject) => {
    uni.request({
      url: '/api/asr',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      data: { audio: audioBase64 },
      success: (res: any) => {
        if (res.data?.text) {
          resolve(res.data.text)
        } else {
          reject(new Error(res.data?.error || 'ASR failed'))
        }
      },
      fail: () => reject(new Error('Network error')),
    })
  })
}
//#endif

//#ifdef H5
function initH5Recognition(): Promise<void> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      reject(new Error('SpeechRecognition not supported'))
      return
    }
    _recognition = new SpeechRecognition()
    _recognition.lang = 'zh-CN'
    _recognition.continuous = false
    _recognition.interimResults = false
    _recognition.onresult = () => {
      // handled in stopH5Recognition
    }
    _recognition.onerror = (e) => {
      _state = 'idle'
      notify()
      reject(new Error(e.error))
    }
    _recognition.onend = () => {
      resolve()
    }
    _recognition.start()
  })
}

function stopH5Recognition(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!_recognition) {
      reject(new Error('No active recognition'))
      return
    }
    _recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript
      resolve(text)
    }
    _recognition.onerror = (e) => {
      reject(new Error(e.error))
    }
    _recognition.stop()
  })
}
//#endif

// ─── Public API ────────────────────────────────────────────────────────────

export async function startRecording() {
  if (_state !== 'idle') return
  _duration = 0
  _state = 'recording'
  notify()

  // Duration tracking
  _timer = setInterval(() => {
    _duration++
    notify()
  }, 1000)

  try {
    //#ifdef MP-WEIXIN
    await requestPrivacyAuthorize()
    await requestRecordPermission()
    await initMpRecorder()
    //#endif
    //#ifdef H5
    await initH5Recognition()
    //#endif
  } catch (e: any) {
    _state = 'idle'
    if (_timer) clearInterval(_timer)
    _timer = null
    notify()
    throw e
  }
}

export async function stopRecording(): Promise<string> {
  if (_state !== 'recording') return ''
  _state = 'transcribing'
  notify()

  if (_timer) clearInterval(_timer)
  _timer = null

  try {
    let text = ''
    //#ifdef MP-WEIXIN
    _recorder?.stop()
    text = await uploadAudio()
    //#endif
    //#ifdef H5
    text = await stopH5Recognition()
    //#endif
    _state = 'idle'
    notify()
    return text
  } catch (e: any) {
    _state = 'idle'
    notify()
    uni.showToast({ title: e.message || '语音识别失败', icon: 'error' })
    throw e
  }
}

function getToken(): string {
  try {
    return uni.getStorageSync('token') || ''
  } catch {
    return ''
  }
}
