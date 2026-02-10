import { IPhysicsWorld } from './IPhysicsWorld'
import { IRenderPipeline } from './IRenderPipeline'
import { Resolution } from './Resolution'

/**
 * 通用游戏循环 (Generic Game Loop)
 * 
 * 采用 Fixed Timestep (60Hz) 确保物理模拟的确定性和跨设备一致性。
 * 所有游戏/特效通过实现 IPhysicsWorld 和 IRenderPipeline 接口来使用此循环。
 */
export class GameLoop {
    protected physics: IPhysicsWorld
    protected renderer: IRenderPipeline
    protected isRunning: boolean = false
    protected lastTime: number = 0
    protected accumulator: number = 0
    protected readonly params: { width: number; height: number; dpr: number; canvas: any }

    // Callback for when the first frame is rendered
    public onFirstFrameRendered?: () => void
    protected hasRenderedFirstFrame: boolean = false

    // Fixed time step (60Hz = 16.66ms)
    protected readonly fixedDelta: number = 1000 / 60

    constructor(
        physics: IPhysicsWorld,
        renderer: IRenderPipeline,
        canvas: any,
        width: number,
        height: number
    ) {
        // Centralized Resolution Handling
        const { dpr, physicalWidth, physicalHeight } = Resolution.getInfo(width, height);

        // Auto-resize canvas to physical pixels
        if (canvas) {
            // Check if canvas is a DOM element (H5) or WeApp node
            if (canvas.width !== undefined) {
                canvas.width = physicalWidth;
                canvas.height = physicalHeight;
            }
        }

        this.params = { width, height, dpr, canvas }
        this.physics = physics
        this.renderer = renderer
    }

    public get width() { return this.params.width }
    public get height() { return this.params.height }
    public get physicsWorld() { return this.physics }

    public start() {
        if (this.isRunning) return

        this.physics.init(this.params.width, this.params.height)
        this.renderer.init(this.params.canvas, this.params.width, this.params.height, this.params.dpr)
        this.isRunning = true
        this.lastTime = performance.now()
        this.accumulator = 0

        requestAnimationFrame(this.loop.bind(this))
    }

    public stop() {
        this.isRunning = false
    }

    public destroy() {
        this.stop()
        this.physics.destroy()
        this.renderer.destroy()
    }

    public resize(width: number, height: number) {
        this.params.width = width
        this.params.height = height
        this.physics.resize(width, height)
    }

    protected loop(time: number) {
        if (!this.isRunning) return

        let deltaTime = time - this.lastTime
        this.lastTime = time

        // 60Hz Timestep Lock (Mobile Optimization)
        let isLocked = false
        if (Math.abs(deltaTime - this.fixedDelta) < 4) {
            deltaTime = this.fixedDelta
            isLocked = true
        }

        // Clamp deltaTime to avoid "spiral of death" on lag spikes
        this.accumulator += Math.min(deltaTime, 100)

        // Snap accumulator to avoid tiny float drifts
        if (Math.abs(this.accumulator - this.fixedDelta) < 2) {
            this.accumulator = this.fixedDelta
        }

        // Fixed Update
        let steps = 0
        while (this.accumulator >= this.fixedDelta && steps < 5) {
            this.onFixedUpdate()
            this.physics.update(this.fixedDelta)
            this.accumulator -= this.fixedDelta
            steps++
        }

        // Interpolation alpha
        const alpha = isLocked ? 1.0 : this.accumulator / this.fixedDelta

        // Render
        this.renderer.render(this.physics, alpha)

        if (!this.hasRenderedFirstFrame) {
            this.hasRenderedFirstFrame = true
            if (this.onFirstFrameRendered) {
                this.onFirstFrameRendered()
            }
        }

        requestAnimationFrame(this.loop.bind(this))
    }

    /** Override this for custom per-fixed-step logic (e.g., input handling) */
    protected onFixedUpdate(): void {
        // Override in subclass if needed
    }
}
