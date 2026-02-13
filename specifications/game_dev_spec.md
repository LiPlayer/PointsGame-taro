# 门店积分小游戏 · 快消式单局开发规范表 (V1.4)

本规范表是《全量开发实施规范 V3.6》的核心子协议。在开发任何“赚积分（Earn）”流程中的随机游戏时，必须强制遵守以下准则。

---

## 1. 结构与进度规范 (Structure & Progression)

| 维度 | 规范要求 (Standard) | 严禁行为 (Forbidden) |
| :--- | :--- | :--- |
| **关卡体系** | **无关卡设计 (Level-Free)**。游戏启动即开始，单一场景循环，结束后直接跳转结算。 | ❌ 禁止设计“选关”、“剧情动画”或“关卡加载页”。 |
| **成长体系** | **零成长机制 (Zero Growth)**。所有玩家初始属性（速度、力量等）完全一致。 | ❌ 禁止设计等级提升、技能加点或装备强化系统。 |
| **单局时长** | **快节奏闭环**。由 DDS 难度曲线自然控制单局节奏与时长，不设定硬性时间限制。 | ❌ 禁止设计节奏拖沓、无难度攀升或导致用户长时间停留的玩法模式。 |
| **异常退出** | **优雅降级**。资源加载失败或逻辑报错必须有 `try-catch` 并自动跳回 Entry 页。 | ❌ 严禁在加载失败时显示白屏或无响应。 |

---

## 2. 交互与体验规范 (Interaction & UI)

| 维度 | 规范要求 (Standard) | 详细约束 |
| :--- | :--- | :--- |
| **新手引导** | **视觉诱导 (Visual Cue)**。仅允许使用 3s 内的动画手势（如动态小手、引导线）。 | ❌ 严禁使用文字说明书。如果需要解释，说明设计已失败。 |
| **核心交互** | **Touch First**。逻辑必须绑定 `onTouchStart` 以实现零延迟，确保在小程序环境下的极致响应。 | ❌ 严禁使用 `onClick`，严禁绑定 Mouse 事件（防止双重触发）。 |
| **视觉安全区** | **全屏适配**。游戏内关键 UI 必须避开顶部通知栏（20px+）和底部安全线。 | ❌ 禁止将得分或退出键放在刘海屏/灵动岛遮挡区域。 |

---

## 3. 技术实施规范 (Technical Spec)

本项目采用“逻辑-渲染分体”架构，确保复杂游戏逻辑与 Taro/React UI 完全解耦，彻底避免 React Re-render 导致的掉帧。

### 3.1 引擎架构与标准 (Architecture & Approved Frameworks)

-   **选型标准**:
    -   **2D 游戏**: 强制 `PixiJS (v7)`。优点：轻量、Webapp 支持成熟。
    -   **3D 游戏**: 强制 `Three.js` (Weapp 适配版)。若场景极端复杂需采用 `PlayCanvas`。
-   **UI 融合**: Taro 只负责游戏外围 UI（按钮、分数显示）；游戏内部所有图形、文字必须在 Canvas 内部绘制。
-   **SSOT**: `src/engine/` 目录下的核心类 (`GameLoop`, `Resolution`) 是架构的唯一真理实现。

### 3.2 跨端性能准则 (Performance & Compatibility)

1.  **单向数据通信**: Taro UI 通过 `Ref` 或 `window` 单向调用引擎 API；引擎严禁通过 `setState` 驱动游戏逻辑（仅限在游戏结束等低频时点回调 React）。
2.  **内存预分配 (Pool Logic)**: 所有 2D Sprite 或 3D Object 必须在预加载阶段创建，运行时严禁频繁 `new` 或销毁对象。
3.  **分辨率隔离**: 必须遵循 `maxDPR` 策略。默认优先保证画质（使用原生 DPR），但在高负载情况下允许通过 `GameLoop` 构造函数手动限制。
4.  **资源池化**: Texture 和 Geometry 必须全局共享，避免重复解析导致的内存溢出。
5.  **计时器坑 (Crucial)**: 部分微信环境下全局不存在 `performance` 对象。引擎计时必须使用 `getNow()` 抽象，优先尝试 `performance.now()`，若失败则降级至 `Date.now()`。
6.  **销毁期坑 (Disposal)**: 在 Weapp 页面卸载（Unmount）瞬间，Canvas 适配器或 window 模拟对象可能先于渲染器被置空。执行 `renderer.dispose()` 时必须包裹 `try-catch` 并添加引用检查，防止报错崩溃。

