import React, { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import './index.scss'

interface PointsCardProps {
    className?: string
    points?: number
    dailyPlayCount?: number
    isActive?: boolean
}

const PointsCard: React.FC<PointsCardProps> = ({
    className = '',
    points: initialPoints = 0,
    dailyPlayCount = 0,
    isActive = true
}) => {
    // UI State
    const [points, setPoints] = useState(initialPoints)

    // Sync Props to UI
    useEffect(() => {
        setPoints(Math.floor(initialPoints))
    }, [initialPoints])

    return (
        <View
            className={`points-card bg-white rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden mt-4 ${className}`}
        >
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

            </View>
        </View>
    )
}

export default React.memo(PointsCard)
