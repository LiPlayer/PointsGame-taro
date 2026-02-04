import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

const SVG_CLOSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"
const SVG_REPLAY = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4%204v5h.582m15.356%202A8.001%208.001%200%20004.582%209m0%200H9m11%2011v-5h-.581m0%200a8.003%208.003%200%2001-15.357-2m15.357%202H15%22%2F%3E%3C%2Fsvg%3E"
const SVG_BOOK = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M19%2011H5m14%200a2%202%200%20012%202v6a2%202%200%2001-2%202H5a2%202%200%2001-2-2v-6a2%202%200%20012-2m14%200V9a2%202%200%2000-2-2M5%2011V9a2%202%200%20012-2m0%200V5a2%202%200%20012-2h6a2%202%200%20012%202v2M7%207h10%22%2F%3E%3C%2Fsvg%3E"
const SVG_NEXT = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M13%205l7%207-7%207M5%205l7%207-7%207%22%2F%3E%3C%2Fsvg%3E"

export default function Result() {
    const router = Taro.useRouter()
    const isReplay = router.params.mode === 'replay'

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/index/index' })
    }

    const handleAgain = () => {
        Taro.reLaunch({ url: `/pages/game/index?mode=${isReplay ? 'replay' : 'earn'}` })
    }

    const handleNextChallenge = () => {
        if (isReplay) {
            Taro.reLaunch({ url: '/pages/collection/index' })
        } else {
            Taro.reLaunch({ url: '/pages/earn/index?autoStart=true' })
        }
    }

    return (
        <View className="flex flex-col h-screen box-border p-6 pt-10 bg-white">
            <View className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-50 text-slate-400 z-10 flex items-center justify-center active:bg-slate-100" onClick={goHome}>
                <Image src={SVG_CLOSE} className="w-5 h-5" />
            </View>

            <View className="flex-1 flex flex-col items-center justify-center pt-10">
                <Text className={`text-sm font-bold uppercase tracking-widest mb-2 ${isReplay ? 'text-slate-400' : 'text-emerald-600'}`}>
                    {isReplay ? '练习模式' : '挑战成功'}
                </Text>

                <View className="relative mb-6 text-center">
                    {isReplay ? (
                        <>
                            <View className="text-8xl font-black text-slate-900 tracking-tighter">85</View>
                            <View className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2">
                                复玩不计分
                            </View>
                        </>
                    ) : (
                        <>
                            <View className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                                <Text>+20</Text>
                                <Text className="text-2xl mt-4">积分</Text>
                            </View>
                            <View className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2 font-black">
                                🎉 新纪录奖励
                            </View>
                        </>
                    )}
                </View>

                <View className="w-full bg-slate-50 border border-slate-100 rounded-[32px] p-6 mb-4 box-border">
                    <View className="flex items-center justify-between mb-4">
                        <View className="text-left">
                            <Text className="text-sm font-bold text-slate-400 uppercase block mb-1">本次表现</Text>
                            <Text className="text-xl font-black text-slate-900">{isReplay ? '表现优异' : '85分'}</Text>
                        </View>
                        <View className="text-right">
                            <Text className="text-sm font-bold text-slate-400 uppercase block mb-1">历史最高</Text>
                            <Text className="text-xl font-black text-slate-400">70</Text>
                        </View>
                    </View>
                    {!isReplay && (
                        <View className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex mb-2">
                            <View className="h-full bg-slate-400 w-[82%]"></View>
                            <View className="h-full bg-emerald-500 w-[18%]"></View>
                        </View>
                    )}
                    <View className="flex justify-between items-center border-t border-slate-200 pt-3">
                        <Text className="text-xs text-slate-400">{isReplay ? '分差' : '打破纪录'}</Text>
                        <Text className={`text-xs font-bold ${isReplay ? 'text-emerald-600' : 'text-emerald-600'}`}>
                            +15 ({isReplay ? '练习' : '突破'})
                        </Text>
                    </View>
                </View>

                <View className={`rounded-2xl p-4 w-full border mb-4 box-border ${isReplay ? 'bg-blue-50 border-blue-100' : 'bg-rose-50 border-rose-100'}`}>
                    <Text className={`font-bold text-xs ${isReplay ? 'text-blue-700' : 'text-rose-700'}`}>
                        {isReplay ? '💡 仅作为练习记录，不影响总积分。' : '当前总积分'}
                    </Text>
                    {!isReplay && <Text className="float-right text-rose-700 font-black text-xl tracking-tight">1,260</Text>}
                </View>
            </View>

            <View className="mt-auto space-y-3 mb-6">
                <View
                    className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 active:bg-slate-50"
                    onClick={handleAgain}
                >
                    <Image src={SVG_REPLAY} className="w-5 h-5 text-slate-400" />
                    <Text>再玩一次</Text>
                </View>
                <View
                    className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white shadow-lg text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    onClick={handleNextChallenge}
                >
                    {isReplay ? (
                        <Image src={SVG_BOOK} className="w-5 h-5 text-white" />
                    ) : (
                        <Image src={SVG_NEXT} className="w-5 h-5 text-white" />
                    )}
                    <Text>{isReplay ? '返回图鉴' : '换个挑战'}</Text>
                </View>
            </View>
        </View>
    )
}
