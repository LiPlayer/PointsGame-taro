# Stack Game Design Specification (V4.0 - 1:1 Ketchapp Fidelity)

**Game Title**: 极致层叠 (Zen Layers) - Based on "Stack"
**Genre**: Hyper-casual / Rhythm / 3D Isometric
**Target Engine**: Three.js (WeChat Mini Program)
**Reference**: Ketchapp "Stack" (#1 Mobile Game Standards)

---

## 1. 核心玩法 (Gameplay Mechanics)

### 1.1 基础循环 (Core Loop)
-   **目标**: 堆叠无限高的方块塔。
-   **操作**: 全屏任意位置单点触摸 (Tap)。
-   **塔基尺寸**: `1 × 1 × 1` 单位 (1米)。随高度向上渐变，底部较暗，顶部契合全局色相。
-   **方块初始尺寸**: `1 × 1 × 0.1` 单位。
-   **流程**:
    1.  **待机 (Idle)**: 显示单块塔基，屏幕提示 "点击开始"。
    2.  **游戏 (Playing)**: 新方块从屏幕外一侧滑入，沿 X/Z 轴交替往复移动。往复范围约为塔宽度的 **1.5倍**，滑出可视范围后立刻折返。点击屏幕锁定位置。
    3.  **切割 (Slicing)**: 未重合部分被物理切断掉落。上方新方块继承切割后的尺寸。
    4.  **结束 (Game Over)**: 当方块完全未重合时，**仅最后一块方块从塔上滑落/翻倒**，已堆好的塔保持不动，短暂展示玩家搭建的结构后进入结算。

### 1.2 进阶机制 (Advanced Mechanics)
-   **完美对齐 (Perfect Stack)**:
    -   **判定**: 误差值 `delta < 0.03` (1-meter 宽容度)。
    -   **视觉**: 仅显示 **白色波纹扩散 (Ripple Effect)**，方块自身不闪白。连续 Perfect 时，波纹数量随 combo 增加。
    -   **听觉**: 音调提升 (Pitch Up)。
-   **得分机制 (Scoring System)**:
    -   **普通放置 (Normal)**: `+1` 分。
    -   **完美对齐 (Perfect)**:
        -   前 3 次 Perfect: `+1` 分。
        -   第 4 次及以后 Perfect: `+1 + (当前 Combo 数 - 3)` 分。
    -   **得分序列示例**:
        -   第 1-3 次 Perfect: `1, 1, 1`
        -   第 4 次及以后: `2, 3, 4, 5...`
-   **速度曲线 (Difficulty)**:
    -   初始速度设为 `V`。
    -   **阶梯式加速 (Step Function)**: 每 **15块** 速度跳增+15%。
    -   速度在 **80分** 后封顶/稳定，让玩家重新找到节奏。
    -   上限为 **2.5V**。

---

## 2. 美术规范 (Art Specifications - 1:1 Fidelity)

### 2.1 场景与环境 (Environment)
-   **3D 等距视角 (Isometric View)**:
    -   取消透视畸变，确保视觉一致性。
    -   摄像机沿 Y 轴平滑跟随堆叠高度上移。
-   **底部淡出 (Bottom Fade)**: 塔基采用程序化 Alpha Map 垂直渐变（CanvasTexture），配合自定义 UV 映射，实现从顶部不透明到底部完全透明的平滑淡出效果。

-   **颜色控制系统 (Color Systems)**:
    -   **1. 全局色相系统 (Global Hue System)**:
        -   **共享变量 (Shared H)**: 全场景（方块与背景）共享唯一色相变量 $H$。
        -   **初始色相 ($H_0$)**: 随机生成 (0-359)。
        -   **步进规则**: 每生成一个新方块，$H_{target} = H_{start} + 5 \times Score$。
        -   **过渡效果**: 背景色相随 $H_{target}$ 进行 **线性插值 (Lerp)** 变换，避免突变，确保视觉柔和流畅。
    -   **2. 饱和度系统 (Saturation System)**:
        -   **方块饱和度 ($S_{Block}$)**: **90** (保持高鲜艳度、实体感)。
        -   **背景饱和度 ($S_{BG}$)**: **70** (确保环境退后、不抢夺视线)。
    -   **3. 动态渐变背景系统 (Background Lightness System)**:
        -   **垂直线性渐变**: 顶部始终比底部亮 15 个单位。
        -   **呼吸循环**: 随游戏运行时间 $t$ 进行 60 秒周期的亮度起伏。
        -   **亮度偏移**: $\Delta L_{time} = 25 \times \cos(\frac{2\pi \times t}{60})$ (幅度 50%)。
        -   **背景定值**:
            -   **顶部 (Top)**: $55 + \Delta L_{time}$ (在 30 ~ 80 之间循环)。
            -   **底部 (Bottom)**: $45 + \Delta L_{time}$ (在 20 ~ 70 之间循环)。
-   **光影配置 (Lighting)**:
    -   **物理光源**: 启用物理光照以获得真实的立体感。
        -   **主光源 (Key Light)**: DirectionalLight, 强度 0.8, 从左上方照射 ((-1, 2, 1))，产生投影。
        -   **环境光 (Fill Light)**: HemisphereLight, 强度 0.8, 地面颜色 0x606060, 提供自然的全局光照补偿。
    -   **材质**: 使用 `MeshStandardMaterial` / `MeshPhongMaterial`，配合光照产生自然的明暗面。

### 2.2 方块与物理 (Blocks & Physics)
-   **单色调方块 (Single-Tone Blocks)**:
    -   **物理光照接管**: 移除人工模拟的明暗面颜色。每个方块只使用一种基准色 `hsl(H, 80%, 60%)`。
    -   **立体感来源**: 完全由 `DirectionalLight` 和 `HemisphereLight` 对 `MeshPhongMaterial` 的照射产生顶面亮、侧面暗的自然立体效果。
    -   **动态**: 方块固有色受全局色相 $H$ 驱动。亮度层级保持绝对定值以维持光影感。
    -   **材质**: `MeshStandardMaterial` (Roughness: 0.4, Metalness: 0.1)。材质表现为"柔和塑料"质感。
-   **碎片 (Debris)**:
    -   **物理模拟**: 使用 `Cannon.js` (cannon-es) 进行刚体动力学模拟。
    -   **切落瞬间**: 多余部分瞬间脱离主体，作为独立刚体向下坠落。
    -   **坠落与翻滚**: 具有真实的碰撞检测和随机初始角速度，受重力影响下落、翻滚。
    -   **自动销毁**: 碎片离开摄像机可视范围后 **立即销毁/回收**，防止内存泄漏和性能下降。

### 2.3 视觉特效 (VFX)
-   **完美波纹 (Perfect Ripple)**: 触发 Perfect 时，从中心向外发射类似水波的白色线框。
    -   **视觉状态**:
        -   本轮第 1-3 次 Perfect: 显示 **无扩散的静态白色线框**。
        -   本轮第 4 次及以后: 显示 **动态扩散波纹**。
    -   **非线性动画**: 采用 **Ease-Out** 曲线，扩散速度先快后慢，透明度呈二次方平滑消失。
    -   **Combo 叠加**: 连续 Perfect 会产生多个层叠波纹。波纹间距随扩散非线性增加，营造高级的水面感。
    -   **节奏感**: 整体动画速度缓慢而流畅，增强游戏的禅意感。
-   **死亡闪光 (Death Flash)**: 游戏结束瞬间，屏幕叠加白色遮罩，0.2秒内淡出。
-   **屏幕震动 (Screen Shake)**: 游戏结束瞬间，摄像机轻微随机偏移震动。

---

## 3. 音效与反馈 (Audio & Haptics - 1:1 Fidelity)

> **核心原则**: 无背景音乐 (No BGM)。全部依赖清脆、简洁的音效 (SFX) 构建节奏感。声音是帮助玩家建立节奏 (Rhythm) 的关键工具。

### 3.1 音效清单 (SFX List)

| 事件 | 音效描述 | 频率/音高 | 音色 |
|------|----------|----------|------|
| **普通放置 (Place)** | 短促的 "嗒" 声 | 固定低音 (~200Hz) | 干燥、木质打击感 |
| **Perfect 放置** | 清脆的 "叮" 声，音高随 combo 递增 | 从 C5 起，逐级上升 | 正弦波 / 钟声质感 |
| **Perfect Combo** | 音高逐级上升，使用 **五声音阶 (Pentatonic)**：C-D-E-G-A | 每次 +大二度/小三度跳跃 | 悦耳、明亮 |
| **回血触发** | 当连续 5+ Perfect 时，叠加一个 **和弦重音** | 主音 + 五度 | 饱满、奖励感 |
| **切割 (Slice)** | 极短的 "咔嗒" | ~300Hz | 干、硬 |
| **Game Over 坠落** | 低沉的 "咚" + 短暂混响 | ~80-100Hz | 重低音 Thud |

### 3.2 音效行为规则
-   **每次放置都有声音**: 无论 Perfect 与否，点击放置的瞬间都必须有声音反馈。
-   **Perfect 音高递增**: Combo 1 → C5, Combo 2 → D5, Combo 3 → E5, Combo 4 → G5, Combo 5 → A5, Combo 6+ → 循环高八度或保持最高音。
-   **非 Perfect 重置**: 当 combo 断裂，下一次 Perfect 的音高从 C5 重新开始。
-   **无背景音乐**: 原版不使用任何 BGM，安静的环境让 SFX 更突出。

### 3.3 触感反馈 (Haptics)
-   **普通放置**: 无震动。
-   **Perfect**: `Taro.vibrateShort({ type: 'light' })` (轻微震动)。
-   **Game Over**: `Taro.vibrateLong()` (重震动)。

---

## 4. 界面规范 (UI Specifications)

### 4.1 布局
-   **分数 (Score)**:
    -   位置: 屏幕上方 20% 处居中。
    -   样式: 纯白、极细字体 (Thin)、巨大字号 (80px+)。
    -   阴影: 轻微的 Drop Shadow 保证在浅色背景下的可见度。
    
### 4.2 结算处理 (Result Handling)
-   **游戏结束**: 当方块完全未重合时，仅最后一块滑落，塔保持不动。
-   **展示**: 短暂展示玩家搭建的"作品"约 1-1.5 秒。
-   **页面跳转**: 将最终分数传递给独立的 **Result Page** 进行展示与交互。
-   **场景重置**: 接收到"重试"指令后，游戏场景瞬间重置。
todo: 模型宏观回看。

---

## 5. 技术栈确认
-   **渲染**: Three.js + `three-platformize`
-   **物理**: cannon-es (成熟刚体物理引擎)
-   **UI**: React (Taro View) 覆盖在 Canvas 之上
-   **音频**: Web Audio API (AudioContext) 合成音效，无需外部音频文件
