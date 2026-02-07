import { Canvas, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC, useCallback, useEffect, useMemo, useRef } from 'react'
import type * as PixiTypes from 'pixi.js'
import BrandHeader from '../BrandHeader'
import { usePixi } from '../../utils/usePixi'

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

type PixiModule = typeof import('pixi.js')

const MAX_STARS = 3000
const VISUAL_SCALE = Math.SQRT1_2
const CONFIG = {
    radius: 8,
    gravity: 0.15,
    friction: 0.96,
    repulsionRadius: 80,
    repulsionForce: 2.0
}

interface StarSprite extends PixiTypes.Sprite {
    vx: number
    vy: number
    oldX: number
    oldY: number
    angularVelocity: number
    z: number
    isSleeping: boolean
    isDying: boolean
    deathTimer: number
    baseScale: number
    sleepTimer: number
    glow?: PixiTypes.Graphics
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

    const { app, pixi } = usePixi(canvasId)
    const containerRef = useRef<PixiTypes.Container | null>(null)
    const starTextureRef = useRef<PixiTypes.Texture | null>(null)
    const pointerRef = useRef({ x: -1000, y: -1000, active: false })
    const starsRef = useRef<StarSprite[]>([])
    const pointsRef = useRef(points)
    const isActiveRef = useRef(isActive)

    pointsRef.current = points
    isActiveRef.current = isActive

    const physics = useMemo(() => ({
        radius: CONFIG.radius * VISUAL_SCALE,
        gravity: CONFIG.gravity * VISUAL_SCALE,
        repulsionRadius: CONFIG.repulsionRadius * VISUAL_SCALE,
        repulsionForce: CONFIG.repulsionForce * VISUAL_SCALE,
        jitter: 2 * VISUAL_SCALE,
        spawnOffset: 20 * VISUAL_SCALE,
        spawnDrop: 100 * VISUAL_SCALE,
        deathRise: 2 * VISUAL_SCALE,
        deathDrift: 1 * VISUAL_SCALE
    }), [])

