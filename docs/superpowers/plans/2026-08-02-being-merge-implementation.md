# 看见此刻（AI_Project × 此刻-uniapp 合并）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 AI_Project（原生微信小程序「此刻 · Being」）与 此刻-uniapp（uni-app「看见此刻」）合并为单一 uni-app 工程「8.看见此刻」：首页采用 AI_Project 设计，uni-app 全部 AI 功能通过首页新增的「快速觉察」入口进入，底部导航统一为 首页/练习/探索/我的。

**架构：** 以 此刻-uniapp 的 uni-app（Vue 3 + TypeScript + Vite + Pinia）代码库为底座；将 AI_Project 的 8 个页面、2 个引导组件、自定义 tabBar、数据/工具模块移植为 uni-app 页面/组件；移除 uni-app 旧 tabBar（觉察/记录/对话/我的）；AI_Project 页面用 Vue Options API（`data()` / `methods` / `onLoad`）保持与原 `Page()` 写法一一对应。

**技术栈：** uni-app (Vue 3 + TypeScript + Vite + Pinia)、微信小程序（mp-weixin）、Jest

**工作目录：** `C:\创业项目\8.看见此刻`（已 git init，已有设计规格提交）

**源目录（只读，不修改）：**
- `S1 = C:\AI_Project`
- `S2 = C:\创业项目\7. 此刻\此刻-uniapp`

---

## 文件结构（合并后）

```
8.看见此刻/
├── docs/superpowers/specs/2026-08-02-being-merge-design.md   # 已提交
├── docs/superpowers/plans/2026-08-02-being-merge-implementation.md  # 本计划
├── src/                          # uni-app 源码（S2 的 src + AI_Project 移植）
│   ├── pages/
│   │   ├── index/index.vue       # 【新】AI_Project 首页 + 快速觉察卡片（tab）
│   │   ├── practice/index.vue    # 【新】AI_Project 练习（tab）
│   │   ├── learning/index.vue    # 【新】AI_Project 探索（tab）
│   │   ├── learning/lesson/index.vue  # 【新】课程详情
│   │   ├── profile/index.vue     # 【新】AI_Project 我的（tab）
│   │   ├── emergency/index.vue   # 【新】情绪急救
│   │   ├── breath/index.vue      # 【新】呼吸练习
│   │   ├── dialogue/index.vue    # 【新】此刻信箱
│   │   ├── quick/index.vue       # 【迁移】原 pages/index（四步觉察）
│   │   ├── auth/index.vue        # 保留（登录）
│   │   ├── chat/index.vue        # 保留（AI 对话）
│   │   ├── history/index.vue     # 保留（记录）
│   │   ├── insight/index.vue     # 保留（洞察）
│   │   ├── card/index.vue        # 保留（卡片）
│   │   └── beliefs/index.vue     # 保留（信念）
│   ├── custom-tab-bar/           # 【新】AI_Project 原生自定义 tabBar（4 件套）
│   ├── components/               # 【新】onboarding-guide / transition-guide（Vue 组件）
│   ├── data/                     # 【新】courses.js / guides.js / dialogue.js（CJS 保留）
│   ├── utils/                    # uni-app 原 utils + 【新】util.js / coins.js / report.js（CJS 保留）
│   ├── stores/ static/ App.vue main.ts manifest.json pages.json uni.scss（保留）
├── server/ functions/ deploy-*.js worker-proxy.js vercel.json .env.example（保留）
├── __tests__/                    # 【新】coins.test.js / util.test.js / setup.js
├── package.json package-lock.json .gitignore
```

## 路由映射表（全部 URL 按此表修正）

