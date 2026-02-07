import { Canvas, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as PixiTypes from 'pixi.js'
import LabelCaps from '../LabelCaps'
import { usePixi } from '../../utils/usePixi'

const SVG_THUNDER_AMBER =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%223%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%2F%3E%3C%2Fsvg%3E"

function formatNumber(value: number): string {
    const num = Number(value || 0)
    const s = String(Math.floor(num))
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

interface PointsCardProps {
    className?: string
    points?: number
    dailyPlayCount?: number
    isActive?: boolean
}

type PixiModule = typeof import('pixi.js')

const MAX_STARS = 3000
const CONFIG = {
    radius: 6,
    gravity: 0.15,
    friction: 0.96,
    repulsionRadius: 80,
    repulsionForce: 0.4
}
const cellSize = CONFIG.radius * 2.2

interface Particle {
    sprite: PixiTypes.Sprite
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
    baseScale: number
    update: (width: number, height: number) => void
}

const PointsCard: FC<PointsCardProps> = ({
    className = '',
    points = 0,
    dailyPlayCount = 0,
    isActive = true
}) => {
    const [displayPoints, setDisplayPoints] = useState(points)
    const displayPointsRef = useRef(points)
    const h5GradientBorderStyle = useMemo(() => {
        if (process.env.TARO_ENV !== 'h5') return undefined
        return {
            border: '1px solid transparent',
            backgroundClip: 'padding-box, border-box',
            backgroundOrigin: 'padding-box, border-box',
            backgroundImage:
                'linear-gradient(white, white), linear-gradient(to top, rgba(241, 245, 249, 1), rgba(241, 245, 249, 0))'
        } as any
    }, [])

    const canvasId = useMemo(
        () => `points-canvas-${Math.random().toString(36).slice(2, 8)}`,
        []
    )

    const { app, pixi } = usePixi(canvasId)
    const particleContainerRef = useRef<PixiTypes.Container | null>(null)
    const starTexture = useRef<PixiTypes.Texture | null>(null)
    const createParticle = useRef<((x: number, y: number) => Particle) | null>(null)
    const pointer = useRef({ x: -1000, y: -1000, active: false })
    const canvasRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)
    const particles = useRef<Particle[]>([])
    const isActiveRef = useRef(isActive)

    displayPointsRef.current = displayPoints
    isActiveRef.current = isActive

    const createStarTexture = (pixi: PixiModule, app: PixiTypes.Application) => {
        const size = 64
        if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            if (ctx) {
                const cx = 32
                const cy = 32
                const r = 28

                ctx.beginPath()
                ctx.arc(cx, cy, r, 0, Math.PI * 2)
                ctx.fillStyle = '#fde68a'
                ctx.fill()

                ctx.beginPath()
                ctx.arc(cx, cy, r - 6, 0, Math.PI * 2)
                ctx.fillStyle = '#ffffff'
                ctx.fill()

                ctx.translate(cx, cy)
                ctx.beginPath()
                ctx.fillStyle = '#f59e0b'
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(
                        Math.cos((18 + i * 72) * Math.PI / 180) * 19,
                        -Math.sin((18 + i * 72) * Math.PI / 180) * 19
                    )
                    ctx.lineTo(
                        Math.cos((54 + i * 72) * Math.PI / 180) * 9,
                        -Math.sin((54 + i * 72) * Math.PI / 180) * 9
                    )
                }
                ctx.closePath()
                ctx.fill()

                return pixi.Texture.from(canvas as any)
            }
        }

        // Fallback: Use Pixi Graphics for Mini-program stability.
        const g = new pixi.Graphics()
        g.beginFill(0xfde68a, 1)
        g.drawCircle(size / 2, size / 2, 28)
        g.endFill()

        g.beginFill(0xffffff, 1)
        g.drawCircle(size / 2, size / 2, 22)
        g.endFill()

        g.beginFill(0xf59e0b, 1)
        const cx = size / 2
        const cy = size / 2
        for (let i = 0; i < 5; i++) {
            const outerAngle = (18 + i * 72) * (Math.PI / 180)
            const innerAngle = (54 + i * 72) * (Math.PI / 180)
            const px = cx + Math.cos(outerAngle) * 19
            const py = cy - Math.sin(outerAngle) * 19
            const ix = cx + Math.cos(innerAngle) * 9
            const iy = cy - Math.sin(innerAngle) * 9
            if (i === 0) g.moveTo(px, py)
            else g.lineTo(px, py)
            g.lineTo(ix, iy)
        }
        g.closePath()
        g.endFill()

        const tex = app.renderer.generateTexture(g)
        g.destroy()
        return tex
    }

    const ParticleImpl = (
        pixi: PixiModule,
        x: number,
        y: number,
        particleContainer: PixiTypes.Container
    ): Particle => {
        const texture = (starTexture.current !== null && starTexture.current !== undefined) ? starTexture.current : pixi.Texture.WHITE
        const sprite = new pixi.Sprite(texture)
        sprite.anchor.set(0.5)
        sprite.x = x
        sprite.y = y

        const particle: Particle = {
            sprite,
            x,
            y,
            oldX: x + (Math.random() - 0.5) * 2,
            oldY: y + (Math.random() - 0.5) * 2,
            radius: CONFIG.radius * (0.8 + Math.random() * 0.4),
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 0.2,
            z: Math.floor(Math.random() * 3) / 2,
            isSleeping: false,
            isDying: false,
            deathTimer: 0,
            baseScale: 1,
            update: () => { }
        }

        const sizeScale = (particle.radius * 2) / 64
        const depthScale = 0.5 + particle.z * 0.7
        particle.baseScale = sizeScale * depthScale
        sprite.scale.set(particle.baseScale)
        sprite.alpha = particle.z > 0.7 ? 1.0 : 0.6 + particle.z * 0.4

        particle.update = (width: number, height: number) => {
            if (particle.isDying) {
                particle.deathTimer += 0.02
                if (particle.deathTimer < 0.4) {
                    particle.y -= 2
                    particle.angle += 0.1
                } else {
                    const phase2 = (particle.deathTimer - 0.4) / 0.6
                    const dyingScale = Math.max(0, 1 - phase2)
                    sprite.scale.set(particle.baseScale * dyingScale)
                    particle.angle += 0.3
                    particle.y -= 1
                    sprite.alpha = 1 - phase2
                }
                sprite.x = particle.x
                sprite.y = particle.y
                sprite.rotation = particle.angle
                return
            }

            if (particle.isSleeping) return

            const vx = (particle.x - particle.oldX) * CONFIG.friction
            const vy = (particle.y - particle.oldY) * CONFIG.friction

            particle.oldX = particle.x
            particle.oldY = particle.y
            particle.x += vx
            particle.y += vy + CONFIG.gravity
            particle.angle += particle.angularVelocity

            if (particle.y + particle.radius > height) {
                particle.y = height - particle.radius
                const impact = vy
                particle.oldY = particle.y + impact * 0.5
                particle.angularVelocity *= 0.9
            }

            if (particle.x + particle.radius > width) {
                particle.x = width - particle.radius
                particle.oldX = particle.x + vx * 0.5
            } else if (particle.x - particle.radius < 0) {
                particle.x = particle.radius
                particle.oldX = particle.x + vx * 0.5
            }

            sprite.x = particle.x
            sprite.y = particle.y
            sprite.rotation = particle.angle
        }

        particleContainer.addChild(sprite)
        return particle
    }

    useEffect(() => {
        if (!app || !pixi) return

        starTexture.current = createStarTexture(pixi, app)
        const particleContainer = new pixi.Container()
        app.stage.addChild(particleContainer)
        particleContainerRef.current = particleContainer

        const createParticleLocal = (x: number, y: number) =>
            ParticleImpl(pixi, x, y, particleContainer)
        createParticle.current = createParticleLocal

        const initParticles = (count: number) => {
            particleContainer.removeChildren()
            particles.current = []

            const w = app.screen.width
            const h = app.screen.height
            const cols = Math.max(1, Math.floor(w / (CONFIG.radius * 2)))
            const total = Math.min(Math.max(count, 0), MAX_STARS)

            for (let i = 0; i < total; i++) {
                const col = i % cols
                const row = Math.floor(i / cols)
                const x = (col + 0.5) * (CONFIG.radius * 2) + (Math.random() - 0.5) * 5
                const y = h - (row + 0.5) * (CONFIG.radius * 2) - 20
                particles.current.push(createParticleLocal(x, y))
            }
        }

        initParticles(displayPointsRef.current)

        const canvas = app.view as any
        const onMouseMove = (e: MouseEvent) => {
            if (process.env.TARO_ENV !== 'h5') return
            if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return

            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                pointer.current.x = x
                pointer.current.y = y
                pointer.current.active = true
            } else {
                pointer.current.active = false
            }
        }
        const onBlur = () => {
            pointer.current.active = false
        }

        if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
            window.addEventListener('mousemove', onMouseMove)
            window.addEventListener('blur', onBlur)
        }

        const solvePhysics = () => {
            const grid: Record<string, Particle[]> = {}
            const activeParticles = particles.current

            for (const p of activeParticles) {
                if (p.isDying) continue
                const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`
                if (!grid[key]) grid[key] = []
                grid[key].push(p)
            }

            for (const p of activeParticles) {
                if (p.isDying) continue

                if (pointer.current.active) {
                    const dx = p.x - pointer.current.x
                    const dy = p.y - pointer.current.y
                    const distSq = dx * dx + dy * dy
                    const radiusSq = CONFIG.repulsionRadius * CONFIG.repulsionRadius

                    if (distSq < radiusSq) {
                        const dist = Math.sqrt(distSq)
                        const force = (1 - dist / CONFIG.repulsionRadius) * CONFIG.repulsionForce
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

        const ticker = () => {
            if (!isActiveRef.current) return
            if (!app.ticker || (app.ticker as any)._destroyed) return

            const w = app.screen.width
            const h = app.screen.height

            for (let i = particles.current.length - 1; i >= 0; i--) {
                const p = particles.current[i]
                if (p.isDying && p.deathTimer >= 1.0) {
                    particleContainer.removeChild(p.sprite)
                    p.sprite.destroy()
                    particles.current.splice(i, 1)
                }
            }

            for (const p of particles.current) {
                p.update(w, h)
            }

            solvePhysics()
            solvePhysics()
        }

        app.ticker.add(ticker)

        if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
            window.PointsSystem = {
                add: (count: number) => {
                    const delta = Math.floor(count || 0)
                    const next = Math.max(0, displayPointsRef.current + delta)
                    displayPointsRef.current = next
                    setDisplayPoints(next)

                    const currentActive = particles.current.filter(p => !p.isDying).length
                    const spaceLeft = Math.max(0, MAX_STARS - currentActive)
                    const toAdd = Math.min(Math.max(0, delta), spaceLeft)
                    const w = app.screen.width

                    for (let i = 0; i < toAdd; i++) {
                        const x = Math.random() * w
                        const y = -20 - Math.random() * 100
                        particles.current.push(createParticleLocal(x, y))
                    }
                },
                consume: (count: number) => {
                    const delta = Math.floor(count || 0)
                    const next = Math.max(0, displayPointsRef.current - delta)
                    displayPointsRef.current = next
                    setDisplayPoints(next)

                    const candidates = particles.current.filter(p => !p.isDying)
                    for (let i = 0; i < delta; i++) {
                        if (candidates.length > 0) {
                            const idx = Math.floor(Math.random() * candidates.length)
                            candidates[idx].isDying = true
                        }
                    }
                },
                explode: () => {
                    for (const p of particles.current) {
                        const force = 10 + Math.random() * 20
                        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
                        p.oldX = p.x - Math.cos(angle) * force
                        p.oldY = p.y - Math.sin(angle) * force
                        p.isSleeping = false
                    }
                }
            }
        }

        return () => {
            if (app && app.ticker) {
                app.ticker.remove(ticker)
            }
            createParticle.current = null
            if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
                window.removeEventListener('mousemove', onMouseMove)
                window.removeEventListener('blur', onBlur)
            }
            if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
                if (window.PointsSystem) delete window.PointsSystem
            }
            if (particleContainerRef.current) {
                particleContainerRef.current.destroy({ children: true })
            }
            if (starTexture.current) {
                starTexture.current.destroy(true)
            }
            particles.current = []
        }
    }, [app, pixi])
    const refreshCanvasRect = useCallback(() => {
        if (process.env.TARO_ENV !== 'weapp') return
        Taro.createSelectorQuery()
            .select(`#${canvasId}`)
            .boundingClientRect((rect) => {
                const r = Array.isArray(rect) ? rect[0] : rect
                if (!r) return
                canvasRectRef.current = {
                    left: r.left ?? 0,
                    top: r.top ?? 0,
                    width: r.width ?? 0,
                    height: r.height ?? 0
                }
            })
            .exec()
    }, [canvasId])

    useEffect(() => {
        if (process.env.TARO_ENV !== 'weapp' || !app) return

        const run = () => {
            if (typeof Taro.nextTick === 'function') {
                Taro.nextTick(() => refreshCanvasRect())
            } else {
                setTimeout(() => refreshCanvasRect(), 0)
            }
        }

        run()

        const onResize = () => refreshCanvasRect()
        if (typeof Taro.onWindowResize === 'function') {
            Taro.onWindowResize(onResize)
        }

        return () => {
            if (typeof Taro.offWindowResize === 'function') {
                Taro.offWindowResize(onResize)
            }
        }
    }, [app, refreshCanvasRect])

    const syncParticles = useCallback((target: number) => {
        const particleContainer = particleContainerRef.current
        const createParticleLocal = createParticle.current
        if (!app || !particleContainer || !createParticleLocal) return

        const currentActive = particles.current.filter(p => !p.isDying).length
        const nextPoints = Math.max(0, Math.floor(target))
        const delta = nextPoints - currentActive

        if (delta > 0) {
            const spaceLeft = Math.max(0, MAX_STARS - currentActive)
            const toAdd = Math.min(delta, spaceLeft)
            const w = app.screen.width
            for (let i = 0; i < toAdd; i++) {
                const x = Math.random() * w
                const y = -20 - Math.random() * 100
                particles.current.push(createParticleLocal(x, y))
            }
        } else if (delta < 0) {
            const candidates = particles.current.filter(p => !p.isDying)
            const toRemove = Math.min(candidates.length, Math.abs(delta))
            for (let i = 0; i < toRemove; i++) {
                const idx = Math.floor(Math.random() * candidates.length)
                candidates[idx].isDying = true
            }
        }
    }, [app])

    useEffect(() => {
        setDisplayPoints(points)
        displayPointsRef.current = points
        syncParticles(points)
    }, [points, syncParticles])

    const handlePointerMove = useCallback((event: any) => {
        if (!app) return

        const touch = (event && event.touches && event.touches[0]) || (event && event.changedTouches && event.changedTouches[0])
        if (!touch) return

        // Weapp: prefer page/client coords minus canvas rect for accurate mapping
        if (process.env.TARO_ENV === 'weapp') {
            const pageX = touch && (touch.pageX !== undefined ? touch.pageX : touch.clientX)
            const pageY = touch && (touch.pageY !== undefined ? touch.pageY : touch.clientY)
            const rect = canvasRectRef.current
            if (rect && typeof pageX === 'number' && typeof pageY === 'number') {
                pointer.current.x = pageX - rect.left
                pointer.current.y = pageY - rect.top
                pointer.current.active = true
                return
            }

            const x = touch && touch.x
            const y = touch && touch.y
            if (typeof x === 'number' && typeof y === 'number') {
                pointer.current.x = x
                pointer.current.y = y
                pointer.current.active = true
                return
            }
        }

        // H5 fallback / Other
        const clientX = (touch && touch.clientX !== undefined) ? touch.clientX : ((touch && touch.pageX !== undefined) ? touch.pageX : ((event && event.clientX !== undefined) ? event.clientX : (event && event.pageX)))
        const clientY = (touch && touch.clientY !== undefined) ? touch.clientY : ((touch && touch.pageY !== undefined) ? touch.pageY : ((event && event.clientY !== undefined) ? event.clientY : (event && event.pageY)))

        if (typeof clientX !== 'number' || typeof clientY !== 'number') return

        const canvas = app.view as HTMLCanvasElement
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 }

        pointer.current.x = clientX - rect.left
        pointer.current.y = clientY - rect.top
        pointer.current.active = true
    }, [app])

    const handlePointerEnd = useCallback(() => {
        pointer.current.active = false
    }, [])

    return (
        <View
            className={`bg-white gradient-border rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden isolate mt-4 ${className}`}
            style={h5GradientBorderStyle}
            onTouchMove={handlePointerMove}
            onTouchStart={handlePointerMove}
            onTouchEnd={handlePointerEnd}
            onTouchCancel={handlePointerEnd}
        >
            <View className="flex flex-col items-center mt-2 mb-16 relative z-10">
                <View className="w-16 h-16 bg-rose-600 rounded-2xl shadow-lg flex items-center justify-center text-white text-3xl font-black mb-4">
                    <Text>婷</Text>
                </View>
                <Text className="text-xl font-black text-slate-900">婷姐•贵州炒鸡</Text>
            </View>

            <Canvas
                id={canvasId}
                canvasId={canvasId}
                type="webgl"
                className="absolute inset-0 w-full h-full z-0 pointer-events-none rounded-[32px]"
                style={{ borderRadius: '32px' }}
            />

            <View className="relative z-10 pointer-events-none">
                <LabelCaps className="block mb-2">当前可用积分</LabelCaps>
                <View className="text-6xl font-black text-slate-900 tracking-tighter mix-blend-multiply">
                    {formatNumber(displayPoints)}
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
PointsCard.options = {
    addGlobalClass: true
}

export default PointsCard






