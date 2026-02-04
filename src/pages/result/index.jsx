import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

export default function Result() {
    return (
        <View className="min-h-screen bg-white p-6 flex flex-col items-center pt-20 box-border">
            <Text className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-600 mb-2">CHALLENGE SUCCESS</Text>

            <View className="relative mb-10 text-center">
                <View className="flex items-center justify-center gap-1">
                    <Text className="text-7xl font-black text-emerald-600 tracking-tighter">+20</Text>
                    <Text className="text-2xl mt-4 font-bold text-emerald-600">PTS</Text>
                </View>
                <View className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2">
                    🎉 新纪录奖励
                </View>
            </View>

            <View className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-auto">
                <View className="flex items-center justify-between mb-2">
                    <View>
                        <Text className="text-[10px] font-bold text-slate-400 uppercase block mb-1">本次得分</Text>
                        <Text className="text-3xl font-black text-slate-900">85</Text>
                    </View>
                    <View className="text-right">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase block mb-1">历史最高</Text>
                        <Text className="text-3xl font-black text-slate-400">70</Text>
                    </View>
                </View>
                {/* Progress Bar Mock */}
                <View className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <View className="h-full bg-slate-400 w-[82%]"></View>
                    <View className="h-full bg-emerald-500 w-[18%]"></View>
                </View>
            </View>

            <View className="w-full space-y-3 mb-6">
                <View
                    className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm flex items-center justify-center gap-2 active:bg-slate-50"
                    onClick={() => Taro.reLaunch({ url: '/pages/game/index' })}
                >
                    <Text>再玩一次</Text>
                </View>
                <View
                    className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white text-sm font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    onClick={() => Taro.reLaunch({ url: '/pages/earn/index' })}
                >
                    <Text>换个运气</Text>
                </View>
            </View>
        </View>
    )
}
