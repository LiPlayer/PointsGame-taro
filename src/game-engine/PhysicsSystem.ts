import { PHYSICS_CONFIG, RENDER_CONFIG } from './Constants'

export class PhysicsSystem {
    // --- 高性能粒子引擎 (Zero Allocation / Typed Arrays) ---
    public MAX_PARTICLES = PHYSICS_CONFIG.maxParticles
    public px: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public py: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public ox: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public oy: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public rads: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public zs: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public ids: Int32Array = new Int32Array(this.MAX_PARTICLES)
    public states: Int8Array = new Int8Array(this.MAX_PARTICLES) // 0: active, 1: dying, 2: cleanup
    public timers: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public angles: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public avs: Float32Array = new Float32Array(this.MAX_PARTICLES)

    // ID池，用于管理稳定的渲染ID
    private idPool: Int32Array = new Int32Array(this.MAX_PARTICLES)
    private poolPtr: number = this.MAX_PARTICLES
    public particleCount: number = 0

    // 网格优化
    private cellSize = PHYSICS_CONFIG.cellSize
    private gridCols = 0
    private gridRows = 0
    private heads: Int32Array = new Int32Array(0)
    private nexts: Int32Array = new Int32Array(this.MAX_PARTICLES)

    private width: number = 0
    private height: number = 0

