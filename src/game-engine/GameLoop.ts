import { PhysicsSystem } from './PhysicsSystem'
import { RenderSystem } from './RenderSystem'
import { PHYSICS_CONFIG } from './Constants'
import Matter from 'matter-js'

export class GameLoop {
    private physics: PhysicsSystem
    private renderer: RenderSystem
    private isRunning: boolean = false
    private lastTime: number = 0
    private accumulator: number = 0
    private readonly params: { width: number; height: number; dpr: number; canvas: any }

    // FPS Calculation properties
    private frameCount: number = 0
    private lastFpsTime: number = 0
    public fps: number = 60
    public onFpsUpdate?: (fps: number) => void

    // Fixed time step (e.g. 1000 / 60 = 16.66ms)
    private readonly fixedDelta = 1000 / PHYSICS_CONFIG.frequency

    constructor(pixi: any, canvas: any, width: number, height: number, dpr: number) {
        this.params = { width, height, dpr, canvas }
        this.physics = new PhysicsSystem()
        this.renderer = new RenderSystem(pixi, canvas, width, height, dpr)
    }

    public start() {
        if (this.isRunning) return

        this.physics.init(this.params.width, this.params.height)
        this.isRunning = true
        this.lastTime = performance.now()
        this.accumulator = 0
        this.frameCount = 0 // Reset frame count on start
        this.lastFpsTime = this.lastTime // Initialize lastFpsTime

        requestAnimationFrame(this.loop.bind(this))
    }

    public stop() {
        this.isRunning = false
    }

    public destroy() {
        this.stop()
        this.physics.clear()
        this.renderer.destroy()
    }

    public addStar(x: number, y: number) {
        const id = this.physics.addParticle(x, y)
        if (id !== -1) {
            const rad = this.physics.rads[id]
            const z = this.physics.zs[id]
            this.renderer.addSprite(id, x, y, rad, z)
        }
    }

    public removeStars(count: number) {
        this.physics.consume(count)
    }

    public explode(power?: number) {
        this.physics.applyExplosion(this.params.width / 2, this.params.height / 2, power)
    }

    public getStarCount(): number {
        return this.physics.getStarCount()
    }

    private pointer = { x: 0, y: 0, active: false }

    public setPointer(x: number, y: number, active: boolean) {
        this.pointer.x = x
        this.pointer.y = y
        this.pointer.active = active
    }

    public resize(width: number, height: number) {
        this.params.width = width
        this.params.height = height
        this.physics.resize(width, height)
        this.renderer.app.renderer.resize(width, height)
    }

    private loop(time: number) {
        if (!this.isRunning) return

        let deltaTime = time - this.lastTime
        this.lastTime = time

        // FPS Calculation
        this.frameCount++
        if (time - this.lastFpsTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (time - this.lastFpsTime))
            this.frameCount = 0
            this.lastFpsTime = time
            if (this.onFpsUpdate) {
                this.onFpsUpdate(this.fps)
            }
        }

        // Apply interaction force EVERY FRAME if pointer is active (Match Prototype)
        if (this.pointer.active) {
            this.physics.applyRepulsion(this.pointer.x, this.pointer.y)
        }

        // --- 60Hz Timestep Lock (Mobile Optimization) ---
        // If detection suggests 60Hz screen (17ms or 16ms), snap to fixedDelta
        // This eliminates "beat" jitter by forcing 1:1 Physics:Render ratio
        let isLocked = false
        if (Math.abs(deltaTime - this.fixedDelta) < 4) {
            deltaTime = this.fixedDelta
            isLocked = true
        }

        // Clamp deltaTime to avoid "spiral of death" on lag spikes
        this.accumulator += Math.min(deltaTime, 100)

        // Snap accumulator to avoid tiny float drifts causing dropped frames
        if (Math.abs(this.accumulator - this.fixedDelta) < 2) {
            this.accumulator = this.fixedDelta
        }

        // Fixed Update Strategy
        let steps = 0
        while (this.accumulator >= this.fixedDelta && steps < 5) {
            this.physics.update(this.fixedDelta)
            this.accumulator -= this.fixedDelta
            steps++
        }

        // Cleanup dead particles
        this.physics.cleanup((id) => {
            this.renderer.removeSprite(id)
        })

        // Interpolation
        // isLocked ? 1.0 (Render Latest) : Calculated Alpha
        const alpha = isLocked ? 1.0 : this.accumulator / this.fixedDelta

        this.syncRender(alpha)
        this.renderer.app.render()

        requestAnimationFrame(this.loop.bind(this))
    }

    private syncRender(alpha: number) {
        const n = this.physics.particleCount
        const px = this.physics.px
        const py = this.physics.py
        const ox = this.physics.ox
        const oy = this.physics.oy
        const ids = this.physics.ids
        const states = this.physics.states
        const timers = this.physics.timers
        const angles = this.physics.angles

        for (let i = 0; i < n; i++) {
            // Interpolate between previous (ox, oy) and current (px, py)
            const ix = px[i] * alpha + ox[i] * (1 - alpha)
            const iy = py[i] * alpha + oy[i] * (1 - alpha)
            const ir = angles[i] // Simple rotation for now (could interpolate if needed)

            let scale: number | undefined = undefined
            let opacity: number | undefined = undefined

            if (states[i] === 1) {
                // Dying Animation: Shrink and Fade
                // Progress is timers[i] (0 to 1)
                const p = timers[i]
                if (p < 0.4) {
                    // Phase 1: Just floating up (handled in physics)
                    opacity = 1
                    scale = 1
                } else {
                    // Phase 2: Shrink and Fade
                    const p2 = (p - 0.4) / 0.6
                    opacity = 1 - p2
                    scale = 1 - p2
                }
            } else {
                scale = 1
                opacity = 1
            }

            this.renderer.updateBody(ids[i], ix, iy, ir, scale, opacity)
        }
    }
}
