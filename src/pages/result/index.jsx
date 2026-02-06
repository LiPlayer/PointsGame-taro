import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getUserData, updatePoints } from '../../utils/user'

const SVG_CLOSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"
const SVG_REPLAY = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4%204v5h.582m15.356%202A8.001%208.001%200%20004.582%209m0%200H9m11%2011v-5h-.581m0%200a8.003%208.003%200%2001-15.357-2m15.357%202H15%22%2F%3E%3C%2Fsvg%3E"
const SVG_BOOK = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M19%2011H5m14%200a2%202%200%20012%202v6a2%202%200%2001-2%202H5a2%202%200%2001-2-2v-6a2%202%200%20012-2m14%200V9a2%202%200%2000-2-2M5%2011V9a2%202%200%20012-2m0%200V5a2%202%200%20012-2h6a2%202%200%20012%202v2M7%207h10%22%2F%3E%3C%2Fsvg%3E"
const SVG_NEXT = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M13%205l7%207-7%207M5%205l7%207-7%207%22%2F%3E%3C%2Fsvg%3E"
const SVG_GIFT_GOLD = "data:image/svg+xml,%3Csvg%20fill%3D%22%23f59e0b%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%202l2.4%207.2h7.6l-6%204.8%202.4%207.2-6-4.8-6%204.8%202.4-7.2-6-4.8h7.6z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"

