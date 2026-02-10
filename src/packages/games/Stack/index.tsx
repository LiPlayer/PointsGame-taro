import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Canvas, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ThreeGameLoop } from './game';
import { SoundManager } from '../../../engine/SoundManager';
import { StackPhysics } from './logic/StackPhysics';
import { StackAudio } from './view/StackAudio';

const StackGame = () => {
    const loopRef = useRef<ThreeGameLoop | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [ready, setReady] = useState(false);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [bgColor, setBgColor] = useState<number>(0xf25367); // Initial color (Rose Red)
    const [gameOver, setGameOver] = useState(false);
    const [deathFlash, setDeathFlash] = useState(false);
    const [bestScore, setBestScore] = useState(0);
    const [time, setTime] = useState(0);

    // Background Breathing Cycle (60s)
    useEffect(() => {
        let startTime = Date.now();
        let frameId: number;

        const update = () => {
            setTime((Date.now() - startTime) / 1000);
            frameId = requestAnimationFrame(update);
        };

        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, []);

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
            console.log('[StackGame] Setting up ThreeGameLoop on canvas');
            const loop = new ThreeGameLoop(canvas, width, height);
            loopRef.current = loop;
            loop.start();
        };

        if (process.env.TARO_ENV === 'h5') {
            const canvasEl = document.getElementById('stack-canvas') as HTMLCanvasElement;
            if (canvasEl) {
                console.log('[StackGame] H5 Canvas detected');
                const rect = canvasEl.getBoundingClientRect();
                setup(canvasEl, rect.width, rect.height);
            }
        } else {
            console.log('[StackGame] WeApp Canvas selecting...');
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

        const result = loopRef.current.handleTap();
        const physics = (loopRef.current as any).physics as StackPhysics;

        setScore(physics.score);
        setCombo(physics.combo);
        setBgColor(result.currentColor);

        if (result.gameOver) {
            console.log('[StackGame] Game Over detected. Score:', physics.score);
            StackAudio.playGameOver();

            // Death Flash effect
            setDeathFlash(true);
            setTimeout(() => setDeathFlash(false), 200);

            // Screen Shake
            loopRef.current.triggerScreenShake();

            // Heavy haptic
            if (process.env.TARO_ENV === 'weapp') {
                Taro.vibrateLong();
            }

            // Update Best Score
            if (physics.score > bestScore) {
                setBestScore(physics.score);
                Taro.setStorage({ key: 'stack_best_score', data: physics.score.toString() });
            }

            setGameOver(true);
            setTimeout(() => {
                Taro.redirectTo({ url: `/pages/result-earn/index?score=${physics.score}&id=stack` });
            }, 1500);
        } else if (result.perfect) {
            console.log('[StackGame] Perfect placement! Combo:', physics.combo);
            StackAudio.playPerfect(physics.combo);

            // Trigger Perfect Ripple VFX
            loopRef.current.triggerPerfectRipple();
            // loopRef.current.triggerPerfectFlash(physics.combo); // Removed

            // Trigger haptic if in WeApp
            if (process.env.TARO_ENV === 'weapp') {
                Taro.vibrateShort({ type: 'light' });
            }
        } else {
            // Ordinary placement gets a "Tick" sound + Slice sound
            StackAudio.playTick();
            StackAudio.playSlice();
        }
    }, [bestScore]);

    const backgroundStyle = useMemo(() => {
        const physics = loopRef.current?.physicsWorld as any as StackPhysics;
        const startH = physics?.startHue || 0;
        const h = (score * 5 + startH) % 360; // Sync with Physics (Hue shift = 5)
        // Amplitude 30 (Range 60)
        const deltaL = 30 * Math.cos((2 * Math.PI * time) / 60);
        const topL = Math.max(0, Math.min(100, 50 + deltaL)); // 20 ~ 80
        const bottomL = Math.max(0, Math.min(100, 40 + deltaL)); // 10 ~ 70

        return {
            background: `linear-gradient(to bottom, hsl(${h}, 30%, ${topL}%) 0%, hsl(${h}, 30%, ${bottomL}%) 100%)`,
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

            {/* Death Flash Overlay */}
            {deathFlash && (
                <View className="absolute inset-0 bg-white z-50 transition-opacity duration-200 opacity-100" />
            )}

            {/* UI Overlay */}
            <View className="absolute top-24 left-0 w-full flex flex-col items-center pointer-events-none">
                {score === 0 && !gameOver && (
                    <Text className="text-white text-7xl font-black opacity-10 leading-none tracking-widest mb-6">极致层叠</Text>
                )}
                <View className="flex flex-col items-center">
                    <Text
                        className="text-white text-9xl font-thin tracking-tighter"
                        style={{ textShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    >{score}</Text>
                </View>
            </View>

            {gameOver && (
                <View className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center transition-opacity duration-1000">
                    <View className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center border border-slate-100">
                        <Text className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">游戏结束</Text>
                        <Text className="text-slate-900 text-6xl font-black mb-6">{score}</Text>
                        <View className="w-12 h-1 border-b-4 border-rose-500 rounded-full"></View>
                    </View>
                </View>
            )}

            {!gameOver && score === 0 && (
                <View className="absolute bottom-32 w-full text-center pointer-events-none animate-pulse">
                    <Text className="text-white text-xl font-bold tracking-[0.2em] shadow-sm">点击开始</Text>
                </View>
            )}

        </View>
    );
};

export default StackGame;
