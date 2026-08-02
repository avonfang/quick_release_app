# 看见此刻 — AI 引导式情绪觉察工具

基于 uni-app（Vue 3 + TypeScript + Vite + Pinia），可发布微信小程序与 H5。

合并自两个独立产品：
- **此刻 · Being**（原生微信小程序）：情绪急救、呼吸、信箱、课程体系、金币机制
- **看见此刻**（uni-app）：AI 对话、快速觉察四步流程、历史记录、洞察卡片、信念

## 页面结构

### 底部导航

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `pages/index/index` | 情绪选择 + 快速觉察入口 + 练习卡片 |
| 练习 | `pages/practice/index` | 课程练习 |
| 探索 | `pages/learning/index` | 课程体系 |
| 我的 | `pages/profile/index` | 个人报告 |

### 功能页（非 Tab）

| 页面 | 路由 | 说明 |
|------|------|------|
| 快速觉察 | `pages/quick/index` | AI 引导四步流程 |
| AI 对话 | `pages/chat/index` | 深度对话 |
| 记录 | `pages/history/index` | 历史记录 |
| 洞察 | `pages/insight/index` | 情绪洞察 |
| 卡片 | `pages/card/index` | 卡片分享 |
| 信念 | `pages/beliefs/index` | 信念管理 |
| 登录 | `pages/auth/index` | 账号登录 |
| 情绪急救 | `pages/emergency/index` | 即时情绪缓解 |
| 呼吸练习 | `pages/breath/index` | 引导呼吸 |
| 此刻信箱 | `pages/dialogue/index` | 情绪表达 |
| 课程详情 | `pages/learning/lesson/index` | 课程内容 |

## 开发命令

```bash
npm install                 # 安装依赖
npm run dev:mp-weixin       # 微信小程序开发模式
npm run build:mp-weixin     # 微信小程序生产构建
npm test                    # 运行 Jest 测试
```

## 目录结构

```
8.看见此刻/
├── src/
│   ├── pages/              # 15 个页面（Vue SFC）
│   ├── components/         # Vue 组件（含引导组件）
│   ├── custom-tab-bar/     # 自定义底部导航（原生组件）
│   ├── data/               # 课程/引导/信箱数据（CommonJS）
│   ├── utils/              # 工具/金币/报告模块（CommonJS）
│   ├── stores/             # Pinia 状态管理
│   ├── static/             # 静态资源
│   ├── App.vue             # 全局入口
│   ├── pages.json          # 路由与 Tab 配置
│   └── manifest.json       # uni-app 配置
├── server/                 # 后端服务
├── functions/              # Cloudflare Functions
├── __tests__/              # Jest 测试
└── docs/                   # 设计文档
```

## 注意事项

- AppID 配置在 `src/manifest.json` 的 `mp-weixin` 段，当前为 `wx4d4542b0093696f7`
- 数据/工具模块保持 CommonJS（Jest 兼容），Vue 页面通过 `import * as` 引用
- 存储键（awakeningCoins、quickRecords、token 等）无冲突，两套体系共存
- 构建产物在 `dist/build/mp-weixin/`，用微信开发者工具打开