| 旧路由（AI_Project 或 uni-app） | 新路由 |
|---|---|
| `/pages/practice/practice` | `/pages/practice/index` |
| `/pages/learning/learning` | `/pages/learning/index` |
| `/pages/learning/lesson/lesson` | `/pages/learning/lesson/index` |
| `/pages/profile/profile` | `/pages/profile/index` |
| `/pages/emergency/emergency` | `/pages/emergency/index` |
| `/pages/breath/breath` | `/pages/breath/index` |
| `/pages/dialogue/dialogue` | `/pages/dialogue/index` |
| `/pages/index/index`（uni-app 四步觉察） | `/pages/quick/index` |
| `/pages/index/index`（AI_Project 首页） | `/pages/index/index`（不变） |
| `/pages/chat/index`、`/pages/history/index`、`/pages/insight/index`、`/pages/card/index`、`/pages/beliefs/index`、`/pages/auth/index` | 不变（不再是 tab 页） |

## 转换规则（移植 AI_Project 时统一应用，后文任务引用本表）

**WXML → Vue template：**
- `wx:if="{{a}}"` → `v-if="a"`；`wx:elif` → `v-else-if`；`wx:else` → `v-else`
- `wx:for="{{list}}"` → `v-for="(item, index) in list"`；`wx:key="id"` → `:key="item.id"`
- `bindtap="fn"` → `@tap="fn"`；`catchtap` → `@tap.stop`；`data-x="{{v}}"` → `:data-x="v"`
- 其余标签（view/text/image/button/input/textarea/scroll-view/canvas）与插值 `{{}}` 原样保留

**WXSS → `<style scoped>`：** 原样复制进 SFC，rpx 单位不变；仅把 `page` 选择器改为在 App.vue 全局样式中处理。

**Page() → Vue Options API：**
```js
// 原写法
Page({ data: { a: 1 }, onLoad() {}, fn(e) { this.setData({ a: 2 }) } })
// 新写法
export default {
  data() { return { a: 1 } },
  onLoad() {},
  methods: { fn(e) { this.a = 2 } }
}
```

**API 替换（全文）：** `wx.` → `uni.`（getStorageSync / setStorageSync / removeStorageSync / navigateTo / navigateBack / switchTab / reLaunch / vibrateShort / showModal / showToast / showActionSheet / setClipboardData / setNavigationBarTitle 均有对应 uni API）。

**页面 JSON：** 页面级 `navigationStyle: custom` 统一合并进 pages.json 的 style；`usingComponents` 改为 Vue `import` + `components` 注册。

**模块引用：** `require('../../data/courses')` → `import courses from '@/data/courses'`（Vite 对 CJS 的默认互操作）；页面里 `const { addCoins } = require(...)` → `import coins from '@/utils/coins'` 后 `coins.addCoins(...)`。**数据/工具模块保持 CommonJS 不动**（Jest 原生兼容）。

---

## 任务 1：搭建工程骨架