### 3.3 通用游戏核心架构 (Core Engine Architecture)

#### 1. 架构逻辑与渲染分离
-   **单向数据流**: 逻辑层 (`IPhysicsWorld`) 只处理状态更新，渲染层 (`IRenderPipeline`) 只负责绘制，`GameLoop` 协调两者。
-   **标准化接口**:
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
      init(canvas: any, width: number, height: number, dpr: number, platform?: any): void
      render(physics: IPhysicsWorld): void
      destroy(): void
    }
    ```

#### 2. 坐标与分辨率 (Resolution System)
-   **逻辑像素主导**: 所有业务逻辑必须基于 **逻辑像素 (CSS Pixels)**，位移与碰撞判定必须排除 dpr 干扰。
-   **自动 DPR 处理**: `GameLoop` 内部通过 `Resolution` 模块自动处理物理/逻辑像素转换。
-   **像素标准**: dpr 仅在渲染器初始化时用于 `Canvas` 缩放。

#### 3. 时间步长 (Time Step)
-   **Variable Timestep**: 物理更新基于真实 `deltaTime` (ms)。
-   **安全限制**: `MIN_DT`: 1ms, `MAX_DT`: 64ms。

### 3.4 交互与输入交互规范 (Input Handling)

为确保在 H5 和 WeApp 环境下行为一致：
-   ✅ **Touch First**: 游戏内的点击交互**必须且只能**绑定 `onTouchStart` (或 `PointerEvent` 的 `pointerdown`)。
-   ❌ **严禁 Click**: 严禁使用 `onClick` 处理游戏逻辑（防止 300ms 延迟及双重触发）。
-   ❌ **新手引导**: 仅允许使用 3s 内的动画手势诱导，严禁使用文字说明书。

### 3.5 资源与音频管理 (Assets & Audio)

-   **资源管理**: 
    -   **云端按需加载**: 使用 `IAssetLoader`，游戏素材严禁打包进小程序主包。
    -   **卸载释放**: 卸载时必须显式调用 `texture.destroy()` 释放显存。
-   **音频系统**:
    -   **系统默认**: 禁止引用大型自定义字体文件。
    -   **实例管理**: 统一使用 `Taro.createInnerAudioContext`。音频 context 必须在页面卸载时关闭，严禁在卸载后继续播放。

### 3.6 分包与大规模扩展 (Subpackage & Cloud Assets)

本项目需支持 **100+ Games**，采用分包 + 云端资源加载架构。
-   **云端结构**: `/games/{gameId}/` 存放配置和资源。
-   **资源加载器**: 封装 `IAssetLoader` 接口以抹平不同云服务商差异。

---

## 4. 经济模型规范 (Economy & Safety)

| 维度 | 规范要求 (Standard) | 逻辑说明 (Rationale) |
| :--- | :--- | :--- |
| **产出控制 (Yield)** | **单局 DDS (Dynamic Difficulty)**。随时间推移线性提速，确保单局在 1-3 分钟内自然终结。 | 通过难度强制控制单局时长，从而将积分产出的速率锁定在宏观可控范围内。 |
| **安全防御 (Safety)** | **反弊逻辑**。核心计分逻辑需具备一致性校验。 | 严禁通过暂停、重连等 UI 状态规避死亡判定。 |
| **商业闭环 (Loop)** | **快消式体验**。结束后直接跳转结算，禁止在游戏内进行社交或其他停留行为。 | 确保“玩游戏 -> 得积分 -> 去消费”的链路极简且高频。 |

---

## 5. 游戏注册表 (Game Registry)

当前已实现且符合规范的游戏列表：

- **[Stack (极致层叠)](../src/packages/games/Stack/index.tsx)**：3D 轴侧视角堆叠游戏，包含程序化音频与动态背景。
- **[KnifeHit (神厨飞刀)](../src/packages/games/KnifeHit/index.tsx)**：程序化动作旋转游戏，强调破坏反馈与打击感。
