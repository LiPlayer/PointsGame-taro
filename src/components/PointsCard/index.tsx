import React, { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Canvas } from '@tarojs/components'
import { GameLoop } from '../../game-engine/GameLoop'
import { readCanvasInfo, ensurePixiModule } from '../../utils/usePixi'
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
    const containerRef = useRef<any>(null)
    const gameLoopRef = useRef<GameLoop | null>(null)
    const canvasRef = useRef<any>(null)
    const containerId = useRef(`container-${Math.random().toString(36).substr(2, 9)}`).current
    const canvasId = useRef(`canvas-${Math.random().toString(36).substr(2, 9)}`).current

    // UI State
    const [points, setPoints] = useState(initialPoints)
    // Container layout info for input mapping
    const layoutRef = useRef({ left: 0, top: 0, width: 0, height: 0 })

    // Sync Props to Game State and Physics
    useEffect(() => {
        setPoints(initialPoints)

        // If engine is ready, sync physical stars
        if (gameLoopRef.current && (window as any).PointsSystem) {
            const current = gameLoopRef.current.getStarCount()
            const target = Math.floor(initialPoints)
            const diff = target - current
            if (diff > 0) {
                (window as any).PointsSystem.add(diff)
            } else if (diff < 0) {
                (window as any).PointsSystem.consume(-diff)
            }
        }
    }, [initialPoints])

    useEffect(() => {
        const initGame = async () => {
            // Use specialized utility for robust canvas discovery
            let info = await readCanvasInfo(canvasId)

            // On some platforms, query might fail immediately on mount
            if (!info) {
                await new Promise(r => setTimeout(r, 100))
                info = await readCanvasInfo(canvasId)
            }

            if (!info) {
                console.error('PointsCard: Could not find canvas info', canvasId)
                return
            }

            // Get platform-aware PIXI module
            const PIXI = await ensurePixiModule((info as any).canvas)
            if (!PIXI) {
                console.error('PointsCard: Could not initialize PIXI module')
                return
            }

            const { canvas, width, height, dpr } = info as any

            // Update layout ref for input mapping (use container query for better accuracy)
            Taro.createSelectorQuery()
                .select(`#${containerId}`)
                .boundingClientRect()
                .exec((res) => {
                    const rect = res[0]
                    if (rect) {
                        layoutRef.current = {
                            left: rect.left,
                            top: rect.top,
                            width: rect.width,
                            height: rect.height
                        }
                    }
                })

            if (canvas) {
                const loop = new GameLoop(PIXI, canvas, width, height, dpr)
                loop.start()
                gameLoopRef.current = loop

                const addStarsAtTop = (count: number) => {
                    for (let i = 0; i < count; i++) {
                        // Match prototype: -20 to -120 y
                        loop.addStar(Math.random() * width, -20 - Math.random() * 100)
                    }
                }

                const addInitialStars = (count: number) => {
                    const radius = 6
                    const spacing = radius * 2.0 // Exact prototype spacing

                    const cols = Math.floor(width / spacing)

                    for (let i = 0; i < count; i++) {
                        const col = i % cols
                        const row = Math.floor(i / cols)

                        // Match prototype: (col + 0.5) * spacing + random jitter 5
                        const x = (col + 0.5) * spacing + (Math.random() - 0.5) * 5
                        const y = height - (row + 0.5) * spacing - 20

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

    // Input Handling using Taro events
    const handleTouch = React.useCallback((e: any, active: boolean) => {
        if (!gameLoopRef.current) return

        // Prevent page scroll during interaction
        if (e.cancelable && typeof e.preventDefault === 'function') {
            e.preventDefault()
        }
        if (typeof e.stopPropagation === 'function') {
            e.stopPropagation()
        }

        const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e)
        const x = touch.clientX - layoutRef.current.left
        const y = touch.clientY - layoutRef.current.top
        gameLoopRef.current.setPointer(x, y, active)
    }, [])

    const handleTouchStart = React.useCallback((e: any) => handleTouch(e, true), [handleTouch])
    const handleTouchMove = React.useCallback((e: any) => handleTouch(e, true), [handleTouch])
    const handleTouchEnd = React.useCallback(() => gameLoopRef.current?.setPointer(0, 0, false), [])

    return (
        <View
            className={`points-card bg-white rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden mt-4 ${className}`}
            id={containerId}
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Canvas Background */}
            {process.env.TARO_ENV === 'weapp' ? (
                <Canvas
                    type="webgl"
                    id={canvasId}
                    style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                />
            ) : (
                <canvas
                    id={canvasId}
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                />
            )}

            {/* UI Content */}
            <View className="points-card-ui relative z-10 pointer-events-none flex flex-col items-center">
                {/* Brand */}
                <View className="w-16 h-16 bg-rose-600 rounded-2xl shadow-lg flex items-center justify-center mb-4">
                    <View className="text-white text-3xl font-black">婷</View>
                </View>
                <View className="text-xl font-black text-slate-900 mb-8">婷姐•贵州炒鸡</View>

                {/* Points */}
                <View className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 mb-2">当前可用积分</View>
                <View className="text-6xl font-black text-slate-900 tracking-tighter mix-blend-multiply">
                    {Math.floor(points).toLocaleString()}
                </View>

                {/* Tag */}
                <View className="mt-4 flex items-center gap-2 px-3 py-1 bg-amber-50/80 backdrop-blur-sm text-amber-700 rounded-full text-[10px] font-bold shadow-sm">
                    <View className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></View>
                    今日已玩 {dailyPlayCount}/3 次
                </View>

                {/* Debug Info (Optional) */}
                <View className="absolute bottom-4 left-0 w-full opacity-30 text-[10px] text-slate-500 text-center">
                    Engine: Hybrid Cross-Platform
                </View>
            </View>
        </View>
    )
}

export default React.memo(PointsCard)
