# 门店积分小游戏 · 全量开发实施规范 (V3.6 - Final)

**适用对象**：开发者 / 团队 / AI 协作工具
**核心架构**：Taro v4 (React) + Tailwind CSS (via weapp-tailwindcss)
**适用范围**：H5 (Web) / 微信小程序 (Weapp)
**SSOT**：视觉标准以 `prototype.tsx` 为准，逻辑标准以本文档为准。

---

## 0. AI 协作协议 (AI Protocol - 🔴 CRITICAL)

系统指令：任何参与本项目开发的 AI 助手必须强制遵守以下工作流：

- **规范优先 (Spec First)**：本文档是代码的唯一真理来源。严禁生成与本文档约束（如 Tailwind 类名、Taro Hook 封装、资源引用方式）相悖的代码。
- **偏差阻断 (Deviation Lock)**：如果在开发过程中发现本文档的规范在技术上不可行、过时或存在更优解；严禁直接编写偏离规范的代码（即“先斩后奏”）。
- **流程约束**：
    1. 必须先执行 **[文档修正]** 动作：更新本文档的相关章节，向用户陈述理由，并等待用户确认。
    2. **确认后执行**：只有在本文档更新并被用户确认后，方可根据新的规范生成代码。

> **Rule**: Code must follow the Spec. If the Code needs to change, the Spec must change first.

---

## 1. 项目背景与核心目标（最高级约束）

### 1.1 核心商业目标 (Core Business Goal)
本系统的唯一使命：**为线下门店持续引流，打造高频复购闭环**。
- **游戏不是目的**：只是流量抓手。
- **积分不是目的**：只是留存钩子。
- **再次到店消费才是目的**。

### 1.2 用户行为路径 (User Journey)
**路径 A：到店转化 (Acquisition)**
> 进店扫码 → 玩一局 (30秒) → 得积分 → 当场抵扣 → **离店**

**路径 B：离店召回 (Retention)**
> 微信下拉 (小程序) → 闲暇时间玩游戏 → 积分积累 → **诱发消费冲动** → **再次到店**

### 1.3 用户画像与设计原则 (User Persona & Principles)
**用户画像**：不是玩家，是顾客。不看规则说明书，只愿意投入碎片化时间 (10-60秒)。
**设计原则**：**零门槛 (Zero Friction)**。如果一个功能需要解释，说明设计已经失败。

---

## 2. 范围冻结（什么能做，什么绝对不能做）

### 2.1 本项目允许存在的能力
- 积分获取 (Play to Earn)
- 随机进入小游戏 (Random Encounter)
- 游戏收集与复玩 (Collection)
- 门店付款抵扣 (Payment)
- 积分分享/转赠 (Social Share)

### 2.2 绝对红线 (Forbidden)
- ❌ **严禁实物兑换系统**：不做商城，只做付款抵扣。
- ❌ **严禁复杂账户**：无注册流程，扫码即玩 (Login Anonymously)。
- ❌ **严禁排行社交**：不通过排行榜制造焦虑，只允许点对点赠送。
- ❌ **严禁赌博感**：可以内部随机，但不可呈现“抽奖机”视觉。

---

## 3. 核心概念与数学模型

### 3.1 积分 (Points)
- 积分 = 付款抵扣数值（100 积分 ≈ 1 元）。
- 只允许用于付款抵扣或转赠。

### 3.2 积分三次幂蒸发模型 (Points Decay)
积分随时间自然衰减，促使用户尽快到店消费。

$$P_{real}(t) = \frac{P_{last}}{\sqrt{1 + 2\lambda P_{last}^2 \cdot \Delta h}}$$

- **参数配置**：`MAX_POINTS = 1280`, `DAYS_TO_CAP = 7`
- **实施位置 (Crucial)**：
    - **UI 展示**：每次启动 App / 打开首页时，前端根据 `lastUpdatedAt` 纯推算分值用于实时动画显示，**严禁自动向后端同步推算值**。
    - **逻辑写入**：只有在发生真正的分值变动（加分/减分）时，前端才基于当前瞬时推算值作为基准计算目标分值，并调用云函数一次性写入后端。这样保证了数据库中只有真实的变更记录。

### 3.3 Earn (入口)
Earn 不是玩法，只是一次结果分流器。决定本次交互是“直接获得积分”还是“进入小游戏”。

---

## 4. Taro 工程化实施规范 (Engineering Spec)

本章节为 Taro 开发的最高技术准则，包含针对小程序环境的特殊配置。

