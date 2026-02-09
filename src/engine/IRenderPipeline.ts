import { IPhysicsWorld } from './IPhysicsWorld'

/**
 * IRenderPipeline - 渲染管线接口
 * 
 * 所有游戏/特效的渲染系统必须实现此接口，
 * 以便与通用 GameLoop 配合使用。
 */
export interface IRenderPipeline {
    /** 初始化渲染器 */
    init(canvas: any, width: number, height: number, dpr: number): void

    /** 渲染一帧，alpha 用于插值 */
    render(physics: IPhysicsWorld, alpha: number): void

    /** 销毁渲染器 */
    destroy(): void
}
