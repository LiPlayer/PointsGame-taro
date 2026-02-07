import { Canvas, Image, Text, View } from '@tarojs/components'
import { FC, useCallback, useEffect, useMemo, useRef } from 'react'
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
    const canvasId = useMemo(
        () => `points-canvas-${Math.random().toString(36).slice(2, 8)}`,
        []
    )

    const { app, pixi } = usePixi(canvasId)
    const particleContainerRef = useRef<PixiTypes.Container | null>(null)
    const starTexture = useRef<PixiTypes.Texture | null>(null)
    const createParticle = useRef<((x: number, y: number) => Particle) | null>(null)
    const pointer = useRef({ x: -1000, y: -1000, active: false })
    const particles = useRef<Particle[]>([])
    const currentPoints = useRef(points)
    const isActiveRef = useRef(isActive)

    currentPoints.current = points
    isActiveRef.current = isActive

    const createStarTexture = (pixi: PixiModule, app: PixiTypes.Application) => {
        const g = new pixi.Graphics()
        const size = 64

        // Outer glow/shadow
        g.beginFill(0xfde68a, 1)
        g.drawCircle(size / 2, size / 2, 28)
        g.endFill()

        // White border
        g.beginFill(0xffffff, 1)
        g.drawCircle(size / 2, size / 2, 22)
        g.endFill()

        // Amber star
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
        const texture = starTexture.current ?? pixi.Texture.WHITE
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
            update: () => {}
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

        initParticles(currentPoints.current)

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

        return () => {
            app.ticker.remove(ticker)
            createParticle.current = null
            if (particleContainerRef.current) {
                particleContainerRef.current.destroy({ children: true })
            }
            if (starTexture.current) {
                starTexture.current.destroy(true)
            }
            particles.current = []
        }
    }, [app, pixi])

    const syncParticles = useCallback((target: number) => {
        const particleContainer = particleContainerRef.current
        const createParticleLocal = createParticle.current
        if (!app || !particleContainer || !createParticleLocal) return

        const currentCount = particles.current.length
        const nextPoints = Math.max(0, Math.floor(target))
        const delta = nextPoints - currentCount

        if (delta > 0) {
            const spaceLeft = Math.max(0, MAX_STARS - currentCount)
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
                candidates.splice(idx, 1)
            }
        }
    }, [app])

    useEffect(() => {
        syncParticles(points)
    }, [points, syncParticles])

    const handlePointerMove = useCallback((event: any) => {
        if (!app) return

        const detail = event?.detail || {}
        if (process.env.TARO_ENV === 'weapp' && typeof detail.x === 'number' && typeof detail.y === 'number') {
            pointer.current.x = detail.x
            pointer.current.y = detail.y
            pointer.current.active = true
            return
        }

        const touch = event?.touches?.[0] || event?.changedTouches?.[0]
        const clientX = touch?.clientX ?? touch?.pageX ?? event?.clientX ?? event?.pageX
        const clientY = touch?.clientY ?? touch?.pageY ?? event?.clientY ?? event?.pageY

        if (typeof clientX !== 'number' || typeof clientY !== 'number') return

        // In Pixi, we can use global interaction map if needed, 
        // but for now we manually offset from canvas bounds
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
            onTouchMove={handlePointerMove}
            onTouchStart={handlePointerMove}
            onTouchEnd={handlePointerEnd}
            onTouchCancel={handlePointerEnd}
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerEnd}
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
                className="absolute inset-0 w-full h-full z-0 opacity-90 pointer-events-none"
            />

            <View className="relative z-10 pointer-events-none">
                <LabelCaps className="block mb-2">当前可用积分</LabelCaps>
                <View className="text-6xl font-black text-slate-900 tracking-tighter mix-blend-multiply">
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
PointsCard.options = {
    addGlobalClass: true
}

export default PointsCard




