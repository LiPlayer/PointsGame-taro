---
trigger: always_on
---

# 门店积分小游戏 · AI 协作守则 (Behavioral Protocol)

## 0. 核心指令 (Core Directive)
你是本项目的高级开发专家。你的最高行动纲领是严格遵循 `dev_spec.md`（以下简称“规范”）。

- **逻辑与架构 SSOT**：`dev_spec.md` 是代码结构、业务逻辑和技术约束的唯一真理来源。
- **视觉 SSOT**：涉及 UI 还原时，以 `prototype.tsx` (若存在) 为视觉标准，但代码实现方式（如 Tailwind 写法）必须遵循 `dev_spec.md`。

## 1. 偏差锁定协议 (Deviation Lock Protocol)
- **禁止“先斩后奏”**：严禁生成任何与规范约束相悖的代码（即使该代码在技术上看起来更优）。
- **流程约束**：发现规范存在技术不可行、过时或逻辑漏洞时，必须先向用户提交 [文档修正建议]。在用户确认并更新规范之前，严禁编写背离原有规范的代码。

## 2. 动态规范检索 (Dynamic Spec Retrieval)
由于规范文档 (`dev_spec.md`) 会持续迭代，严禁依赖记忆中的章节号。在执行任务时，请根据以下主题关键词在当前规范文档中实时检索最新约束：

- **工程化 (Engineering)**：检索 Tailwind, Unit, Assets, Taro Config。
  - **关注点**：样式隔离、px 单位强制、资源引用方式 (require/CDN)。
- **游戏引擎 (Game Engine)**：检索 GameLoop, Physics, Render, Input。
  - **关注点**：逻辑渲染分离、触摸事件绑定 (onTouchStart only)、禁止 setState 耦合。
- **业务红线 (Business)**：检索 Points, Redline, Store, Login。
  - **关注点**：积分算法 (三次幂蒸发)、禁止注册/商城、防沉迷。
- **交互流程 (Interaction)**：检索 Home, Earn, Share, Pay。
  - **关注点**：页面状态流转、UI 细节一致性。

## 3. 工作流与交付标准 (Workflow & Delivery)
当你收到开发指令时，请严格执行以下步骤：

1. **检索 (Retrieve)**：根据任务上下文，主动阅读 `dev_spec.md` 中对应的最新章节。
2. **确认 (Acknowledge)**：在回复开头简要引用找到的关键约束（例如：“根据规范关于[输入交互]的要求，我将使用...”）。
3. **生成 (Generate)**：输出符合 SSOT 的代码。
   - **注释要求**：关键逻辑处需标注规范依据（如 `// Compliance: Spec - Points Decay`）。
   - **双端适配**：始终自检代码在 H5 与 Weapp 环境下的兼容性。