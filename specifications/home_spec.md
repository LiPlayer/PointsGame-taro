# 首页 (Home Page) 全量技术规范与一致性指南 (V3.2)

本文档是首页开发的最终权威参考，整合了所有视觉微调、物理交互及适配逻辑。

---

## 1. 基础架构与适配 (Base Architecture)

### 1.1 沉浸式配置
- **微信小程序**: 必须在 `pages.config` 或 `app.config` 中设置 `"navigationStyle": "custom"`。
- **背景填充**: 页面背景需满铺至屏幕顶部（StatusBar 区域）。
- **状态栏透明**: 页面顶部不得显示任何原生导航栏背景。

### 1.2 比例一致性 (Scaling Strategy)
- **基准画布**: 宽度 `375px`。
- **动态缩放系数**: `scaleFactor = 实测容器宽度 / 375`。
- **规范要求**: 所有非文字的尺寸单位（星星半径、排斥圆半径、物理力大小）必须在运行时乘以 `scaleFactor` 以保证不同机型下的画面比例一致。

---

## 2. 积分卡片 (Points Card) - 深度解析

### 2.1 样式与融合 (The Glass & Stacking)
- **容器属性**: 
  - `isolate`: **必须开启**。使用 `isolate` (CSS isolation) 或 `z-index` 创建独立的层叠上下文，隔离 `mix-blend-multiply`。
  - `overflow-hidden`: 严格裁剪超出的粒子动画。
  - `shadow-card`: `0 20px 40px -10px rgba(15, 23, 42, 0.05)`。
- **渐变透明边框 (`gradient-border`)**:
  - 实现: 双层背景叠加 (`padding-box` + `border-box`)。
  - **核心特性**: 边框颜色向顶部渐变消失 (`to top`)，实现与背景的羽化融合。
  - 代码参考:
    ```css
    background-image: linear-gradient(white, white), 
                      linear-gradient(to top, rgba(241, 245, 249, 1), rgba(241, 245, 249, 0));
    ```

### 2.2 信息层层级
- **指针穿透**: 包含积分数值的文字层必须设置 `pointer-events: none`，确保触摸事件能直接传递到下层的 Canvas。
- **玻璃态组件 (Points Badge)**: 
  - 样式: `bg-white/80 backdrop-blur-sm`。
  - 功能: 实时显示今日已玩次数，不遮挡 Canvas 交互。
- **混合模式**: 积分数字使用 `mix-blend-multiply`，使星星在数字后方流动时呈现自然的视觉融合感。

---

## 3. 动态粒子系统 (Points-Canvas Engine)

### 3.1 物理引擎 (Verlet Physics)
- **稳定性**: 每帧进行 **2次（Double Solve）** 约束迭代，防止星星在大量堆叠时产生穿透。
- **物理常量**:
  - `gravity`: `0.15 * scaleFactor`。
  - `friction`: `0.96` (阻力系数)。
  - `bounce`: 碰撞边界时保留 `50%` 的反弹动能。
- **按压排斥 (Interaction)**:
  - 触发节点: `touchstart` (按压) 与 `touchmove` (滑动)。
  - 斥力半径: `80 * scaleFactor` px。
  - 逻辑: 即使处于静止状态的粒子，一旦进入斥力半径，必须被“唤醒”并赋予反向速度。

### 3.2 渲染细节
- **分层渲染 (Pseudo-3D)**:
  - 粒子分为 3 个离散 Z 深层 (0, 0.5, 1.0)。
  - 不同层应用不同的缩放倍率 (`0.5x` 到 `1.2x`)。
- **星星素材**: 
  - 基于三层绘制：`amber-100` 外边框 -> `white` 主体 -> `amber-500` 中心星。
  - 前景粒子（Z=1.0）额外绘制 `rgba(255,255,255,0.3)` 的弧形高光。

### 3.3 状态机与 API
- **ADD (落入)**: 粒子从 Canvas 顶部 (`y < 0`) 洒入。
- **CONSUME (消耗)**: 
  - 阶段 1 (40%): 向上漂浮。
  - 阶段 2 (60%): 旋转加速并缩放至 0。
- **EXPLODE (喷发)**: 全场粒子获得向上的随机矢量力 (10-30 units)。

---

## 4. 视觉层级与字重
- **Typography**: 
  - 数字: `font-black` (权重 900)。
  - 标题: `font-black`。
  - 标签: `font-800` (Plus Jakarta Sans)。
- **色彩**: 严禁使用纯红/纯黑。
  - 品牌红: `#e11d48` (rose-600)。
  - 标题黑: `#0f172a` (slate-900)。

---

## 5. 交互一致性检测清单 (QA Check)
- [ ] 微信胶囊按钮区域是否已避开？
- [ ] 积分卡片顶部边框是否是透明渐变的？
- [ ] 触摸按压数字位置时，背后的星星是否被推开？
- [ ] 大屏手机和 iPad 下，星星的大小比例是否协调？
- [ ] 积分卡片是否开启了 CSS Isolation (`isolate`)？
