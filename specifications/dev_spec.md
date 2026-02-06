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

- Home 页：无顶部导航，沉浸式
- 其他页面：左上角悬浮 [X] 按钮
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

#### A. 2D 上下文 (UI & 2D Canvas)
- **设计稿标准**: 375px 设计稿 (iPhone 6/7/8 为基准)
- **单位策略**:
  - UI 样式: 书写 `px` 会被转换。由于 `designWidth` 设为 `375`，写 `100px` 在真机上表现为 `200rpx`，正好对应 375 屏幕下的 100 物理像素点。
  - 2D Canvas: 通常使用逻辑像素 (`windowWidth`)，但需与设计系统对齐。

#### B. 3D 上下文 (WebGL / Three.js)
- **渲染标准**: 物理像素 (强制使用物理像素以保证清晰度)
- **DPR 处理**:
  ```ts
  const dpr = Taro.getSystemInfoSync().pixelRatio
  // 内部缓冲区大小 (物理像素)
  renderer.setSize(width * dpr, height * dpr, false)
  // CSS 显示尺寸 (逻辑像素)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ```
- **坐标系**: 右手坐标系 Y轴向上 (Three.js 默认)

#### C. Aspect Ratio Strategy (多设备适配策略)
- **核心原则**: 宽度优先 (Width-First)，高度弹性 (Height-Flexible)。
- **Game Content (2D & 3D)**:
  - **Safe Zone (安全区)**: 核心玩法区域必须限制在 **9:16 (约 0.56)** 的比例范围内。
    - 无论设备屏幕多长 (如 20:9)，必须保证该核心区域完整可见。
    - 无论设备屏幕多宽 (如 iPad)，必须保证该核心区域不被裁剪 (Letterbox or FOV adjustment)。
- **2D UI**:
  - 顶部/底部固定元素：使用 `fixed` 定位及 `safe-area-inset-*` 适配刘海屏与 Home Bar。
  - 中间内容区：使用 Flex 弹性布局 (`flex-1`) 自适应剩余高度。
- **3D Specifics**:
  - **FOV 适配**: 默认为垂直 FOV 固定。针对极宽屏幕 (iPad)，需动态调整 Camera Distance 或 FOV 以保证横向内容不被裁剪。
  - **背景填充**: 3D 场景背景应有一定的冗余 (Over-scan)，以覆盖全面屏手机的超长纵横比 (如 20:9)。

---

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

