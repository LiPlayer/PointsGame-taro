# 门店积分粒子系统技术规范 (Points Particle System Spec)

**适用范围**：首页积分卡片 (Home Points Card) 粒子特效
**技术栈**：PixiJS v7 + Custom Verlet Physics
**最后更新**：V3.6

---

## 0. 核心架构与约束 (Core Architecture & Mandates)
针对移动端高性能需求（3000+ 物理实体），本项目采用 **"PixiJS + Verlet Physics"** 自研框架。

### 0.1 核心准则 (Core Architecture)
- **渲染层**：强制 `PixiJS (v7)` + `WebGL`。严禁 Canvas 2D 回退。
- **物理层**：强制 **100% 自研 Verlet Integration** + **TypedArray**。彻底移除外部物理引擎（如 Matter.js）以实现零渲染循环开销。
- **循环层**：强制 **Fixed Timestep (60Hz)**，与屏幕刷新率解耦。
- **纯净性**：游戏核心类 (`GameLoop`, `Physics`) **严禁引用 Taro/React**。

### 0.2 关键约束 (Critical Constraints)
1. **DPR 托管**：物理世界始终使用**逻辑像素**。渲染层限制最高分辨率（H5 <= 2.0, WeApp <= 1.5）以保 60FPS。
2. **状态解耦**：所有物理状态修改（加分/耗分）必须在 **Fixed Update** 步长内闭环。
3. **SSOT 配置**：物理参数必须由 `Constants.ts` 集中分发，全局禁止逻辑内硬编码。

---

## 1. 性能指标 (Performance Targets)
为确保在移动端微信小程序环境下的流畅度，本系统必须满足以下指标：
- **粒子数量**：支持 **3000+** 动态粒子同时在屏。
- **帧率目标**：
  - **High-End (iOS/Android Flagship)**: 稳定 60 FPS。
  - **Low-End (Entry Level)**: 不低于 30 FPS。
- **内存占用**：Heap 增长 < 10MB，无频繁 GC。

---

## 2. 物理引擎实现 (Physics Implementation)

### 2.1 核心算法：Verlet Integration
采用无速度衰减的韦尔莱积分，以获得比欧拉积分更稳定的物理表现。
- **位置更新**：`x = x + (x - oldX) * friction + gravity`
- **内存优化**：全量使用 `Float32Array` 存储 `x, y, oldX, oldY`，严禁使用对象 (`{x, y}`)。

### 2.2 碰撞检测：Grid Partitioning
- **空间划分**：将屏幕划分为 `cellSize` (约 18px) 的网格。
- **查询复杂度**：从 $O(N^2)$ 降低至 $O(N)$。
- **数据结构**：使用 `Int32Array` 实现链表式网格索引 (`heads`, `nexts`)，避免数组分配开销。

### 2.3 交互模型：Repulsion (斥力)
- **触发机制**：用户手指触摸/拖拽时产生斥力场。
- **力学模型**：基于距离的反比斥力，但在 **Fixed Update** 中施加，确保不同刷新率下总冲量一致。

---

## 3. 渲染系统 (Render System)

### 3.1 PixiJS 架构
- **容器**：使用 `PIXI.ParticleContainer` (options: position, rotation, scale, alpha)。
- **纹理**：
  - **仅生成一次**：在 `RenderSystem` 初始化时使用 `PIXI.Graphics` 绘制并通过 `generateTexture` 生成。
  - **复用机制**：所有 3000 个粒子共享同一个 Texture 引用。

### 3.2 分辨率策略与坐标系 (Resolution & Coordinates)
- **逻辑像素主导**：所有物理计算基于 Logical Pixels。
- **分辨率安全网 (MAX_DPR)**：
  - H5: `resolution = min(DPR, 2.0)`
  - Weapp: `resolution = min(DPR, 1.5)`
- **坐标一致性**：`渲染坐标 = 物理坐标 * resolution`。此转换由 PixiJS 渲染器根据 `resolution` 属性内部自动处理，物理逻辑无需感知，从而保证了跨平台运动半径和力感的一致。

---

## 4. 游戏循环架构 (Game Loop)

### 4.1 Fixed Timestep (60Hz)
为了解决高刷新率屏幕 (120Hz) 下物理仿真过快的问题，采用蓄水池 (Accumulator) 模式：
```typescript
while (accumulator >= 16.66ms) {
    physics.update(16.66ms);
    accumulator -= 16.66ms;
}
```

### 4.2 Interpolation (插值)
渲染帧的位置 **must** 进行线性插值，以消除类似 60Hz 物理在 144Hz 显示器上的抖动：
`renderPos = currentPos * alpha + oldPos * (1 - alpha)`

---

## 5. 组件集成 (Integration)

### 5.1 纯净性 (Purity)
- `GameLoop`, `PhysicsSystem`, `RenderSystem` 必须保持纯 TS 实现，不依赖 React/Taro。
- 仅通过 **构造函数注入** Canvas 和 Dimensions。

### 5.2 生命周期 (Lifecycle)
- **Mount**: `useEffect` -> `readCanvasInfo` -> `new GameLoop()` -> `loop.start()`
- **Unmount**: `useEffect return` -> `loop.destroy()` -> `PIXI.Application.destroy()`
- **Race Condition Guard**: 必须使用 `isMounted` 标志位防止异步初始化在组件卸载后执行。
