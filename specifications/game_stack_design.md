# Stack Game Design Specification (V2.0 - Final Ketchapp Clone)

**Game Title**: 极致层叠 (Zen Layers)
**Genre**: Hyper-casual / Rhythm / 3D Isometric
**Target Engine**: Three.js (WeChat Mini Program)

---

## 1. 核心玩法 (Gameplay Mechanics)

### 1.1 基础循环 (Core Loop)
-   **目标**: 堆叠无限高的方块塔。
-   **操作**: 全屏任意位置单点触摸 (Tap)。
-   **流程**:
    1.  **待机 (Idle)**: 显示塔基，屏幕提示 "Tap to Start"。
    2.  **游戏 (Playing)**: 方块沿 X/Z 轴交替往复移动。点击屏幕锁定位置。
    3.  **切割 (Slicing)**: 未重合部分被物理切断掉落。上方新方块继承切割后的尺寸。
    4.  **结束 (Game Over)**: 当方块完全未重合（尺寸降为0）时，整体掉落，游戏结束。

### 1.2 进阶机制 (Advanced Mechanics)
-   **完美对齐 (Perfect Stack)**:
    -   **判定**: 误差值 `delta < 3.0` (宽容度)。
    -   **视觉**: 触发白色波纹扩散 (Ripple Effect) + 屏幕极其微弱的闪光。
    -   **听觉**: 音调提升 (Pitch Up)。
-   **回血机制 (Growth/Heal)**:
    -   **触发**: 连续 **8次** Perfect。
    -   **效果**: 方块尺寸按 `BaseSize * 0.1` 的步长逐次扩大，直至恢复初始大小。
-   **速度曲线**:
    -   初始速度: `2.0`
    -   加速逻辑: 每层增加 `0.05`，无上限。

---

## 2. 美术规范 (Art Specifications - 1:1 Fidelity)

**核心关键词**: `Vibrant`, `Plastic`, `Atmospheric`

### 2.1 场景与环境 (Environment)
-   **无限色相环 (Infinite Hue Cycle)**:
    -   **逻辑**: `Hue = (LayerIndex * 5) % 360`。
    -   **参数**: 饱和度 `S=80%`，亮度 `L=65%` (糖果色/马卡龙色系)。
-   **动态背景 (Dynamic Atmosphere)**:
    -   **实现**: CSS `linear-gradient` (Top: HSL+10% Lightness, Bottom: HSL-10% Lightness)。
    -   **星空粒子 (Starry Particles)**:
        -   60+ 个白色半透明方块粒子 (`THREE.Points`)。
        -   从下往上缓慢漂浮，无限循环。
-   **光影配置**:
    -   **主光**: `DirectionalLight` (1.0强度, 产生投影)。
    -   **边缘光**: `Rim Light` (背光, 0.6强度, 勾勒轮廓)。
    -   **环境光**: `AmbientLight` (0.5強度)。

### 2.2 方块与物理 (Blocks & Physics)
-   **材质**: `MeshPhongMaterial` (Shininess: 30, Specular: 0x333333)。
-   **碎片 (Debris)**:
    -   **重力**: 受重力加速度 ($g$) 影响加速下落。
    -   **翻滚**: 具有随机初始角速度，下落时自然旋转。
    -   **交互**: 碎片颜色需继承本体。

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
    -   位置: 分数下方。
    -   样式: 毛玻璃胶囊背景 + 这色文字。

### 4.2 结算页 (Result Overlay)
-   **触发**: 游戏结束 (Game Over) 后延迟 1s 弹出。
-   **内容**:
    -   本局分数 (Current Score)。
    -   **历史最高 (Best Score)** (本地持久化)。
    -   "Play Again" 按钮 (图标或文字)。
    -   背景: 全屏半透明黑色遮罩 (Fade In)。

---

## 5. 技术栈确认
-   **渲染**: Three.js + `three-platformize`
-   **物理**: 自研轻量级 AABB 物理 (无第三方物理引擎)
-   **UI**: React (Taro View) 覆盖在 Canvas 之上