**文件：**
- 创建：`C:\创业项目\8.看见此刻\`（已存在）
- 复制：S2 的 `src/`、`server/`、`functions/`、`deploy-*.js`、`worker-proxy.js`、`vercel.json`、`.env.example`、`index.html`、`tsconfig.json`、`tsconfig.node.json`、`shims-uni.d.ts`、`uni.scss`、`vite.config.js`、`vite.config.ts`、`package.json`、`package-lock.json`
- 排除：`.git`、`node_modules`、`dist`、`.env`、`manifest.json`（根目录 HBuilderX 残留）、`pages.json`（根目录残留）、`project.config.json`（根目录残留）、`project.private.config.json`、`_test_upload.txt`、`.claude`、`.vercel`

- [ ] **步骤 1：复制基础工程**
```powershell
$dst = 'C:\创业项目\8.看见此刻'
Copy-Item 'C:\创业项目\7. 此刻\此刻-uniapp\src' $dst -Recurse -Force
Copy-Item 'C:\创业项目\7. 此刻\此刻-uniapp\server','C:\创业项目\7. 此刻\此刻-uniapp\functions','C:\创业项目\7. 此刻\此刻-uniapp\deploy-cf.js','C:\创业项目\7. 此刻\此刻-uniapp\deploy-cf-test.js','C:\创业项目\7. 此刻\此刻-uniapp\deploy-cf-test2.js','C:\创业项目\7. 此刻\此刻-uniapp\deploy-cf2.js','C:\创业项目\7. 此刻\此刻-uniapp\deploy-cloudflare.js','C:\创业项目\7. 此刻\此刻-uniapp\deploy-final.js','C:\创业项目\7. 此刻\此刻-uniapp\deploy-worker.js','C:\创业项目\7. 此刻\此刻-uniapp\worker-proxy.js','C:\创业项目\7. 此刻\此刻-uniapp\vercel.json','C:\创业项目\7. 此刻\此刻-uniapp\.env.example','C:\创业项目\7. 此刻\此刻-uniapp\index.html','C:\创业项目\7. 此刻\此刻-uniapp\tsconfig.json','C:\创业项目\7. 此刻\此刻-uniapp\tsconfig.node.json','C:\创业项目\7. 此刻\此刻-uniapp\shims-uni.d.ts','C:\创业项目\7. 此刻\此刻-uniapp\uni.scss','C:\创业项目\7. 此刻\此刻-uniapp\vite.config.js','C:\创业项目\7. 此刻\此刻-uniapp\vite.config.ts','C:\创业项目\7. 此刻\此刻-uniapp\package.json','C:\创业项目\7. 此刻\此刻-uniapp\package-lock.json' $dst -Recurse -Force
```

- [ ] **步骤 2：创建 .gitignore**

创建 `C:\创业项目\8.看见此刻\.gitignore`：
```gitignore
node_modules/
dist/
.env
.DS_Store
*.log
```

- [ ] **步骤 3：安装依赖**

优先：`npm install`（在 `C:\创业项目\8.看见此刻` 执行，可能需联网）。
若网络不可用：复制 S2 的 `node_modules`（270MB）：
```powershell
Copy-Item 'C:\创业项目\7. 此刻\此刻-uniapp\node_modules' 'C:\创业项目\8.看见此刻\node_modules' -Recurse -Force
```

- [ ] **步骤 4：验证基线构建**

运行：`npm run build:mp-weixin`
预期：成功，生成 `dist/build/mp-weixin/`；确认其中 `app.json` 含旧 tabBar 4 项（后续任务会改）。

- [ ] **步骤 5：Commit**
```bash
git add -A
git commit -m "chore: 复制 uni-app 基础工程骨架"
```

## 任务 2：迁移快速觉察页（pages/index → pages/quick）

**文件：**
- 移动：`src/pages/index/index.vue` → `src/pages/quick/index.vue`
- 修改：`src/pages/auth/index.vue`、`src/pages/quick/index.vue`

- [ ] **步骤 1：移动文件**
```powershell
New-Item 'C:\创业项目\8.看见此刻\src\pages\quick' -ItemType Directory -Force | Out-Null
Move-Item 'C:\创业项目\8.看见此刻\src\pages\index\index.vue' 'C:\创业项目\8.看见此刻\src\pages\quick\index.vue' -Force
Remove-Item 'C:\创业项目\8.看见此刻\src\pages\index' -Force
```

- [ ] **步骤 2：修正 auth 重定向**

`src/pages/auth/index.vue` 三处 `uni.reLaunch({ url: '/pages/index/index' })`（约 12/59/89 行）全部改为：
```ts
uni.reLaunch({ url: '/pages/quick/index' })
```

- [ ] **步骤 3：修正 quick 页导航**

`src/pages/quick/index.vue`：
- `goChat` / `goHistory` / `goInsight` 三个方法中 `uni.switchTab({ url: '/pages/chat/index' })` 等改为 `uni.navigateTo({ url: '...' })`
- 新增「回到首页」方法：
```ts
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
```
（模板底部加一个返回按钮，样式沿用页面现有风格。）

- [ ] **步骤 4：Commit**
```bash
git add -A
git commit -m "refactor: 四步觉察页迁移至 pages/quick 并修正导航"
```

## 任务 3：修正 uni-app 其余页面的导航调用

**文件：** `src/pages/history/index.vue`、`src/pages/card/index.vue`、`src/pages/chat/index.vue`

- [ ] **步骤 1：history 页**

`src/pages/history/index.vue`：
- 约 126 行 `uni.switchTab({ url: '/pages/chat/index' })` → `uni.navigateTo({ url: '/pages/chat/index' })`
- 约 136 行 `uni.switchTab({ url: '/pages/insight/index' })` → `uni.navigateTo({ url: '/pages/insight/index' })`

- [ ] **步骤 2：card 页**

`src/pages/card/index.vue` 约 97 行 `uni.switchTab({ url: '/pages/chat/index' })` → `uni.navigateTo({ url: '/pages/chat/index' })`

- [ ] **步骤 3：chat 页**

`src/pages/chat/index.vue` 三处（约 528/543/605 行）`uni.switchTab({ url: '/pages/index/index' })` **保持不变**（目标已是 AI_Project 首页 tab 页，语义=回首页）。

- [ ] **步骤 4：全局自查**

运行：`rg -n "switchTab" src/pages`
预期：剩余 switchTab 只指向 `/pages/index/index`（tab 页）与 custom-tab-bar 无关。

- [ ] **步骤 5：Commit**
```bash
git add -A
git commit -m "refactor: uni-app 页面导航改为 navigateTo，兼容新 tab 结构"
```

## 任务 4：合并 pages.json（路由 + 自定义 tabBar）

**文件：** 修改 `src/pages.json`

- [ ] **步骤 1：整体替换 pages.json**

`src/pages.json` 全文替换为：
```json
{
  "pages": [
    {"path": "pages/index/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/practice/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/learning/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/learning/lesson/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/profile/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/emergency/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/breath/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/dialogue/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/quick/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/auth/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/chat/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/card/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/beliefs/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/history/index", "style": {"navigationStyle": "custom"}},
    {"path": "pages/insight/index", "style": {"navigationStyle": "custom"}}
  ],
  "globalStyle": {
    "navigationBarBackgroundColor": "#2A231D",
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "此刻",
    "backgroundColor": "#2A231D"
  },
  "tabBar": {
    "custom": true,
    "color": "#C4C0B8",
    "selectedColor": "#C4A06A",
    "backgroundColor": "#2A231D",
    "list": [
      {"pagePath": "pages/index/index", "text": "首页"},
      {"pagePath": "pages/practice/index", "text": "练习"},
      {"pagePath": "pages/learning/index", "text": "探索"},
      {"pagePath": "pages/profile/index", "text": "我的"}
    ]
  }
}
```

- [ ] **步骤 2：验证构建**
运行：`npm run build:mp-weixin`
预期：成功；`dist/build/mp-weixin/app.json` 的 pages 为 15 项、tabBar.custom 为 true。

- [ ] **步骤 3：Commit**
```bash
git add src/pages.json
git commit -m "feat: 合并路由表并启用自定义 tabBar 配置"
```

## 任务 5：移植自定义 tabBar

**文件：**
- 创建：`src/custom-tab-bar/index.js`、`index.json`、`index.wxml`、`index.wxss`（复制自 `S1\custom-tab-bar\`）

- [ ] **步骤 1：复制四件套**
```powershell
Copy-Item 'C:\AI_Project\custom-tab-bar\*' 'C:\创业项目\8.看见此刻\src\custom-tab-bar\' -Force
```

- [ ] **步骤 2：修正跳转路径**

`src/custom-tab-bar/index.js` 中 `tabs` 数组改为：
```js
tabs: [
  { icon: '🏠', label: '首页', pagePath: '/pages/index/index' },
  { icon: '🧘', label: '练习', pagePath: '/pages/practice/index' },
  { icon: '🔍', label: '探索', pagePath: '/pages/learning/index' },
  { icon: '👤', label: '我的', pagePath: '/pages/profile/index' }
]
```

- [ ] **步骤 3：验证编译产物**
运行：`npm run build:mp-weixin`
预期：`dist/build/mp-weixin/custom-tab-bar/` 下存在 4 个文件。
若 uni-app 未透传该目录，执行**回退方案**：将 tabBar 改为 Vue 组件 `src/components/tab-bar.vue`（复制同一份逻辑，`uni.switchTab`），在 4 个 tab 页模板底部引入；pages.json 移除 custom tabBar 配置，改回普通 tabBar 或纯页面内导航。

- [ ] **步骤 4：Commit**
```bash
git add -A
git commit -m "feat: 移植 AI_Project 自定义底部导航"
```

## 任务 6：移植数据与工具层

**文件：**
- 复制：`S1\data\courses.js`、`S1\data\guides.js`、`S1\data\dialogue.js` → `src/data/`
- 复制：`S1\utils\util.js`、`S1\utils\coins.js`、`S1\utils\report.js` → `src/utils/`

- [ ] **步骤 1：复制文件（保持 CJS 不动）**
```powershell
Copy-Item 'C:\AI_Project\data\courses.js','C:\AI_Project\data\guides.js','C:\AI_Project\data\dialogue.js' 'C:\创业项目\8.看见此刻\src\data\' -Force
Copy-Item 'C:\AI_Project\utils\util.js','C:\AI_Project\utils\coins.js','C:\AI_Project\utils\report.js' 'C:\创业项目\8.看见此刻\src\utils\' -Force
```

- [ ] **步骤 2：API 替换**

三个 utils 文件中 `wx.` 全部替换为 `uni.`（getStorageSync/setStorageSync）。`util.js` 内部 `require('../data/courses')`、`require('../utils/coins')` 相对路径不变。

- [ ] **步骤 3：数据完整性自查**
运行：`node -e "console.log(Object.keys(require('./src/data/courses')).length, Object.keys(require('./src/data/guides')).length)"`（在项目根目录）
预期：输出两个数字（课程路径数与急救引导数），无报错。

- [ ] **步骤 4：Commit**
```bash
git add -A
git commit -m "feat: 移植 AI_Project 数据与工具模块"
```

## 任务 7：全局入口与样式

**文件：** 修改 `src/App.vue`；复制素材

- [ ] **步骤 1：App.vue onLaunch 增加存储初始化**

`src/App.vue` 的 onLaunch 改为：
```ts
onLaunch(() => {
  console.log("App Launch");
  const s = uni as any;
  if (typeof s.getStorageSync("awakeningCoins") !== "number") s.setStorageSync("awakeningCoins", 10);
  if (typeof s.getStorageSync("hasSeenOnboarding") !== "boolean") s.setStorageSync("hasSeenOnboarding", false);
  if (typeof s.getStorageSync("streakDays") !== "number") s.setStorageSync("streakDays", 0);
  if (typeof s.getStorageSync("lastCheckInDate") !== "string") s.setStorageSync("lastCheckInDate", "");
});
```

- [ ] **步骤 2：App.vue 全局样式合并 AI_Project 的 app.wxss**

读取 `S1\app.wxss`，将其中 `page { ... }` 与全局公共类追加到 `src/App.vue` 的 `<style>`（保留 uni-app 原有 `page` 背景，二者统一为 AI_Project 的 `#2A231D` 深色主题）。

