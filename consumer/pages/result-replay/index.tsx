import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, FC } from 'react'

import LabelCaps from '../../components/LabelCaps'
import NavClose from '../../components/NavClose'
import { getUserData, updatePoints } from '@shared/utils/user'
import { getWeappContentPaddingTopPx, isWeapp } from '@shared/utils/weappLayout'

const SVG_REPLAY = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4%204v5h.582m15.356%202A8.001%208.001%200%20004.582%209m0%200H9m11%2011v-5h-.581m0%200a8.003%208.003%200%2001-15.357-2m15.357%202H15%22%2F%3E%3C%2Fsvg%3E"
const SVG_BOOK = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M19%2011H5m14%200a2%202%200%20012%202v6a2%202%200%2001-2%202H5a2%202%200%2001-2-2v-6a2%202%200%20012-2m14%200V9a2%202%200%2000-2-2M5%2011V9a2%202%200%20012-2m0%200V5a2%202%200%20012-2h6a2%202%200%20012%202v2M7%207h10%22%2F%3E%3C%2Fsvg%3E"

const ResultReplay: FC = () => {
    const router = Taro.useRouter()
    const currentScore = parseInt(router.params.score || '0')
    const [bestScore] = useState(70)

    const goHome = () => {
        const pages = Taro.getCurrentPages()
        if (pages.length > 1) {
            Taro.navigateBack()
        } else {
            Taro.reLaunch({ url: '/pages/collection/index' })
        }
    }

    const handleAgain = () => {
        Taro.redirectTo({ url: '/pages/game/index?mode=replay' })
    }

    const handleNextChallenge = () => {
        Taro.redirectTo({ url: '/pages/collection/index' })
    }

    const contentPaddingTop = isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50

    return (
        <View
            className={`flex flex-col h-screen box-border px-6 pb-[calc(24px+env(safe-area-inset-bottom))] bg-white relative ${isWeapp() ? '' : 'pt-[50px]'}`}
            style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
        >
            <NavClose onClick={goHome} />

            <View className="flex-1 flex flex-col items-center justify-center pt-10">
                <LabelCaps className="mb-2 text-slate-400">练习模式</LabelCaps>

                <View className="relative mb-6 text-center">
                    <View className="text-8xl font-black text-slate-900 tracking-tighter">{currentScore}</View>
                    <View className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2">
                        复玩不计分
                    </View>
                </View>

                <View className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8 box-border">
                    <View className="flex items-center justify-between mb-2">
                        <View className="text-left">
                            <Text className="text-[10px] font-bold text-slate-400 uppercase block mb-1">本次表现</Text>
                            <Text className="text-xl font-black text-slate-700">表现优秀</Text>
                        </View>
                        <View className="text-right">
                            <Text className="text-[10px] font-bold text-slate-400 uppercase block mb-1">历史最佳</Text>
                            <Text className="text-xl font-black text-slate-700">{bestScore}</Text>
                        </View>
                    </View>
                    <View className="flex justify-between mt-1 border-t border-slate-200 pt-2">
                        <Text className="text-[10px] text-slate-400">分差</Text>
                        <Text className="text-[10px] text-emerald-600 font-bold">+{Math.max(0, currentScore - bestScore)} (练习)</Text>
                    </View>
                </View>

                <View className="bg-blue-50 rounded-2xl p-4 w-full border border-blue-100 mb-4">
                    <Text className="text-blue-700 font-bold text-xs">💡 仅作为练习记录，不影响总积分。</Text>
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
                <View
                    className="w-full py-5 rounded-2xl bg-slate-900 text-white text-sm font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                    onClick={handleNextChallenge}
                >
                    <Image src={SVG_BOOK} className="w-5 h-5 text-white" />
                    <Text>返回图鉴</Text>
                </View>
            </View>
        </View>
    )
}

export default ResultReplay
