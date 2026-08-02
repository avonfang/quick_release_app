# 「看见此刻」— AI_Project × 此刻-uniapp 合并设计规格

> 版本：v1.0 · 2026-08-02
> 目标工程：`C:\创业项目\8.看见此刻`（uni-app 工程）
> 上游来源：`C:\AI_Project`（原生微信小程序「此刻 · Being」）、`C:\创业项目\7. 此刻\此刻-uniapp`（uni-app「看见此刻」）

## 概述

将两个独立实现的产品合并为一个全新工程「8.看见此刻」：

- **AI_Project**（原生微信小程序「此刻 · Being」）：提供全新的首页视觉设计（Figma 重设计）、情绪练习、急救、呼吸、信箱、课程体系、金币机制，纯本地存储。
- **此刻-uniapp**（uni-app「看见此刻 - AI 引导式情绪觉察工具」）：提供 AI 对话、快速觉察四步流程、历史记录、洞察卡片、信念、语音、云端同步、登录认证。

合并后是一个基于 uni-app（Vue 3 + TypeScript + Vite + Pinia）的单一代码库，可发布微信小程序与 H5。

## 关键决策（已与用户确认）

| 决策点 | 选择 | 说明 |
|--------|------|------|
| 底座框架 | uni-app | 保留 uni-app 全部 AI 功能，将 AI_Project 页面移植为 Vue |
| 功能范围 | 保留 AI_Project 全部功能 | 急救/呼吸/信箱/课程/报告全部移植 |
| 导航结构 | 统一用 AI_Project 导航 | 底部：首页/练习/探索/我的；快速觉察为首页卡片入口 |
| 视觉效果 | 微信端 1:1 | uni-app 编译 mp-weixin 与原生渲染同引擎，样式可无损移植 |

## 页面结构

### 底部导航（自定义 tabBar，沿用 AI_Project emoji 风格）

| 页面 | 路由 | 来源 |
|------|------|------|
| 首页（此刻） | `pages/index/index` | AI_Project 移植 + 新增「快速觉察」卡片 |
| 练习 | `pages/practice/index` | AI_Project 移植 |
| 探索 | `pages/learning/index` | AI_Project 移植 |
| 我的 | `pages/profile/index` | AI_Project 移植 |

### AI_Project 功能页（非 tab，从首页/练习/探索进入）

| 页面 | 路由 | 说明 |
|------|------|------|
| 情绪急救 | `pages/emergency/index` | 保留原交互 |
| 呼吸练习 | `pages/breath/index` | 保留原交互 |
| 此刻信箱 | `pages/dialogue/index` | 保留原交互 |
| 课程详情 | `pages/learning/lesson` | 保留原交互 |

### 此刻-uniapp 功能页（快速觉察功能区）

| 页面 | 路由 | 说明 |
|------|------|------|
| 快速觉察（四步流程） | `pages/quick/index` | 原 `pages/index/index` 改名移植；首页卡片直达 |
| AI 对话 | `pages/chat/index` | 原样保留 |
| 记录 | `pages/history/index` | 原样保留 |
| 洞察（我的） | `pages/insight/index` | 原样保留 |
| 卡片 | `pages/card/index` | 原样保留 |
| 信念 | `pages/beliefs/index` | 原样保留 |
| 登录 | `pages/auth/index` | 原样保留 |

> 说明：原 uni-app 的 tabBar（觉察/记录/对话/我的）移除，改为在快速觉察流程页内放置「对话/记录/洞察」等入口按钮；原 `uni.switchTab` 调用改为 `uni.navigateTo`。

## 首页「快速觉察」入口

在 AI_Project 首页新增一张醒目卡片：

- 位置：情绪选择区与练习卡片之间
- 内容：图标 + 「快速觉察」标题 + 一句副标题（如"用 AI 引导记录此刻的情绪"）
- 行为：点击 → `uni.navigateTo('/pages/quick/index')`
- 视觉：与现有卡片风格一致（深色主题、圆角、渐变）

## 组件与素材

- `onboarding-guide`、`transition-guide` → 移植为 Vue 组件，行为（storage 标记 `hasSeenOnboarding` / `hasSeenV5Guide`）不变
- 自定义 tabBar（emoji 图标，无图片依赖）→ 移植为 uni-app 自定义 tabBar
- 素材：`C:\AI_Project\png\image_461556084166494.jpg` → `src/static/`，更新引用路径

## 数据与存储

存储键经核对**无冲突**，保持不变：

- AI_Project 键：`awakeningCoins`、`coinLedger`、`streakDays`、`lastCheckInDate`、`hasSeenOnboarding`、`hasSeenV5Guide`、`progress_*`、`lesson_*`、`dialogueHistory`
- uni-app 键：`token`、`userInfo`、`userId`、`cards`、`lastRecordDate`、`resumeSessionId`、quickRecords

数据模块（`courses.js` / `guides.js` / `dialogue.js` / `util.js` / `coins.js` / `report.js`）由 CommonJS 转换为 ESM 后移入 `src/data`、`src/utils`。

## 测试

- 保留 AI_Project 的 Jest 测试（`__tests__/coins.test.js`、`util.test.js`），搬入新工程根目录
- `__tests__/setup.js` 的全局 mock 从 `wx` 调整为 `uni`（utils 统一使用 uni API）
- `package.json` 补充 `"test": "jest"` 脚本；`npm test` 必须通过

## 基础设施

保留（属产品基础设施）：`server/`、`functions/`、`deploy-*.js`、`worker-proxy.js`、`vercel.json`、`.env.example`。

排除：`.env`（含密钥，不复制）、`.git`、`node_modules`、`dist`（构建产物，重新生成）。

## 验证标准

1. `npm install` 成功，`npm test` 全部通过
2. `npm run build:mp-weixin` 构建成功
3. 微信开发者工具打开构建产物，编译无报错
4. 首页为 AI_Project 风格，含「快速觉察」卡片
5. 四步觉察流程 + AI 对话 + 记录 + 洞察可用
6. 急救/呼吸/信箱/课程/报告页面可用，底部导航正常

## 风险与对策

| 风险 | 对策 |
|------|------|
| uni-app 构建需网络下载依赖 | 优先复用 此刻-uniapp 现有 node_modules；如失败再 npm install |
| AI 后端不可用 | 快速觉察已有本地兜底回复（"谢谢你的记录。"），不受影响 |
| 自定义 tabBar 在 uni-app 中行为差异 | 以 mp-weixin 产物为准逐项核对；必要时退回原生 tabBar 配置 |
| 两套"我的"页面并存造成困惑 | 底部「我的」= AI_Project 报告页；uni-app 洞察页仅从觉察功能区进入 |
