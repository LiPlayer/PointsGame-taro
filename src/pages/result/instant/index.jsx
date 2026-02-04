import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getUserData, updatePoints } from '../../../utils/user'

const SVG_CLOSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"
const SVG_GIFT_GOLD = "data:image/svg+xml,%3Csvg%20fill%3D%22%23f59e0b%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%202l2.4%207.2h7.6l-6%204.8%202.4%207.2-6-4.8-6%204.8%202.4-7.2-6-4.8h7.6z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
const SVG_NEXT = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M13%205l7%207-7%207M5%205l7%207-7%207%22%2F%3E%3C%2Fsvg%3E"

export default function InstantResult() {
    const [points, setPoints] = useState(0)
    const winPoints = 10 // Mock fixed win points for instant win

    useDidShow(() => {
        const data = getUserData()
        if (data) {
            setPoints(data.points)
            // Update points only once
            updatePoints(winPoints)
            setPoints(data.points + winPoints)
        }
    })

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/index/index' })
    }

    const handleNextChallenge = () => {
        Taro.redirectTo({ url: '/pages/earn/index?autoStart=true' })
    }

    return (
        <View className="flex flex-col h-screen box-border p-6 pt-10 bg-white">
            <View className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 text-slate-400 z-10 flex items-center justify-center active:bg-slate-200" onClick={goHome}>
                <Image src={SVG_CLOSE} className="w-5 h-5 text-slate-400" />
            </View>

            <View className="flex-1 flex flex-col items-center justify-center pt-10">
                <View className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-amber-100">
                    <Image
                        src={SVG_GIFT_GOLD}
                        className="w-16 h-16"
                    />
                </View>

                <View className="text-center mb-10">
                    <Text className="text-sm font-bold text-emerald-600 mb-2 block uppercase tracking-widest">惊喜时刻！</Text>
                    <Text className="text-xs text-slate-400 font-bold opacity-70 mb-4 block">无需任何挑战，系统赠送</Text>

                    <View className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                        <Text>+{winPoints}</Text>
                        <Text className="text-2xl mt-4">积分</Text>
                    </View>
                </View>

                <View className="bg-rose-50 rounded-2xl p-4 w-full border border-rose-100 mb-4 flex items-center justify-between box-border">
                    <Text className="text-rose-700 font-bold text-sm">当前总积分</Text>
                    <Text className="text-rose-700 font-black text-xl tracking-tight">{(points + winPoints).toLocaleString()}</Text>
                </View>
            </View>

            <View className="mt-auto space-y-3 mb-6">
                <Button
                    className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white shadow-lg text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition-transform border-none outline-none"
                    onClick={handleNextChallenge}
                >
                    <Image src={SVG_NEXT} className="w-5 h-5 text-white" />
                    <Text>换个挑战</Text>
                </Button>
            </View>
        </View>
    )
}
