import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, FC } from 'react'

import BtnPrimary from '../../components/BtnPrimary'
import LabelCaps from '../../components/LabelCaps'
import NavClose from '../../components/NavClose'
import { getUserData, updatePoints } from '../../utils/user'
import { getWeappContentPaddingTopPx, isWeapp } from '../../utils/weappLayout'

const SVG_GIFT_GOLD = "data:image/svg+xml,%3Csvg%20fill%3D%22%23f59e0b%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%202l2.4%207.2h7.6l-6%204.8%202.4%207.2-6-4.8-6%204.8%202.4-7.2-6-4.8h7.6z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
const SVG_NEXT = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M13%205l7%207-7%207M5%205l7%207-7%207%22%2F%3E%3C%2Fsvg%3E"

const ResultInstant: FC = () => {
    const [points, setPoints] = useState(0)
    const winPoints = 10

    useDidShow(() => {
        const data = getUserData()
        if (data) {
            updatePoints(winPoints)
            setPoints(data.points + winPoints)
        }
    })

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const handleNextChallenge = () => {
        Taro.redirectTo({ url: '/pages/earn-entry/index?autoStart=true' })
    }

    const contentPaddingTop = isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50

    return (
        <View
            className={`flex flex-col h-screen box-border px-6 pb-[calc(24px+env(safe-area-inset-bottom))] bg-white relative ${isWeapp() ? '' : 'pt-[50px]'}`}
            style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
        >
            <NavClose onClick={goHome} />

            <View className="flex-1 flex flex-col items-center justify-center pt-10">
                <View className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-amber-100">
                    <Image
                        src={SVG_GIFT_GOLD}
                        className="w-16 h-16"
                    />
                </View>

                <View className="text-center mb-10">
                    <LabelCaps className="mb-2 text-emerald-600">惊喜时刻！</LabelCaps>
                    <Text className="text-[10px] text-slate-400 font-bold opacity-70 mb-4 block uppercase tracking-widest">无需任何挑战，系统赠送</Text>
                    <View className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                        <Text>+{winPoints}</Text>
                        <Text className="text-2xl mt-4">积分</Text>
                    </View>
                </View>

                <View className="bg-rose-50 rounded-2xl p-4 w-full border border-rose-100 mb-4 flex items-center justify-between box-border">
                    <Text className="text-rose-700 font-bold text-sm">当前总积分</Text>
                    <Text className="text-rose-700 font-black text-xl tracking-tight">{Math.floor(points).toLocaleString()}</Text>
                </View>
            </View>

            <View className="mt-auto space-y-3 mb-6">
                <BtnPrimary className="text-sm" onClick={handleNextChallenge}>
                    <Image src={SVG_NEXT} className="w-5 h-5 text-white" />
                    <Text>换个挑战</Text>
                </BtnPrimary>
            </View>
        </View>
    )
}

export default ResultInstant
