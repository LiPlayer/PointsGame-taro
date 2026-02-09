import { PHYSICS_CONFIG, RENDER_CONFIG } from './Constants'

/**
 * PBD (Position-Based Dynamics) Physics System
 * 
 * 性能优化:
 * - 全部使用 TypedArray 预分配，运行时零GC
 * - 空间网格碰撞检测 O(n) 复杂度
 * - 只同深度层粒子碰撞，减少计算量
 */
export class PhysicsSystem {
    // --- 高性能粒子引擎 (Zero Allocation / Typed Arrays) ---
    public MAX_PARTICLES = PHYSICS_CONFIG.maxParticles

    // Position (current frame)
    public px: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public py: Float32Array = new Float32Array(this.MAX_PARTICLES)

    // Position (previous frame) - for velocity calculation
    public ox: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public oy: Float32Array = new Float32Array(this.MAX_PARTICLES)

    // Velocity (explicit for PBD)
    public vx: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public vy: Float32Array = new Float32Array(this.MAX_PARTICLES)

    // Particle properties
    public rads: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public zs: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public ids: Int32Array = new Int32Array(this.MAX_PARTICLES)
    public states: Int8Array = new Int8Array(this.MAX_PARTICLES) // 0: active, 1: dying, 2: cleanup
    public timers: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public angles: Float32Array = new Float32Array(this.MAX_PARTICLES)
    public avs: Float32Array = new Float32Array(this.MAX_PARTICLES)

    // ID Pool
    private idPool: Int32Array = new Int32Array(this.MAX_PARTICLES)
    private poolPtr: number = this.MAX_PARTICLES
    public particleCount: number = 0

    // Round-robin z-level counter for uniform distribution
    private zCounter: number = 0

    // Spatial Grid
    private cellSize = PHYSICS_CONFIG.cellSize
    private gridCols = 0
    private gridRows = 0
    private heads: Int32Array = new Int32Array(0)
    private nexts: Int32Array = new Int32Array(this.MAX_PARTICLES)

    private width: number = 0
    private height: number = 0

