# Stack Game Design Specification (V2.0 - Final Ketchapp Clone)

**Game Title**: 极致层叠 (Zen Layers) - Based on "Stack"
**Genre**: Hyper-casual / Rhythm / 3D Isometric
**Target Engine**: Three.js (WeChat Mini Program)
**Reference**: Ketchapp "Stack" (#1 Mobile Game Standards)

---

## 1. 核心玩法 (Gameplay Mechanics)

### 1.1 基础循环 (Core Loop)
-   **目标**: 堆叠无限高的方块塔。
-   **操作**: 全屏任意位置单点触摸 (Tap)。
-   **流程**:
    1.  **待机 (Idle)**: 显示塔基，屏幕提示 "点击开始"。
    2.  **游戏 (Playing)**: 方块沿 X/Z 轴交替往复移动。点击屏幕锁定位置。
    3.  **切割 (Slicing)**: 未重合部分被物理切断掉落。上方新方块继承切割后的尺寸。
    4.  **结束 (Game Over)**: 当方块完全未重合（尺寸降为0）时，整体掉落，游戏结束。

### 1.2 进阶机制 (Advanced Mechanics)
-   **完美对齐 (Perfect Stack)**:
    -   **判定**: 误差值 `delta < 3.0` (宽容度)。
    -   **视觉**: 触发白色波纹扩散 (Ripple Effect) + 屏幕边缘发光特效。
    -   **听觉**: 音调提升 (Pitch Up)。
-   **回血机制 (Growth/Heal)**:
    -   **触发**: 连续 **8次** Perfect。
    -   **效果**: 方块尺寸增加 **10%**，可叠加直至恢复初始尺寸。
-   **速度曲线 (Difficulty)**:
    -   初始速度设为 `V`。
    -   每成功放置 1 个方块，速度增加 **0.5%**。
    -   速度上限为 **2.5V**。

---

## 2. 美术规范 (Art Specifications - 1:1 Fidelity)

**核心关键词**: `Minimalism`, `Matte`, `Gradient`

### 2.1 场景与环境 (Environment)
-   **3D 等距视角 (Isometric View)**:
    -   取消透视畸变，确保视觉一致性。
    -   摄像机沿 Y 轴平滑跟随堆叠高度上移。
-   **颜色系统 (Color System)**:
    -   **动态偏移**: 每成功放置 1 个方块，色相 (Hue) 顺时针偏移 **1度** (累计 10 块偏移 10度)。
    -   **配色方案**: 高饱和度 (70-80%)、中低明度 (50-60%)，维持极简高级感。
    -   **背景**: 随方块色调动态变化的 **同类色/邻近色 (Analogous)** 渐变。背景色相为方块色相 + 40°，且饱和度更低 (40%)、明度更高 (80-90%)，营造半透明大气感。
-   **光影配置**:
    -   **全局光照 (AO)**: 使用柔和的 Ambient Occlusion 或阴影贴图区分叠层空间感。
    -   **主光**: `DirectionalLight` (0.8强度, 产生投影, 暖白色)。
    -   **柔和阴影 (Drop Shadow)**: 开启 PCFSoftShadowMap，阴影偏差 `bias: -0.0005`。
    -   **环境光**: `AmbientLight` (0.8強度，提升整体明亮度)。

### 2.2 方块与物理 (Blocks & Physics)
-   **材质**: `MeshPhongMaterial` (Shininess: 10, Specular: 0x222222)。材质表现为“柔和哑光塑料”，具有极微弱的高光点以勾勒边缘。
-   **碎片 (Debris)**:
    -   **物理模拟**: 使用成熟物理引擎（如 `Cannon.js`）进行刚体动力学模拟 (Gravity Rigidbody)。
    -   **切落瞬间**: 当未能完美对齐时，多余部分瞬间脱离主体，并作为独立刚体向下坠落。
    -   **坠落与翻滚**: 具有真实的碰撞检测和随机初始角速度，受重力影响下落、翻滚并与塔身发生可能的碰撞反馈，最终自然滑出屏幕。
    -   **因果反馈**: 玩家需要直观看到“失误的部分掉下去”的过程，建立强烈的视觉反馈。

### 2.3 视觉特效 (VFX)
-   **完美波纹 (Perfect Ripple)**: 触发 Perfect 时，白色线框从中心向外扩散热散。
-   **死亡闪光 (Death Flash)**: 游戏结束瞬间，屏幕叠加一层白色遮罩，0.2秒内淡出。
-   **屏幕震动 (Screen Shake)**: 游戏结束（方块掉落）瞬间，摄像机进行轻微的随机偏移震动。

---

## 3. 音效与反馈 (Audio & Haptics)

### 3.1 动态音效 (Procedural Audio)
-   **Combo 音阶**: C大调音阶 (C4 -> C5)。每连续一次 Perfect 升一个半音/全音。
-   **第8级 (Major Chord)**: 触发回血时，播放特殊的 **重音/和弦**，随后音调重置或循环高音。
-   **切断声 (Snip)**: 短促、干燥的打击声 (Wood Block)。
-   **坠落声 (Fall)**: 游戏结束时的重低音撞击声。

### 3.2 触感反馈 (Haptics - iOS/Android)
-   **Perfect**: `Taro.vibrateShort({ type: 'light' })` (轻微震动)。
-   **Game Over**: `Taro.vibrateLong()` (重震动)。

---

## 4. 界面规范 (UI Specifications)

### 4.1 布局
-   **分数 (Score)**:
    -   位置: 屏幕上方 20% 处居中。
    -   样式: 纯白、极细字体 (Thin)、巨大字号 (80px+)。
    -   阴影: 轻微的 Drop Shadow 保证在浅色背景下的可见度。
-   **连击提示 (Combo)**:
    -   位置: 当前方块上方。
    -   触发: 完美叠合时弹出。
    -   动画: 0.5秒内上浮并淡出。

### 4.2 结算处理 (Result Handling)
-   **游戏结束**: 当方块尺寸归零或完全未重合时。
-   **页面跳转**: 游戏结束后，场景会将最终分数与截图数据传递给独立的 **Result Page** 进行展示与交互（如重试、分享）。
-   **场景重置**: 接收到“重试”指令后，游戏场景瞬间重置。

---

## 5. 技术栈确认
-   **渲染**: Three.js + `three-platformize`
-   **物理**: Cannon.js / cannon-es (成熟刚体物理引擎，确保碎片翻滚与碰撞的真实感)
-   **UI**: React (Taro View) 覆盖在 Canvas 之上
