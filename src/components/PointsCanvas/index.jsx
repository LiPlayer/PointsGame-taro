import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const PointsCanvas = forwardRef((props, ref) => {
    const { initialPoints = 0 } = props
    const canvasRef = useRef(null)
    const engineRef = useRef(null)
    const boundsRef = useRef(null)
    const env = Taro.getEnv()
    const isWeb = env === Taro.ENV_TYPE.WEB || env === 'WEB' || env === 'H5'

    useImperativeHandle(ref, () => ({
        add: (count) => engineRef.current?.add(count),
        consume: (count) => engineRef.current?.consume(count),
        explode: () => engineRef.current?.explode()
    }))

    useEffect(() => {
        let timer = null
        let cleanupInteraction = null

        const initCanvas = async () => {
            // Wait for Taro to finish layout
            await new Promise(resolve => Taro.nextTick(resolve))
            await new Promise(resolve => setTimeout(resolve, 100))

            let canvasNode, width, height, ctx, dpr;

            if (isWeb && typeof document !== 'undefined') {
                canvasNode = canvasRef.current
                if (!canvasNode) return
                const rect = canvasNode.getBoundingClientRect()
                ctx = canvasNode.getContext('2d')
                dpr = window.devicePixelRatio || 1
                width = rect.width
                height = rect.height
                canvasNode.width = width * dpr
                canvasNode.height = height * dpr
                ctx.scale(dpr, dpr)
            } else {
                const query = Taro.createSelectorQuery()
                const res = await new Promise(resolve => {
                    query.select('#points-canvas')
                        .fields({ node: true, size: true, rect: true })
                        .exec(resolve)
                })
                if (!res || !res[0] || !res[0].node) return
                const data = res[0]
                canvasNode = data.node
                width = data.width
                height = data.height
                ctx = canvasNode.getContext('2d')
                dpr = Taro.getSystemInfoSync().pixelRatio || 1
                canvasNode.width = width * dpr
                canvasNode.height = height * dpr
                ctx.scale(dpr, dpr)
            }

            const scaleFactor = (width / 375) || 1
            startEngine(canvasNode, ctx, width, height, scaleFactor)

            // Native Interaction: Attach to parent card like the prototype
            const container = canvasNode.parentElement
            if (container) {
                const handleUpdate = (clientX, clientY, active) => {
                    const rect = canvasNode.getBoundingClientRect()
                    const x = clientX - rect.left
                    const y = clientY - rect.top
                    engineRef.current?.updateMouse(x, y, active)
                }

                const moveHandler = (e) => {
                    const touch = e.touches?.[0] || e
                    handleUpdate(touch.clientX, touch.clientY, true)
                }
                const leaveHandler = () => engineRef.current?.updateMouse(-1000, -1000, false)

                container.addEventListener('mousemove', moveHandler)
                container.addEventListener('touchmove', moveHandler, { passive: false })
                container.addEventListener('touchstart', moveHandler, { passive: false })
                container.addEventListener('mouseleave', leaveHandler)
                container.addEventListener('touchend', leaveHandler)
                container.addEventListener('mouseenter', moveHandler)

                cleanupInteraction = () => {
                    container.removeEventListener('mousemove', moveHandler)
                    container.removeEventListener('touchmove', moveHandler)
                    container.removeEventListener('touchstart', moveHandler)
                    container.removeEventListener('mouseleave', leaveHandler)
                    container.removeEventListener('touchend', leaveHandler)
                    container.removeEventListener('mouseenter', moveHandler)
                }
            }
        }

        const startEngine = (canvas, ctx, width, height, scaleFactor) => {
            const CONFIG = {
                radius: 8 * scaleFactor,
                gravity: 0.15 * scaleFactor,
                friction: 0.96,
                repulsionRadius: 80 * scaleFactor,
                repulsionForce: 1.0,
                stiffness: 0.5,
                colors: ['#fbbf24', '#f59e0b', '#d97706']
            }

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
                    this.z = Math.floor(Math.random() * 3) / 2
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

                    if (mouse.active) {
                        const dx = this.x - mouse.x
                        const dy = this.y - mouse.y
                        const distSq = dx * dx + dy * dy
                        const rSq = CONFIG.repulsionRadius * CONFIG.repulsionRadius
                        if (distSq < rSq) {
                            const dist = Math.sqrt(distSq)
                            const force = (1 - dist / CONFIG.repulsionRadius) * CONFIG.repulsionForce
                            const angle = Math.atan2(dy, dx)
                            this.x += Math.cos(angle) * force * 2
                            this.y += Math.sin(angle) * force * 2
                            this.isSleeping = false
                        }
                    }

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
                    const baseScale = (this.radius * 2 / 64)
                    const zScale = 0.5 + this.z * 0.7
                    const s = baseScale * zScale * this.scale
                    ctx.save()
                    ctx.translate(this.x, this.y)
                    ctx.rotate(this.angle)
                    ctx.scale(s, s)
                    if (starTemplate) ctx.drawImage(starTemplate, -32, -32)
                    if (this.z > 0.7) {
                        ctx.beginPath()
                        ctx.arc(-10, -10, 8, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(255,255,255,0.3)'
                        ctx.fill()
                    }
                    ctx.restore()
                }
            }

            const cellSize = CONFIG.radius * 2.2
            let grid = {}

            const solveCollisions = () => {
                grid = {}
                for (let p of particles) {
                    if (p.isDying) continue
                    const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`
                    if (!grid[key]) grid[key] = []
                    grid[key].push(p)
                }
                for (let p of particles) {
                    if (p.isDying) continue
                    const gx = Math.floor(p.x / cellSize)
                    const gy = Math.floor(p.y / cellSize)
                    for (let xi = gx - 1; xi <= gx + 1; xi++) {
                        for (let yi = gy - 1; yi <= gy + 1; yi++) {
                            const cell = grid[`${xi},${yi}`]
                            if (!cell) continue
                            for (let other of cell) {
                                if (p === other || Math.abs(p.z - other.z) > 0.1) continue
                                const dx = p.x - other.x
                                const dy = p.y - other.y
                                const distSq = dx * dx + dy * dy
                                const minDist = p.radius + other.radius
                                if (distSq < minDist * minDist && distSq > 0) {
                                    const dist = Math.sqrt(distSq)
                                    const overlap = (minDist - dist) * CONFIG.stiffness
                                    const nx = dx / dist, ny = dy / dist
                                    p.x += nx * overlap; p.y += ny * overlap
                                    other.x -= nx * overlap; other.y -= ny * overlap
                                    p.isSleeping = false; other.isSleeping = false
                                }
                            }
                        }
                    }
                }
            }

            const cols = Math.floor(width / (CONFIG.radius * 2))
            for (let i = 0; i < initialPoints; i++) {
                const col = i % cols
                const row = Math.floor(i / cols)
                particles.push(new Particle((col + 0.5) * (CONFIG.radius * 2), height - (row + 0.5) * (CONFIG.radius * 2) - 10, true))
            }

            const loop = () => {
                ctx.clearRect(0, 0, width, height)
                particles.forEach(p => p.update())
                for (let i = 0; i < 2; i++) solveCollisions()
                particles.sort((a, b) => a.z - b.z)
                particles.forEach(p => p.draw())
                for (let i = particles.length - 1; i >= 0; i--) {
                    if (particles[i].isDying && particles[i].deathTimer >= 1) particles.splice(i, 1)
                }
                const nextFrame = (cb) => (canvas.requestAnimationFrame || Taro.requestAnimationFrame || window.requestAnimationFrame)(cb)
                timer = nextFrame(loop)
            }

            engineRef.current = {
                add: (count) => { for (let i = 0; i < count; i++) particles.push(new Particle(Math.random() * width, -20)) },
                consume: (count) => {
                    let killed = 0
                    for (let i = particles.length - 1; i >= 0 && killed < count; i--) {
                        if (!particles[i].isDying) { particles[i].isDying = true; killed++ }
                    }
                },
                explode: () => {
                    particles.forEach(p => {
                        const force = (10 + Math.random() * 20) * scaleFactor
                        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
                        p.oldX = p.x - Math.cos(angle) * force; p.oldY = p.y - Math.sin(angle) * force; p.isSleeping = false
                    })
                },
                updateMouse: (x, y, active) => { mouse.x = x; mouse.y = y; mouse.active = active },
                requestClose: () => {
                    const cancel = (id) => (canvas.cancelAnimationFrame || Taro.cancelAnimationFrame || window.cancelAnimationFrame)(id)
                    cancel(timer)
                }
            }
            loop()
        }

        const createStarTemplate = (ctx, r) => {
            const size = 64
            let canvas
            if (process.env.TARO_ENV === 'h5') {
                canvas = document.createElement('canvas')
                canvas.width = size; canvas.height = size
            } else {
                try { canvas = Taro.createOffscreenCanvas({ type: '2d', width: size, height: size }) } catch (e) { return null }
            }
            if (!canvas || canvas.width === 0) return null
            const sctx = canvas.getContext('2d')
            const cx = size / 2, cy = size / 2, outerR = 28
            sctx.beginPath(); sctx.arc(cx, cy, outerR, 0, Math.PI * 2); sctx.fillStyle = '#fef3c7'; sctx.fill()
            sctx.beginPath(); sctx.arc(cx, cy, outerR - 6, 0, Math.PI * 2); sctx.fillStyle = '#ffffff'; sctx.fill()
            sctx.save(); sctx.translate(cx, cy); sctx.beginPath()
            for (let i = 0; i < 5; i++) {
                sctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 19, -Math.sin((18 + i * 72) * Math.PI / 180) * 19)
                sctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 9, -Math.sin((54 + i * 72) * Math.PI / 180) * 9)
            }
            sctx.closePath(); sctx.fillStyle = '#f59e0b'; sctx.fill(); sctx.restore()
            return canvas
        }

        initCanvas()
        return () => {
            engineRef.current?.requestClose()
            if (cleanupInteraction) cleanupInteraction()
        }
    }, [initialPoints, isWeb])

    return (
        isWeb ? (
            <canvas id='points-canvas' className='points-canvas' ref={canvasRef} />
        ) : (
            <Canvas type='2d' id='points-canvas' className='points-canvas' ref={canvasRef} />
        )
    )
})

export default PointsCanvas