    const createStarTexture = (pixi: PixiModule, app: PixiTypes.Application) => {
        const g = new pixi.Graphics()
        const size = 64

        // Outer glow/shadow
        g.beginFill(0xfef3c7, 1)
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

    const createStar = (pixi: PixiModule, x: number, y: number): StarSprite => {
        const star = new pixi.Sprite(starTextureRef.current!) as StarSprite
        star.anchor.set(0.5)
        star.x = x
        star.y = y
        star.oldX = x + (Math.random() - 0.5) * physics.jitter
        star.oldY = y + (Math.random() - 0.5) * physics.jitter
        star.vx = 0
        star.vy = 0

        const rad = physics.radius * (0.8 + Math.random() * 0.4)
        star.z = Math.floor(Math.random() * 3) / 2
        star.baseScale = (rad * 2) / 64 * (0.5 + star.z * 0.7)
        star.scale.set(star.baseScale)

        star.angle = Math.random() * 360
        star.angularVelocity = (Math.random() - 0.5) * 5
        star.isSleeping = false
        star.isDying = false
        star.deathTimer = 0
        star.sleepTimer = 0

        if (star.z > 0.7) {
            const glow = new pixi.Graphics()
            glow.beginFill(0xffffff, 0.3)
            glow.drawCircle(-10, -10, 8)
            glow.endFill()
            star.addChild(glow)
            star.glow = glow
        }

        return star
    }

    useEffect(() => {
        if (!app || !pixi) return

        starTextureRef.current = createStarTexture(pixi, app)
        const container = new pixi.Container()
        app.stage.addChild(container)
        containerRef.current = container

        // Initial setup
        const w = app.screen.width
        const h = app.screen.height
        const count = Math.min(Math.max(pointsRef.current, 0), MAX_STARS)
        const cols = Math.max(1, Math.floor(w / (physics.radius * 2)))

        for (let i = 0; i < count; i++) {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = (col + 0.5) * (physics.radius * 2) + (Math.random() - 0.5) * 5
            const y = h - (row + 0.5) * (physics.radius * 2) - physics.spawnOffset
            const star = createStar(pixi, x, y)
            container.addChild(star)
            starsRef.current.push(star)
        }

        const ticker = (delta: number) => {
            if (!isActiveRef.current || !containerRef.current) return

            const stars = starsRef.current
            const w = app.screen.width
            const h = app.screen.height
            const radius = physics.radius

            // Sorting (only if count changed, but in Pixi we can just sort children if needed)
            // For simplicity and speed, we sort every 60 frames or when count changes

            for (let i = stars.length - 1; i >= 0; i--) {
                const s = stars[i]
                if (s.isDying) {
                    s.deathTimer += 0.02 * delta
                    if (s.deathTimer < 0.4) {
                        s.y -= physics.deathRise * delta
                        s.angle += 5 * delta
                    } else {
                        const phase2 = (s.deathTimer - 0.4) / 0.6
                        s.scale.set(s.baseScale * (1 - phase2))
                        s.angle += 15 * delta
                        s.y -= physics.deathDrift * delta
                    }
                    if (s.deathTimer >= 1.0) {
                        container.removeChild(s)
                        stars.splice(i, 1)
                        s.destroy({ children: true })
                    }
                    continue
                }

                if (s.isSleeping) {
                    // Quick touch check to wake up
                    if (pointerRef.current.active) {
                        const dx = s.x - pointerRef.current.x
                        const dy = s.y - pointerRef.current.y
                        if (dx * dx + dy * dy < physics.repulsionRadius * physics.repulsionRadius) {
                            s.isSleeping = false
                            s.sleepTimer = 0
                        }
                    }
                    if (s.isSleeping) continue
                }

                const vx = (s.x - s.oldX) * CONFIG.friction
                const vy = (s.y - s.oldY) * CONFIG.friction

                // Sleep check
                if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05 && s.y + radius >= h - 2) {
                    s.sleepTimer += delta
                    if (s.sleepTimer > 60) {
                        s.isSleeping = true
                        continue
                    }
                } else {
                    s.sleepTimer = 0
                }

                s.oldX = s.x
                s.oldY = s.y
                s.x += vx
                s.y += vy + physics.gravity * delta
                s.angle += s.angularVelocity * delta

                // Pointer interaction
                if (pointerRef.current.active) {
                    const dx = s.x - pointerRef.current.x
                    const dy = s.y - pointerRef.current.y
                    const distSq = dx * dx + dy * dy
                    if (distSq < physics.repulsionRadius * physics.repulsionRadius) {
                        const dist = Math.sqrt(distSq)
                        const force = (1 - dist / physics.repulsionRadius) * physics.repulsionForce
                        const angle = Math.atan2(dy, dx)
                        s.x += Math.cos(angle) * force * 2 * delta
                        s.y += Math.sin(angle) * force * 2 * delta
                    }
                }

                // Boundaries
                if (s.y + radius > h) {
                    s.y = h - radius
                    s.oldY = s.y + vy * 0.5
                }
                if (s.x + radius > w) {
                    s.x = w - radius
                    s.oldX = s.x + vx * 0.5
                } else if (s.x - radius < 0) {
                    s.x = radius
                    s.oldX = s.x + vx * 0.5
                }
            }
        }

        app.ticker.add(ticker)

        return () => {
            app.ticker.remove(ticker)
            if (containerRef.current) {
                containerRef.current.destroy({ children: true })
            }
            if (starTextureRef.current) {
                starTextureRef.current.destroy(true)
            }
            starsRef.current = []
        }
    }, [app, pixi])

    const syncStars = useCallback((target: number) => {
        const container = containerRef.current
        if (!app || !pixi || !container) return

        const currentCount = starsRef.current.length
        const nextPoints = Math.max(0, Math.floor(target))
        const delta = nextPoints - currentCount

        if (delta > 0) {
            const spaceLeft = Math.max(0, MAX_STARS - currentCount)
            const toAdd = Math.min(delta, spaceLeft)
            for (let i = 0; i < toAdd; i++) {
                const x = Math.random() * app.screen.width
                const y = -physics.spawnOffset - Math.random() * physics.spawnDrop
                const star = createStar(pixi, x, y)
                container.addChild(star)
                starsRef.current.push(star)
            }
        } else if (delta < 0) {
            const candidates = starsRef.current.filter(s => !s.isDying)
            const toRemove = Math.min(candidates.length, Math.abs(delta))
            for (let i = 0; i < toRemove; i++) {
                const idx = Math.floor(Math.random() * candidates.length)
                candidates[idx].isDying = true
                candidates.splice(idx, 1)
            }
        }
    }, [app, pixi, physics])

    useEffect(() => {
        syncStars(points)
    }, [points, syncStars])

    const handlePointerMove = useCallback((event: any) => {
        if (!app) return

        const detail = event?.detail || {}
        if (process.env.TARO_ENV === 'weapp' && typeof detail.x === 'number' && typeof detail.y === 'number') {
            pointerRef.current.x = detail.x
            pointerRef.current.y = detail.y
            pointerRef.current.active = true
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

        pointerRef.current.x = clientX - rect.left
        pointerRef.current.y = clientY - rect.top
        pointerRef.current.active = true
    }, [app])

    const handlePointerEnd = useCallback(() => {
        pointerRef.current.active = false
    }, [])

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
                type="webgl"
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
