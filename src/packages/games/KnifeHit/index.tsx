import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Canvas, Text } from '@tarojs/components';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
import { KnifeGameLoop } from './game';
import { GameState } from './logic/KnifePhysics';

const KnifeHitGame = () => {
    const loopRef = useRef<KnifeGameLoop | null>(null);
    const [isSceneReady, setIsSceneReady] = useState(false);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [bestScore, setBestScore] = useState(0);

    useEffect(() => {
        Taro.getStorage({ key: 'knife_best_score' }).then(res => {
            if (res.data) setBestScore(parseInt(res.data, 10));
        }).catch(() => { });

        const setup = (canvas: any, width: number, height: number) => {
            const dpr = Taro.getSystemInfoSync().pixelRatio;
            const loop = new KnifeGameLoop(canvas, width, height, dpr);
            loop.onFirstFrameRendered = () => setIsSceneReady(true);
            loopRef.current = loop;
            loop.start();
        };

        if (process.env.TARO_ENV === 'h5') {
            const canvasEl = document.getElementById('knife-canvas') as HTMLCanvasElement;
            if (canvasEl) {
                const rect = canvasEl.getBoundingClientRect();
                setup(canvasEl, rect.width, rect.height);
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

        return () => loopRef.current?.destroy();
    }, []);

    useDidShow(() => loopRef.current?.resume());
    useDidHide(() => loopRef.current?.pause());

    const handleTap = useCallback(() => {
        if (!loopRef.current) return;
        loopRef.current.handleTap();
        setScore(loopRef.current.physics.score);
        if (loopRef.current.physics.state === GameState.GAMEOVER) {
            setGameOver(true);
        }
    }, []);

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
                <Text className="text-white/60 text-sm font-light">BEST: {bestScore}</Text>
                <Text className="text-white text-8xl font-thin mt-4">{score}</Text>
            </View>

            {!isSceneReady && (
                <View className="absolute inset-0 flex items-center justify-center bg-[#D2A679]">
                    <Text className="text-white font-bold animate-pulse">正在加载</Text>
                </View>
            )}
        </View>
    );
};

export default KnifeHitGame;