export default function Result() {
    const router = Taro.useRouter()
    const isReplay = router.params.mode === 'replay'
    const isInstant = router.params.instant === 'true'
    const currentScore = parseInt(router.params.score || '0')
    const winPoints = 10 // Fixed points for instant win

    const [points, setPoints] = useState(0)
    const [bestScore, setBestScore] = useState(70) // Mock best score
    const [isNewRecord, setIsNewRecord] = useState(false)

    useDidShow(() => {
        const data = getUserData()
        if (data) {
            setPoints(data.points)
            // In earn mode, update points
            if (isInstant) {
                const updatedPoints = data.points + winPoints
                updatePoints(winPoints)
                setPoints(updatedPoints)
            } else if (!isReplay && currentScore > 0) {
                const updatedPoints = data.points + currentScore
                updatePoints(currentScore)
                setPoints(updatedPoints)
                if (currentScore > bestScore) {
                    setIsNewRecord(true)
                    setBestScore(currentScore)
                }
            }
        }
    })

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/index/index' })
    }

    const handleAgain = () => {
        Taro.redirectTo({ url: `/pages/game/index?mode=${isReplay ? 'replay' : 'earn'}` })
    }

    const handleNextChallenge = () => {
        if (isReplay) {
            Taro.redirectTo({ url: '/pages/collection/index' })
        } else {
            Taro.redirectTo({ url: '/pages/earn/index?autoStart=true' })
        }
    }

    return (
        <View className="flex flex-col h-screen box-border px-6 pt-[50px] pb-[calc(24px+env(safe-area-inset-bottom))] bg-white">
            <View className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 text-slate-400 z-10 flex items-center justify-center active:bg-slate-200" onClick={goHome}>
                <Image src={SVG_CLOSE} className="w-5 h-5" />
            </View>

            {isInstant ? (
                /* Instant Win Layout */
                <View className="flex-1 flex flex-col items-center justify-center pt-10">
                    <View className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-amber-100">
                        <Image src={SVG_GIFT_GOLD} className="w-16 h-16" />
                    </View>

                    <View className="text-center mb-10">
                        <Text className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-emerald-600 mb-2 block">惊喜时刻！</Text>
                        <Text className="text-[10px] text-slate-400 font-bold opacity-70 mb-4 block uppercase tracking-widest">无需任何挑战，系统赠送</Text>
                        <View className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                            <Text>+{winPoints}</Text>
                            <Text className="text-2xl mt-4">积分</Text>
                        </View>
                    </View>

                    <View className="bg-rose-50 rounded-2xl p-4 w-full border border-rose-100 mb-4 flex items-center justify-between box-border">
                        <Text className="text-rose-700 font-bold text-sm">当前总积分</Text>
                        <Text className="text-rose-700 font-black text-xl tracking-tight">{(points).toLocaleString()}</Text>
                    </View>
                </View>
            ) : (
                /* Standard Game Result Layout */
                <View className="flex-1 flex flex-col items-center justify-center pt-10">
                    <Text className={`text-[10px] font-extrabold uppercase tracking-[0.1em] mb-2 ${isReplay ? 'text-slate-400' : 'text-emerald-600'}`}>
                        {isReplay ? '练习模式' : '挑战成功'}
                    </Text>

                    <View className="relative mb-6 text-center">
                        {isReplay ? (
                            <>
                                <View className="text-8xl font-black text-slate-900 tracking-tighter">{currentScore}</View>
                                <View className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2">
                                    复玩不计分
                                </View>
                            </>
                        ) : (
                            <>
                                <View className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                                    <Text>+{currentScore}</Text>
                                    <Text className="text-2xl mt-4">积分</Text>
                                </View>
                                {isNewRecord && (
                                    <View className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2 font-black">
                                        🎉 新纪录奖励
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    <View className="w-full bg-slate-50 border border-slate-100 rounded-[32px] p-6 mb-4 box-border">
                        <View className="flex items-center justify-between mb-4">
                            <View className="text-left">
                                <Text className="text-sm font-bold text-slate-400 uppercase block mb-1">本次表现</Text>
                                <Text className="text-xl font-black text-slate-900">{currentScore}分</Text>
                            </View>
                            <View className="text-right">
                                <Text className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-slate-400 block mb-1">历史最高</Text>
                                <Text className="text-xl font-black text-slate-400">{bestScore}</Text>
                            </View>
                        </View>
                        {!isReplay && (
                            <View className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex mb-2">
                                <View className="h-full bg-slate-400 w-[70%]"></View>
                                <View className="h-full bg-emerald-500 w-[30%]"></View>
                            </View>
                        )}
                        <View className="flex justify-between items-center border-t border-slate-200 pt-3">
                            <Text className="text-[10px] text-slate-400 uppercase tracking-widest">打破纪录</Text>
                            <Text className={`text-[10px] font-bold uppercase tracking-widest ${isNewRecord ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isNewRecord ? `+${currentScore - 70} (突破)` : '稳步提升'}
                            </Text>
                        </View>
                    </View>

                    <View className={`rounded-2xl p-4 w-full border mb-4 box-border ${isReplay ? 'bg-blue-50 border-blue-100' : 'bg-rose-50 border-rose-100'}`}>
                        <Text className={`font-bold text-xs ${isReplay ? 'text-blue-700' : 'text-rose-700'}`}>
                            {isReplay ? '💡 仅作为练习记录，不影响总积分。' : '当前总积分'}
                        </Text>
                        {!isReplay && <Text className="float-right text-rose-700 font-black text-xl tracking-tight">{points.toLocaleString()}</Text>}
                    </View>
                </View>
            )}

            <View className="mt-auto space-y-3 mb-6">
                {!isInstant && (
                    <Button
                        className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 active:bg-slate-50 border-none outline-none"
                        onClick={handleAgain}
                    >
                        <Image src={SVG_REPLAY} className="w-5 h-5 text-slate-400" />
                        <Text>再玩一次</Text>
                    </Button>
                )}
                <Button
                    className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white shadow-lg text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition-transform border-none outline-none"
                    onClick={handleNextChallenge}
                >
                    <Image src={isReplay ? SVG_BOOK : SVG_NEXT} className="w-5 h-5 text-white" />
                    <Text>{isReplay ? '返回图鉴' : '换个挑战'}</Text>
                </Button>
            </View>
        </View>
    )
}