- [ ] **步骤 3：复制首页素材**
```powershell
New-Item 'C:\创业项目\8.看见此刻\src\static\images' -ItemType Directory -Force | Out-Null
Copy-Item 'C:\AI_Project\png\image_461556084166494.jpg' 'C:\创业项目\8.看见此刻\src\static\images\mood-bg.jpg' -Force
```

- [ ] **步骤 4：Commit**
```bash
git add -A
git commit -m "feat: 全局存储初始化与深色主题样式"
```

## 任务 8：移植首页（AI_Project 设计 + 快速觉察卡片）

**文件：**
- 创建：`src/pages/index/index.vue`（由 `S1\pages\index\` 四件套转换）

- [ ] **步骤 1：转换页面**

按「转换规则」把 `S1\pages\index\index.wxml` / `index.wxss` / `index.js` / `index.json` 合并为 `src/pages/index/index.vue`：
- template 用 `v-if`/`v-for`/`@tap` 重写；`<style scoped>` 放原 WXSS
- 首页图片引用改为 `/static/images/mood-bg.jpg`
- 修正路由：`/pages/breath/breath`→`/pages/breath/index`、`/pages/dialogue/dialogue`→`/pages/dialogue/index`、`/pages/emergency/emergency`→`/pages/emergency/index`、`/pages/practice/practice?path=...`→`/pages/practice/index?path=...`、`/pages/profile/profile`→`/pages/profile/index`
- `usingComponents` 中的 onboarding-guide / transition-guide 改为 `import` + `components` 注册（组件在任务 12 移植，先以任务 12 完成后再编译）

- [ ] **步骤 2：新增「快速觉察」卡片**

在 template 的情绪区与练习卡片之间插入：
```html
<view class="quick-card" @tap="goQuick">
  <text class="quick-icon">⚡</text>
  <view class="quick-info">
    <text class="quick-title">快速觉察</text>
    <text class="quick-desc">用 AI 引导，四步记录此刻的情绪</text>
  </view>
  <text class="quick-arrow">→</text>
