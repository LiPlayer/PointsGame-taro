import Matter from 'matter-js'
import { PHYSICS_CONFIG } from './Constants'

export class PhysicsSystem {
    public engine: Matter.Engine
    public world: Matter.World

    // --- 高性能粒子引擎 (Zero Allocation / Typed Arrays) ---
    public MAX_PARTICLES = 5000
    public px: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public py: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public ox: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public oy: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public rads: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public zs: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public ids: Int32Array = new Int32Array(this.MAX_PARTICLES)
    public particleCount: number = 0

    // 网格优化
    private cellSize = 18 // Slightly larger for random radius
    private gridCols = 0
    private gridRows = 0
    private heads: Int32Array = new Int32Array(0)
    private nexts: Int32Array = new Int32Array(this.MAX_PARTICLES)

    private walls: Matter.Body[] = []
    private width: number = 0
    private height: number = 0

    constructor() {
        this.engine = Matter.Engine.create({
            positionIterations: 2,
            velocityIterations: 2,
            enableSleeping: true
        })
        this.world = this.engine.world
        this.engine.gravity.y = 0.15 // 匹配原型重力
    }

    public init(w: number, h: number) {
        this.width = w
        this.height = h
        this.createWalls(w, h)

        // 初始化网格
        this.gridCols = Math.ceil(w / this.cellSize)
        this.gridRows = Math.ceil(h / this.cellSize)
        this.heads = new Int32Array(this.gridCols * this.gridRows).fill(-1)
    }

    public update(dt: number) {
        // 1. Matter.js 更新 (边界和复杂物体)
        Matter.Engine.update(this.engine, dt)

        // 2. 高性能粒子更新 (Verlet Integration)
        this.updateParticles(dt)
    }

    private updateParticles(dt: number) {
        const n = this.particleCount
        const w = this.width, h = this.height
        const friction = 0.96 // 匹配原型
        const gravity = 0.15 // 匹配原型

        // 网格重构
        const cols = this.gridCols
        const rows = this.gridRows
        this.heads.fill(-1) // Reset heads for new frame

        for (let i = 0; i < n; i++) {
            // Verlet Integration
            const vx = (this.px[i] - this.ox[i]) * friction
            const vy = (this.py[i] - this.oy[i]) * friction + gravity

            this.ox[i] = this.px[i]
            this.oy[i] = this.py[i]
            this.px[i] += vx
            this.py[i] += vy

            // Boundary
            const r = this.rads[i]
            if (this.px[i] < r) {
                this.px[i] = r
                this.ox[i] = this.px[i] + (this.px[i] - this.ox[i]) * 0.5
            }
            if (this.px[i] > w - r) {
                this.px[i] = w - r
                this.ox[i] = this.px[i] + (this.px[i] - this.ox[i]) * 0.5
            }
            if (this.py[i] > h - r) {
                const vy = (this.py[i] - this.oy[i])
                this.py[i] = h - r
                this.oy[i] = this.py[i] + vy * 0.5 // Damped bounce up
            }

            // Grid Insert
            const gx = Math.floor(this.px[i] / this.cellSize)
            const gy = Math.floor(this.py[i] / this.cellSize)
            if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
                const idx = gx + gy * cols
                this.nexts[i] = this.heads[idx]
                this.heads[idx] = i
            }
        }

        // Collision Solve (1 Pass for speed)
        for (let i = 0; i < n; i++) {
            const gx = Math.floor(this.px[i] / this.cellSize)
            const gy = Math.floor(this.py[i] / this.cellSize)
            const r = this.rads[i]
            const zi = this.zs[i]

            for (let x = gx - 1; x <= gx + 1; x++) {
                if (x < 0 || x >= cols) continue
                for (let y = gy - 1; y <= gy + 1; y++) {
                    if (y < 0 || y >= rows) continue
                    let o = this.heads[x + y * cols]
                    while (o !== -1) {
                        if (o > i) {
                            // 深度过滤：深度差超过 0.1 不碰撞 (匹配原型)
                            if (Math.abs(zi - this.zs[o]) < 0.1) {
                                const dx = this.px[i] - this.px[o]
                                const dy = this.py[i] - this.py[o]
                                const distSq = dx * dx + dy * dy
                                const min = r + this.rads[o]
                                if (distSq < min * min && distSq > 0) {
                                    const dist = Math.sqrt(distSq)
                                    const push = (min - dist) * 0.5
                                    const nx = (dx / dist) * push
                                    const ny = (dy / dist) * push
                                    this.px[i] += nx
                                    this.py[i] += ny
                                    this.px[o] -= nx
                                    this.py[o] -= ny
                                }
                            }
                        }
                        o = this.nexts[o]
                    }
                }
            }
        }
    }

    public addParticle(x: number, y: number): number {
        if (this.particleCount >= this.MAX_PARTICLES) return -1

        const i = this.particleCount
        this.px[i] = x
        this.py[i] = y
        this.ox[i] = x + (Math.random() - 0.5) * 4 // 初始动力
        this.oy[i] = y + (Math.random() - 0.5) * 4

        // 随机半径 (80% - 120%)
        this.rads[i] = PHYSICS_CONFIG.particle.radius * (0.8 + Math.random() * 0.4)
        // 随机深度 (0, 0.5, 1.0)
        this.zs[i] = Math.floor(Math.random() * 3) / 2

        this.ids[i] = i
        this.particleCount++
        return i
    }

    public removeStars(count: number) {
        this.particleCount = Math.max(0, this.particleCount - count)
    }

    public getStarCount(): number {
        return this.particleCount
    }

    public applyRepulsion(x: number, y: number) {
        const n = this.particleCount
        const range = PHYSICS_CONFIG.interaction.repulsionRadius
        const rangeSq = range * range
        const force = 0.8 // Match prototype (0.4 * 2)

        for (let i = 0; i < n; i++) {
            const dx = this.px[i] - x
            const dy = this.py[i] - y
            const d2 = dx * dx + dy * dy
            if (d2 < rangeSq && d2 > 0) {
                const dist = Math.sqrt(d2)
                const f = (1 - dist / range) * force
                const nx = (dx / dist) * f
                const ny = (dy / dist) * f

                // Direct modification (Explosive feel)
                this.px[i] += nx
                this.py[i] += ny
            }
        }
    }

    public clear() {
        Matter.World.clear(this.world, false)
        this.particleCount = 0
    }

    public resize(w: number, h: number) {
        this.width = w
        this.height = h
        this.createWalls(w, h)
        // Re-init grid heads
        this.gridCols = Math.ceil(w / this.cellSize)
        this.gridRows = Math.ceil(h / this.cellSize)
        this.heads = new Int32Array(this.gridCols * this.gridRows).fill(-1)
    }

    private createWalls(w: number, h: number) {
        if (this.walls.length > 0) {
            Matter.World.remove(this.world, this.walls)
        }

        const th = 100
        this.walls = [
            Matter.Bodies.rectangle(w / 2, h + th / 2, w + th * 2, th, { isStatic: true }),
            Matter.Bodies.rectangle(-th / 2, h / 2, th, h + th * 2, { isStatic: true }),
            Matter.Bodies.rectangle(w + th / 2, h / 2, th, h + th * 2, { isStatic: true })
        ]
        Matter.World.add(this.world, this.walls)
    }
}
