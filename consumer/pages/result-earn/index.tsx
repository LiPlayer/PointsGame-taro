import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, FC } from 'react'

import BtnPrimary from '../../components/BtnPrimary'
import LabelCaps from '../../components/LabelCaps'
import NavClose from '../../components/NavClose'
import { getUserData, updatePoints } from '@shared/utils/user'
import { getWeappContentPaddingTopPx, isWeapp } from '@shared/utils/weappLayout'

const SVG_REPLAY = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4%204v5h.582m15.356%202A8.001%208.001%200%20004.582%209m0%200H9m11%2011v-5h-.581m0%200a8.003%208.003%200%2001-15.357-2m15.357%202H15%22%2F%3E%3C%2Fsvg%3E"
const SVG_NEXT = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M13%205l7%207-7%207M5%205l7%207-7%207%22%2F%3E%3C%2Fsvg%3E"

const ResultEarn: FC = () => {
    const router = Taro.useRouter()
    const currentScore = parseInt(router.params.score || '0')
    const contentPaddingTop = isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50

    const [points, setPoints] = useState(0)
    const [bestScore, setBestScore] = useState(70)
    const [isNewRecord, setIsNewRecord] = useState(false)
    const [recordDelta, setRecordDelta] = useState(0)

    useDidShow(() => {
        const data = getUserData()
        if (data) {
            setPoints(data.points)
            if (currentScore > 0) {
                const updatedPoints = data.points + currentScore
                updatePoints(currentScore)
                setPoints(updatedPoints)
                const prevBest = bestScore
                if (currentScore > prevBest) {
                    setIsNewRecord(true)
                    setRecordDelta(currentScore - prevBest)
                    setBestScore(currentScore)
                } else {
                    setIsNewRecord(false)
                    setRecordDelta(0)
                }
            }
        }
    })

    const goHome = () => {
        const pages = Taro.getCurrentPages()
        if (pages.length > 1) {
            Taro.navigateBack()
        } else {
            Taro.reLaunch({ url: '/pages/home/index' })
        }
    }

    const handleAgain = () => {
        const id = router.params.id
        if (id === 'stack') {
            Taro.redirectTo({ url: '/packages/games/Stack/index' })
        } else {
            Taro.redirectTo({ url: '/pages/game/index' })
        }
    }

    const handleNextChallenge = () => {
        Taro.redirectTo({ url: '/pages/earn-entry/index?autoStart=true' })
    }

    return (
        <View className="flex flex-col h-screen bg-white relative overflow-hidden">
            <NavClose onClick={goHome} />

            <View
                className={`flex-1 flex flex-col px-6 pb-[calc(24px+env(safe-area-inset-bottom))] box-border ${isWeapp() ? '' : 'pt-[50px]'}`}
                style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
            >
                <View className="flex-1 flex flex-col items-center justify-center pt-10">
                    <LabelCaps className="mb-2 text-emerald-600">挑战成功</LabelCaps>

                    <View className="relative mb-10 text-center">
                        <View className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                            <Text>+{currentScore}</Text>
                            <Text className="text-2xl mt-4">积分</Text>
                        </View>
                        {isNewRecord && (
                            <View className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2">
                                🎉 新纪录奖励
                            </View>
                        )}
                    </View>

                    <View className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8 box-border">
                        <View className="flex items-center justify-between mb-2">
                            <View className="text-left">
                                <Text className="text-[10px] font-bold text-slate-400 uppercase block mb-1">本次得分</Text>
                                <Text className="text-3xl font-black text-slate-900">{currentScore}</Text>
                            </View>
                            <View className="text-right">
                                <Text className="text-[10px] font-bold text-slate-400 uppercase block mb-1">历史最高</Text>
                                <Text className="text-3xl font-black text-slate-400">{bestScore}</Text>
                            </View>
                        </View>
                        <View className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                            <View className="h-full bg-slate-400 w-[70%]"></View>
                            <View className="h-full bg-emerald-500 w-[30%]"></View>
                        </View>
                        <View className="flex justify-between mt-1">
                            <Text className="text-[10px] text-slate-400">打破纪录</Text>
                            <Text className={`text-[10px] font-bold ${isNewRecord ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isNewRecord ? `+${recordDelta} (突破)` : '稳步提升'}
                            </Text>
                        </View>
                    </View>

                    <View className="bg-rose-50 rounded-2xl p-4 w-full border border-rose-100 mb-4 flex items-center justify-between box-border">
                        <Text className="text-rose-700 font-bold text-sm">当前总积分</Text>
                        <Text className="text-rose-700 font-black text-xl tracking-tight">{Math.floor(points).toLocaleString()}</Text>
                    </View>
                </View>

                <View className="mt-auto space-y-3 mb-6">
                    <View
                        className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition"
                        onClick={handleAgain}
                    >
                        <Image src={SVG_REPLAY} className="w-5 h-5" />
                        <Text>再玩一次</Text>
                    </View>
                    <BtnPrimary className="text-sm" onClick={handleNextChallenge}>
                        <Image src={SVG_NEXT} className="w-5 h-5 text-white" />
                        <Text>换个挑战</Text>
                    </BtnPrimary>
                </View>
            </View>
        </View>
    )
}

export default ResultEarn