</view>
```
在 `<style scoped>` 追加（沿用深色卡片风格）：
```css
.quick-card {
  display: flex; align-items: center; gap: 24rpx;
  margin: 32rpx 32rpx 0; padding: 32rpx;
  background: linear-gradient(135deg, #3A3229, #2A231D);
  border: 1rpx solid rgba(196,160,106,.35);
  border-radius: 24rpx;
}
.quick-icon { font-size: 56rpx; }
.quick-info { flex: 1; display: flex; flex-direction: column; }
.quick-title { color: #E8DFD0; font-size: 34rpx; font-weight: 600; }
.quick-desc { color: #C4C0B8; font-size: 24rpx; margin-top: 8rpx; }
.quick-arrow { color: #C4A06A; font-size: 36rpx; }
```
在 methods 中新增：
```js
goQuick() {
  uni.navigateTo({ url: '/pages/quick/index' })
}
```

- [ ] **步骤 3：构建验证**
运行：`npm run build:mp-weixin`
预期：成功，无语法错误（若任务 12 组件尚未就绪，本步骤可延后到任务 12 后统一验证）。

- [ ] **步骤 4：Commit**
```bash
git add -A
git commit -m "feat: 移植 AI_Project 首页并新增快速觉察入口"
```

## 任务 9：移植练习页

**文件：**
- 创建：`src/pages/practice/index.vue`（由 `S1\pages\practice\` 转换）
- 修改：`src/pages/learning/lesson/index.vue`（如 practice 通过 reLaunch 到 lesson 需改路由）

- [ ] **步骤 1：转换页面**

按「转换规则」转换四件套；检查 `practice.js` 中的 `reLaunch` / `navigateTo` URL，按路由映射表修正（`/pages/learning/lesson/lesson`→`/pages/learning/lesson/index` 等）。

- [ ] **步骤 2：构建验证**
运行：`npm run build:mp-weixin`
预期：成功。

- [ ] **步骤 3：Commit**
```bash
git add -A
git commit -m "feat: 移植练习页"
```

## 任务 10：移植探索页与课程详情

**文件：**
- 创建：`src/pages/learning/index.vue`、`src/pages/learning/lesson/index.vue`

- [ ] **步骤 1：转换两页**

按「转换规则」转换；`learning.js` 的 navigateTo（lesson 详情）URL 改为 `/pages/learning/lesson/index?id=...`；`lesson.js` 的 `wx.setNavigationBarTitle` → `uni.setNavigationBarTitle`。

- [ ] **步骤 2：构建验证**
运行：`npm run build:mp-weixin`
预期：成功。

- [ ] **步骤 3：Commit**
```bash
git add -A
git commit -m "feat: 移植探索与课程详情页"
```

## 任务 11：移植我的（报告）页

**文件：**
- 创建：`src/pages/profile/index.vue`（由 `S1\pages\profile\` 转换）

- [ ] **步骤 1：转换页面**

按「转换规则」转换；`profile.js` 中 `wx.setClipboardData` → `uni.setClipboardData`；内部导航 URL 按映射表修正。

- [ ] **步骤 2：构建验证**
运行：`npm run build:mp-weixin`
预期：成功。

- [ ] **步骤 3：Commit**
```bash
git add -A
git commit -m "feat: 移植个人报告页"
```

## 任务 12：移植引导组件

**文件：**
- 创建：`src/components/onboarding-guide.vue`、`src/components/transition-guide.vue`

- [ ] **步骤 1：确认使用位置**
运行：`rg -l "onboarding-guide|transition-guide" C:\AI_Project\pages`
预期：列出使用组件名（onboarding-guide 用于首页等；transition-guide 用于 practice 等），据此在对应 Vue 页面 import。

- [ ] **步骤 2：转换组件**

按「转换规则」把两个组件的 js/json/wxml/wxss 转为 Vue 组件（`<template>` + `<script>` + `<style scoped>`）；`wx.` → `uni.`；在使用的页面（任务 8/9）完成 import 与注册。

- [ ] **步骤 3：构建验证**
运行：`npm run build:mp-weixin`
预期：成功。

- [ ] **步骤 4：Commit**
```bash
git add -A
git commit -m "feat: 移植 onboarding/transition 引导组件"
```

## 任务 13：移植情绪急救页

**文件：**
- 创建：`src/pages/emergency/index.vue`（由 `S1\pages\emergency\` 转换）

- [ ] **步骤 1：转换页面**

按「转换规则」转换；`guides` 数据改为 `import guides from '@/data/guides'`；`courses`（页内 require）同样改默认导入；导航 URL 按映射表修正。

- [ ] **步骤 2：构建验证**
运行：`npm run build:mp-weixin`
预期：成功。

- [ ] **步骤 3：Commit**
```bash
git add -A
git commit -m "feat: 移植情绪急救页"
```

## 任务 14：移植呼吸练习页

**文件：**
- 创建：`src/pages/breath/index.vue`（由 `S1\pages\breath\` 转换）

- [ ] **步骤 1：转换页面**

按「转换规则」转换；导航 URL 按映射表修正；`vibrateShort` 改用 `uni.vibrateShort`。

- [ ] **步骤 2：构建验证**
运行：`npm run build:mp-weixin`
预期：成功。

- [ ] **步骤 3：Commit**
```bash
git add -A
git commit -m "feat: 移植呼吸练习页"
```

## 任务 15：移植此刻信箱页

**文件：**
- 创建：`src/pages/dialogue/index.vue`（由 `S1\pages\dialogue\` 转换）

- [ ] **步骤 1：转换页面**

按「转换规则」转换；`dialogue.js` 数据模块改为 `import dialogue from '@/data/dialogue'`；`showActionSheet` / `vibrateShort` 改用 uni API；导航 URL 按映射表修正。

- [ ] **步骤 2：构建验证**
运行：`npm run build:mp-weixin`
预期：成功。

- [ ] **步骤 3：Commit**
```bash
git add -A
git commit -m "feat: 移植此刻信箱页"
```

## 任务 16：测试迁移与 Jest 配置

**文件：**
- 创建：`__tests__/setup.js`、`__tests__/coins.test.js`、`__tests__/util.test.js`（复制自 `S1\__tests__\`）
- 修改：`package.json`（jest 依赖与配置、test 脚本）

- [ ] **步骤 1：复制测试文件**
```powershell
Copy-Item 'C:\AI_Project\__tests__\*' 'C:\创业项目\8.看见此刻\__tests__\' -Force
```

- [ ] **步骤 2：更新 setup.js**

`__tests__/setup.js` 全文替换为：
```js
global.uni = {
  getStorageSync: jest.fn(() => null),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn()
}
```

- [ ] **步骤 3：更新测试引用**

`coins.test.js` / `util.test.js`：
- `require('../utils/coins')` → `require('../src/utils/coins')`，`util.test.js` 同理指向 `../src/utils/util`
- 所有 `wx.getStorageSync` / `wx.setStorageSync` 断言与 mock 改为 `uni.getStorageSync` / `uni.setStorageSync`

- [ ] **步骤 4：更新 package.json**

`scripts` 增加 `"test": "jest"`；`devDependencies` 增加 `"jest": "^30.4.2"`；`jest` 配置：
```json
"jest": {
  "setupFiles": ["./__tests__/setup.js"]
}
```
（合并到已从 S2 复制的 package.json 中，保留 uni 脚本与依赖。）

- [ ] **步骤 5：运行测试**
运行：`npm test`
预期：全部 PASS（coins 与 util 两个测试文件）。

- [ ] **步骤 6：Commit**
```bash
git add -A
git commit -m "test: 迁移 Jest 测试并适配 uni API"
```

## 任务 17：全量构建与开发者工具验证

**文件：** 无新增（验证）

- [ ] **步骤 1：生产构建**
运行：`npm run build:mp-weixin`
预期：成功，`dist/build/mp-weixin` 生成。

- [ ] **步骤 2：检查产物 app.json**
预期：15 个页面、`tabBar.custom: true`、tabBar list 4 项为 首页/练习/探索/我的。

- [ ] **步骤 3：微信开发者工具编译**
运行（需开发者工具已安装、已登录）：
```powershell
& 'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat' open --project 'C:\创业项目\8.看见此刻\dist\build\mp-weixin'
```
预期：`√ open`，工具内编译无报错。

- [ ] **步骤 4：功能核对清单**

在开发者工具模拟器中逐项确认：
- 首页 = AI_Project 深色设计，含「快速觉察」卡片
- 点击快速觉察 → 四步流程（情绪→强度→事件→想法→AI 回应）
- 流程内可进 对话/记录/洞察；可返回首页
- 底部导航 首页/练习/探索/我的 正常切换
- 急救/呼吸/信箱/课程/报告页面可达且样式正常
- 冷启动无 tab 高亮闪烁

- [ ] **步骤 5：Commit 剩余变更**
```bash
git add -A
git commit -m "chore: 合并完成，构建验证通过"
```

## 任务 18：收尾与文档

**文件：** `README.md`（新建）、`AGENTS.md`（新建，可选）

- [ ] **步骤 1：写 README**

创建 `README.md`：项目简介（合并来源、页面结构、快速觉察入口）、开发命令（`npm run dev:mp-weixin` / `npm run build:mp-weixin` / `npm test`）、目录结构、注意事项（appid 在 `src/manifest.json` 的 mp-weixin 段，目前为 `wx4d4542b0093696f7`，如需更换改此处）。

- [ ] **步骤 2：更新设计文档的 CJS 说明**

`docs/superpowers/specs/2026-08-02-being-merge-design.md` 中"数据与存储"一节，将"由 CommonJS 转换为 ESM"改为"保留 CommonJS（Jest 原生兼容），Vue 中通过默认导入互操作使用"，并 commit。

- [ ] **步骤 3：最终验证**
运行：`npm test` 与 `npm run build:mp-weixin`
预期：测试通过、构建成功。

- [ ] **步骤 4：Commit**
```bash
git add -A
git commit -m "docs: README 与规格修订"
```

---

## 自检记录

**规格覆盖度：** 设计规格中的每一项（框架底座、页面路由、快速觉察入口、tabBar、组件素材、存储键、测试、基础设施保留/排除、验证标准）均有对应任务：任务 1-7 覆盖骨架/路由/导航/tabBar/数据/全局；任务 8-15 覆盖全部 8 个 AI_Project 页面与组件；任务 16 覆盖测试；任务 17 覆盖验证标准；任务 18 覆盖文档与收尾。

**占位符扫描：** 无 TODO/待定；每个移植任务都指向具体源文件与精确目标路径；新代码（pages.json、tabBar 数组、快速觉察卡片、App.vue onLaunch、setup.js、导航修正）均给出完整代码。

**类型一致性：** 路由统一使用「路由映射表」；页面命名统一 `pages/<name>/index.vue`；`uni.` API 与 CJS 默认导入方式全计划一致。
