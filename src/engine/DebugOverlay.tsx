import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import { GameLoop } from './GameLoop';

interface DebugOverlayProps {
    loop: GameLoop | null;
}

/**
 * DebugOverlay - 用于开发模式下的性能调试看板
 * 
 * 仅在 process.env.NODE_ENV === 'development' 时建议渲染。
 * 采取节流读取策略（1s/次），避免频繁触发 React Render 影响性能。
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({ loop }) => {
    const [fps, setFps] = useState<number>(0);

    useEffect(() => {
        if (!loop) return;

        const timer = setInterval(() => {
            setFps(loop.fps);
        }, 1000);

        return () => clearInterval(timer);
    }, [loop]);

    if (process.env.NODE_ENV !== 'development' || !loop) {
        return null;
    }

    return (
        <View
            className="fixed top-4 right-4 z-[9999] pointer-events-none px-2 py-1 rounded bg-black/50 backdrop-blur-sm border border-white/20"
        >
            <Text className="text-white text-xs font-mono font-bold">
                FPS: {fps}
            </Text>
        </View>
    );
};
