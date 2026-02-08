import React, { useEffect, useRef, useState } from 'react'
import { View } from '@tarojs/components'
import { GameLoop } from '../../game-engine/GameLoop'
import './index.scss'

interface PointsCardProps {
    className?: string
    points?: number
    dailyPlayCount?: number
    isActive?: boolean
}

const PointsCard: React.FC<PointsCardProps> = ({
    className = '',
    points: initialPoints = 1240,
    dailyPlayCount = 0,
    isActive = true
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const gameLoopRef = useRef<GameLoop | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // UI State
    const [points, setPoints] = useState(initialPoints)

    // Sync Props to Game State and Physics
    useEffect(() => {
        setPoints(initialPoints)

        // If engine is ready, sync physical stars
        if (gameLoopRef.current && (window as any).PointsSystem) {
            const current = gameLoopRef.current.getStarCount()
            const diff = initialPoints - current
            if (diff > 0) {
                (window as any).PointsSystem.add(diff)
            } else if (diff < 0) {
                (window as any).PointsSystem.consume(-diff)
            }
        }
    }, [initialPoints])

    useEffect(() => {
        const initGame = async () => {
            if (!containerRef.current) return

            // 1. Get Dimensions
            const rect = containerRef.current.getBoundingClientRect()
            const width = rect.width
            const height = rect.height
            const dpr = window.devicePixelRatio || 1

            // 2. Locate Canvas
            // H5: Use ref. Weapp: Query selector (omitted for this demo step)
            let canvas = canvasRef.current

            if (canvas) {
                // 3. Initialize Game Loop
                const loop = new GameLoop(canvas, width, height, dpr)
                loop.start()
                gameLoopRef.current = loop

                // 4. Expose Global API
                const addStarsAtTop = (count: number) => {
                    for (let i = 0; i < count; i++) {
                        loop.addStar(Math.random() * width, -10 - Math.random() * height * 0.5)
                    }
                }

                // Initial Placement (Grid Packed at Bottom - Match Prototype)
                const addInitialStars = (count: number) => {
                    const radius = 6 // Approx radius
                    const cols = Math.floor(width / (radius * 2.2))

                    for (let i = 0; i < count; i++) {
                        const col = i % cols
                        const row = Math.floor(i / cols)

                        // X: Centered in column with slight jitter
                        const x = (col + 0.5) * (radius * 2.2) + (Math.random() - 0.5) * 2

                        // Y: Stacked from bottom up
                        const y = height - (row + 0.5) * (radius * 2.2) - 20

                        loop.addStar(x, y)
                    }
                }

                    ; (window as any).PointsSystem = {
                        add: (count: number) => {
                            addStarsAtTop(count)
                            setPoints(p => p + count)
                        },
                        consume: (count: number) => {
                            loop.removeStars(count)
                            setPoints(p => Math.max(0, p - count))
                        },
                        explode: () => {
                            console.log('Explode trigger')
                        }
                    }

                // Initial Stars (Directly to engine, state is already set)
                addInitialStars(initialPoints)
            }
        }

        initGame()

        return () => {
            if (gameLoopRef.current) {
                gameLoopRef.current.destroy()
                gameLoopRef.current = null
            }
            delete (window as any).PointsSystem
        }
    }, [])

    // Input Handling (H5 & Weapp)
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const getPos = (e: MouseEvent | TouchEvent) => {
            let x = 0, y = 0
            if (window.TouchEvent && e instanceof TouchEvent) {
                x = e.touches[0].clientX
                y = e.touches[0].clientY
            } else if (e instanceof MouseEvent) {
                x = e.clientX
                y = e.clientY
            }
            const rect = el.getBoundingClientRect()
            return { x: x - rect.left, y: y - rect.top }
        }

        const onStart = (e: MouseEvent | TouchEvent) => {
            if (!gameLoopRef.current) return
            const { x, y } = getPos(e)
            gameLoopRef.current.setPointer(x, y, true)
        }

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!gameLoopRef.current) return
            const { x, y } = getPos(e)
            // Just update position, keep active state as is (it's handled by start/end)
            // But for safety in case start was missed (e.g. valid drag entry), we can rely on active state being maintained by loop or explicitly set here.
            // Prototype sets active=true on move too.
            gameLoopRef.current.setPointer(x, y, true)
        }

        const onEnd = () => {
            if (!gameLoopRef.current) return
            gameLoopRef.current.setPointer(0, 0, false)
        }

        // Attach listeners
        el.addEventListener('mousedown', onStart)
        el.addEventListener('touchstart', onStart, { passive: false })

        el.addEventListener('mousemove', onMove)
        el.addEventListener('touchmove', onMove, { passive: false })

        el.addEventListener('mouseup', onEnd)
        el.addEventListener('mouseleave', onEnd)
        el.addEventListener('touchend', onEnd)

        return () => {
            el.removeEventListener('mousedown', onStart)
            el.removeEventListener('touchstart', onStart)
            el.removeEventListener('mousemove', onMove)
            el.removeEventListener('touchmove', onMove)
            el.removeEventListener('mouseup', onEnd)
            el.removeEventListener('mouseleave', onEnd)
            el.removeEventListener('touchend', onEnd)
        }
    }, [])

    return (
        <View className={`points-card bg-white rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden mt-4 ${className}`} ref={containerRef}>
            {/* Canvas Background (Absolute) */}
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            />

            {/* UI Content (Relative, defines height) */}
            <View className="points-card-ui relative z-10 pointer-events-none flex flex-col items-center">
                {/* Brand */}
                <View className="w-16 h-16 bg-rose-600 rounded-2xl shadow-lg flex items-center justify-center mb-4">
                    <View className="text-white text-3xl font-black">婷</View>
                </View>
                <View className="text-xl font-black text-slate-900 mb-8">婷姐•贵州炒鸡</View>

                {/* Points */}
                <View className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 mb-2">当前可用积分</View>
                <View className="text-6xl font-black text-slate-900 tracking-tighter mix-blend-multiply">
                    {points.toLocaleString()}
                </View>

                {/* Tag */}
                <View className="mt-4 flex items-center gap-2 px-3 py-1 bg-amber-50/80 backdrop-blur-sm text-amber-700 rounded-full text-[10px] font-bold shadow-sm">
                    <View className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></View>
                    今日已玩 {dailyPlayCount}/3 次
                </View>

                {/* Debug Info (Optional) */}
                <View className="absolute bottom-4 left-0 w-full opacity-30 text-[10px] text-slate-500 text-center">
                    Engine: Matter.js + PixiJS
                </View>
            </View>
        </View>
    )
}

export default React.memo(PointsCard)
