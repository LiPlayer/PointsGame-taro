/**
 * IPhysicsWorld - 物理世界接口
 * 
 * 所有游戏/特效的物理系统必须实现此接口，
 * 以便与通用 GameLoop 配合使用。
 */
export interface IPhysicsWorld {
    /** 初始化物理世界 */
    init(width: number, height: number): void

    /** 固定时间步长更新 (16.66ms) */
    update(dt: number): void

    /** 窗口尺寸变化 */
    resize(width: number, height: number): void

    /** 销毁物理世界 */
    destroy(): void
}
