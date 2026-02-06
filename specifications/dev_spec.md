# 门店积分小游戏 · 统一一致性约束与实施规范 (V3.2)

**适用对象**：开发者 / 团队 / AI 协作工具  
**核心架构**：Taro v4 (Native Shell + Game Core)
**UI 框架**：React 18 + Tailwind CSS (via weapp-tailwindcss)
**项目性质**：线下门店引流 + 复访驱动的轻量小游戏系统

---

## 文档定位（必须先读）

本文档是本项目从 0 开始开发时的**唯一权威规范**。它同时扮演三种角色：

- 需求来源文档（为什么要做）
- 交互与产品规范（用户看到什么、怎么用）
- 工程实施约束（代码与架构不能怎么写）

任何功能、页面、玩法、工程实现，只要与本文档冲突，即视为错误。

---

## 1. 项目背景与核心目标（最高级约束）

### 1.1 核心商业目标

本小游戏系统的唯一目的：为线下门店持续引流，形成长期、稳定的回头客。

> 游戏不是目的，积分不是目的，**再次到店消费**才是目的。

### 1.2 一句话用户路径

> 到店扫码 → 玩一下 → 得积分 → 付款抵扣 → 下次再来

### 1.3 用户前提（不可假设用户会学习）

- 用户不是玩家
- 用户不看规则
- 用户只愿意花几十秒

> 如果一个设计需要解释，说明设计已经失败。

---

## 2. 范围冻结（什么能做，什么绝对不能做）

### 2.1 本项目允许存在的能力

- 积分获取 (Play to Earn)
- 随机进入小游戏 (Random Encounter)
- 游戏收集与复玩 (Collection)
- 门店付款抵扣 (Payment)
- 积分分享/转赠 (Social Share)

### 2.2 本项目明确禁止的方向（红线）

- 商城 / 商品兑换
- 提现 / 现金等价
- 等级 / 成长体系 / 任务列表
- 排行榜 / 社交裂变（除点对点赠送外）
- 概率展示 / 保底 / 连抽

> 可以内部使用随机逻辑，但系统对用户不可呈现“抽奖 / 赌博感”。

---

## 3. 核心概念统一定义（防止认知漂移）

### 3.1 积分 (Points)

积分 = 付款抵扣数值（100 积分 ≈ 1 元，具体汇率由后端配置）。

只允许用于：
- 门店付款抵扣
- 当面转给朋友

### 3.2 Earn（赚积分入口）

Earn 不是玩法，只是一次结果分流器。

作用：决定本次交互是“直接获得积分”还是“进入小游戏”。

心理学目标：制造“惊喜感”而非“博弈感”。

### 3.3 游戏 (Game)

游戏是：积分的获取方式、新鲜感与记忆点。

游戏不是：
- 独立长期产品
- 成长体系核心

### 3.4 Collection（游戏图鉴）

Collection 收集的是“遇到过的小游戏”，而不是卡片或奖励。

作用：
- 展示已遇到游戏
- 提供复玩入口（不发积分）

### 3.5 Evaporation（积分蒸发）

自然规律：食材会变凉，热情会冷却，积分也会随时间流逝而蒸发。

#### 积分三次幂蒸发模型 (Point-Cubic Decay)

**核心理念**：
- 积分越多，蒸发越快
- 与时间呈线性关系，与积分呈三次幂关系

**核心配置输入 (Developer Config)**：

```ts
const P_MAX = 1280;      // 积分天花板
const DAYS_TO_CAP = 7;   // 达到天花板所需天数
```

其他变量全部自动推导，开发者无需关心。

**模型设计目标**：
- 平衡性：在 $P_{max}$ 处，每日蒸发量 ≈ 每日产出量
- 成长性：从 0 开始玩，连续 $D_{cap}$ 天达到 $P_{max}$

**数学模型**：

衰减微分方程：

$$ \frac{dP}{dt} = -\lambda P^3 $$

解析解（代码实现）：

$$ P_{real}(t) = \frac{P_{last}}{\sqrt{1 + 2\lambda P_{last}^2 \cdot \Delta h}} $$

参数自动推导：

每日期望产出 $G_{daily}$：

$$ G_{daily} = \frac{8 \cdot P_{max}}{7 \cdot D_{cap}} $$

示例：P_max = 1280, D_cap = 7 → G_daily ≈ 209 分/天（单局目标 ≈ 70 分）

衰减系数 $\lambda$：

$$ \lambda = \frac{G_{daily}}{24 \cdot P_{max}^3} $$

