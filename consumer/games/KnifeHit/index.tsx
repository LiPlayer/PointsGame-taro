import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Canvas, Text, Image } from '@tarojs/components';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
import { KnifeGameLoop } from './game';

const SVG_KNIFE_READY = "data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2224%22%20viewBox%3D%220%200%2012%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%202L10%2010H2L6%202Z%22%20fill%3D%22%23FF4444%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%2210%22%20width%3D%224%22%20height%3D%2212%22%20fill%3D%22%23FF4444%22%2F%3E%3C%2Fsvg%3E";
const SVG_KNIFE_USED = "data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2224%22%20viewBox%3D%220%200%2012%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%202L10%2010H2L6%202Z%22%20fill%3D%22%2300000033%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%2210%22%20width%3D%224%22%20height%3D%2212%22%20fill%3D%22%2300000033%22%2F%3E%3C%2Fsvg%3E";

const KnifeHitGame = () => {
    const loopRef = useRef<KnifeGameLoop | null>(null);
    const [isSceneReady, setIsSceneReady] = useState(false);
    const [score, setScore] = useState(0);
    const [knivesRemaining, setKnivesRemaining] = useState(7);
    const [gameOver, setGameOver] = useState(false);
    const [bestScore, setBestScore] = useState(0);

    useEffect(() => {
        Taro.getStorage({ key: 'knife_best_score' }).then(res => {
            if (res.data) setBestScore(parseInt(res.data, 10));
        }).catch(() => { });

        const setup = (canvas: any, width: number, height: number) => {
            const loop = new KnifeGameLoop(canvas, width, height);

            loop.physics.onScoreUpdate = (s) => {
                setScore(s);
                if (s > bestScore) {
                    setBestScore(s);
                    Taro.setStorage({ key: 'knife_best_score', data: s.toString() });
                }
            };
            loop.physics.onFail = () => setGameOver(true);
            loop.physics.onKnivesCountUpdate = (c) => setKnivesRemaining(c);

            loop.onFirstFrameRendered = () => setIsSceneReady(true);
            loopRef.current = loop;
            loop.start();
        };

        const startSetup = () => {
            if (process.env.TARO_ENV === 'h5') {
                const canvasEl = document.getElementById('knife-canvas') as HTMLCanvasElement;
                if (canvasEl) {
                    const rect = canvasEl.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        setup(canvasEl, rect.width, rect.height);
                    } else {
                        setTimeout(startSetup, 100);
                    }
                }
            } else {
                Taro.createSelectorQuery()
                    .select('#knife-canvas')
                    .fields({ node: true, size: true })
                    .exec((res) => {
                        if (res?.[0]?.node) {
                            setup(res[0].node, res[0].width, res[0].height);
                        }
                    });
            }
        };

        setTimeout(startSetup, 50);

        const handleResize = () => {
            if (process.env.TARO_ENV === 'h5' && loopRef.current) {
                const canvasEl = document.getElementById('knife-canvas') as HTMLCanvasElement;
                if (canvasEl) {
                    const rect = canvasEl.getBoundingClientRect();
                    loopRef.current.resize(rect.width, rect.height);
                }
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            loopRef.current?.destroy();
        };
    }, [bestScore]);

    useDidShow(() => loopRef.current?.resume());
    useDidHide(() => loopRef.current?.pause());

    const handleTap = useCallback(() => {
        if (!loopRef.current || gameOver) return;
        loopRef.current.handleTap();
    }, [gameOver]);

    return (
        <View
            className="relative w-full h-full flex flex-col items-center overflow-hidden bg-[#D2A679]"
            onTouchStart={handleTap}
        >
            {process.env.TARO_ENV === 'h5' ? (
                <canvas id="knife-canvas" style={{ width: '100%', height: '100%' }} />
            ) : (
                <Canvas type="webgl" id="knife-canvas" style={{ width: '100%', height: '100%' }} />
            )}

            {/* UI Overlay */}
            <View className="absolute top-12 w-full flex flex-col items-center pointer-events-none">
                <Text className="text-white text-8xl font-thin mt-12">{score}</Text>
            </View>

            {/* Knives UI */}
            <View className="absolute bottom-10 left-6 flex flex-col gap-2 pointer-events-none">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Image
                        key={i}
                        src={i < knivesRemaining ? SVG_KNIFE_READY : SVG_KNIFE_USED}
                        className="w-2 h-4 transition-all duration-300"
                        style={{ opacity: i < knivesRemaining ? 1 : 0.3 }}
                    />
                ))}
            </View>

            {gameOver && (
                <View className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-50">
                    <Text className="text-white text-4xl font-bold mb-8">游戏结束</Text>
                    <View
                        className="px-8 py-3 bg-white text-[#D2A679] rounded-full font-bold active:scale-95 transition-transform"
                        onClick={() => {
                            setGameOver(false);
                            setScore(0);
                            setKnivesRemaining(7);
                            loopRef.current?.physics.reset();
                        }}
                    >
                        再来一局
                    </View>
                </View>
            )}

            {!isSceneReady && (
                <View className="absolute inset-0 flex items-center justify-center bg-[#D2A679]">
                    <Text className="text-white font-bold animate-pulse">正在加载</Text>
                </View>
            )}
        </View>
    );
};

export default KnifeHitGame;
