# 神厨飞刀 (Chef's Flying Knife) 开发进度交接手册 (Sync)

> [!IMPORTANT]
> 此文件旨在解决更换电脑后的上下文丢失问题。Antigravity 读取此文件后可立即恢复进度。

## 1. 当前任务状态 (Task Status)
- [x] 确定第二个游戏为：神厨飞刀 (Knife Hit)
- [x] 完成 1:1 完美还原 + 无尽程序化模式设计规范 (`game_knife_design.md`)
- [x] 完成“极简扁平矢量风 (Minimalist Flat Vector)”画风确认
- [/] 实施阶段 (Execution)
    - [x] 建立 `src/packages/games/KnifeHit` 目录
    - [x] 实现 `KnifePhysics` (物理骨架)
    - [x] 实现 `KnifeRender` (渲染骨架)
    - [x] 实现 `KnifeGameLoop` (循环控制)
    - [x] 实现 `index.tsx` (Taro 接入层 UI)
    - [ ] **下一步**：编写具体的 `KnifePhysics.ts` 中的旋转脚本（Behavior Pool）与碰撞检测逻辑。

## 2. 实施计划快照 (Implementation Plan)
- **技术栈**：Three.js (OrthographicCamera) + cannon-es。
- **画风**：追求参考图中的干净质感，使用 `MeshBasicMaterial`，暖色调背景。
- **核心逻辑**：
    - 程序化旋转算法（匀速、震荡、反向、骤停）。
    - 飞刀投射物理：射线检测 + 物理 recoil + 失败时的翻转坠落。
    - 无缝转场：圆盘插满后物理炸裂，瞬时切换下一主题（披萨、南瓜、齿轮等）。

## 3. 设计规范详述
参见项目内文档：[game_knife_design.md](./game_knife_design.md)
