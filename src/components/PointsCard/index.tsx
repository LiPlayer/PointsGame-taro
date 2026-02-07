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


const PointsCard: FC<PointsCardProps> = ({
    className = '',
    points = 0,
    dailyPlayCount = 0,
    isActive = true
}) => {
    // Optimization: Remove displayPoints state to prevent React re-renders on every point change.
    // Instead, we manipulate the DOM directly via displayRef.
    const displayPointsRef = useRef(points)
    const displayRef = useRef<HTMLDivElement>(null)

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
    const pointer = useRef({ x: -1000, y: -1000, active: false })
    const canvasRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)

    // Optimized State for 3000 particles
    const posX = useRef(new Float32Array(MAX_STARS))
    const posY = useRef(new Float32Array(MAX_STARS))
    const oldX = useRef(new Float32Array(MAX_STARS))
    const oldY = useRef(new Float32Array(MAX_STARS))
    const angles = useRef(new Float32Array(MAX_STARS))
    const angVels = useRef(new Float32Array(MAX_STARS))
    const radii = useRef(new Float32Array(MAX_STARS))
    const zs = useRef(new Float32Array(MAX_STARS))
    const statuses = useRef(new Uint8Array(MAX_STARS)) // 0: active, 1: sleeping, 2: dying
    const deathTimers = useRef(new Float32Array(MAX_STARS))
    const baseScales = useRef(new Float32Array(MAX_STARS))
    const sprites = useRef<(PixiTypes.Sprite | null)[]>(new Array(MAX_STARS).fill(null))
    const currentCount = useRef(0)
    const gridHeads = useRef<Int32Array | null>(null)
    const gridNexts = useRef<Int32Array | null>(null)

    const STATUS_ACTIVE = 0
    const STATUS_SLEEPING = 1
    const STATUS_DYING = 2

    const isActiveRef = useRef(isActive)
    isActiveRef.current = isActive

    // Helper: Update point text without triggering React state
    const updatePointDisplay = (val: number) => {
        if (displayRef.current) {
            displayRef.current.innerText = formatNumber(val)
        }
    }

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

    const createParticleAt = (idx: number, x: number, y: number, pixi: PixiModule, container: PixiTypes.Container) => {
        const texture = starTexture.current || pixi.Texture.WHITE
        let sprite = sprites.current[idx]
        if (!sprite) {
            sprite = new pixi.Sprite(texture)
            sprite.anchor.set(0.5)
            container.addChild(sprite)
            sprites.current[idx] = sprite
        }
        sprite.visible = true
        sprite.x = x
        sprite.y = y

        posX.current[idx] = x
        posY.current[idx] = y
        oldX.current[idx] = x + (Math.random() - 0.5) * 2
        oldY.current[idx] = y + (Math.random() - 0.5) * 2
        radii.current[idx] = CONFIG.radius * (0.8 + Math.random() * 0.4)
        angles.current[idx] = Math.random() * Math.PI * 2
        angVels.current[idx] = (Math.random() - 0.5) * 0.2
        zs.current[idx] = Math.floor(Math.random() * 3) / 2
        statuses.current[idx] = STATUS_ACTIVE
        deathTimers.current[idx] = 0

        const sizeScale = (radii.current[idx] * 2) / 64
        const depthScale = 0.5 + zs.current[idx] * 0.7
        baseScales.current[idx] = sizeScale * depthScale
        sprite.scale.set(baseScales.current[idx])
        sprite.alpha = zs.current[idx] > 0.7 ? 1.0 : 0.6 + zs.current[idx] * 0.4
    }

    useEffect(() => {
        if (!app || !pixi) return

        starTexture.current = createStarTexture(pixi, app)
        const particleContainer = new pixi.ParticleContainer(MAX_STARS, {
            scale: true,
            position: true,
            rotation: true,
            alpha: true
        })
        app.stage.addChild(particleContainer)
        particleContainerRef.current = particleContainer

        const initParticles = (count: number) => {
            particleContainer.removeChildren()
            sprites.current.fill(null)
            const n = Math.min(count, MAX_STARS)
            currentCount.current = n

            const w = app.screen.width
            const h = app.screen.height
            const cols = Math.max(1, Math.floor(w / (CONFIG.radius * 2)))

            for (let i = 0; i < n; i++) {
                const col = i % cols
                const row = Math.floor(i / cols)
                const x = (col + 0.5) * (CONFIG.radius * 2) + (Math.random() - 0.5) * 5
                const y = h - (row + 0.5) * (CONFIG.radius * 2) - 20
                createParticleAt(i, x, y, pixi, particleContainer)
            }
        }

        initParticles(displayPointsRef.current)
        updatePointDisplay(displayPointsRef.current)

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
            const count = currentCount.current
            const w = app.screen.width
            const h = app.screen.height
            const cols = Math.ceil(w / cellSize)
            const rows = Math.ceil(h / cellSize)
            const gridCount = cols * rows

            if (!gridHeads.current || gridHeads.current.length < gridCount) gridHeads.current = new Int32Array(gridCount)
            if (!gridNexts.current || gridNexts.current.length < MAX_STARS) gridNexts.current = new Int32Array(MAX_STARS)

            const heads = gridHeads.current
            const nexts = gridNexts.current
            heads.fill(-1)

            const px = posX.current
            const py = posY.current
            const rads = radii.current
            const sts = statuses.current
            const zz = zs.current

            for (let i = 0; i < count; i++) {
                if (sts[i] === STATUS_DYING) continue
                const cx = Math.floor(px[i] / cellSize)
                const cy = Math.floor(py[i] / cellSize)
                if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
                    const key = cx + cy * cols
                    nexts[i] = heads[key]
                    heads[key] = i
                } else nexts[i] = -1
            }

            const repulsionRadiusSq = CONFIG.repulsionRadius * CONFIG.repulsionRadius
            const ptrX = pointer.current.x
            const ptrY = pointer.current.y
            const ptrActive = pointer.current.active

            for (let i = 0; i < count; i++) {
                if (sts[i] !== STATUS_ACTIVE) continue

                if (ptrActive) {
                    const dx = px[i] - ptrX
                    const dy = py[i] - ptrY
                    const distSq = dx * dx + dy * dy
                    if (distSq < repulsionRadiusSq) {
                        const dist = Math.sqrt(distSq)
                        const force = (1 - dist / CONFIG.repulsionRadius) * CONFIG.repulsionForce
                        const angle = Math.atan2(dy, dx)
                        px[i] += Math.cos(angle) * force * 2
                        py[i] += Math.sin(angle) * force * 2
                        sts[i] = STATUS_ACTIVE // Wake up if touched
                    }
                }

                const cellX = Math.floor(px[i] / cellSize)
                const cellY = Math.floor(py[i] / cellSize)
                for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
                    if (cx < 0 || cx >= cols) continue
                    for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
                        if (cy < 0 || cy >= rows) continue
                        const cellKey = cx + cy * cols
                        let oIdx = heads[cellKey]
                        while (oIdx !== -1) {
                            if (i !== oIdx) {
                                if (Math.abs(zz[i] - zz[oIdx]) < 0.1) {
                                    const dx = px[i] - px[oIdx]
                                    const dy = py[i] - py[oIdx]
                                    const distSq = dx * dx + dy * dy
                                    const minDist = rads[i] + rads[oIdx]
                                    if (distSq < minDist * minDist && distSq > 0) {
                                        const dist = Math.sqrt(distSq)
                                        const overlap = (minDist - dist) * 0.5
                                        const nx = dx / dist, ny = dy / dist
                                        px[i] += nx * overlap; py[i] += ny * overlap
                                        px[oIdx] -= nx * overlap; py[oIdx] -= ny * overlap
                                        sts[i] = STATUS_ACTIVE; sts[oIdx] = STATUS_ACTIVE
                                    }
                                }
                            }
                            oIdx = nexts[oIdx]
                        }
                    }
                }
            }
        }

        const ticker = () => {
            if (!isActiveRef.current) return
            if (!app.ticker || (app.ticker as any)._destroyed) return

            const count = currentCount.current
            const w = app.screen.width
            const h = app.screen.height
            const px = posX.current; const py = posY.current
            const ox = oldX.current; const oy = oldY.current
            const ags = angles.current; const avs = angVels.current
            const rads = radii.current; const sts = statuses.current
            const dts = deathTimers.current; const bsc = baseScales.current
            const sps = sprites.current

            const ptrActive = pointer.current.active
            const ptrX = pointer.current.x; const ptrY = pointer.current.y
            const repSq = CONFIG.repulsionRadius * CONFIG.repulsionRadius

            for (let i = 0; i < count; i++) {
                const s = sps[i]
                if (!s) continue

                if (sts[i] === STATUS_DYING) {
                    dts[i] += 0.02
                    if (dts[i] >= 1.0) { s.visible = false; continue }
                    if (dts[i] < 0.4) { py[i] -= 2; ags[i] += 0.1 }
                    else {
                        const phase2 = (dts[i] - 0.4) / 0.6
                        s.scale.set(bsc[i] * Math.max(0, 1 - phase2))
                        ags[i] += 0.3; py[i] -= 1; s.alpha = 1 - phase2
                    }
                    s.x = px[i]; s.y = py[i]; s.rotation = ags[i]
                    continue
                }

                if (sts[i] === STATUS_SLEEPING) {
                    if (ptrActive) {
                        const dx = px[i] - ptrX, dy = py[i] - ptrY
                        if (dx * dx + dy * dy < repSq) sts[i] = STATUS_ACTIVE
                    }
                    continue
                }

                const vx = (px[i] - ox[i]) * CONFIG.friction
                const vy = (py[i] - oy[i]) * CONFIG.friction
                ox[i] = px[i]; oy[i] = py[i]
                px[i] += vx; py[i] += vy + CONFIG.gravity
                ags[i] += avs[i]

                // Boundary checks
                if (py[i] + rads[i] > h) { py[i] = h - rads[i]; oy[i] = py[i] + vy * 0.5; avs[i] *= 0.9 }
                if (px[i] + rads[i] > w) { px[i] = w - rads[i]; ox[i] = px[i] + vx * 0.5 }
                else if (px[i] - rads[i] < 0) { px[i] = rads[i]; ox[i] = px[i] + vx * 0.5 }

                // Sleep detection
                if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05 && py[i] > h - rads[i] - 2) {
                    if (!ptrActive || (px[i] - ptrX) ** 2 + (py[i] - ptrY) ** 2 > repSq) sts[i] = STATUS_SLEEPING
                }
            }

            // Align with Prototype: Run physics iterations multiple times for stability
            solvePhysics()
            solvePhysics()

            // Final Sync: Move sprites AFTER all physics steps to ensure frame-perfect visual stability
            for (let i = 0; i < count; i++) {
                const s = sps[i]
                if (s && sts[i] !== STATUS_DYING && sts[i] !== STATUS_SLEEPING) {
                    s.x = px[i]; s.y = py[i]; s.rotation = ags[i]
                }
            }
        }

        app.ticker.add(ticker)

        if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
            (window as any).PointsSystem = {
                add: (count: number) => {
                    const delta = Math.floor(count || 0)
                    const next = Math.max(0, displayPointsRef.current + delta)
                    displayPointsRef.current = next
                    updatePointDisplay(next)

                    const w = app.screen.width
                    const currentTotal = currentCount.current
                    const toAdd = Math.min(delta, MAX_STARS - currentTotal)

                    for (let i = 0; i < toAdd; i++) {
                        const idx = currentTotal + i
                        const x = Math.random() * w
                        const y = -20 - Math.random() * 100
                        createParticleAt(idx, x, y, pixi, particleContainer)
                    }
                    currentCount.current += toAdd
                },
                consume: (count: number) => {
                    const delta = Math.floor(count || 0)
                    const next = Math.max(0, displayPointsRef.current - delta)
                    displayPointsRef.current = next
                    updatePointDisplay(next)

                    let killed = 0
                    const total = currentCount.current
                    for (let i = 0; i < total && killed < delta; i++) {
                        if (statuses.current[i] !== STATUS_DYING) {
                            statuses.current[i] = STATUS_DYING
                            deathTimers.current[i] = 0
                            killed++
                        }
                    }
                },
                explode: () => {
                    const n = currentCount.current
                    for (let i = 0; i < n; i++) {
                        const force = 10 + Math.random() * 20
                        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
                        oldX.current[i] = posX.current[i] - Math.cos(angle) * force
                        oldY.current[i] = posY.current[i] - Math.sin(angle) * force
                        statuses.current[i] = STATUS_ACTIVE
                    }
                }
            }
        }

        return () => {
            if (app && app.ticker) {
                app.ticker.remove(ticker)
            }
            if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
                window.removeEventListener('mousemove', onMouseMove)
                window.removeEventListener('blur', onBlur)
            }
            if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
                if ((window as any).PointsSystem) delete (window as any).PointsSystem
            }
            if (particleContainerRef.current) {
                particleContainerRef.current.destroy({ children: true })
            }
            if (starTexture.current) {
                starTexture.current.destroy(true)
            }
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
        if (!app || !particleContainer || !pixi) return

        const currentTotal = currentCount.current
        let currentActive = 0
        for (let i = 0; i < currentTotal; i++) {
            if (statuses.current[i] !== STATUS_DYING) currentActive++
        }

        const nextPoints = Math.max(0, Math.floor(target))
        const delta = nextPoints - currentActive

        if (delta > 0) {
            const spaceLeft = MAX_STARS - currentTotal
            const toAdd = Math.min(delta, spaceLeft)
            const w = app.screen.width
            for (let i = 0; i < toAdd; i++) {
                const idx = currentTotal + i
                const x = Math.random() * w
                const y = -20 - Math.random() * 100
                createParticleAt(idx, x, y, pixi, particleContainer)
            }
            currentCount.current += toAdd
        } else if (delta < 0) {
            let toRemove = Math.abs(delta)
            for (let i = 0; i < currentTotal && toRemove > 0; i++) {
                if (statuses.current[i] !== STATUS_DYING) {
                    statuses.current[i] = STATUS_DYING
                    deathTimers.current[i] = 0
                    toRemove--
                }
            }
        }
    }, [app, pixi])

    useEffect(() => {
        displayPointsRef.current = points
        updatePointDisplay(points)
        syncParticles(points)
    }, [points, syncParticles])

    const handlePointerMove = useCallback((event: any) => {
        if (!app) return

        const touch = (event && event.touches && event.touches[0]) || (event && event.changedTouches && event.changedTouches[0])
        if (!touch) return

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
            className={`bg-white gradient-border rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden mt-4 ${className}`}
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
                className="absolute inset-0 w-full h-full z-0 pointer-events-none"
                style={{ backgroundColor: 'transparent' }}
            />

            <View className="relative z-10 pointer-events-none">
                <LabelCaps className="block mb-2">当前可用积分</LabelCaps>
                <View
                    ref={displayRef}
                    className="text-6xl font-black text-slate-900 tracking-tighter mix-blend-multiply"
                >
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
