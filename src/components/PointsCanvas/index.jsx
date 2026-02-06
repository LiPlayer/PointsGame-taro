import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const PointsCanvas = forwardRef((props, ref) => {
    const { initialPoints = 0 } = props
    const canvasRef = useRef(null)
    const engineRef = useRef(null)

    useImperativeHandle(ref, () => ({
        add: (count) => engineRef.current?.add(count),
        consume: (count) => engineRef.current?.consume(count),
        explode: () => engineRef.current?.explode()
    }))

    useEffect(() => {
        let timer = null
        const initCanvas = async () => {
            // Must wait for nextTick to ensuring rendering layer is ready
            // Weapp sometimes needs extra time for layout values to stabilize
            await new Promise(resolve => Taro.nextTick(resolve))
            await new Promise(resolve => setTimeout(resolve, 50))

            const query = Taro.createSelectorQuery()
            query.select('#points-canvas')
                .fields({ node: true, size: true })
                .exec((res) => {
                    if (!res[0] || !res[0].node) return
                    const canvas = res[0].node
                    const ctx = canvas.getContext('2d')
                    const dpr = Taro.getSystemInfoSync().pixelRatio
                    const width = res[0].width
                    const height = res[0].height

                    // Setup physical resolution
                    canvas.width = width * dpr
                    canvas.height = height * dpr
                    ctx.scale(dpr, dpr)

                    // Scaling factor based on design width 375
                    const scaleFactor = (width / 375) || 1

                    startEngine(canvas, ctx, width, height, scaleFactor)
                })
        }

        const startEngine = (canvas, ctx, width, height, scaleFactor) => {
            const CONFIG = {
                radius: 8 * scaleFactor,
                gravity: 0.15 * scaleFactor,
                friction: 0.96,
                repulsionRadius: 80 * scaleFactor,
                colors: ['#fbbf24', '#f59e0b', '#d97706'],
                sleepThreshold: 0.05
            }

            // Pre-render star template
            const starTemplate = createStarTemplate(ctx, CONFIG.radius)

            const particles = []
            let mouse = { x: -1000, y: -1000, active: false }

            class Particle {
                constructor(x, y, isInitial = false) {
                    this.x = x
                    this.y = y
                    this.oldX = x + (isInitial ? 0 : (Math.random() - 0.5) * 5)
                    this.oldY = y + (isInitial ? 0 : (Math.random() - 0.5) * 5)
                    this.radius = CONFIG.radius * (0.8 + Math.random() * 0.4)
                    this.angle = Math.random() * Math.PI * 2
                    this.angularVelocity = (Math.random() - 0.5) * 0.1
                    this.z = Math.floor(Math.random() * 3) / 2 // 0, 0.5, 1.0
                    this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)]
                    this.isSleeping = false
                    this.isDying = false
                    this.deathTimer = 0
                    this.scale = 1.0
                }

                update() {
                    if (this.isDying) {
                        this.deathTimer += 0.02
                        if (this.deathTimer < 0.4) {
                            this.y -= 2 * scaleFactor
                            this.angle += 0.1
                        } else {
                            const p2 = (this.deathTimer - 0.4) / 0.6
                            this.scale = 1 - p2
                            this.angle += 0.3
                            this.y -= 1 * scaleFactor
                        }
                        return
                    }

                    if (this.isSleeping) return

                    const vx = (this.x - this.oldX) * CONFIG.friction
                    const vy = (this.y - this.oldY) * CONFIG.friction

                    this.oldX = this.x
                    this.oldY = this.y
                    this.x += vx
                    this.y += vy + CONFIG.gravity
                    this.angle += this.angularVelocity

                    // Repulsion
                    if (mouse.active) {
                        const dx = this.x - mouse.x
                        const dy = this.y - mouse.y
                        const dist = Math.sqrt(dx * dx + dy * dy)
                        if (dist < CONFIG.repulsionRadius) {
                            const force = (CONFIG.repulsionRadius - dist) / CONFIG.repulsionRadius
                            this.x += dx / dist * force * 2
                            this.y += dy / dist * force * 2
                            this.isSleeping = false
                        }
                    }

                    // Boundaries
                    if (this.y + this.radius > height) {
                        this.y = height - this.radius
                        this.oldY = this.y + (this.y - this.oldY) * -0.5
                    }
                    if (this.x + this.radius > width) {
                        this.x = width - this.radius
                        this.oldX = this.x + (this.x - this.oldX) * -0.5
                    } else if (this.x - this.radius < 0) {
                        this.x = this.radius
                        this.oldX = this.x + (this.x - this.oldX) * -0.5
                    }
                }

                draw() {
                    const s = this.scale * (0.6 + this.z * 0.6)
                    ctx.save()
                    ctx.translate(this.x, this.y)
                    ctx.rotate(this.angle)
                    ctx.scale(s, s)

                    if (starTemplate && starTemplate.width > 0 && starTemplate.height > 0) {
                        ctx.drawImage(starTemplate, -CONFIG.radius, -CONFIG.radius)
                    } else {
                        // Primitive fallback if template failed or is invalid
                        drawPrimitiveStar(ctx, 0, 0, CONFIG.radius, this.color)
                    }

                    if (this.z === 1.0) { // Shine for near particles
                        ctx.beginPath()
                        ctx.arc(-CONFIG.radius * 0.3, -CONFIG.radius * 0.3, CONFIG.radius * 0.2, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(255,255,255,0.3)'
                        ctx.fill()
                    }
                    ctx.restore()
                }
            }

            // Init particles
            const cols = Math.floor(width / (CONFIG.radius * 2))
            for (let i = 0; i < initialPoints; i++) {
                const col = i % cols
                const row = Math.floor(i / cols)
                const x = (col + 0.5) * (CONFIG.radius * 2) + (Math.random() - 0.5) * 5
                const y = height - (row + 0.5) * (CONFIG.radius * 2) - 10
                particles.push(new Particle(x, y, true))
            }

            const loop = () => {
                ctx.clearRect(0, 0, width, height)

                // Verlet solver (2 iterations)
                for (let i = 0; i < 2; i++) {
                    particles.forEach(p => p.update())
                }

                // Render
                particles.forEach(p => p.draw())

                // Remove dead particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    if (particles[i].isDying && particles[i].deathTimer >= 1) {
                        particles.splice(i, 1)
                    }
                }

                const nextFrame = (callback) => {
                    if (canvas.requestAnimationFrame) return canvas.requestAnimationFrame(callback)
                    return (Taro.requestAnimationFrame || window.requestAnimationFrame)(callback)
                }

                timer = nextFrame(loop)
            }

            engineRef.current = {
                add: (count) => {
                    for (let i = 0; i < count; i++) {
                        particles.push(new Particle(Math.random() * width, -20))
                    }
                },
                consume: (count) => {
                    let killed = 0
                    for (let i = particles.length - 1; i >= 0 && killed < count; i--) {
                        if (!particles[i].isDying) {
                            particles[i].isDying = true
                            killed++
                        }
                    }
                },
                explode: () => {
                    particles.forEach(p => {
                        p.oldY += 10 + Math.random() * 20
                        p.oldX += (Math.random() - 0.5) * 10
                        p.isSleeping = false
                    })
                },
                updateMouse: (x, y, active) => {
                    mouse.x = x
                    mouse.y = y
                    mouse.active = active
                },
                requestClose: () => {
                    if (canvas.cancelAnimationFrame) canvas.cancelAnimationFrame(timer)
                    else (Taro.cancelAnimationFrame || window.cancelAnimationFrame)(timer)
                }
            }

            loop()
        }

        const createStarTemplate = (ctx, r) => {
            const size = Math.max(1, Math.ceil(r * 4))
            let canvas

            if (process.env.TARO_ENV === 'h5') {
                canvas = document.createElement('canvas')
                canvas.width = size
                canvas.height = size
            } else {
                try {
                    canvas = Taro.createOffscreenCanvas({ type: '2d', width: size, height: size })
                } catch (e) {
                    // Fallback if OffscreenCanvas fails (older Weapp versions)
                    return null
                }
            }

            if (!canvas || canvas.width === 0 || canvas.height === 0) return null
            const sctx = canvas.getContext('2d')
            if (!sctx) return null
            const c = r * 2

            // Outer Glow/Border
            sctx.beginPath()
            drawStar(sctx, c, c, 5, r, r * 0.5)
            sctx.fillStyle = '#fef3c7' // amber-100
            sctx.fill()

            // Main Body
            sctx.beginPath()
            drawStar(sctx, c, c, 5, r * 0.85, r * 0.4)
            sctx.fillStyle = '#ffffff'
            sctx.fill()

            // Core
            sctx.beginPath()
            drawStar(sctx, c, c, 5, r * 0.4, r * 0.15)
            sctx.fillStyle = '#f59e0b' // amber-500
            sctx.fill()

            return canvas
        }

        const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
            let rot = Math.PI / 2 * 3
            let x = cx
            let y = cy
            let step = Math.PI / spikes
            ctx.moveTo(cx, cy - outerRadius)
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius
                y = cy + Math.sin(rot) * outerRadius
                ctx.lineTo(x, y)
                rot += step
                x = cx + Math.cos(rot) * innerRadius
                y = cy + Math.sin(rot) * innerRadius
                ctx.lineTo(x, y)
                rot += step
            }
            ctx.lineTo(cx, cy - outerRadius)
            ctx.closePath()
        }

        const drawPrimitiveStar = (targetCtx, cx, cy, r, color) => {
            targetCtx.beginPath()
            drawStar(targetCtx, cx, cy, 5, r, r * 0.5)
            targetCtx.fillStyle = color
            targetCtx.fill()
        }

        initCanvas()

        return () => {
            engineRef.current?.requestClose()
        }
    }, [initialPoints])

    const handleTouch = (e, active) => {
        if (!engineRef.current) return
        const touch = e.touches[0]
        if (touch) {
            // In Weapp, we need to convert clientX/Y to canvas local
            const query = Taro.createSelectorQuery()
            query.select('#points-canvas').boundingClientRect(res => {
                if (res) {
                    const x = touch.clientX - res.left
                    const y = touch.clientY - res.top
                    engineRef.current.updateMouse(x, y, active)
                }
            }).exec()
        } else {
            engineRef.current.updateMouse(-1000, -1000, false)
        }
    }

    return (
        <Canvas
            type='2d'
            id='points-canvas'
            className='points-canvas'
            onTouchStart={(e) => handleTouch(e, true)}
            onTouchMove={(e) => handleTouch(e, true)}
            onTouchEnd={() => engineRef.current?.updateMouse(-1000, -1000, false)}
        />
    )
})

export default PointsCanvas
