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

### 1.1 核心商业目标
本小游戏系统的唯一目的：**为线下门店持续引流，形成长期、稳定的回头客**。游戏不是目的，积分不是目的，再次到店消费才是目的。

### 1.2 一句话用户路径
> 到店扫码 → 玩一下 → 得积分 → 付款抵扣 → 下次再来

### 1.3 用户前提（不可假设用户会学习）
用户不是玩家，不看规则，只愿意花几十秒。
**设计原则**：如果一个设计需要解释，说明设计已经失败。

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
- **实例管理**：游戏音效统一使用 `Taro.createInnerAudioContext`，严禁使用 HTML5 `<audio>` 标签。
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
3. **分辨率隔离**：必须遵循 `maxDPR` 限制。3D 游戏在微信小程序中强制限制 `resolution <= 1.2` 以保散热稳定。
4. **资源池化**：Texture 和 Geometry 必须全局共享，避免重复解析导致的内存溢出。


#### C. 坐标系统与分辨率 (Coordinate System & Resolution)
**核心原则**：物理/逻辑计算使用**逻辑像素 (Logical Pixels)**，渲染层自动处理 DPR 转换。

1. **逻辑像素主导**：
   - 所有游戏逻辑（物理计算、碰撞检测、交互判定）必须基于**逻辑像素**（CSS Pixels）
   - 逻辑像素与设备无关，确保跨设备一致的游戏体验
   
2. **分辨率安全网 (maxDPR)**：
   - H5 环境：`resolution = min(devicePixelRatio, 2.0)`
   - WeApp 环境：`resolution = min(devicePixelRatio, 1.5)`
   
3. **坐标转换规则**：
   - **物理坐标 → 渲染坐标**：由渲染引擎（PixiJS/Three.js）根据 `resolution` 属性自动处理
   - **触摸输入 → 逻辑坐标**：直接使用容器相对坐标，无需 DPR 转换
   - **禁止手动缩放**：严禁在物理层手动乘以 DPR，所有缩放由渲染层统一处理

4. **一致性保证**：
   - 相同的物理参数（速度、力、半径）在不同 DPR 设备上产生相同的视觉效果

#### D. 游戏循环与帧率 (Game Loop & Frame Rate)
**核心原则**：采用 **Fixed Timestep (60Hz)** 确保物理模拟的确定性和跨设备一致性。

1. **固定时间步长 (Fixed Timestep)**：
   - 物理更新必须使用固定步长 `16.66ms` (60Hz)
   - 使用累加器模式处理可变帧间隔
   - 限制最大 deltaTime 防止"死亡螺旋"（建议 100ms）

2. **60Hz 锁定优化**：
   - 检测 60Hz 屏幕时自动锁定 deltaTime 为固定值
   - 容差范围：`|deltaTime - 16.66| < 4ms`
   - 消除浮点误差导致的微小抖动

3. **渲染插值 (Interpolation)**：
   - 渲染位置必须在当前帧和前一帧之间线性插值
   - 插值因子 `alpha = accumulator / fixedDelta`
   - 消除高刷新率屏幕（120Hz+）的视觉抖动

4. **帧率目标**：
   - **目标**：稳定 60 FPS
   - **最低**：不低于 30 FPS（低端设备）
   - **监控**：开发模式下每秒打印 FPS 到控制台

5. **跨刷新率兼容**：
   - 60Hz 设备：1:1 物理/渲染同步
   - 120Hz+ 设备：物理 60Hz，渲染 120Hz（插值）
   - 低于 60Hz：允许跳帧，但物理步长不变

#### E. 通用游戏引擎框架 (Generic Game Engine Framework)

所有游戏/特效必须实现以下接口，配合通用 `GameLoop` 使用：

```typescript
// src/engine/IPhysicsWorld.ts
interface IPhysicsWorld {
  init(width: number, height: number): void
  update(dt: number): void
  resize(w: number, h: number): void
  destroy(): void
}

// src/engine/IRenderPipeline.ts
interface IRenderPipeline {
  init(canvas: any, width: number, height: number, dpr: number): void
  render(physics: IPhysicsWorld, alpha: number): void
  destroy(): void
}
```

**通用 GameLoop (src/engine/GameLoop.ts)**：
- Fixed Timestep 60Hz 物理更新
- 渲染插值消除高刷新率抖动
- `onFixedUpdate()` 钩子供子类覆写

**使用模式**：
```typescript
// 1. 实现接口
class MyPhysics implements IPhysicsWorld { ... }
class MyRenderer implements IRenderPipeline { ... }

// 2. 继承 GameLoop
class MyGameLoop extends GameLoop {
  constructor(pixi, canvas, w, h, dpr) {
    super(new MyPhysics(), new MyRenderer(pixi), canvas, w, h, dpr)
  }
  protected onFixedUpdate() { /* 自定义逻辑 */ }
}
```

**示例**：`src/effects/` 首页积分粒子系统完整实现了此框架。


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
- **逻辑**：游戏结束后延迟 1.5s 跳转 Result 页。

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
