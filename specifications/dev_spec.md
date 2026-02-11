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
- **实施位置**：每次启动 App / 打开首页时，前端根据 `last_active_timestamp` 计算并更新显示分值，随后同步至后端。

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

### 4.4 游戏引擎规范 (Game Engine Spec)
本项目采用“逻辑-渲染分体”架构，确保复杂游戏逻辑与 Taro/React UI 完全解耦，彻底避免 React Re-render 导致的掉帧。

#### A. 选型标准 (Approved Frameworks)
- **2D 游戏**：强制 `PixiJS (v7)`。优点：轻量、Webapp 支持成熟。
- **3D 游戏**：强制 `Three.js` (Weapp 适配版)。若场景极端复杂需采用 `PlayCanvas`。
- **UI 融合**：Taro 只负责游戏外围 UI（按钮、分数显示）；游戏内部所有图形、文字必须在 Canvas 内部绘制。

#### B. 跨端性能准则 (Performance & Compatibility)
1. **单向数据通信**：Taro UI 通过 `Ref` 或 `window` 单向调用引擎 API；引擎严禁通过 `setState` 驱动游戏逻辑（仅限在游戏结束等低频时点回调 React）。
2. **内存预分配 (Pool Logic)**：所有 2D Sprite 或 3D Object 必须在预加载阶段创建，运行时严禁频繁 `new` 或销毁对象。
3. **分辨率隔离**：必须遵循 `maxDPR` 策略。默认优先保证画质（使用原生 DPR），但在高负载情况下允许通过 `GameLoop` 构造函数手动限制。
4. **资源池化**：Texture 和 Geometry 必须全局共享，避免重复解析导致的内存溢出。
5. ⚠️ **计时器坑 (Crucial)**：部分微信环境下全局不存在 `performance` 对象。引擎计时必须使用 `getNow()` 抽象，优先尝试 `performance.now()`，若失败则降级至 `Date.now()`。
6. ⚠️ **销毁期坑 (Disposal)**：在 Weapp 页面卸载（Unmount）瞬间，Canvas 适配器或 window 模拟对象可能先于渲染器被置空。执行 `renderer.dispose()` 时必须包裹 `try-catch` 并添加引用检查，防止 `cancelAnimationFrame of null` 导致的系统崩溃。


#### C. 通用游戏核心架构 (Core Engine Architecture)
**SSOT**: `src/engine/` 目录下的核心类 (`GameLoop`, `Resolution`) 是架构的唯一真理实现。

1.  **架构总览 (Architecture Overview)**
    -   **逻辑-渲染分离**: 游戏逻辑 (`IPhysicsWorld`) 与渲染表现 (`IRenderPipeline`) 严格解耦。
    -   **单向数据流**: 逻辑层只处理状态更新，渲染层只负责绘制，`GameLoop` 负责协调两者。
    -   **分辨率托管**: 开发者无需手动计算 DPR，`GameLoop` 自动通过 `Resolution` 模块处理物理/逻辑像素转换。

2.  **坐标与分辨率 (Resolution System)**
    -   **逻辑像素主导**: 所有业务逻辑（速度、位置、碰撞体积）必须基于 **逻辑像素 (CSS Pixels)**。
    -   **自动 DPR 处理**: `GameLoop` 构造函数不再接受外部 `dpr`，内部通过 `Resolution.getInfo(width, height)` 自动计算物理尺寸。
    -   **自动 DPR 处理**: `GameLoop` 默认使用设备原生 `devicePixelRatio` 以获得最佳画质 (No Cap)。
    -   **性能调优 (Optional)**:
        -   默认情况下不限制 DPR，优先保证画质。
        -   对于高负载 3D 游戏，允许在 `GameLoop` 构造函数中传入 `{ maxDPR: 2.0 }` 进行手动限制，以平衡发热与画质。

3.  **时间步长 (Time Step)**
    -   **Variable Timestep (全变速)**: 物理更新基于真实 `deltaTime`，最大程度利用高刷屏流畅度。
    -   **直接渲染**: 不再使用插值 (`alpha`)，渲染器直接绘制物理引擎的当前状态。
    -   **安全限制**:
        -   `MIN_DT`: 1ms (防止除零)
        -   `MAX_DT`: 64ms (防止卡顿穿模)