控制台日志（启动时输出）：

```text
[Economy] P_MAX: 1280, DAYS_TO_CAP: 7
[Economy] Derived G_DAILY: 209.22 pts/day
[Economy] Derived LAMBDA: 4.20e-11
[Economy] Target per game (3 games/day): ~69.74 pts
```

---

## 4. 视觉与 UI 规范 (V3.2 Design Tokens)

### 4.1 视觉标准 (Visual Golden Master)

**一切视觉样式以 [specifications/prototype.html](file:///d:/Project/PointsGame-web/specifications/prototype.html) 为唯一事实标准 (SSOT)。**

开发者必须直接查看 `prototype.html` 文件（浏览器打开或看源码）来获取：
-   精确的 **颜色值** (Color Tokens)
-   精确的 **间距与圆角** (Spacing & Radius)
-   **字体大小与粗细** (Typography)
-   **组件布局** (Component Layout)

> 注意：`prototype.html` 使用 Tailwind 编写。
> 由于本项目已集成 `weapp-tailwindcss`，开发者**可以直接复制 (Copy & Paste)** `prototype.html` 中的 Class 样式到 Taro 代码中，无需手动翻译为 Sass。

### 4.2 核心图标隐喻 (Icon Metaphors)

- Home：门店 Logo（婷）
- Earn：闪电 / 手柄
- Collection：奖杯 (Trophy)
- Share：礼物 (Gift)
- Scan/Pay：扫码框 (Viewfinder)

---

## 5. 页面与交互一致性规范

> **Visual Priority**: 所有页面的布局结构、元素层级、留白，必须严格复刻 `prototype.html` 中的设计。

### 5.0 全局导航 (Global Nav)

- **沉浸式体验**: 微信小程序必须开启全屏模式，**禁止保留顶部原生导航栏区域** (`navigationStyle: 'custom'`)。
- Home 页：无顶部导航，沉浸式背景填充至屏幕顶部。
- 其他页面：左上角悬浮 [X] 按钮，需避开胶囊按钮 (Capsule Button) 区域。
- 行为：点击 [X] 直接返回 Home（Reset to Home，不走历史栈）

### 5.1 Home（首页）

**核心展示**：
- 门店名称：婷姐•贵州炒鸡
- 当前可用积分（大字展示）

**主操作区（Grid Layout）**：
- 赚积分（Primary Button, Full Width）
- 已收集的游戏（Secondary, Icon Block）
- 分享积分（Secondary, Icon Block）
- 付款抵扣（Dark Button, Full Width）

**Canvas 实现要点（H5/Weapp 一致性）**：
- H5 环境使用原生 `<canvas>` + `ref` 直接 `getContext('2d')`，不要依赖 `Taro.createSelectorQuery().fields({ node: true })`，否则 H5 取不到 `node` 导致没有星星。
- Weapp 仍用 `fields({ node: true, size: true, rect: true })` 拿到小程序专用 CanvasNode。
- 初始化时均需按 `dpr`（`devicePixelRatio` 或 `pixelRatio`）设置物理分辨率，再按 `width/375` 计算 `scaleFactor`。
- 触摸交互共用一套逻辑：先用缓存的 bounding rect，将 `clientX/Y` 转换为局部坐标；找不到时再各自平台查询一次。

### 5.2 Earn Flow（赚积分流程）

三个连续状态：

#### State A: Entry（入口）
- 标题：Play & Earn
- 文案：准备好了吗？
- 行为：点击“开始” → 随机判定 → State B 或 C

#### State B: Instant Win（直接获分）
- 文案：惊喜时刻！无需游戏，直接获分
- 行为：查看结果 → Result

#### State C: Game Encounter（遇到游戏）
- 首次遇到：必须展示“解锁新游戏”高亮标签或动效
- 行为：开始挑战 → Game Container

### 5.3 Game Container（游戏容器）

- 顶部悬浮透明 [X]
- 禁止游戏内部绘制退出按钮
- 禁止游戏内部显示积分 UI
- Game Over 后延迟 1.5s 跳转 Result

### 5.4 Result（结算页）

**Earn 模式**：
- 显示本次得分 vs 最高记录
- Diff 动效逻辑：
  - Current > Best：绿色 +Diff
  - Current ≤ Best：灰色提示“未突破最高分”

**Collection 模式**：
- 显示“复玩不计分”

**操作**：
- 换个运气
- 再玩一次

### 5.5 Share（积分分享）

- Top：我的收款二维码 + 文案
- Bottom：输入转赠金额 + 扫码转出

### 5.6 StorePay（门店支付）

- Scan：扫描商户收款码
- Confirm：订单总额 - 积分抵扣 = 最终支付

### 5.7 Collection（图鉴）

- 卡片展示已解锁游戏
- 未解锁灰色或隐藏
- 提示：复玩不会获得积分

---

## 6. 一致性规则 (Logic Constraints)

### 6.1 积分一致性

- 云端存储：`{ points, lastUpdatedAt, dailyPlayCount }`
- 前端：根据 timestamp 应用蒸发公式
- 原子性：积分变更必须在云端完成

### 6.2 游戏循环一致性

- Earn 重试：取最高分作为最终结算
- 高分实时同步（防崩溃）
- Collection 复玩：不请求接口、不增加积分

### 6.3 防刷与安全

- StorePay 锁：支付确认页冻结积分
- Earn 锁：单日次数上限

---

## 7. 部署与环境规范 (Architecture V4.0 - Unified Taro)

### 7.1 技术栈 (Tech Stack)

- Framework: Taro v4 (React)
- CSS: **Tailwind CSS** (via `weapp-tailwindcss`) + Sass
- 2D Game: Taro Canvas
- 3D Game: Taro 3D / WebGL Adapter (Three.js via three-platformize) - **No WebView**

### 7.2 目录结构

```text
├── config/             # Taro Build Config
│   ├── index.js
├── src/
│   ├── app.config.js
│   ├── app.js
│   ├── app.scss        # Tailwind directives here
│   ├── pages/
│   └── assets/
├── tailwind.config.js  # Tailwind Configuration
├── postcss.config.js   # PostCSS Configuration
└── package.json
```

### 7.3 分辨率与坐标系规范 (Resolution & Coordinate System)

#### A. 视觉设计标准 (Visual Standard)
- **基准画布**: **375px × 812px** (iPhone X/13 逻辑比例)。
- **设计稿单位**: 1:1 像素单位。开发者在 `prototype.html` 中看到的 `px` 即为代码直接书写值。

#### B. 2D 渲染规范 (UI & 2D Canvas)
- **UI 样式**: 
  - 项目 `designWidth` 已设为 `375`。
  - **强制要求**: 书写原生 `px`。Taro 会自动将其转换为 `rpx` (375 屏幕下 1px = 2rpx)，确保跨端缩放准确。
  - **Tailwind**: 直接复制 `prototype.html` 中的 Tailwind 类名（如 `p-4`, `w-8`），无需转换单位。
- **2D Canvas**: 
  - 必须使用逻辑像素进行布局绘制。
  - 必须应用物理像素缩放以防止模糊：`ctx.scale(dpr, dpr)`。

#### C. 3D 与游戏核心 (Game Core)
- **渲染分辨率**: 强制物理像素渲染。
- **DPR 处理**:
  ```ts
  const dpr = Taro.getSystemInfoSync().pixelRatio
  // 渲染器缓冲区使用物理像素 (清晰度保障)
  renderer.setSize(width * dpr, height * dpr, false)
  // 容器显示使用逻辑像素 (布局对齐)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ```

---

## 8.0 Taro单代码库·全端一致性保障 (Single-Codebase Consistency)

为确保“一套代码（Taro）”在 H5 原型与微信小程序真机中效果一致，必须遵守以下核心架构约束：

### 8.1 视觉与单位 (Units & Visual)
- **绝对单位**: **强制只写 `px`**。
  - Taro 会根据 `designWidth: 375` 自动将 `px` 转为小程序的 `rpx` 和 H5 的 `rem`。
  - **禁忌**: 严禁在代码中手动书写 `rem` 或 `rpx` 单位，这会导致 Taro 的自动伸缩机制失效。比例失调是双端对齐失败的首要原因。
- **字体加粗**:
  - 现象：安卓微信对 `font-black` 渲染偏细。
  - 方案：必要时对关键数字应用 `text-shadow: 0 0 1px currentColor` 进行视觉增广。
- **SVG 图标 (No Inline SVG in JSX)**: 
  - **禁令**: 在小程序环境下，Taro 对原生 `<svg>` 标签支持极差，编译时常将其误判为名为 `comp` 的组件导致崩溃。
  - **方案**: 统一将 SVG 路径转义后存入 CSS 的 `background-image` (Data URI) 中，或直接引用图片资源。
- **行高对齐**: 统一使用 `leading-none` 加 `padding` 定位，消除不同内核 Baseline 差异。
- **多设备适配策略 (Aspect Ratio Strategy)**:
  - **核心原则**: **宽度锁定 (Fixed-Width-Fit) + 高度弹性 (Flexible-Height)**。
  - **安全区 (Safe Zone)**:
    - 核心游戏交互区必须限制在 **9:16 (0.5625)** 的正中区域内。
    - 高于 16:9 的屏幕（即长屏手机）：内容垂直居中，顶部/底部留白或使用装饰性背景填充（Overscan）。
    - 低于 16:9 的屏幕（即 iPad/折叠屏）：侧边留白或调整摄像机 FOV，保证内容不被裁剪。
  - **UI 适配**:
    - 顶部导航/状态栏：使用 `safe-area-inset-top`。
    - 底部操作栏：使用 `safe-area-inset-bottom`。
    - 中间区：使用 `flex-1` 或 `justify-between` 吸收高度增量。

### 8.2 层级霸凌与同层渲染 (Layering)
- **Canvas 2D**: 
  - 小程序端必须指定 `type="2d"`。这是启用“同层渲染”的关键，允许 `z-index` 跨原生组件生效，解决“图形挡住按钮”或“文字层级异常”的问题。
- **Cover-View 降级**:
  - 如果必须覆盖在非同层渲染的原生组件上，使用 `CoverView`。它在小程序是原生层，在 H5 会自动降级为常规 `div`，保持逻辑一致。
- **CSS 特性差异**:
  - **Backdrop-filter**: 小程序部分低端机支持较差。需补充 `background: rgba(255,255,255,0.95)` 作为降级方案。
  - **Mix-blend-mode**: 
    - **Weapp**: 在 `canvas` 及其父容器应用时，必须确保容器开启了 `isolate` 或有明确的 `z-index`。
    - **H5**: 支持良好，但在 Safari 下可能需要 `-webkit-` 前缀或特定的堆叠上下文。

### 8.3 视口与安全区 (Viewport)
- **禁用法令**: **严禁使用 `100vh`**。
  - 原因：H5 包含地址栏，小程序包含状态栏，`100vh` 会导致底部内容偏离。
  - 方案：统一使用 `min-h-screen` (Tailwind) 或 `height: 100%`。必须确保 `app.scss` 中 `page { height: 100% }` 已显式定义。
- **安全区**: 定位吸底元素必须使用 `env(safe-area-inset-bottom)`。
- **状态栏与胶囊按钮 (Status Bar & Capsule)**:
  - **Weapp**: 必须通过 `Taro.getSystemInfoSync().statusBarHeight` 动态获取高度并应用为 Padding。
  - **H5**: 建议通过环境变量注入模拟高度。

### 8.4 渲染时机与生命周期 (Timing)
- **NextTick 机制**: 
  - 获取 Canvas 实例或测算 DOM 尺寸前，**必须包裹在 `Taro.nextTick()` 中**。
  - **Weapp 特供缓冲**: 在真机上，布局容器伸缩可能存在延迟，初始化时建议在 `nextTick` 后再附加 `50ms` 延迟，确保获取的是稳定后的最终尺寸。
- **离屏渲染 (Offscreen Canvas)**:
  - `Taro.createOffscreenCanvas` 在 H5 端不存在。
  - **方案**: 分支处理，H5 环境使用标准 `document.createElement('canvas')`。

### 8.5 交互反馈 (Interaction)
- **点击延迟消除**:
  - 游戏高频按钮禁止使用默认 `onClick`（在某些环境下有 300ms 延迟），推荐使用 `onTouchStart` + `onTouchEnd` 模拟点击。
- **手势穿透**:
  - 小程序弹出层必须使用 `catchMove` 防止底层滚动。
  - H5 端需通过 `overscroll-behavior: none` 禁掉橡皮筋效果。
- **Webview 滚动**: 小程序默认禁用 `rubberBand` (橡皮筋回弹)，H5 需通过 CSS `overscroll-behavior: none` 禁用来保持手感一致。

### 8.6 环境分支策略 (APIs & Environment Branching)
- **条件编译**: 仅在以下不可调和的差异时才使用 `process.env.TARO_ENV`：
  1. 状态栏高度计算（小程序需避开胶囊按钮，H5 无需）。
  2. Canvas 初始化 API（`createCanvasContext` 仅用于旧版，新版推荐 `createSelectorQuery` 查找真实节点）。
  3. 分享逻辑（微信 API vs H5 复制链接）。

### 8.7 数据持久化与存储 (Storage)
- **现象**: H5 的 `localStorage` 几乎无限制（5MB+），但小程序的 `setStorageSync` 单个 key 建议不超过 200KB，总量不超过 10MB。
- **强制方案**:
  - **大数据隔离**: 严禁将大型 JSON 对象（如全量游戏配置）存储在单个 Key 中。
  - **同步 vs 异步**: 首页初始化建议使用 `getStorage` (异步)，避免 `getStorageSync` 阻塞 UI 渲染层导致白屏。

### 8.8 自定义组件样式隔离 (Component Scoping)
- **现象**: 外部 CSS 无法修改自定义组件内部样式（Weapp 的 Shadow DOM 限制）。
- **强制方案**:
  - **配置隔离**: 所有自定义组件必须声明 `options: { addGlobalClass: true }`，确保 Tailwind 等全局原子类能渗透进组件内部。
  - **禁止级联**: 避免写 `& .child` 这种深层级联选择器，小程序组件化后层级会发生变化。**强制使用原子类**。

### 8.9 自定义组件与元素选型 (Component Selection)
- **原生元素陷阱**: 小程序的原生 `Button` 自带不可重置的 UA 样式。
  - **方案**: 除必须使用原生能力的场景外，高保真布局建议使用 `View` 模拟按钮。
- **权限配置**: 所有自定义组件必须声明 `options: { addGlobalClass: true }`，确保 Tailwind 原子类渗透。
- **层级隔离**: 避免深层 CSS 级联，强制使用原子类。

### 8.9 资源路径与网络 (Network & Assets)
- **现象**: H5 本地测试可用相对路径，小程序真机必须使用 HTTPS 且域名必须在白名单内。
- **强制方案**:
  - **图片地址**: 动态图片路径建议统一封装 `resolveAsset(url)` 工具函数，自动根据环境切换 CDN 前缀。
  - **静态引用**: 在 JS 中引入图片必须使用 `import img from './icon.png'`，由 Webpack 处理路径映射，严禁硬编码本地绝对路径。
- **音频与多媒体 (Audio Consistency)**:
  - **实例唯一**: 统一使用 `Taro.createInnerAudioContext`。
  - **交互诱导**: H5 端通过“开始”按钮点击事件触发 `audio.play()` 以绕过浏览器浏览器自动播放限制。
- **字体加载 (Font Loading)**:
  - **双向加载**: 小程序端必须显式调用 `Taro.loadFontFace`，并配合 `CSS @font-face` 作为降级。
- **资源加载一致性**:
  - **图片**: 小程序主包有大小限制，较大的静态图（如首页 Canvas 用背景）建议放在 `assets` 目录并由 Webpack 处理。
  - **SVG**: 推荐将 SVG 转换为内联 DataURI 或使用图标库组件，避免网络请求延迟导致 H5 已显示而小程序还是空白的问题。
- **全局样式污染 (Styling Scope)**:
  - **层级显写**: 复杂选择器（如 `& > div`）尽量转为原子类，避免依赖 CSS 层级。
  - **变量注入**: Tailwind 配置的自定义间距/颜色，确保在小程序 `config/index.js` 的 `postcss` 插件中正确配置了 `weapp-tailwindcss`。
- **内存与性能瓶颈 (Performance Bottleneck)**:
  - **资源释放**: 在 `onUnload` 或销毁组件时，必须强制清除所有 Canvas `requestAnimationFrame` 计数器，并将大型数组/离屏 Canvas 设置为 `null` 辅助 GC 手动回收。
  - **序列化屏障**: 减少 JS 逻辑层与 Canvas 渲染层之间的大型数据传输。尽量在 Canvas 内部维护状态，而不是通过 React State 驱动每一帧的坐标。


## 8. 游戏列表 (Game Registry)

### 8.1 砂锅围筷子 (Chopsticks)
- 状态：已发布
- 类型：2D
- 机制：Knife Hit 变体

### 8.2 飞翔的小鸡 (Flappy Chicken)
- 状态：已发布
- 类型：2D
- 机制：Flappy Bird 变体

### 8.3 叠蒸笼 (Stack Tower)
- 状态：待开发
- 类型：3D
- 机制：节奏堆叠

### 8.4 疯狂炒鸡 (Crazy Stir-fry)
- 状态：原型阶段
- 类型：2D
- 机制：接住掉落食材

---

## 9. 变更规则

修改本文档前，必须先修改本文档，再改代码。

> 一致性优先于一切。
