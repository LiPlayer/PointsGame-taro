import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC } from 'react'

import NavClose from '../../components/NavClose'

const SVG_GAME_1 = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M14.828%2014.828a4%204%200%2001-5.656%200M9%2010h.01M15%2010h.01M21%2012a9%209%200%2011-18%200%209%209%200%200118%200z%22%2F%3E%3C%2Fsvg%3E"
const SVG_GAME_2 = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M19%2011H5m14%200a2%202%200%20012%202v6a2%202%200%2001-2%202H5a2%202%200%2001-2-2v-6a2%202%200%20012-2m14%200V9a2%202%200%2000-2-2M5%2011V9a2%202%200%20012-2m0%200V5a2%202%200%20012-2h6a2%202%200%20012%202v2M7%207h10%22%2F%3E%3C%2Fsvg%3E"
const SVG_GAME_LOCKED = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%2015v2m-6%204h12a2%202%200%20002-2v-6a2%202%200%2000-2-2H6a2%202%200%2000-2%202v6a2%202%200%20002%202zm10-10V7a4%204%200%2000-8%200v4h8z%22%2F%3E%3C%2Fsvg%3E"
const SVG_REPLAY = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%223%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M14.752%2011.168l-3.197-2.132A1%201%200%200010%209.87v4.263a1%201%200%20001.555.832l3.197-2.132a1%201%200%20000-1.664z%22%20%2F%3E%3C%2Fsvg%3E"

const Collection: FC = () => {
    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const handleReplay = (gameId: number) => {
        Taro.reLaunch({ url: `/pages/game/index?mode=replay&gameId=${gameId}` })
    }

    return (
        <View className="flex flex-col h-screen box-border px-6 pt-[50px] pb-[calc(16px+env(safe-area-inset-bottom))] bg-white">
            <View className="flex items-center gap-4 mb-8">
                <NavClose className="!relative !top-0 !left-0 !bg-slate-50" onClick={goHome} />
                <Text className="text-xl font-black text-slate-900">已收集的游戏</Text>
            </View>

            <View className="flex-1 overflow-y-auto space-y-4 pr-1">
                <View className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                    <View className="flex items-center gap-4">
                        <View className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                            <Image src={SVG_GAME_1} className="w-7 h-7 text-rose-600" />
                        </View>
                        <View>
                            <Text className="font-black text-slate-900 block">疯狂炒鸡</Text>
                            <Text className="text-[10px] font-bold text-slate-400">已玩 12 次</Text>
                        </View>
                    </View>
                    <View
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition"
                        onClick={() => handleReplay(1)}
                    >
                        <Image src={SVG_REPLAY} className="w-3 h-3 text-white" />
                        <Text>复玩</Text>
                    </View>
                </View>

                <View className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                    <View className="flex items-center gap-4">
                        <View className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Image src={SVG_GAME_2} className="w-7 h-7 text-amber-600" />
                        </View>
                        <View>
                            <Text className="font-black text-slate-900 block">砂锅围筵子</Text>
                            <Text className="text-[10px] font-bold text-slate-400">已玩 3 次</Text>
                        </View>
                    </View>
                    <View
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition"
                        onClick={() => handleReplay(2)}
                    >
                        <Image src={SVG_REPLAY} className="w-3 h-3 text-white" />
                        <Text>复玩</Text>
                    </View>
                </View>

                <View className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 flex items-center gap-4 opacity-60 grayscale">
                    <View className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                        <Image src={SVG_GAME_LOCKED} className="w-6 h-6 text-slate-400" />
                    </View>
                    <Text className="font-bold text-slate-400 text-sm">???</Text>
                </View>
            </View>

            <View className="py-4 text-center">
                <Text className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">复玩不会获得积分</Text>
            </View>
        </View>
    )
}

export default Collection
