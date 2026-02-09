import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { StackPhysics } from './physics';
import { StackRender } from './render';
import { SoundManager } from '../../engine/SoundManager';
import { GameLoop } from '../../engine/GameLoop';

import { Resolution } from '../../engine/Resolution';

class StackGameLoop extends GameLoop {
    constructor(canvas: any, width: number, height: number, dprOrIgnore: number) {
        // dpr is ignored by base class now, but keeping signature compatible if needed, 
        // OR better: update signature to match base.
        // Actually, let's update this constructor to match base:
        super(new StackPhysics(), new StackRender(), canvas, width, height);
    }

    // ... handleTap
    public handleTap() {
        console.log('[StackGameLoop] handleTap called');
        const physics = this.physics as StackPhysics;
        if (physics.gameOver) {
            physics.reset();
            this.start();
        } else {
            physics.placeBlock();
        }
    }
}

const StackGame = () => {
    const loopRef = useRef<StackGameLoop | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        SoundManager.getInstance().unlock();

        if (!ready) {
            const timer = setTimeout(() => setReady(true), 100);
            return () => clearTimeout(timer);
        }

        const isH5 = process.env.TARO_ENV === 'h5';

        if (isH5) {
            // H5: Use direct DOM access
            const canvasEl = document.getElementById('stack-canvas') as HTMLCanvasElement;
            if (!canvasEl) {
                console.error('[StackGame] Canvas element not found');
                return;
            }
            const rect = canvasEl.getBoundingClientRect();
            // Just pass canvas and logical dimensions. GameLoop handles resizing!
            const loop = new StackGameLoop(canvasEl, rect.width, rect.height, 0);
            loopRef.current = loop;
            loop.start();
        } else {
            // WeApp: Use Taro selector
            Taro.createSelectorQuery()
                .select('#stack-canvas')
                .fields({ node: true, size: true })
                .exec((res) => {
                    if (!res || !res[0] || !res[0].node) {
                        console.error('[StackGame] Canvas node not found via SelectorQuery');
                        return;
                    }
                    const canvas = res[0].node;
                    const width = res[0].width;
                    const height = res[0].height;

                    // Pass logical width/height. GameLoop handles resizing and DPR.
                    const loop = new StackGameLoop(canvas, width, height, 0);
                    loopRef.current = loop;
                    loop.start();
                });
        }

        return () => {
            loopRef.current?.destroy();
        };
    }, [ready]);

    const handleTap = useCallback(() => {
        console.log('[StackGame] Tap detected');
        loopRef.current?.handleTap();
    }, []);

    return (
        <View
            className="relative w-full h-full bg-slate-50 rounded-3xl overflow-hidden shadow-xl"
            onTouchStart={handleTap}
            onClick={handleTap}
        >
            {process.env.TARO_ENV === 'h5' ? (
                <canvas
                    id="stack-canvas"
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
            ) : (
                <Canvas
                    type="2d"
                    id="stack-canvas"
                    style={{ width: '100%', height: '100%' }}
                />
            )}

            {/* UI Overlay */}
            <View className="absolute top-10 left-0 w-full flex items-center justify-center pointer-events-none">
                <View className="text-slate-900 text-6xl font-black opacity-10">STACK</View>
            </View>

            <View className="absolute bottom-10 w-full text-center pointer-events-none">
                <View className="text-slate-400 text-sm font-bold uppercase tracking-widest">Tap to Stack</View>
            </View>
        </View>
    );
};

export default StackGame;

