import Taro from '@tarojs/taro'

/**
 * Points Hero Star Engine (Verlet + Spatial Hash)
 * Spec: specifications/dev_spec.md + specifications/home_spec.md
 *
 * Notes:
 * - No drawImage (hand-drawn arcs/lineTo only).
 * - Supports start/stop/destroy for onShow/onHide + cleanup.
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function drawStar(ctx, radius) {
  // 5-point star, centered at (0,0)
  const outer = radius
  const inner = radius * 0.5

  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

export class StarAnimation {
  constructor(canvasNode, ctx, width, height, dpr, initialPoints = 0) {
    this.canvas = canvasNode
    this.ctx = ctx

    this.dpr = dpr || 1

    // `useCanvas2D` scales the context by dpr already (per spec). We reset transforms per frame
    // and treat width/height as logical (CSS px) dimensions from the hook.
    this.width = width || 300
    this.height = height || 200
    this.physicalWidth = Math.max(1, Math.floor(this.width * this.dpr))
    this.physicalHeight = Math.max(1, Math.floor(this.height * this.dpr))

    const widthFactor = this.width / 375

    this.CONFIG = {
      maxParticles: 1500,
      radius: 8 * widthFactor,
      gravity: 0.15,
      friction: 0.96,
      floorBounce: -0.5,
      repulsionRadius: 80 * widthFactor,
      repulsionForce: 1.0,
      colors: ['#fbbf24', '#f59e0b', '#d97706'],
      sleepThreshold: 0.05
    }

    this.cellSize = this.CONFIG.radius * 2.2
    this.grid = {}
    this.particles = []

    this.pointer = {
      x: -1000,
      y: -1000,
      oldX: -1000,
      oldY: -1000,
      active: false
    }

    this.running = false
    this.rafId = null

    const isWeapp = process.env.TARO_ENV === 'weapp'

    // Note: "Illegal invocation" on H5 is commonly caused by calling a host function
    // (e.g. requestAnimationFrame) with the wrong `this` binding. Prefer globalThis on H5,
    // and only use CanvasNode RAF APIs on Weapp 2D canvas nodes.
    const globalRaf =
      typeof globalThis !== 'undefined' ? globalThis.requestAnimationFrame : undefined
    const globalCaf =
      typeof globalThis !== 'undefined' ? globalThis.cancelAnimationFrame : undefined

    this._raf =
      (isWeapp && this.canvas?.requestAnimationFrame
        ? this.canvas.requestAnimationFrame.bind(this.canvas)
        : null) ||
      (typeof globalRaf === 'function' ? globalRaf.bind(globalThis) : null) ||
      (typeof Taro?.requestAnimationFrame === 'function' ? Taro.requestAnimationFrame.bind(Taro) : null)

    this._caf =
      (isWeapp && this.canvas?.cancelAnimationFrame
        ? this.canvas.cancelAnimationFrame.bind(this.canvas)
        : null) ||
      (typeof globalCaf === 'function' ? globalCaf.bind(globalThis) : null) ||
      (typeof Taro?.cancelAnimationFrame === 'function' ? Taro.cancelAnimationFrame.bind(Taro) : null)

    this.setParticleCount(initialPoints)
    this.loop = this.loop.bind(this)
  }

  destroy() {
    this.stop()
    this.particles = null
    this.grid = null
    this.pointer = null
    this.canvas = null
    this.ctx = null
  }

  start() {
    if (this.running) return
    this.running = true
    if (this._raf) this.rafId = this._raf(this.loop)
  }

  stop() {
    this.running = false
    if (this.rafId != null && this._caf) this._caf(this.rafId)
    this.rafId = null
  }

  setPointer(x, y, active) {
    if (!this.pointer) return
    this.pointer.oldX = this.pointer.x
    this.pointer.oldY = this.pointer.y
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.active = !!active
  }

  createParticle(x, y) {
    const r = this.CONFIG.radius * rand(0.8, 1.2)
    return {
      x,
      y,
      oldX: x + rand(-2, 2),
      oldY: y + rand(-2, 2),
      radius: r,
      angle: rand(0, Math.PI * 2),
      angularVelocity: rand(-0.1, 0.1),
      z: Math.floor(Math.random() * 3) / 2, // 0, 0.5, 1.0
      color: this.CONFIG.colors[Math.floor(Math.random() * this.CONFIG.colors.length)],
      isSleeping: false,
      isDying: false,
      deathTimer: 0,
      scale: 1.0
    }
  }

  initStack(targetCount) {
    this.particles = []
    const cols = Math.max(1, Math.floor(this.width / (this.CONFIG.radius * 2)))

    for (let i = 0; i < targetCount; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)

      const x = (col + 0.5) * (this.CONFIG.radius * 2) + rand(-2.5, 2.5)
      const y = this.height - (row + 0.5) * (this.CONFIG.radius * 2) - 20

      this.particles.push(this.createParticle(x, y))
    }
  }

  setParticleCount(count) {
    const target = clamp(Math.floor(count || 0), 0, this.CONFIG.maxParticles)

    if (!this.particles || this.particles.length === 0) {
      this.initStack(target)
      return
    }

    const alive = this.particles.filter((p) => !p.isDying)
    const aliveCount = alive.length

    if (target > aliveCount) {
      const toAdd = target - aliveCount
      for (let i = 0; i < toAdd; i++) {
        const x = Math.random() * this.width
        const y = -20 - Math.random() * 100
        this.particles.push(this.createParticle(x, y))
      }
      return
    }

    if (target < aliveCount) {
      let candidates = alive.slice()
      const toKill = aliveCount - target
      for (let i = 0; i < toKill; i++) {
        if (candidates.length === 0) break
        const idx = Math.floor(Math.random() * candidates.length)
        candidates[idx].isDying = true
        candidates.splice(idx, 1)
      }
    }
  }

  update() {
    if (!this.particles) return

    for (const p of this.particles) {
      if (p.isDying) {
        p.deathTimer += 0.02
        if (p.deathTimer < 0.4) {
          p.y -= 2
          p.angle += 0.1
        } else {
          const phase2 = (p.deathTimer - 0.4) / 0.6
          p.scale = 1 - phase2
          p.angle += 0.3
          p.y -= 1
        }
        continue
      }

      if (p.isSleeping) continue

      const vx = (p.x - p.oldX) * this.CONFIG.friction
      const vy = (p.y - p.oldY) * this.CONFIG.friction

      p.oldX = p.x
      p.oldY = p.y

      p.x += vx
      p.y += vy + this.CONFIG.gravity
      p.angle += p.angularVelocity

      // Walls
      if (p.x + p.radius > this.width) {
        p.x = this.width - p.radius
        p.oldX = p.x + vx * 0.5
      } else if (p.x - p.radius < 0) {
        p.x = p.radius
        p.oldX = p.x + vx * 0.5
      }

      // Floor (bounce)
      if (p.y + p.radius > this.height) {
        p.y = this.height - p.radius
        const vYAfter = vy * this.CONFIG.floorBounce
        p.oldY = p.y - vYAfter
        p.angularVelocity *= 0.9
      }

      if (Math.abs(vx) + Math.abs(vy) < this.CONFIG.sleepThreshold) {
        p.isSleeping = true
      }
    }

    // Prune dead
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      if (p.isDying && p.deathTimer >= 1.0) this.particles.splice(i, 1)
    }
  }

  solve() {
    if (!this.particles) return

    // Spatial hash
    this.grid = {}
    for (const p of this.particles) {
      if (p.isDying) continue
      const key = `${Math.floor(p.x / this.cellSize)},${Math.floor(p.y / this.cellSize)}`
      if (!this.grid[key]) this.grid[key] = []
      this.grid[key].push(p)
    }

    // Repulsion force field (pointer)
    if (this.pointer?.active) {
      const px = this.pointer.x
      const py = this.pointer.y
      const pvx = px - this.pointer.oldX
      const pvy = py - this.pointer.oldY
      const speed = clamp(Math.sqrt(pvx * pvx + pvy * pvy) / 12, 0.6, 2.0)

      for (const p of this.particles) {
        if (p.isDying) continue
        const dx = p.x - px
        const dy = p.y - py
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        if (dist > this.CONFIG.repulsionRadius) continue

        const strength =
          (1 - dist / this.CONFIG.repulsionRadius) * this.CONFIG.repulsionForce * speed

        p.x += (dx / dist) * strength * 12
        p.y += (dy / dist) * strength * 12
        p.isSleeping = false
      }
    }

    // Particle collision constraint (neighbors only)
    for (const key of Object.keys(this.grid)) {
      const [cx, cy] = key.split(',').map((n) => parseInt(n, 10))
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const other = this.grid[`${cx + ox},${cy + oy}`]
          if (!other) continue

          const here = this.grid[key]
          for (const a of here) {
            if (a.isDying) continue
            for (const b of other) {
              if (a === b || b.isDying) continue
              const dx = b.x - a.x
              const dy = b.y - a.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              const minDist = a.radius + b.radius
              if (dist >= minDist) continue

              const overlap = (minDist - dist) / dist
              const sx = dx * overlap * 0.5
              const sy = dy * overlap * 0.5

              a.x -= sx
              a.y -= sy
              b.x += sx
              b.y += sy

              a.isSleeping = false
              b.isSleeping = false
            }
          }
        }
      }
    }
  }

  draw() {
    if (!this.ctx || !this.particles) return
    const ctx = this.ctx

    // Always clear the full physical buffer using identity transform, then restore logical space.
    if (typeof ctx.setTransform === 'function') {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, this.physicalWidth, this.physicalHeight)
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    } else {
      // Fallback: best-effort clear in current transform space.
      ctx.clearRect(0, 0, this.width, this.height)
    }

    // Sort for subtle depth order
    this.particles.sort((a, b) => a.z - b.z)

    for (const p of this.particles) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle)

      const zScale = 0.5 + p.z * 0.7
      const finalScale = zScale * p.scale
      ctx.scale(finalScale, finalScale)

      // Outer ring (amber-100 like)
      ctx.beginPath()
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(254, 243, 199, 1)'
      ctx.fill()

      // White body
      ctx.beginPath()
      ctx.arc(0, 0, Math.max(1, p.radius - 2.5), 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // Gold star
      ctx.fillStyle = p.color
      drawStar(ctx, Math.max(2, p.radius - 3.5))

      // Shine on closer stars
      if (p.z > 0.7) {
        ctx.beginPath()
        ctx.arc(-p.radius * 0.3, -p.radius * 0.3, Math.max(1, p.radius * 0.25), 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.fill()
      }

      ctx.restore()
    }
  }

  loop() {
    if (!this.running) return
    this.update()
    this.solve()
    this.solve() // Stability
    this.draw()
    if (this._raf) this.rafId = this._raf(this.loop)
  }
}
