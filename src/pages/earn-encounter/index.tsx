import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC } from 'react'

import BtnPrimary from '../../components/BtnPrimary'
import NavClose from '../../components/NavClose'
import { getWeappContentPaddingTopPx, isWeapp } from '../../utils/weappLayout'

const SVG_GAME_ICON = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22%23e11d48%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M14.828%2014.828a4%204%200%2001-5.656%200M9%2010h.01M15%2010h.01M21%2012a9%209%200%2011-18%200%209%209%200%200118%200z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
const SVG_THUNDER = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%20%2F%3E%3C%2Fsvg%3E"

const EarnEncounter: FC = () => {
    const contentPaddingTop = isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const handleStart = () => {
        Taro.reLaunch({ url: '/pages/game/index' })
    }

    return (
        <View className="text-center flex flex-col h-screen items-center bg-rose-50 relative overflow-hidden">
            <NavClose className="bg-white/50 text-slate-400 active:bg-white/70" onClick={goHome} />

            <View
                className={`flex-1 flex flex-col items-center w-full px-6 pb-[calc(24px+env(safe-area-inset-bottom))] box-border ${isWeapp() ? '' : 'pt-[50px]'}`}
                style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
            >
                <View className="flex-1 flex flex-col items-center justify-center w-full">
                    <View className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-rose-200 relative animate-float">
                        <View className="absolute -top-3 px-3 py-1 bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm z-10">
                            新游戏解锁
                        </View>
                        <Image
                            src={SVG_GAME_ICON}
                            className="w-20 h-20 text-rose-600"
                        />
                    </View>
                    <Text className="text-3xl font-black text-rose-600 mb-2">疯狂炒鸡</Text>
                    <Text className="text-sm text-rose-800 font-bold opacity-70">首次挑战 · 难度 ★★★</Text>
                </View>

                <BtnPrimary className="text-xl mb-6 shadow-lg" onClick={handleStart}>
                    <Image src={SVG_THUNDER} className="w-6 h-6 text-white" />
                    <Text>开始挑战</Text>
                </BtnPrimary>
            </View>
        </View>
    )
}

export default EarnEncounter
