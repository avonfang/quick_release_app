# src/ — uni-app 前端

Vue 3 + TypeScript + Vite + Pinia，编译目标 mp-weixin + H5。

## 入口

- `main.ts` — `createSSRApp` + `createPinia`
- `App.vue` — 全局 `onLaunch` 初始化存储（awakeningCoins, hasSeenOnboarding, streakDays, lastCheckInDate），全局深色样式 (`#2A231D`)

## 页面 (15)

| 页面 | 路由 | 来源 | 说明 |
|------|------|------|------|
| 首页 | `pages/index/index` | AI_Project 移植 | 情绪选择 + 快速觉察卡片 + 练习卡片 |
| 练习 | `pages/practice/index` | AI_Project 移植 | 每日练习入口 |
| 探索 | `pages/learning/index` | AI_Project 移植 | 三路课程列表 |
| 课程详情 | `pages/learning/lesson/index` | AI_Project 移植 | 课程内容+练习 |
| 我的 | `pages/profile/index` | AI_Project 移植 | 个人报告+成就+周报 |
| 情绪急救 | `pages/emergency/index` | AI_Project 移植 | 4 种情绪引导 |
| 呼吸练习 | `pages/breath/index` | AI_Project 移植 | 引导式呼吸 |
| 此刻信箱 | `pages/dialogue/index` | AI_Project 移植 | 情绪表达写信+AI回信 |
| 快速觉察 | `pages/quick/index` | 此刻-uniapp 移植 | AI 引导四步流程 |
| AI 对话 | `pages/chat/index` | 此刻-uniapp | 深度对话 |
| 记录 | `pages/history/index` | 此刻-uniapp | 历史记录列表 |
| 洞察 | `pages/insight/index` | 此刻-uniapp | 情绪洞察+信念统计 |
| 卡片 | `pages/card/index` | 此刻-uniapp | 卡片分享 |
| 信念 | `pages/beliefs/index` | 此刻-uniapp | 信念管理 |
| 登录 | `pages/auth/index` | 此刻-uniapp | 账号登录 |

## 数据模块 (src/data/)

ESM 格式，默认导出大 JSON 对象：

- `courses.js` — 三条课程路径 (presence/surrender/openness)，各 6 课
- `guides.js` — 4 种情绪急救引导 (anxiety/anger/low/tangled)，各 7-8 步
- `dialogue.js` — 信箱 AI 回复引擎 (`generateReply(conversation)`, `detectEmotion(text)`)

Vue 页面导入方式：
```js
import courses from '@/data/courses'     // 默认导出
import guides from '@/data/guides'       // 默认导出
import { generateReply } from '@/data/dialogue'  // 命名导出
```

## 工具模块 (src/utils/)

| 文件 | 导出 | 说明 |
|------|------|------|
| `coins.js` | `addCoins()`, `getLedger()` | 金币+流水 (awakeningCoins/coinLedger) |
| `util.js` | `formatDate()`, `formatTime()`, `EMOTION_MAP`, `completeLesson()`, `getCourseProgress()` | 通用工具+课程进度 |
| `report.js` | `generateInsight()`, `getAchievements()`, `getWeekReport()` | 洞察+成就+周报 |
| `api.ts` | `api.get/post`, `setToken`, `isLoggedIn` | HTTP 请求封装 (JWT) |
| `cloud.ts` | `chatWithAI()`, `saveCard()`, `getMergedRecords()` | AI 对话 + 卡片 CRUD + 云端同步 |
| `prompt.js` | `SYSTEM_PROMPT`, `BELIEF_EXTRACTION_PROMPT` | AI 对话系统提示词 |
| `quick-record.ts` | 快速记录相关 | 快速觉察本地存储 |
| `voice.ts` | 语音相关 | 录音+百度 ASR |
| `card-share.ts` | 卡片分享 | Canvas 绘制分享图 |
| `insight.ts` | 洞察相关 | 情绪数据统计 |

## 组件 (src/components/)

- `AiBubble.vue` / `UserBubble.vue` — 对话气泡
- `QuickOptions.vue` — 快速选择按钮
- `onboarding-guide.vue` — 首次引导蒙层 (storage: `hasSeenOnboarding`)
- `transition-guide.vue` — V5 升级引导 (storage: `hasSeenV5Guide`)

## 自定义 TabBar (src/custom-tab-bar/)

原生微信小程序 Component 格式（非 Vue），不可改为 `.vue`。

- `index.js` — `switchTab()` 使用 `wx.switchTab`
- `index.json` — 声明为自定义组件

配置在 `pages.json` → `tabBar.custom: true`。

## 状态管理 (src/stores/)

- `session.js` — 快速觉察 8 阶段状态机 (event → emotion → thought → belief → loosen → release → awareness → action)，含 `advanceStage()` 和 `reset()`

## 存储键一览

**AI_Project 系:** `awakeningCoins`, `coinLedger`, `streakDays`, `lastCheckInDate`, `hasSeenOnboarding`, `hasSeenV5Guide`, `progress_*`, `lesson_*`, `dialogueHistory`
**此刻-uniapp 系:** `token`, `userInfo`, `userId`, `cards`, `lastRecordDate`, `resumeSessionId`, `quickRecords`

两套键无冲突，共存于同一 storage。
