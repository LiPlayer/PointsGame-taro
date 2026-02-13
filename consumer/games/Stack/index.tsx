import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Canvas, Text } from '@tarojs/components';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
import { ThreeGameLoop } from './game';
import { SoundManager } from '@/engine/SoundManager';
import { StackPhysics } from './logic/StackPhysics';
import { StackAudio } from './view/StackAudio';
import { GameState } from './logic/StackPhysics';
import { DebugOverlay } from '@/engine/DebugOverlay';

// Combined Component for Loading and Start Hint
const LoadingStartHint = ({ isSceneReady, visible }: { isSceneReady: boolean, visible: boolean }) => {
    if (!visible) return null;

    return (
        <View
            className={`absolute bottom-32 w-full flex flex-col items-center justify-center pointer-events-none transition-all duration-700 ease-out`}
        >
            <View className="relative flex items-center justify-center">
                {/* Text Content with In-place Content Switch */}
                <View className="relative z-10 flex flex-col items-center">
                    <Text
                        className={`text-white text-xl font-bold tracking-[0.2em] transition-all duration-500 whitespace-nowrap animate-pulse ${isSceneReady ? 'scale-100 opacity-100' : 'scale-95 opacity-80'}`}
                    >
                        {isSceneReady ? '点击开始' : '正在加载'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const StackGame = () => {
    const loopRef = useRef<ThreeGameLoop | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isSceneReady, setIsSceneReady] = useState(false);
    const [ready, setReady] = useState(false);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [bgColor, setBgColor] = useState<number>(0xf25367); // Initial color (Rose Red)
    const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
    const [gameOver, setGameOver] = useState(false);
    const [showFinalScore, setShowFinalScore] = useState(false);
    const [bestScore, setBestScore] = useState(0);
    const [time, setTime] = useState(0);
    const isPausedRef = useRef(false);
    const exitTimerRef = useRef<any>(null);

    // Background Breathing Cycle (60s)
    useEffect(() => {
        let startTime = Date.now();
        let frameId: number;
        let lastTime = startTime;

        const update = () => {
            if (!isPausedRef.current) {
                const now = Date.now();
                // We add delta instead of setting absolute to allow "freezing" time
                setTime(prev => prev + (now - lastTime) / 1000);
            }
            lastTime = Date.now();
            frameId = requestAnimationFrame(update);
        };

        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, []);

    // Lifecycle Management
    useDidShow(() => {
        console.log('[StackGame] onShow');
        isPausedRef.current = false;
        loopRef.current?.resume();
        SoundManager.getInstance().resume();
    });

    useDidHide(() => {
        console.log('[StackGame] onHide');
        isPausedRef.current = true;
        loopRef.current?.pause();
        SoundManager.getInstance().suspend();
    });

    // Load Best Score on mount
    useEffect(() => {
        Taro.getStorage({ key: 'stack_best_score' }).then(res => {
            if (res.data) setBestScore(parseInt(res.data, 10));
        }).catch(() => { });
    }, []);

    useEffect(() => {
        SoundManager.getInstance().unlock();

        if (!ready) {
            const timer = setTimeout(() => setReady(true), 100);
            return () => clearTimeout(timer);
        }

        const setup = (canvas: any, width: number, height: number) => {
            const loop = new ThreeGameLoop(canvas, width, height);
            loop.onFirstFrameRendered = () => {
                setIsSceneReady(true);
            };
            loopRef.current = loop;
            loop.start();
        };

        if (process.env.TARO_ENV === 'h5') {
            const canvasEl = document.getElementById('stack-canvas') as HTMLCanvasElement;
            if (canvasEl) {
                const rect = canvasEl.getBoundingClientRect();
                setup(canvasEl, rect.width, rect.height);
            }
        } else {
            Taro.createSelectorQuery()
                .select('#stack-canvas')
                .fields({ node: true, size: true })
                .exec((res) => {
                    if (res?.[0]?.node) {
                        setup(res[0].node, res[0].width, res[0].height);
                    }
                });
        }

        return () => {
            loopRef.current?.destroy();
        };
    }, [ready]);
    const handleTap = useCallback(() => {
        if (!loopRef.current) return;

        const physics = (loopRef.current as any).physics as StackPhysics;

        if (gameOver) {
            if (exitTimerRef.current) {
                clearTimeout(exitTimerRef.current);
            }
            Taro.redirectTo({ url: `/pages/result-earn/index?score=${physics.score}&id=stack` });
            return;
        }

        // Prevent multiple game-over triggers during the 1s hold
        if (physics.state === GameState.GAMEOVER) return;

        const result = loopRef.current.handleTap();

        setScore(physics.score);
        setCombo(physics.combo);
        setBgColor(result.currentColor);
        setGameState(physics.state);

        if (result.gameOver) {
            // Heavy haptic immediately
            if (process.env.TARO_ENV === 'weapp') {
                Taro.vibrateLong();
            }

            // Hold camera for 1 second before zoom and score
            setTimeout(() => {
                if (!loopRef.current) return;

                // Camera Overview Zoom
                const towerHeight = physics.stack.length * 0.1;
                loopRef.current.stackRenderer.zoomToOverview(towerHeight);

                // Delay Final Score sliding to center (start after zoom begins)
                setTimeout(() => setShowFinalScore(true), 600);

                // Update Best Score
                if (physics.score > bestScore) {
                    setBestScore(physics.score);
                    Taro.setStorage({ key: 'stack_best_score', data: physics.score.toString() });
                }

                setGameOver(true);
            }, 1000);
        } else if (result.perfect) {
            StackAudio.playPerfect(physics.combo);

            // Trigger Perfect Ripple VFX via game loop
            loopRef.current.triggerPerfectRipple(physics.combo);

            // Trigger haptic if in WeApp
            if (process.env.TARO_ENV === 'weapp') {
                Taro.vibrateShort({ type: 'light' });
            }
        } else {
            // Ordinary placement gets ONLY a "Tick" sound (Clean, no Slice/Fall)
            // Dynamic Audio: Calculate Scale and Pan
            const top = physics.stack[physics.stack.length - 1];
            if (top) {
                // Scale relative to initial size (1.0)
                // We use X*Z area to approximate "mass"
                const area = top.size.x * top.size.z;
                const scale = Math.min(1.0, Math.max(0.1, area));

                StackAudio.playTick(scale);
            } else {
                StackAudio.playTick();
            }
        }
    }, [bestScore, gameOver]);

    // Smooth Hue Transition
    const currentHueRef = useRef<number>(0);
    const initializedRef = useRef<boolean>(false);

    const backgroundStyle = useMemo(() => {
        const physics = loopRef.current?.physicsWorld as any as StackPhysics;
        const startH = physics?.startHue || 0;

        // Target Hue: accumulation of 5 degrees per score. 
        // We use absolute value to avoid modulo wrapping issues during interpolation.
        const targetH = startH + score * 5;

        // Initialize on first valid physics access
        if (!initializedRef.current && physics) {
            currentHueRef.current = targetH;
            initializedRef.current = true;
        }

        // Linear Interpolation (Lerp) for smooth transition
        // Since this runs every frame (due to time dependency), it creates an animation
        if (initializedRef.current) {
            currentHueRef.current += (targetH - currentHueRef.current) * 0.05;
        }

        const h = currentHueRef.current % 360;

        // Amplitude 25 (Range 50)
        const deltaL = 25 * Math.cos((2 * Math.PI * time) / 60);
        const topL = Math.max(0, Math.min(100, 55 + deltaL)); // 30 ~ 80
        const bottomL = Math.max(0, Math.min(100, 45 + deltaL)); // 20 ~ 70

        return {
            background: `linear-gradient(to bottom, hsl(${h}, 70%, ${topL}%) 0%, hsl(${h}, 70%, ${bottomL}%) 100%)`,
            transition: 'none'
        };
    }, [score, time]);

    return (
        <View
            className="relative w-full h-full flex flex-col items-center overflow-hidden"
            style={backgroundStyle}
            onTouchStart={handleTap}
        >
            {process.env.TARO_ENV === 'h5' ? (
                <canvas
                    id="stack-canvas"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
            ) : (
                <Canvas
                    type="webgl"
                    id="stack-canvas"
                    style={{ width: '100%', height: '100%' }}
                />
            )}

            {/* UI Overlay */}
            <View
                className={`absolute left-0 w-full flex flex-col items-center pointer-events-none transition-all duration-[1500ms] cubic-bezier(0.23, 1, 0.32, 1) ${showFinalScore ? 'top-1/2 -translate-y-1/2' : 'top-24'}`}
            >
                <View className="relative w-full flex flex-col items-center">
                    {/* Title: Position absolute to prevent layout shift of score */}
                    <View className="flex flex-col items-center">
                        <Text
                            className={`text-white font-thin tracking-tighter transition-all duration-[1500ms] ${showFinalScore ? 'text-[12rem]' : 'text-9xl'}`}
                            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                        >{score}</Text>
                    </View>
                </View>
            </View>

            {gameOver && !showFinalScore && (
                <View className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />
            )}

            <LoadingStartHint
                isSceneReady={isSceneReady}
                visible={!gameOver && gameState === GameState.IDLE}
            />

            <DebugOverlay loop={loopRef.current} />
        </View>
    );
};

export default StackGame;
