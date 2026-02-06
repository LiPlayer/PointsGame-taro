# 首页 (Home) 开发实施规范 (V4.1 - Simplified)

**文档定位**：本文档是 “静态 HTML 原型” 到 “工业级 Taro 应用” 的工程桥梁。

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

```jsx
<View className="min-h-screen bg-brand-bg flex flex-col relative overflow-hidden">
  
  {/* Layer 1: 品牌头 (Header) */}
  <BrandHeader />

  {/* Layer 2: 核心交互卡片 (Hero) */}
  {/* 关键点：isolate 建立独立堆叠上下文，z-10 提升层级 */}
  <PointsHeroCard className="relative isolate z-10" />

  {/* Layer 3: 操作区 */}
  <ActionGrid className="relative z-20" />

  {/* Layer 4: 安全区垫片 (使用 JIT 语法) */}
  <View className="pb-[env(safe-area-inset-bottom)]" />

</View>
```

---

## 3. 核心特性实施细节 (Implementation)

### 3.1 积分卡片 (PointsHeroCard) - 核心难点

#### A. 层级与渲染策略 (Rendering Strategy)
- **DOM 顺序 (Critical)**：JSX 中，`<Canvas>` 必须 **写在** `<Content>` 之前。
    - **原理**：小程序原生组件遵循“先渲染的在下层”规则（即使是同层渲染）。
- **Z-Index**：
    - `Canvas`: `absolute z-0`
    - `Content`: `relative z-10 pointer-events-none`
- **混合模式 (Mix-Blend Mode)**：
    - **Weapp**: 严禁使用 `mix-blend-multiply`（会导致文字消失或层级错误）。
    - **H5**: 推荐保留。
    - **实现**：使用 1.1 定义的变体：`h5:mix-blend-multiply`。

#### B. 物理粒子引擎 (Physics Engine)
必须移植 `prototype.html` 中的 `<script>` 逻辑，但需适配 Taro：
- **参数**：Gravity `0.15`, Friction `0.96`, Floor Bounce `-0.5`。
- **交互**：实现手指滑动的排斥力场（Repulsion Force）。
- **绘制 (Rendering)**：严禁使用图片 (`drawImage`)。必须使用 Canvas API (`ctx.arc`, `ctx.lineTo`) 手绘星星（外圈、内体、核心三层）。

### 3.2 品牌头 (BrandHeader)
- **布局适配**：
    - **H5**: 使用 Tailwind 变体 `h5:pt-[20px]`。
    - **Weapp**: 使用行内样式 `style={{ paddingTop: sysInfo.statusBarHeight }}`。
- **Logo**: 暂时使用 CSS 实现（红色圆角矩形），预留 `Image` 接口。

### 3.3 视觉特效 (Visual Effects)
- **渐变边框**：小程序不支持 `border-box` 渐变。
    - **方案**：双层 `View` 模拟（外层渐变 + `Padding 1px` -> 内层纯白）。
- **毛玻璃**：安卓小程序不支持 `backdrop-blur`。
    - **方案**：使用 `bg-amber-50/90` (高不透明度) 作为保底，叠加 `backdrop-blur-sm`。

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
      
      // 分支 A: H5 (Standard DOM)
      if (process.env.TARO_ENV === 'h5') {
        const canvas = document.getElementById(id);
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
    });
  });
}
```

---

## 5. 开发自查清单 (QA)

- [ ] **配置检查**：`tailwind.config.js` 是否已添加 `h5/weapp` 插件？
- [ ] **组件检查**：所有组件文件底部是否包含 `addGlobalClass: true`？
- [ ] **层级检查**：JSX 中 `<Canvas>` 是否在 `<Content>` 之前？
- [ ] **视觉检查**：小程序端文字是否清晰（无混合模式），H5 端是否有混合模式？
- [ ] **物理检查**：星星是否是手绘的矢量图，而非模糊的位图？
