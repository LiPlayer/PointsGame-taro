import { Canvas, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC, useCallback, useEffect, useMemo, useRef } from 'react'
import BrandHeader from '../BrandHeader'
import { useCanvas2D, Canvas2DRect } from '../../utils/useCanvas2D'
import { requestRaf, cancelRaf } from '../../utils/raf'

const SVG_THUNDER_AMBER =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%223%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%2F%3E%3C%2Fsvg%3E"

function formatNumber(value: number): string {
    const num = Number(value || 0)
    const s = String(Math.floor(num))
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

interface PointsHeroCardProps {
    className?: string
    points?: number
    dailyPlayCount?: number
    isActive?: boolean
}

interface Particle {
    x: number
    y: number
    oldX: number
    oldY: number
    radius: number
    angle: number
    angularVelocity: number
    z: number
    isSleeping: boolean
    isDying: boolean
    deathTimer: number
    scale: number
    update: () => void
}

const MAX_STARS = 3000
// Height ~ r^2 when width is fixed, so halve height => r * sqrt(0.5)
const VISUAL_SCALE = Math.SQRT1_2
const CONFIG = {
    particleCount: 1240,
    radius: 8,
    gravity: 0.15,
    friction: 0.96,
    repulsionRadius: 80,
    repulsionForce: 1.0
}

const PointsHeroCard: FC<PointsHeroCardProps> = ({
    className = '',
    points = 0,
    dailyPlayCount = 0,
    isActive = true
}) => {
    const canvasId = useMemo(
        () => `points-canvas-${Math.random().toString(36).slice(2, 8)}`,
        []
    )
    const rectRef = useRef<Canvas2DRect | null>(null)
    const pointerRef = useRef({ x: -1000, y: -1000, active: false })
    const activeRef = useRef(isActive)
    const pointsRef = useRef(points)
    const controlsRef = useRef<null | {
        start: () => void
        stop: () => void
        sync: (target: number) => void
    }>(null)

    pointsRef.current = points

    useEffect(() => {
        activeRef.current = isActive
        const controls = controlsRef.current
        if (!controls) return
        if (isActive) controls.start()
        else controls.stop()
    }, [isActive])

    useEffect(() => {
        controlsRef.current?.sync(points)
    }, [points])

    const handlePointerMove = useCallback((event: any) => {
        const rect = rectRef.current
        if (!rect) return

        const detail = event?.detail || {}
        if (process.env.TARO_ENV === 'weapp' && typeof detail.x === 'number' && typeof detail.y === 'number') {
            pointerRef.current.x = detail.x
            pointerRef.current.y = detail.y
            pointerRef.current.active = true
            return
        }

        const touch = event?.touches?.[0] || event?.changedTouches?.[0]
        const clientX =
            touch?.clientX ?? touch?.pageX ?? event?.clientX ?? event?.pageX
        const clientY =
            touch?.clientY ?? touch?.pageY ?? event?.clientY ?? event?.pageY

        if (typeof clientX !== 'number' || typeof clientY !== 'number') return

        pointerRef.current.x = clientX - rect.left
        pointerRef.current.y = clientY - rect.top
        pointerRef.current.active = true
    }, [])

    const handlePointerEnd = useCallback(() => {
        pointerRef.current.active = false
    }, [])

    useCanvas2D(
        canvasId,
        ({ ctx, rect, canvas }) => {
            rectRef.current = rect

            let width = rect.width
            let height = rect.height
            let particles: Particle[] | null = []
            let grid: Record<string, Particle[]> | null = {}
            let animationId: number | null = null
            let running = false
            let starOffscreen: any = null

            const physics = {
                radius: CONFIG.radius * VISUAL_SCALE,
                gravity: CONFIG.gravity * VISUAL_SCALE,
                repulsionRadius: CONFIG.repulsionRadius * VISUAL_SCALE,
                repulsionForce: CONFIG.repulsionForce * VISUAL_SCALE,
                jitter: 2 * VISUAL_SCALE,
                spawnJitter: 5 * VISUAL_SCALE,
                spawnOffset: 20 * VISUAL_SCALE,
                spawnDrop: 100 * VISUAL_SCALE,
                deathRise: 2 * VISUAL_SCALE,
                deathDrift: 1 * VISUAL_SCALE
            }

            const initialCount = Math.min(
                Math.max(Math.floor(pointsRef.current || 0), 0),
                MAX_STARS
            )
            let currentPoints = initialCount
            const cellSize = physics.radius * 2.2

            // Caching Star Shape (CRITICAL for Weapp Performance)
            const prepareStarCache = () => {
                const size = 64
                if (process.env.TARO_ENV === 'weapp') {
                    // Use global API instead of instance method for better compatibility
                    starOffscreen = Taro.createOffscreenCanvas({
                        type: '2d',
                        width: size,
                        height: size
                    })
                } else if (typeof document !== 'undefined') {
                    starOffscreen = document.createElement('canvas')
                    starOffscreen.width = size
                    starOffscreen.height = size
                }

                if (!starOffscreen || typeof starOffscreen.getContext !== 'function') {
                    console.error('Offscreen canvas or getContext not available')
                    return
                }
                const sCtx = starOffscreen.getContext('2d')
                if (!sCtx) return

                sCtx.translate(size / 2, size / 2)
                sCtx.beginPath()
                sCtx.arc(0, 0, 28, 0, Math.PI * 2)
                sCtx.fillStyle = '#fef3c7'
                sCtx.fill()

                sCtx.beginPath()
                sCtx.arc(0, 0, 22, 0, Math.PI * 2)
                sCtx.fillStyle = '#ffffff'
                sCtx.fill()

                sCtx.beginPath()
                for (let i = 0; i < 5; i++) {
                    const outerAngle = (18 + i * 72) * (Math.PI / 180)
                    const innerAngle = (54 + i * 72) * (Math.PI / 180)
                    sCtx.lineTo(Math.cos(outerAngle) * 19, -Math.sin(outerAngle) * 19)
                    sCtx.lineTo(Math.cos(innerAngle) * 9, -Math.sin(innerAngle) * 9)
                }
                sCtx.closePath()
                sCtx.fillStyle = '#f59e0b'
                sCtx.fill()
            }

            class ParticleImpl implements Particle {
                x: number
                y: number
                oldX: number
                oldY: number
                radius: number
                angle: number
                angularVelocity: number
                z: number
                isSleeping: boolean
                isDying: boolean
                deathTimer: number
                scale: number
                private sleepTimer: number = 0

                constructor(x: number, y: number) {
                    this.x = x
                    this.y = y
                    this.oldX = x + (Math.random() - 0.5) * physics.jitter
                    this.oldY = y + (Math.random() - 0.5) * physics.jitter
                    this.radius = physics.radius * (0.8 + Math.random() * 0.4)
                    this.angle = Math.random() * Math.PI * 2
                    this.angularVelocity = (Math.random() - 0.5) * 0.2
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
                            this.y -= physics.deathRise
                            this.angle += 0.1
                        } else {
                            const phase2 = (this.deathTimer - 0.4) / 0.6
                            this.scale = 1 - phase2
                            this.angle += 0.3
                            this.y -= physics.deathDrift
                        }
                        return
                    }

                    if (this.isSleeping) return

                    const vx = (this.x - this.oldX) * CONFIG.friction
                    const vy = (this.y - this.oldY) * CONFIG.friction

                    // Sleep Check: If movement is very low for multiple frames
                    if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05 && this.y + this.radius >= height - 2) {
                        this.sleepTimer++
                        if (this.sleepTimer > 60) {
                            this.isSleeping = true
                            return
                        }
                    } else {
                        this.sleepTimer = 0
                    }

                    this.oldX = this.x
                    this.oldY = this.y

                    this.x += vx
                    this.y += vy + physics.gravity
                    this.angle += this.angularVelocity

                    if (this.y + this.radius > height) {
                        this.y = height - this.radius
                        const impact = vy
                        this.oldY = this.y + impact * 0.5
                        this.angularVelocity *= 0.9
                    }

                    if (this.x + this.radius > width) {
                        this.x = width - this.radius
                        this.oldX = this.x + vx * 0.5
                    } else if (this.x - this.radius < 0) {
                        this.x = this.radius
                        this.oldX = this.x + vx * 0.5
                    }
                }
            }

            const sortParticles = () => {
                if (!particles) return
                particles.sort((a, b) => a.z - b.z)
            }

            const init = (count: number) => {
                if (!particles) return
                particles.length = 0
                const cols = Math.max(1, Math.floor(width / (physics.radius * 2)))
                for (let i = 0; i < count; i++) {
                    const col = i % cols
                    const row = Math.floor(i / cols)
                    const x =
                        (col + 0.5) * (physics.radius * 2) +
                        (Math.random() - 0.5) * physics.spawnJitter
                    const y =
                        height - (row + 0.5) * (physics.radius * 2) - physics.spawnOffset
                    particles.push(new ParticleImpl(x, y))
                }
                sortParticles()
            }

            const syncToPoints = (target: number) => {
                if (!particles) return
                const nextPoints = Math.max(0, Math.floor(target))
                const delta = nextPoints - currentPoints
                if (delta === 0) return

                if (delta > 0) {
                    const spaceLeft = Math.max(0, MAX_STARS - particles.length)
                    const starsToAdd = Math.min(delta, spaceLeft)
                    for (let i = 0; i < starsToAdd; i++) {
                        const x = Math.random() * width
                        const y = -physics.spawnOffset - Math.random() * physics.spawnDrop
                        particles.push(new ParticleImpl(x, y))
                    }
                } else {
                    let candidates = particles.filter((p) => !p.isDying)
                    const toRemove = Math.min(candidates.length, Math.abs(delta))
                    for (let i = 0; i < toRemove; i++) {
                        const idx = Math.floor(Math.random() * candidates.length)
                        candidates[idx].isDying = true
                        candidates.splice(idx, 1)
                    }
                }

                currentPoints = nextPoints
                sortParticles()
            }

            const solve = () => {
                if (!particles || !grid) return
                grid = {}

                for (const p of particles) {
                    if (p.isDying || p.isSleeping) continue // Skip sleeping particles
                    const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`
                    if (!grid[key]) grid[key] = []
                    grid[key].push(p)
                }

                for (const p of particles) {
                    if (p.isDying || p.isSleeping) continue

                    if (pointerRef.current.active) {
                        const dx = p.x - pointerRef.current.x
                        const dy = p.y - pointerRef.current.y
                        const distSq = dx * dx + dy * dy
                        const radiusSq =
                            physics.repulsionRadius * physics.repulsionRadius

                        if (distSq < radiusSq) {
                            const dist = Math.sqrt(distSq)
                            const force =
                                (1 - dist / physics.repulsionRadius) *
                                physics.repulsionForce
                            const angle = Math.atan2(dy, dx)
                            p.x += Math.cos(angle) * force * 2
                            p.y += Math.sin(angle) * force * 2
                            p.isSleeping = false
                        }
                    }

                    const cellX = Math.floor(p.x / cellSize)
                    const cellY = Math.floor(p.y / cellSize)

                    for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
                        for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
                            const key = `${cx},${cy}`
                            const cell = grid[key]
                            if (!cell) continue

                            for (const other of cell) {
                                if (p === other) continue
                                if (Math.abs(p.z - other.z) > 0.1) continue

                                const dx = p.x - other.x
                                const dy = p.y - other.y
                                const distSq = dx * dx + dy * dy
                                const minDist = p.radius + other.radius

                                if (distSq < minDist * minDist && distSq > 0) {
                                    const dist = Math.sqrt(distSq)
                                    const overlap = minDist - dist
                                    const nx = dx / dist
                                    const ny = dy / dist
                                    const factor = 0.5
                                    p.x += nx * overlap * factor
                                    p.y += ny * overlap * factor
                                    other.x -= nx * overlap * factor
                                    other.y -= ny * overlap * factor
                                    p.isSleeping = false
                                    other.isSleeping = false
                                }
                            }
                        }
                    }
                }
            }

            const draw = () => {
                if (!particles) return
                ctx.clearRect(0, 0, width, height)

                for (const p of particles) {
                    const baseScale = (p.radius * 2) / 64
                    const zScale = 0.5 + p.z * 0.7
                    const finalScale = baseScale * zScale * p.scale
                    const size = 64 * finalScale

                    // 1. Optimized Rendering for small stars (z=0)
                    // If p.z is 0 and it's not currently animating/dying, we skip matrix transforms entirely.
                    if (p.z === 0 && !p.isDying && p.isSleeping && starOffscreen) {
                        ctx.drawImage(starOffscreen, p.x - size / 2, p.y - size / 2, size, size)
                        continue
                    }

                    ctx.save()
                    ctx.translate(p.x, p.y)
                    ctx.rotate(p.angle)
                    ctx.scale(finalScale, finalScale)

                    if (starOffscreen) {
                        ctx.drawImage(starOffscreen, -32, -32)
                    } else {
                        ctx.beginPath()
                        ctx.arc(0, 0, 28, 0, Math.PI * 2)
                        ctx.fillStyle = '#fef3c7'
                        ctx.fill()
                    }

                    if (p.z > 0.7) {
                        ctx.beginPath()
                        ctx.arc(-10, -10, 8, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
                        ctx.fill()
                    }

                    ctx.restore()
                }
            }

            const loop = () => {
                if (!running || !particles) return

                for (const p of particles) p.update()
                const originalLength = particles.length
                for (let i = particles.length - 1; i >= 0; i--) {
                    if (particles[i].isDying && particles[i].deathTimer >= 1.0) {
                        particles.splice(i, 1)
                    }
                }
                if (particles.length !== originalLength) {
                    sortParticles()
                }

                // Performance Optimization: One solve per frame is enough for high particle counts in Weapp
                solve()
                draw()

                animationId = requestRaf(loop)
            }

            const start = () => {
                if (running) return
                running = true
                animationId = requestRaf(loop)
            }

            const stop = () => {
                running = false
                if (animationId !== null) {
                    cancelRaf(animationId)
                    animationId = null
                }
                pointerRef.current.active = false
            }

            prepareStarCache()
            init(initialCount)
            syncToPoints(pointsRef.current)

            controlsRef.current = {
                start,
                stop,
                sync: syncToPoints
            }

            if (activeRef.current) start()

            return () => {
                stop()
                controlsRef.current = null
                particles = null
                grid = null
                rectRef.current = null
                starOffscreen = null
            }
        },
        []
    )

    return (
        <View
            className={`bg-white gradient-border rounded-[32px] p-8 text-center shadow-card relative overflow-hidden isolate ${className}`}
            onTouchMove={handlePointerMove}
            onTouchStart={handlePointerMove}
            onTouchEnd={handlePointerEnd}
            onTouchCancel={handlePointerEnd}
        >
            <BrandHeader className="relative z-10" />

            <Canvas
                id={canvasId}
                canvasId={canvasId}
                type="2d"
                className="absolute inset-0 w-full h-full z-0 opacity-90"
            />

            <View className="relative z-10 pointer-events-none">
                <Text className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 block mb-2">
                    当前可用积分
                </Text>
                <View className="text-6xl font-black text-slate-900 tracking-tighter h5:mix-blend-multiply">
                    {formatNumber(points)}
                </View>
                <View className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-50/80 backdrop-blur-sm text-amber-700 rounded-full text-[10px] font-bold shadow-sm">
                    <Image src={SVG_THUNDER_AMBER} className="w-3 h-3" />
                    <Text>今日已玩 {dailyPlayCount}/3 次</Text>
                </View>
            </View>
        </View>
    )
}

// @ts-ignore
PointsHeroCard.options = {
    addGlobalClass: true
}

export default PointsHeroCard
