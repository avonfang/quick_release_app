# 看见此刻 — AI 引导式情绪觉察工具

基于 uni-app (Vue 3 + TypeScript + Vite + Pinia)，编译为微信小程序与 H5。

## 项目来源

合并自两个独立产品：
- **此刻 · Being** (原生微信小程序): 情绪急救、呼吸、信箱、课程、金币、报告
- **看见此刻** (uni-app): AI 对话、快速觉察四步流程、历史记录、洞察卡片、信念、语音

## 目录结构

```
8.看见此刻/
├── src/                      # uni-app 前端（15 个页面，Vue SFC）
│   ├── pages/                # 页面组件
│   ├── components/           # 可复用 Vue 组件
│   ├── custom-tab-bar/       # 自定义底部导航（原生小程序 Component）
│   ├── data/                 # 课程/引导/信箱数据（ESM）
│   ├── utils/                # 工具/金币/报告/API/云同步（ESM + TS）
│   ├── stores/               # Pinia 状态管理（session.js）
│   ├── App.vue               # 全局入口 + 存储初始化 + 深色主题样式
│   ├── pages.json            # 路由与 Tab 配置（15 页 + 自定义 tabBar）
│   └── manifest.json         # uni-app 配置（mp-weixin appid: wx4d4542b0093696f7）
├── server/                   # Express API 后端（端口 3001）
│   ├── routes/               # auth, chat, records, asr
│   └── middleware/           # auth 中间件
├── functions/                # Cloudflare Pages Functions（边缘代理到 VPS）
├── __tests__/                # Jest 测试（18 个用例）
├── docs/superpowers/         # 设计规格 + 实现计划
├── deploy-*.js               # Cloudflare Worker 部署脚本
├── worker-proxy.js           # Worker 代理入口
└── vercel.json               # Vercel 部署配置
```

## 架构关键决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 模块格式 | ESM (`export function` / `export default`) | Vite/Rollup 需静态分析命名导出，CJS `module.exports` 会导致构建警告和运行时错误 |
| 数据模块 (courses, guides) | `export default { ... }` 大 JSON | Vite 可直接分析；Vue 页面用 `import courses from` (非 `import * as`) |
| 工具模块 (coins, util, report) | `export function` 命名导出 | 支持 tree-shaking；页面用 `import { addCoins }` 或 `import * as coins` |
| 自定义 tabBar | 原生微信小程序 Component() | 与 AI_Project 风格一致，emoji 图标无图片依赖 |
| 测试 | Jest + @swc/jest | SWC 将 ESM 转译为 CJS 供 Jest 运行 |
| 深色主题 | 全局样式 `page { background: #2A231D }` | 来自 AI_Project 设计，全部页面统一 |
| 存储键 | 两套体系共存无冲突 | AI_Project: `awakeningCoins`, `streakDays` 等; uni-app: `token`, `cards`, `quickRecords` |

## 页面导航

**Tab 页 (4):** 首页 → 练习 → 探索 → 我的
**功能页 (11):** 快速觉察、AI对话、记录、洞察、卡片、信念、登录、情绪急救、呼吸练习、此刻信箱、课程详情

路由见 `src/pages.json`。

## 命令

```bash
npm install                  # 安装依赖
npm run dev:mp-weixin        # 微信小程序开发
npm run build:mp-weixin      # 生产构建 → dist/build/mp-weixin/
npm test                     # Jest 测试（18/18）
```

## 数据流

- **本地优先**: 金币、课程进度、信箱历史、签到均通过 `uni.getStorageSync/setStorageSync` 本地存储
- **云端同步**: 登录后卡片记录通过 `server/routes/records.js` 同步到 VPS
- **AI 对话**: 前端 → `server/routes/chat.js` → DeepSeek API (API key 服务端保护)
- **语音识别**: 前端录音 → `server/routes/asr.js` → 百度 ASR
- **生产代理**: Cloudflare Pages Functions (`functions/`) → VPS `http://111.229.195.214:3001`

## 注意事项

- 构建产物在 `dist/build/mp-weixin/`，用微信开发者工具打开该目录
- `src/custom-tab-bar/` 是原生格式 (`Component({})`)，不能改为 Vue SFC
- 全局 `uni` API 通过 `src/__tests__/setup.js` mock，不要删除
- Sass 弃用警告可忽略 (Dart Sass legacy-js-api)
- 微信 H5 通过 Vite proxy 转发 `/v1` 到 DeepSeek API