4.  **标准化接口 (Standard Interfaces)**

    所有游戏/特效必须实现以下接口：

    ```typescript
    // src/engine/IPhysicsWorld.ts
    interface IPhysicsWorld {
      init(width: number, height: number): void // 接收逻辑宽高
      update(dt: number): void // 可变步长 dt (ms)
      resize(w: number, h: number): void
      destroy(): void
    }

    // src/engine/IRenderPipeline.ts
    interface IRenderPipeline {
      /** 初始化渲染器 */
      init(canvas: any, width: number, height: number, dpr: number, platform?: any): void
      /** 渲染一帧 */
      render(physics: IPhysicsWorld): void
      destroy(): void
    }
    ```

    **通用 GameLoop 使用模式**:
    ```typescript
    // src/engine/GameLoop.ts
    class MyGameLoop extends GameLoop {
      private platform: any;

      constructor(canvas, w, h, options?: { maxDPR?: number }) {
        // 默认满画质，或者通过 options 限制 DPR：
        super(new MyPhysics(), new MyRenderer(), canvas, w, h, options)
      }

      public start() {
        // ... 平台初始化逻辑 ...
        super.start(this.platform)
      }
    }
    ```

5.  **强制合规与禁手 (Compliance & Forbidden Patterns)**
    **违反以下规则的代码审核将不予通过 (Zero Tolerance)**：
    
    -   ❌ **严禁绕过 GameLoop**: 禁止手动调用 `requestAnimationFrame` 或自定义计时器循环。
    -   ❌ **严禁手动缩放**: 禁止在游戏逻辑中乘以 `dpr`，或手动修改 Canvas 宽高（必须委托给 `GameLoop`）。
    -   ❌ **严禁状态耦合**: 禁止在 `IPhysicsWorld` 中直接操作 React State 或 DOM/Taro 节点。
    -   ❌ **严禁引擎污染**: `src/engine/` 目录仅限存放**绝对通用**的代码（如数学库、音频只有底层管理）。任何特定游戏的逻辑（如“消除音效”、“方块纹理”）必须存放于 `src/games/{GameName}/` 目录下。

6.  **输入交互规范 (Input Handling Spec)**
    为确保在 H5 (Mobile/Desktop) 和 WeApp 环境下行为一致，同时也支持 Chrome Emulation 调试：
    
    -   ✅ **Touch First**: 游戏内的点击交互**必须且只能**绑定 `onTouchStart` (或 `PointerEvent` 的 `pointerdown`)。
    -   ❌ **严禁 Click**: 严禁使用 `onClick` 处理游戏逻辑（会有 300ms 延迟，且在 Emulation 模式下会造成双重触发）。
    -   ❌ **无视 Mouse**: 严禁绑定 `onMouseDown`，除非你明确知道自己在做什么（Chrome Emulation 会在 touch 后模拟 mouse 事件，导致由“松开”引发的误触）。
205: 
206: 7.  **性能监控规范 (Performance Monitoring Spec - Debug Only)**
207:     为确保开发过程中能够实时掌握性能状况，所有游戏集成必须支持 FPS 显示机制：
208:     
209:     -   ✅ **引擎集成**: `GameLoop` 必须维护 `fps` 属性，实时计算平滑帧率。
210:     -   ✅ **UI 集成**: 游戏容器或主页面必须在开发环境下渲染 `src/engine/DebugOverlay` 组件。
211:     -   ✅ **节流策略**: 为避免监控工具本身干扰性能，`DebugOverlay` 必须采取节流读取策略（推荐 **1000ms/次**），严禁随帧更新 React State。
212:     -   ✅ **环境隔离**: 监控逻辑必须包裹在 `if (process.env.NODE_ENV === 'development')` 中，确保 Release 包完全不含此类代码。


### 4.5 分包与云端资源 (Subpackage & Cloud Assets)

本项目需支持**大规模游戏扩展 (100+ Games)**，采用分包 + 云端资源加载架构。

#### A. 微信小程序分包限制
| 限制项 | 数值 |
|--------|------|
| 单个主包/分包 | ≤ 2MB |
| 总包大小 | ≤ 30MB |

**规则**：TabBar/启动页/公共组件必须放主包；分包之间不能互相引用。

#### B. 云端游戏加载架构
游戏数量超限时，采用微信云存储动态加载：
- 主包：核心页面 + 通用游戏容器 + 引擎核心
- 云端：`/games/{gameId}/` 存放配置和资源

#### C. 资源加载抽象层
封装 `IAssetLoader` 接口，便于未来切换云服务商 (wx-cloud → tencent-cos / aliyun-oss)：
```typescript
// src/utils/assetLoader.ts
export interface IAssetLoader {
  getAssetUrl(path: string): Promise<string>
  downloadFile(remotePath: string): Promise<string>
}
```

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
- **UI**：顶部悬浮透明 [X]，禁止游戏内部绘制退出按钮。
- **逻辑**：游戏结束后经过确认或者自动跳转 Result 页。

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

### 6.2 游戏循环
1. **Start**: 检查次数 -> 扣除次数 -> 进入游戏。
2. **Play**: 纯前端逻辑。
3. **End**: 上传分数 + 签名 -> 后端下发积分。

---

## 7. 游戏列表 (Registry)

> 完整游戏列表已迁移至独立文档：[game_list.md](./game_list.md)
