# 首页 (Home) 开发实施规范 (V4.4 - Final Guarantee)

**文档定位**：
本文档是 “静态 HTML 原型” 到 “工业级 Taro 应用” 的工程桥梁。

---

## 0. AI 协作核心协议 (AI Protocol)

- **视觉数据源 (Visual Data)**：`prototype.html`。
    - **指令**：自动解析 HTML 中的 Tailwind 类名（颜色、间距、圆角）。
    - **禁止**：在此文档中重新定义具体的 Hex 颜色或字体名称。
- **工程架构源 (Engineering Spec)**：本文档。
    - **指令**：必须遵守本文档定义的 DOM 结构、物理引擎参数、Tailwind 配置和跨端钩子。
- **冲突解决**：若代码实现与本文档冲突，以本文档为准。

---

## 1. 架构配置 (Architecture Setup)

> [!IMPORTANT]
> **强制指令**：AI 在生成代码前，必须先验证以下配置文件。

### 1.1 Tailwind 条件编译 (Project Config)
为了解决混合模式在小程序的兼容性问题，同时保持 JSX 整洁，必须在 `tailwind.config.js` 中注册平台变体。

```javascript
// tailwind.config.js
const plugin = require('tailwindcss/plugin');

module.exports = {
  // ... 其他配置
  plugins: [
    plugin(function({ addVariant }) {
      // 注册 h5: 前缀 -> 仅在 H5 环境生效
      addVariant('h5', process.env.TARO_ENV === 'h5' ? '&' : '.ignore-h5');
      // 注册 weapp: 前缀 -> 仅在 小程序 环境生效
      addVariant('weapp', process.env.TARO_ENV === 'weapp' ? '&' : '.ignore-weapp');
    })
  ],
}
```

### 1.2 组件样式隔离 (Component Config)
由于使用 `weapp-tailwindcss`，所有拆分的组件（如 `PointsHeroCard`, `ActionGrid`）必须在组件代码中配置：

```javascript
// 在组件文件底部添加
PointsHeroCard.options = {
  addGlobalClass: true
};
```

---

## 2. 页面架构 (Component Tree)

> [!IMPORTANT]
> **强制指令**：DOM 顺序是解决小程序 Canvas 层级问题的唯一手段。

**结构说明**：`BrandHeader` 必须作为 `PointsHeroCard` 的子元素存在，以确保粒子背景能够覆盖整个头部区域。

```jsx
<View className="min-h-screen bg-brand-bg flex flex-col relative overflow-hidden">
  
  {/* Layer 1: 核心交互容器 (Hero) */}
  {/* 包含：Canvas背景 + BrandHeader + 积分数字 */}
  <PointsHeroCard className="relative isolate z-10" />

  {/* Layer 2: 操作区 */}
  <ActionGrid className="relative z-20" />

  {/* Layer 3: 安全区垫片 (使用 JIT 语法) */}
  <View className="pb-[env(safe-area-inset-bottom)]" />

</View>
```

---

## 3. 核心特性实施细节 (Implementation)

### 3.1 积分卡片 (PointsHeroCard) - 核心难点

#### A. 内部 DOM 结构与顺序 (Internal DOM Order)
为了解决层级问题并实现沉浸式头部，组件内部结构必须如下：

```jsx
<View className="..."> {/* Container */}
  
  {/* 1. 物理层：Canvas 粒子背景 (绝对定位，最底层) */}
  {/* DOM 顺序第一位，Z-Index 0 */}
  <Canvas type="2d" className="absolute inset-0 z-0 ..." />

  {/* 2. 头部层：品牌 Logo 与标题 */}
  {/* 必须在 Canvas 之后，Z-Index 20 (需高于积分内容以防重叠难点) */}
  <BrandHeader className="relative z-20" />

  {/* 3. 内容层：积分数字与胶囊 */}
  {/* 必须在 Canvas 之后，Z-Index 10 */}
  <View className="relative z-10 pointer-events-none ...">
     <Content />
  </View>

</View>
```

#### B. 混合模式 (Mix-Blend Mode)
- **Weapp**: 严禁使用 `mix-blend-multiply`。这是导致“星星挡字”现象的主要原因。
- **H5**: 推荐保留。
- **实现**：使用 1.1 定义的变体：`h5:mix-blend-multiply`。

#### C. 物理粒子引擎 (Physics Engine)
- **参数**：Gravity `0.15`, Friction `0.96`, Floor Bounce `-0.5`。
- **交互**：实现手指滑动的排斥力场（Repulsion Force）。
- **绘制**：使用 `ctx.arc` / `ctx.lineTo` 手绘星星。

### 3.2 品牌头 (BrandHeader)
作为子组件的适配：
- **Weapp**: `style={{ paddingTop: sysInfo.statusBarHeight }}`。
- **Logo**: 暂时使用 CSS 实现（红色圆角矩形），预留 `Image` 接口。

### 3.3 视觉特效 (Visual Effects)
- **渐变边框 (Gradient Border)**：
    - **强制方案**：双层 `View` 模拟。
    - **外层 View**：`rounded-[32px] p-[1px]` 设置渐变背景。
    - **内层 View**：`rounded-[31px] bg-white h-full w-full`。
- **毛玻璃 (Backdrop Blur)**：
    - **强制方案**：使用 `bg-amber-50/90` (Amber-50, 90% Opacity) 降级，叠加 `backdrop-blur-sm`。

---

## 4. 跨端一致性逻辑 (Cross-Platform Logic)

### 4.1 Canvas 2D Hook (Standard)
使用此 Hook 抹平 DOM 和 `SelectorQuery` 的差异。

```javascript
import Taro, { useReady } from '@tarojs/taro';

export function useCanvas2D(id, drawCallback) {
  useReady(() => {
    Taro.nextTick(() => {
      const dpr = Taro.getSystemInfoSync().pixelRatio;
      
      // 分支 A: H5 (Robust DOM Lookup)
      if (process.env.TARO_ENV === 'h5') {
        const el = document.getElementById(id);
        if (!el) return;
        // 兼容 Taro 容器：若 ID 在容器上，则查找内部真正的 canvas
        const canvas = el.tagName === 'CANVAS' ? el : el.querySelector('canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        drawCallback(canvas, ctx, rect.width, rect.height, dpr);
        return;
      }

      // 分支 B: Weapp (SelectorQuery)
      if (process.env.TARO_ENV === 'weapp') {
        Taro.createSelectorQuery().select(`#${id}`)
          .fields({ node: true, size: true }).exec((res) => {
            if (!res[0]?.node) return;
            const { node, width, height } = res[0];
            node.width = width * dpr;
            node.height = height * dpr;
            const ctx = node.getContext('2d');
            ctx.scale(dpr, dpr);
            drawCallback(node, ctx, width, height, dpr);
          });
      }
    });
  });
}
```

---

## 5. 故障排查 (Troubleshooting - Emergency Only)

如果严格执行上述规范后，Weapp 端依然出现“星星在文字上”，请按以下顺序执行保底措施：

1.  **Check 1**: 确认文字元素没有被施加 `mix-blend-mode`。这是最常见的隐形杀手。
2.  **Check 2**: 确认 `<Canvas>` 的 Z-Index 显式设置为 `z-0` 或 `z-[-1]`（负值通常能强制置底，但需确保父容器非 `overflow-hidden` 导致消失）。
3.  **Check 3 (核武器)**: 如果上述都无效，请在 `<Canvas>` 上使用 `visibility: hidden` 直到第一帧绘制完成，或给文字容器包裹一层 `<CoverView>`（不推荐，会失去 CSS 能力，仅作为最后手段）。