    constructor() {
        // 初始化ID池 (倒序放入，从0开始取)
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            this.idPool[i] = this.MAX_PARTICLES - 1 - i
        }
    }

    public init(w: number, h: number) {
        this.width = w
        this.height = h

        // 初始化网格
        this.gridCols = Math.ceil(w / this.cellSize)
        this.gridRows = Math.ceil(h / this.cellSize)
        this.heads = new Int32Array(this.gridCols * this.gridRows).fill(-1)
    }

    public update(dt: number) {
        // 全自研 Verlet 更新 (不再依赖 Matter.js)
        this.updateParticles(dt)
    }

    private updateParticles(dt: number) {
        const n = this.particleCount
        const w = this.width, h = this.height

        // 从 Constants.ts 读取参数，根治“名存实亡”
        const friction = 1 - PHYSICS_CONFIG.particle.frictionAir
        const gravity = PHYSICS_CONFIG.gravity.y

        // 网格重构
        const cols = this.gridCols
        const rows = this.gridRows
        this.heads.fill(-1)

        for (let i = 0; i < n; i++) {
            // Animation state: Dying
            if (this.states[i] === 1) {
                this.timers[i] += 0.02
                if (this.timers[i] < 0.4) {
                    this.py[i] -= 2
                    this.angles[i] += 0.1
                } else {
                    this.py[i] -= 1
                    this.angles[i] += 0.2
                    if (this.timers[i] >= 1.0) {
                        this.states[i] = 2
                    }
                }
                continue
            }

            // Verlet Integration
            const vx = (this.px[i] - this.ox[i]) * friction
            const vy = (this.py[i] - this.oy[i]) * friction + gravity

            this.ox[i] = this.px[i]
            this.oy[i] = this.py[i]
            this.px[i] += vx
            this.py[i] += vy

            this.angles[i] += this.avs[i]
            this.avs[i] *= 0.99

            const gx = Math.floor(this.px[i] / this.cellSize)
            const gy = Math.floor(this.py[i] / this.cellSize)
            if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
                const idx = gx + gy * cols
                this.nexts[i] = this.heads[idx]
                this.heads[idx] = i
            }
        }

        // Collision Solve (2 Passes)
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < n; i++) {
                if (this.states[i] !== 0) continue

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
                            if (o > i && this.states[o] === 0) {
                                if (Math.abs(zi - this.zs[o]) < 0.1) {
                                    const dx = this.px[i] - this.px[o]
                                    const dy = this.py[i] - this.py[o]
                                    const distSq = dx * dx + dy * dy
                                    const min = r + this.rads[o]
                                    if (distSq < min * min && distSq > 0) {
                                        const dist = Math.sqrt(distSq)
                                        const stiffness = (PHYSICS_CONFIG.particle as any).stiffness || 0.1
                                        const overlap = (min - dist)
                                        const nx = dx / dist
                                        const ny = dy / dist

                                        // 核心：给排斥力加一个上限，防止在极端重叠下产生瞬间爆炸速度导致星星飞出
                                        const maxPush = 5
                                        const pushX = nx * Math.min(overlap * stiffness, maxPush)
                                        const pushY = ny * Math.min(overlap * stiffness, maxPush)

                                        this.px[i] += pushX
                                        this.py[i] += pushY
                                        this.px[o] -= pushX
                                        this.py[o] -= pushY
                                    }
                                }
                            }
                            o = this.nexts[o]
                        }
                    }
                }
            }
            // Constraint Pass: Apply Boundary Logic (Refactored to Pure Math)
            this.applyConstraints(n, w, h)
        }
    }

    private applyConstraints(n: number, w: number, h: number) {
        const bounce = PHYSICS_CONFIG.bounds.bounce
        const ceilingMargin = PHYSICS_CONFIG.bounds.ceilingMargin
        for (let i = 0; i < n; i++) {
            if (this.states[i] !== 0) continue
            const r = this.rads[i]

            // Left Wall
            if (this.px[i] < r) {
                this.px[i] = r
                this.ox[i] = this.px[i] + (this.px[i] - this.ox[i]) * bounce
            }
            // Right Wall
            if (this.px[i] > w - r) {
                this.px[i] = w - r
                this.ox[i] = this.px[i] + (this.px[i] - this.ox[i]) * bounce
            }
            // Floor
            if (this.py[i] > h - r) {
                const vy = (this.py[i] - this.oy[i])
                this.py[i] = h - r
                this.oy[i] = this.py[i] + vy * bounce
            }
            // Ceiling (Open)
            if (this.py[i] < ceilingMargin) {
                this.states[i] = 2
            }
        }
    }

    public addParticle(x: number, y: number): number {
        if (this.particleCount >= this.MAX_PARTICLES || this.poolPtr <= 0) return -1

        const i = this.particleCount
        this.px[i] = x
        this.py[i] = y
        this.ox[i] = x + (Math.random() - 0.5) * 3
        this.oy[i] = y + (Math.random() - 0.5) * 1

        this.states[i] = 0
        this.timers[i] = 0
        // 使用 collisionRadius 并加入随机扰动 (0.8 ~ 1.2x)
        this.rads[i] = PHYSICS_CONFIG.particle.collisionRadius * (0.8 + Math.random() * 0.4)
        this.zs[i] = Math.floor(Math.random() * (RENDER_CONFIG.depth?.zLevels || 3)) / 2
        this.angles[i] = Math.random() * Math.PI * 2
        this.avs[i] = (Math.random() - 0.5) * 0.2

        const id = this.idPool[--this.poolPtr]
        this.ids[i] = id
        this.particleCount++
        return id
    }

    public consume(count: number) {
        const n = this.particleCount
        let marked = 0
        const indices = Array.from({ length: n }, (_, i) => i)
            .filter(i => this.states[i] === 0)

        console.log(`[PhysicsSystem] consume requested: ${count}, available active: ${indices.length}, total: ${n}`)

        for (let i = 0; i < count && indices.length > 0; i++) {
            const idxIdx = Math.floor(Math.random() * indices.length)
            const pIdx = indices.splice(idxIdx, 1)[0]
            this.states[pIdx] = 1
            this.timers[pIdx] = 0
            marked++
        }
        console.log(`[PhysicsSystem] consume finished: marked ${marked} for removal`)
        return marked
    }

    public cleanup(onRemove: (id: number) => void) {
        for (let i = this.particleCount - 1; i >= 0; i--) {
            if (this.states[i] === 2) {
                const id = this.ids[i]
                onRemove(id)
                this.idPool[this.poolPtr++] = id

                const last = this.particleCount - 1
                if (i !== last) {
                    this.px[i] = this.px[last]; this.py[i] = this.py[last]
                    this.ox[i] = this.ox[last]; this.oy[i] = this.oy[last]
                    this.rads[i] = this.rads[last]; this.zs[i] = this.zs[last]
                    this.ids[i] = this.ids[last]; this.states[i] = this.states[last]
                    this.timers[i] = this.timers[last]
                    this.angles[i] = this.angles[last]; this.avs[i] = this.avs[last]
                }
                this.particleCount--
            }
        }
    }

    public removeStars(count: number) {
        this.consume(count)
    }

    public getStarCount(): number {
        return this.particleCount
    }

    public applyExplosion(x: number, y: number, power: number = 15) {
        const n = this.particleCount
        for (let i = 0; i < n; i++) {
            if (this.states[i] !== 0) continue
            const dx = this.px[i] - x
            const dy = this.py[i] - y
            const force = power + Math.random() * 10
            const angle = Math.atan2(dy, dx)

            this.ox[i] = this.px[i] - Math.cos(angle) * force
            this.oy[i] = this.py[i] - Math.sin(angle) * force
        }
    }

    public applyRepulsion(x: number, y: number) {
        const n = this.particleCount
        const range = PHYSICS_CONFIG.interaction.repulsionRadius
        const rangeSq = range * range
        const force = PHYSICS_CONFIG.interaction.repulsionForce

        for (let i = 0; i < n; i++) {
            if (this.states[i] !== 0) continue
            const dx = this.px[i] - x
            const dy = this.py[i] - y
            const d2 = dx * dx + dy * dy
            if (d2 < rangeSq && d2 > 0) {
                const dist = Math.sqrt(d2)
                const f = (1 - dist / range) * force * 2
                const nx = (dx / dist) * f
                const ny = (dy / dist) * f

                this.px[i] += nx
                this.py[i] += ny
            }
        }
    }

    public clear() {
        this.particleCount = 0
        this.poolPtr = this.MAX_PARTICLES
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            this.idPool[i] = this.MAX_PARTICLES - 1 - i
        }
    }

    public resize(w: number, h: number) {
        this.width = w
        this.height = h
        this.gridCols = Math.ceil(w / this.cellSize)
        this.gridRows = Math.ceil(h / this.cellSize)
        this.heads = new Int32Array(this.gridCols * this.gridRows).fill(-1)
    }
}
