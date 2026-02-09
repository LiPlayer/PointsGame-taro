import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Canvas, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ThreeGameLoop } from './game';
import { SoundManager } from '../../../engine/SoundManager';
import { StackPhysics } from './logic/StackPhysics';

const StackGame = () => {
    const loopRef = useRef<ThreeGameLoop | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [ready, setReady] = useState(false);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [gameOver, setGameOver] = useState(false);

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

        if (result.gameOver) {
            console.log('[StackGame] Game Over detected. Score:', physics.score);
            setGameOver(true);
            setTimeout(() => {
                Taro.redirectTo({ url: `/pages/result-earn/index?score=${physics.score}&id=stack` });
            }, 1500);
        } else if (result.perfect) {
            console.log('[StackGame] Perfect placement! Combo:', physics.combo);
            // Trigger haptic if in WeApp
            if (process.env.TARO_ENV === 'weapp') {
                Taro.vibrateShort({ type: 'light' });
            }
        }
    }, []);

    return (
        <View
            className="relative w-full h-full bg-slate-50 flex flex-col items-center overflow-hidden"
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
            <View className="absolute top-20 left-0 w-full flex flex-col items-center pointer-events-none">
                <Text className="text-slate-900 text-7xl font-black opacity-10 leading-none">STACK</Text>
                <View className="mt-4 flex flex-col items-center">
                    <Text className="text-slate-900 text-8xl font-black tracking-tighter">{score}</Text>
                    {combo > 2 && (
                        <View className="bg-rose-500 px-3 py-1 rounded-full mt-2 animate-bounce">
                            <Text className="text-white text-xs font-bold uppercase tracking-widest">{combo} COMBO</Text>
                        </View>
                    )}
                </View>
            </View>

            {gameOver && (
                <View className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center transition-opacity duration-1000">
                    <View className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center border border-slate-100">
                        <Text className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Game Over</Text>
                        <Text className="text-slate-900 text-6xl font-black mb-6">{score}</Text>
                        <View className="w-12 h-1 border-b-4 border-rose-500 rounded-full"></View>
                    </View>
                </View>
            )}

            {!gameOver && (
                <View className="absolute bottom-12 w-full text-center pointer-events-none">
                    <Text className="text-slate-300 text-xs font-bold uppercase tracking-[0.3em]">Tap to stack precisely</Text>
                </View>
            )}
        </View>
    );
};

export default StackGame;
