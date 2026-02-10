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

        // Variable Timestep: No Accumulator Logic
        // We use the safeDelta calculated below for physics updates

        // Variable Timestep (No Lock)
        // Clamp deltaTime to avoid giant leaps or tiny steps
        const safeDelta = Math.min(deltaTime, 64) // Max ~15fps latency simulation
        const dt = Math.max(safeDelta, 1) // Min 1ms to avoid zero-division in physics

        // Update Physics directly with variable time
        this.onUpdate(dt) // Hook for custom logic
        this.physics.update(dt)

        // Render current state
        this.renderer.render(this.physics)

        if (!this.hasRenderedFirstFrame) {
            this.hasRenderedFirstFrame = true
            if (this.onFirstFrameRendered) {
                this.onFirstFrameRendered()
            }
        }

        requestAnimationFrame(this.loop.bind(this))
    }

    /** Override this for custom per-frame logic (e.g., input handling) */
    protected onUpdate(dt: number): void {
        // Override in subclass if needed
    }
}
