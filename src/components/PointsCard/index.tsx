import { Canvas, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { FC, useCallback, useEffect, useMemo, useRef } from 'react'
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

const MAX_STARS = 5000
const CONFIG = {
    radius: 6,
    gravity: 0.15,
    friction: 0.96,
    repulsionRadius: 80,
    repulsionForce: 0.4
}
const cellSize = CONFIG.radius * 2.2

// STATUS Constants
const STATUS_ACTIVE = 0
const STATUS_SLEEPING = 1
const STATUS_DYING = 2

const PointsCard: FC<PointsCardProps> = React.memo(({
    className = '',
    points: initialPoints = 0,
    dailyPlayCount = 0,
    isActive = true
}) => {
    // 1. Decoupled Refs
    const displayRef = useRef<HTMLDivElement>(null)
    const pointsRef = useRef(initialPoints)
    const isActiveRef = useRef(isActive)
    isActiveRef.current = isActive

    const canvasId = useMemo(() => `pc-${Math.random().toString(36).slice(2, 6)}`, [])
    const { app, pixi } = usePixi(canvasId)
    const starTexture = useRef<PixiTypes.Texture | null>(null)
    const pointer = useRef({ x: -1000, y: -1000, active: false })
    const canvasRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)

    // 2. Typed Arrays (Zero-Allocation Physics)
    const px = useRef(new Float32Array(MAX_STARS))
    const py = useRef(new Float32Array(MAX_STARS))
    const ox = useRef(new Float32Array(MAX_STARS))
    const oy = useRef(new Float32Array(MAX_STARS))
    const ags = useRef(new Float32Array(MAX_STARS))
    const avs = useRef(new Float32Array(MAX_STARS))
    const rads = useRef(new Float32Array(MAX_STARS))
    const zs = useRef(new Float32Array(MAX_STARS))
    const sts = useRef(new Uint8Array(MAX_STARS))
    const dts = useRef(new Float32Array(MAX_STARS))
    const bsc = useRef(new Float32Array(MAX_STARS))
    const sps = useRef<(PixiTypes.Sprite | null)[]>(new Array(MAX_STARS).fill(null))
    const count = useRef(0)
    const heads = useRef<Int32Array | null>(null)
    const nexts = useRef<Int32Array | null>(null)

    const updateUI = (v: number) => { if (displayRef.current) displayRef.current.innerText = formatNumber(v) }

    const spawnStar = (idx: number, x: number, y: number, pixi: PixiModule, container: PixiTypes.Container) => {
        const tex = starTexture.current || pixi.Texture.WHITE
        let s = sps.current[idx]
        if (!s) { s = new pixi.Sprite(tex); s.anchor.set(0.5); container.addChild(s); sps.current[idx] = s }
        s.visible = true; s.x = x; s.y = y
        px.current[idx] = x; py.current[idx] = y
        ox.current[idx] = x + (Math.random() - 0.5) * 2; oy.current[idx] = y + (Math.random() - 0.5) * 2
        rads.current[idx] = CONFIG.radius * (0.8 + Math.random() * 0.4); ags.current[idx] = Math.random() * Math.PI * 2
        avs.current[idx] = (Math.random() - 0.5) * 0.2; zs.current[idx] = Math.floor(Math.random() * 3) / 2
        sts.current[idx] = STATUS_ACTIVE; dts.current[idx] = 0
        const sc = (rads.current[idx] * 2) / 64 * (0.5 + zs.current[idx] * 0.7)
        bsc.current[idx] = sc; s.scale.set(sc); s.alpha = zs.current[idx] > 0.7 ? 1 : 0.6 + zs.current[idx] * 0.4
    }

    useEffect(() => {
        if (!app || !pixi) return

        // --- Init Texture ---
        if (!starTexture.current) {
            const size = 64
            if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
                const c = document.createElement('canvas'); c.width = size; c.height = size
                const x = c.getContext('2d'); if (x) {
                    x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fillStyle = '#fde68a'; x.fill()
                    x.beginPath(); x.arc(32, 32, 22, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill()
                    x.translate(32, 32); x.beginPath(); x.fillStyle = '#f59e0b'
                    for (let i = 0; i < 5; i++) {
                        x.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 19, -Math.sin((18 + i * 72) * Math.PI / 180) * 19)
                        x.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 9, -Math.sin((54 + i * 72) * Math.PI / 180) * 9)
                    }
                    x.closePath(); x.fill(); starTexture.current = pixi.Texture.from(c as any)
                }
            } else {
                const g = new pixi.Graphics().beginFill(0xfde68a).drawCircle(32, 32, 28).endFill()
                    .beginFill(0xffffff).drawCircle(32, 32, 22).endFill().beginFill(0xf59e0b)
                for (let i = 0; i < 5; i++) {
                    const o = (18 + i * 72) * Math.PI / 180, n = (54 + i * 72) * Math.PI / 180
                    if (i === 0) g.moveTo(32 + Math.cos(o) * 19, 32 - Math.sin(o) * 19); else g.lineTo(32 + Math.cos(o) * 19, 32 - Math.sin(o) * 19)
                    g.lineTo(32 + Math.cos(n) * 9, 32 - Math.sin(n) * 9)
                }
                g.closePath().endFill(); starTexture.current = app.renderer.generateTexture(g); g.destroy()
            }
        }

        const container = new pixi.ParticleContainer(MAX_STARS, { scale: true, position: true, rotation: true, alpha: true })
        app.stage.addChild(container)

        const init = (val: number) => {
            count.current = Math.min(val, MAX_STARS); const w = app.screen.width, h = app.screen.height, gap = CONFIG.radius * 2
            const cols = Math.max(1, Math.floor(w / gap))
            for (let i = 0; i < count.current; i++) {
                spawnStar(i, (i % cols + 0.5) * gap + (Math.random() - 0.5) * 5, h - (Math.floor(i / cols) + 0.5) * gap - 20, pixi, container)
            }
        }
        init(pointsRef.current); updateUI(pointsRef.current)

        // --- Interaction ---
        const v = app.view as any
        const move = (cx: number, cy: number) => {
            if (!v.getBoundingClientRect) return
            const r = v.getBoundingClientRect(); pointer.current.x = cx - r.left; pointer.current.y = cy - r.top; pointer.current.active = true
        }
        const hMove = (e: MouseEvent) => move(e.clientX, e.clientY)
        const hTouch = (e: TouchEvent) => {
            const t = e.touches[0] || e.changedTouches[0]; if (t) move(t.clientX, t.clientY)
            if (e.cancelable) e.preventDefault()
        }
        const hEnd = () => { pointer.current.active = false }

        if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
            v.addEventListener('mousemove', hMove), v.addEventListener('touchstart', hTouch, { passive: false })
            v.addEventListener('touchmove', hTouch, { passive: false }), v.addEventListener('mouseleave', hEnd)
            window.addEventListener('mouseup', hEnd), window.addEventListener('touchend', hEnd)
        }

        const loop = () => {
            if (!isActiveRef.current || !app.ticker || (app.ticker as any)._destroyed) return

            // FIXED-STEP PHYSICS (Smoothing out jitter)
            const n = count.current, w = app.screen.width, h = app.screen.height
            const gravity = CONFIG.gravity, friction = CONFIG.friction
            const r2 = CONFIG.repulsionRadius * CONFIG.repulsionRadius
            const rForce = CONFIG.repulsionForce
            const rRad = CONFIG.repulsionRadius

            const _px = px.current, _py = py.current, _ox = ox.current, _oy = oy.current, _ag = ags.current, _av = avs.current
            const _rd = rads.current, _st = sts.current, _dt = dts.current, _bs = bsc.current, _sp = sps.current, _zs = zs.current
            const p = pointer.current

            // PASS 1: Integration + GRID REBUILD
            const c = Math.ceil(w / cellSize), r = Math.ceil(h / cellSize)
            if (!heads.current || heads.current.length < c * r) heads.current = new Int32Array(c * r)
            if (!nexts.current) nexts.current = new Int32Array(MAX_STARS)
            const hds = heads.current, nxs = nexts.current; hds.fill(-1)

            for (let i = 0; i < n; i++) {
                const s = _sp[i]; if (!s) continue
                if (_st[i] === STATUS_DYING) {
                    _dt[i] += 0.02; if (_dt[i] >= 1) { s.visible = false; _sp[i] = null; continue }
                    if (_dt[i] < 0.4) { _py[i] -= 2; _ag[i] += 0.1 } else {
                        const ph = (_dt[i] - 0.4) / 0.6; s.scale.set(_bs[i] * Math.max(0, 1 - ph)); _ag[i] += 0.3; _py[i] -= 1; s.alpha = 1 - ph
                    }
                    s.x = _px[i]; s.y = _py[i]; s.rotation = _ag[i]; continue
                }

                if (_st[i] === STATUS_SLEEPING) {
                    if (p.active && (_px[i] - p.x) ** 2 + (_py[i] - p.y) ** 2 < r2) _st[i] = STATUS_ACTIVE
                } else {
                    const vx = (_px[i] - _ox[i]) * friction, vy = (_py[i] - _oy[i]) * friction
                    _ox[i] = _px[i]; _oy[i] = _py[i]; _px[i] += vx; _py[i] += vy + gravity; _ag[i] += _av[i]
                    if (_py[i] + _rd[i] > h) { _py[i] = h - _rd[i]; _oy[i] = _py[i] + vy * 0.5; _av[i] *= 0.9 }
                    if (_px[i] + _rd[i] > w) { _px[i] = w - _rd[i]; _ox[i] = _px[i] + vx * 0.5 } else if (_px[i] - _rd[i] < 0) { _px[i] = _rd[i]; _ox[i] = _px[i] + vx * 0.5 }
                    if (vx * vx + vy * vy < 0.01 && _py[i] > h - _rd[i] - 2) { if (!p.active || (_px[i] - p.x) ** 2 + (_py[i] - p.y) ** 2 > r2) _st[i] = STATUS_SLEEPING }
                }

                if (_st[i] !== STATUS_DYING) {
                    const gx = (_px[i] / cellSize) | 0, gy = (_py[i] / cellSize) | 0
                    if (gx >= 0 && gx < c && gy >= 0 && gy < r) { const k = gx + gy * c; nxs[i] = hds[k]; hds[k] = i }
                }
            }

            // PASS 2: GAME-GRADE COLLISION SOLVER (Avoid Sqrt + Order Cache)
            const rForce_rRad = rForce / rRad
            for (let iter = 0; iter < 2; iter++) {
                for (let i = 0; i < n; i++) {
                    const st_i = _st[i]; if (st_i !== STATUS_ACTIVE) continue
                    if (p.active) {
                        const dx = _px[i] - p.x, dy = _py[i] - p.y, d2 = dx * dx + dy * dy
                        if (d2 < r2) {
                            const d = Math.sqrt(d2), invD = 1 / d, f2 = (rForce * invD - rForce_rRad) * 2;
                            _px[i] += dx * f2; _py[i] += dy * f2
                        }
                    }
                    const gx = (_px[i] / cellSize) | 0, gy = (_py[i] / cellSize) | 0
                    for (let x = gx - 1; x <= gx + 1; x++) {
                        if (x < 0 || x >= c) continue
                        for (let y = gy - 1; y <= gy + 1; y++) {
                            if (y < 0 || y >= r) continue
                            let o = hds[x + y * c]
                            while (o !== -1) {
                                if (o > i && Math.abs(_zs[i] - _zs[o]) < 0.1) {
                                    const dx = _px[i] - _px[o], dy = _py[i] - _py[o], d2 = dx * dx + dy * dy, min = _rd[i] + _rd[o]
                                    const min2 = min * min
                                    if (d2 < min2 && d2 > 0) {
                                        const d = Math.sqrt(d2), ov = (min - d) * 0.5, invD = 1 / d
                                        const nx = dx * invD, ny = dy * invD
                                        _px[i] += nx * ov; _py[i] += ny * ov
                                        _px[o] -= nx * ov; _py[o] -= ny * ov
                                        if (_st[o] === STATUS_SLEEPING) _st[o] = STATUS_ACTIVE
                                    }
                                }
                                o = nxs[o]
                            }
                        }
                    }
                }
            }

            // PASS 3: SYNC (Optimized: Zero-Setter for Sleeping stars)
            for (let i = 0; i < n; i++) {
                if (_st[i] === STATUS_ACTIVE) {
                    const s = _sp[i];
                    if (s) { s.x = _px[i]; s.y = _py[i]; s.rotation = _ag[i] }
                }
            }
        }
        app.ticker.add(loop)

        const api = {
            add: (v: number) => {
                const add = Math.floor(v), nxt = Math.max(0, pointsRef.current + add); pointsRef.current = nxt; updateUI(nxt)
                const real = Math.min(add, MAX_STARS - count.current)
                for (let i = 0; i < real; i++) spawnStar(count.current + i, Math.random() * app.screen.width, -50, pixi, container)
                count.current += real
            },
            consume: (v: number) => {
                const sub = Math.floor(v), nxt = Math.max(0, pointsRef.current - sub); pointsRef.current = nxt; updateUI(nxt)
                let k = 0; for (let i = 0; i < count.current && k < sub; i++) if (sts.current[i] < 2) { sts.current[i] = STATUS_DYING; dts.current[i] = 0; k++ }
            },
            explode: () => {
                for (let i = 0; i < count.current; i++) {
                    const f = 15 + Math.random() * 15, a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
                    ox.current[i] = px.current[i] - Math.cos(a) * f; oy.current[i] = py.current[i] - Math.sin(a) * f; sts.current[i] = STATUS_ACTIVE
                }
            }
        }; (window as any).PointsSystem = api

        return () => {
            app.ticker.remove(loop); v.removeEventListener('mousemove', hMove); v.removeEventListener('touchstart', hTouch)
            v.removeEventListener('touchmove', hTouch); v.removeEventListener('mouseleave', hEnd)
            window.removeEventListener('mouseup', hEnd); window.removeEventListener('touchend', hEnd)
            delete (window as any).PointsSystem; container.destroy({ children: true })
            if (starTexture.current) starTexture.current.destroy(true)
            sps.current.fill(null)
        }
    }, [app, pixi])

    useEffect(() => {
        if (initialPoints !== pointsRef.current && (window as any).PointsSystem) {
            const d = initialPoints - pointsRef.current; if (d > 0) (window as any).PointsSystem.add(d); else (window as any).PointsSystem.consume(-d)
        }
    }, [initialPoints])

    const refresh = useCallback(() => {
        if (process.env.TARO_ENV !== 'weapp') return
        Taro.createSelectorQuery().select(`#${canvasId}`).boundingClientRect((r) => {
            const res = Array.isArray(r) ? r[0] : r; if (res) canvasRectRef.current = { left: res.left || 0, top: res.top || 0, width: res.width || 0, height: res.height || 0 }
        }).exec()
    }, [canvasId])

    useEffect(() => {
        if (process.env.TARO_ENV !== 'weapp' || !app) return
        refresh(); Taro.onWindowResize?.(refresh); return () => Taro.offWindowResize?.(refresh)
    }, [app, refresh])

    const hWp = useCallback((e: any) => {
        if (process.env.TARO_ENV !== 'weapp') return
        const t = e.touches[0] || e.changedTouches[0]; if (!t) return
        const x = t.x ?? (t.pageX - (canvasRectRef.current?.left || 0)), y = t.y ?? (t.pageY - (canvasRectRef.current?.top || 0))
        pointer.current.x = x; pointer.current.y = y; pointer.current.active = true
    }, [])

    const hWpEnd = useCallback(() => { pointer.current.active = false }, [])

    return (
        <View className={`bg-white rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden mt-4 ${className}`}
            onTouchMove={process.env.TARO_ENV === 'weapp' ? hWp : undefined}
            onTouchStart={process.env.TARO_ENV === 'weapp' ? hWp : undefined}
            onTouchEnd={process.env.TARO_ENV === 'weapp' ? hWpEnd : undefined}
        >
            <View className="flex flex-col items-center mt-2 mb-16 relative z-10 pointer-events-none">
                <View className="w-16 h-16 bg-rose-600 rounded-2xl shadow-lg flex items-center justify-center text-white text-3xl font-black mb-4">
                    <Text>婷</Text>
                </View>
                <Text className="text-xl font-black text-slate-900">婷姐•贵州炒鸡</Text>
            </View>
            <Canvas id={canvasId} canvasId={canvasId} type="webgl" className="absolute inset-0 w-full h-full z-0" />
            <View className="relative z-10 pointer-events-none">
                <LabelCaps className="block mb-2">当前可用积分</LabelCaps>
                <View ref={displayRef} className="text-6xl font-black text-slate-900 tracking-tighter">
                    {formatNumber(pointsRef.current)}
                </View>
                <View className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-[10px] font-bold shadow-sm">
                    <Image src={SVG_THUNDER_AMBER} className="w-3 h-3" />
                    <Text>今日已玩 {dailyPlayCount}/3 次</Text>
                </View>
            </View>
        </View>
    )
})

// @ts-ignore
PointsCard.options = { addGlobalClass: true }

export default PointsCard