### 4.1 样式与单位 (Styling & Units)
- **框架**：`weapp-tailwindcss` (必选)。
- **组件样式隔离 (Critical)**：所有自定义组件（Component）必须在配置中显式声明 `options: { addGlobalClass: true }`，否则 Tailwind 原子类无法在组件内部生效。
- **单位策略**：全项目强制使用 **px**。
    - **原理**：Taro 编译时会自动将 px 转换为 rpx (Weapp) 和 rem (H5)。
    - **禁止**：严禁手动写 rpx 或 vw/vh，严禁使用 100vh（会导致 iOS 底部遮挡），应使用 `min-h-screen`。
- **安全区 (Safe Area)**：统一使用 CSS 变量：`pb-[env(safe-area-inset-bottom)]`。

### 4.2 资源管理 (Assets)
- **图片引用**：
    - ❌ **禁止**：在 CSS/Tailwind Class 中引用本地图片路径（如 `bg-[url('./img.png')]`）。
    - ✅ **推荐**：使用 `<Image src={require('@/assets/img.png')} />` 或 Base64/CDN URL。
- **字体策略 (Font Strategy)**：
    - **禁用自定义字体**：全项目禁止引用自定义网络字体或本地字体文件，以优化加载速度和稳定性。
    - **系统字体栈**：强制使用系统默认字体，确保在 iOS (苹方) 和 Android (思源/MiSans) 下具备原生流畅感。
    - **CSS 规范**：全局样式必须包含完整的 Fallback 序列，优先匹配原生 UI 字体。

### 4.3 音频与多媒体 (Audio & Multimedia)
- **实例管理**：
    - **音频文件**：统一使用 `Taro.createInnerAudioContext`。
    - **程序化音频**：允许使用 `Taro.createWebAudioContext` (若支持) 生成简单波形音效 (Oscillator)，以减少对外部素材的依赖。
    - ⚠️ **兼容性坑**：微信小程序主逻辑环境下不存在 `window.AudioContext`。音频引擎初始化必须优先判断环境并使用 `Taro.createWebAudioContext()` 作为替代。
- **交互诱导**：H5 环境下，浏览器禁止自动播放。必须在用户首次点击（如“开始”按钮）的事件回调中执行一次 `audio.play()` (即使是播放静音片段) 以解锁音频上下文。

### 4.4 游戏开发标准 (Game Development Standard)

所有游戏相关的引擎设计、跨端性能准则、分辨率隔离、标准化接口及分包加载规范，已统一迁移至独立协议：

> **SSOT**: [game_dev_spec.md](./game_dev_spec.md)


### 4.5 分包加载策略 (Subpackage Strategy)

本项目需支持分包加载，微信小程序单分包需控制在 2MB 以内。非核心大型资源应尽可能通过云端加载。详细的资源加载抽象层 (`IAssetLoader`) 请参阅 `game_dev_spec.md`。

---

## 5. 页面与交互一致性规范 (详细版)

### 5.1 Home（首页）
- **核心展示**：门店 Logo、当前可用积分（大字）、粒子特效背景。
- **操作区**：赚积分、已收集游戏、分享积分、付款抵扣。
- **Taro 实现**：粒子动画需在 `onHide` 时暂停 loop，`onShow` 时恢复。

### 5.2 Earn Flow（赚积分流程）
三个连续状态，前端根据后端返回的 `seed` 决定分支：
1. **State A: Entry** (准备开始)
2. **State B: Instant Win** (直接获分)
3. **State C: Game Encounter** (遇到游戏)
- **Taro 实现**：路由跳转前即计算好结果，避免白屏等待。

### 5.3 Game Container（游戏容器）

统一的游戏内 UI 标准及生命周期逻辑已迁移至 `game_dev_spec.md`。

### 5.4 Result（结算页）
- **模式**：Earn (积分+Diff动效) / Collection (不计分提示)。
- **操作**：换个运气 / 再玩一次。

### 5.5 Share（积分分享）
- **功能**：展示收款码 / 扫码转积分。
- **限制**：**仅限面对面扫码 (Face-to-Face Only)**，严禁线上分享。
- **Taro 实现**：
    - **Weapp**: 禁用 `ShareAppMessage`，扫码接口强制 `onlyFromCamera: true`。
    - **H5**: 仅展示二维码，不提供复制链接功能。

### 5.6 StorePay（门店支付）
- **流程**：Scan -> Confirm。
- **Taro 实现**：进入 Scan 时调用 `Taro.setScreenBrightness({ value: 1 })`。

---

## 6. 数据与状态一致性

### 6.1 积分原子性
- **展示层**：允许前端预计算。
- **结算层**：关键操作必须等待后端 ACK，失败则回滚。

### 6.2 游戏状态机 (Game State)

游戏单局的业务循环（Start -> Play -> End）详细定义请参阅 `game_dev_spec.md` 的经济模型章节。

---

## 7. 游戏列表 (Registry)

> 完整游戏列表与单局开发细节已迁移至独立文档：[game_dev_spec.md](./game_dev_spec.md)