    constructor() {
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            this.idPool[i] = this.MAX_PARTICLES - 1 - i
        }
    }

    public init(w: number, h: number) {
        this.width = w
        this.height = h
        this.gridCols = Math.ceil(w / this.cellSize)
        this.gridRows = Math.ceil(h / this.cellSize)
        this.heads = new Int32Array(this.gridCols * this.gridRows).fill(-1)
    }

    public update(dt: number) {
        this.updatePBD()
    }

    /**
     * PBD Update Loop:
     * 1. Apply gravity to velocity
     * 2. Predict new positions
     * 3. Solve constraints (multiple iterations)
     * 4. Update velocity from position change
     */
    private updatePBD() {
        const n = this.particleCount
        const w = this.width, h = this.height

        const gravity = PHYSICS_CONFIG.gravity.y
        const damping = PHYSICS_CONFIG.particle.damping || 0.98
        const consumption = PHYSICS_CONFIG.consumption
        const constraintIterations = PHYSICS_CONFIG.bounds.collisionPasses

        // ========== Phase 1: Apply forces & predict positions ==========
        for (let i = 0; i < n; i++) {
            // Skip dying particles
            if (this.states[i] === 1) {
                this.timers[i] += consumption.speed
                if (this.timers[i] < consumption.phase1Threshold) {
                    this.py[i] += consumption.floatForce1
                    this.angles[i] += 0.1
                } else {
                    this.py[i] += consumption.floatForce2
                    this.angles[i] += 0.2
                    if (this.timers[i] >= 1.0) {
                        this.states[i] = 2
                    }
                }
                continue
            }

            // Apply gravity
            this.vy[i] += gravity

            // Apply damping
            this.vx[i] *= damping
            this.vy[i] *= damping

            // Store old position
            this.ox[i] = this.px[i]
            this.oy[i] = this.py[i]

            // Predict new position
            this.px[i] += this.vx[i]
            this.py[i] += this.vy[i]

            // Update rotation
            this.angles[i] += this.avs[i]
            this.avs[i] *= (1 - (PHYSICS_CONFIG.particle.angularDamping || 0.0))
        }

        // ========== Phase 2: Constraint solving (multiple iterations) ==========
        for (let iter = 0; iter < constraintIterations; iter++) {
            // Rebuild spatial grid each iteration
            this.rebuildGrid(n)

            // Solve particle-particle constraints
            this.solveParticleConstraints(n)

            // Solve boundary constraints
            this.solveBoundaryConstraints(n, w, h)
        }

        // ========== Phase 3: Update velocity from position change ==========
        for (let i = 0; i < n; i++) {
            if (this.states[i] !== 0) continue
            this.vx[i] = this.px[i] - this.ox[i]
            this.vy[i] = this.py[i] - this.oy[i]
        }
    }

    private rebuildGrid(n: number) {
        const cols = this.gridCols
        const rows = this.gridRows
        this.heads.fill(-1)

        for (let i = 0; i < n; i++) {
            if (this.states[i] !== 0) continue

            const gx = Math.floor(this.px[i] / this.cellSize)
            const gy = Math.floor(this.py[i] / this.cellSize)

            if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
                // Inline index calculation: gx + gy * cols
                const idx = gx + gy * cols
                this.nexts[i] = this.heads[idx]
                this.heads[idx] = i
            }
        }
    }

    /**
     * PBD Distance Constraint:
     * If two particles overlap, push them apart to exactly minDist
     */
    private solveParticleConstraints(n: number) {
        const cols = this.gridCols
        const rows = this.gridRows

        for (let i = 0; i < n; i++) {
            if (this.states[i] !== 0) continue

            const gx = Math.floor(this.px[i] / this.cellSize)
            const gy = Math.floor(this.py[i] / this.cellSize)
            const ri = this.rads[i]
            const zi = this.zs[i]

            // Start with current cell (center)
            // Pre-calculate grid index to avoid re-calculation in loop
            const centerIdx = gx + gy * cols

            // Check 9 neighboring cells (including self)
            // Unroll loop for performance (3x3 grid)
            // Use local vars for speed
            const heads = this.heads
            const nexts = this.nexts
            const states = this.states
            const px = this.px
            const py = this.py
            const rads = this.rads
            const zs = this.zs

            for (let dy = -1; dy <= 1; dy++) {
                const ny = gy + dy
                if (ny < 0 || ny >= rows) continue

                const yOffset = ny * cols

                for (let dx = -1; dx <= 1; dx++) {
                    const nx = gx + dx
                    if (nx < 0 || nx >= cols) continue

                    let j = heads[nx + yOffset]
                    while (j !== -1) {
                        if (j > i && states[j] === 0) {
                            // Only collide same z-level (performance + visual)
                            if (Math.abs(zi - zs[j]) < 0.1) {
                                const dx = px[i] - px[j]
                                const dy = py[i] - py[j]
                                const distSq = dx * dx + dy * dy
                                const minDist = ri + rads[j]

                                if (distSq < minDist * minDist && distSq > 0.0001) {
                                    const dist = Math.sqrt(distSq)
                                    const overlap = minDist - dist

                                    // PBD: Move each particle by half the overlap
                                    const limit = overlap * 0.5
                                    const nx = dx / dist
                                    const ny = dy / dist

                                    px[i] += nx * limit
                                    py[i] += ny * limit
                                    px[j] -= nx * limit
                                    py[j] -= ny * limit
                                }
                            }
                        }
                        j = nexts[j]
                    }
                }
            }
        }
    }

    private solveBoundaryConstraints(n: number, w: number, h: number) {
        const bounce = PHYSICS_CONFIG.bounds.bounce
        const ceilingMargin = PHYSICS_CONFIG.bounds.ceilingMargin

        for (let i = 0; i < n; i++) {
            if (this.states[i] !== 0) continue
            const r = this.rads[i]

            // Left Wall
            if (this.px[i] < r) {
                this.px[i] = r
                this.vx[i] *= -bounce
            }
            // Right Wall
            if (this.px[i] > w - r) {
                this.px[i] = w - r
                this.vx[i] *= -bounce
            }
            // Floor
            if (this.py[i] > h - r) {
                this.py[i] = h - r
                this.vy[i] *= -bounce
                this.avs[i] *= 0.9
            }
            // Ceiling (cleanup)
            if (this.py[i] < ceilingMargin) {
                this.states[i] = 2
            }
        }
    }

    public addParticle(x: number, y: number): number {
        if (this.particleCount >= this.MAX_PARTICLES || this.poolPtr <= 0) return -1

        const i = this.particleCount

        // Position
        this.px[i] = x
        this.py[i] = y
        this.ox[i] = x
        this.oy[i] = y

        // Velocity (random horizontal drift for natural falling)
        this.vx[i] = (Math.random() - 0.5) * 5.0  // -2.5 ~ 2.5 水平漂移
        this.vy[i] = Math.random() * 0.5          // 0 ~ 0.5 轻微向下

        // State
        this.states[i] = 0
        this.timers[i] = 0

        // Radius with small variance
        this.rads[i] = PHYSICS_CONFIG.particle.collisionRadius * (0.9 + Math.random() * 0.2)

        // Uniform z-level distribution (round-robin)
        const zLevels = RENDER_CONFIG.depth?.zLevels || 3
        this.zs[i] = (this.zCounter % zLevels) / (zLevels - 1 || 1)
        this.zCounter++

        // Rotation
        this.angles[i] = Math.random() * Math.PI * 2
        this.avs[i] = (Math.random() - 0.5) * 0.2

        // Assign ID
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

        for (let i = 0; i < count && indices.length > 0; i++) {
            const idxIdx = Math.floor(Math.random() * indices.length)
            const pIdx = indices.splice(idxIdx, 1)[0]
            this.states[pIdx] = 1
            this.timers[pIdx] = 0
            marked++
        }
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
                    this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last]
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
            const dist = Math.sqrt(dx * dx + dy * dy) + 1
            const force = power / dist

            this.vx[i] += (dx / dist) * force
            this.vy[i] += (dy / dist) * force
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
                const f = (1 - dist / range) * force
                this.vx[i] += (dx / dist) * f
                this.vy[i] += (dy / dist) * f
            }
        }
    }

    public clear() {
        this.particleCount = 0
        this.poolPtr = this.MAX_PARTICLES
        this.zCounter = 0
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
