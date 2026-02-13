import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC } from 'react'

import NavClose from '../../components/NavClose'
import { getWeappCloseTopPx, getWeappContentPaddingTopPx, isWeapp } from '@shared/utils/weappLayout'

const SVG_GIFT = "data:image/svg+xml,%3Csvg%20fill%3D%22%23f59e0b%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%202l2.4%207.2h7.6l-6%204.8%202.4%207.2-6-4.8-6%204.8%202.4-7.2-6-4.8h7.6z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
const SVG_EYE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M15%2012a3%203%200%2011-6%200%203%203%200%20016%200z%22%20%2F%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M2.458%2012C3.732%207.943%207.523%205%2012%205c4.478%200%208.268%202.943%209.542%207-1.274%204.057-5.064%207-9.542%207-4.477%200-8.268-2.943-9.542-7z%22%20%2F%3E%3C%2Fsvg%3E"

const EarnInstant: FC = () => {
    const contentPaddingTop = isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const handleViewResult = () => {
        Taro.redirectTo({
            url: '/pages/result-instant/index'
        })
    }

    return (
        <View className="text-center flex flex-col h-screen items-center bg-amber-50 relative overflow-hidden">
            <NavClose className="bg-white/50 text-slate-400 active:bg-white/70" onClick={goHome} />

            <View
                className={`flex-1 flex flex-col items-center w-full px-6 pb-[calc(24px+env(safe-area-inset-bottom))] box-border ${isWeapp() ? '' : 'pt-[50px]'}`}
                style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
            >
                <View className="flex-1 flex flex-col items-center justify-center w-full">
                    <View className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-amber-200 animate-pulse-glow">
                        <Image
                            src={SVG_GIFT}
                            className="w-20 h-20"
                        />
                    </View>
                    <Text className="text-3xl font-black text-amber-600 mb-2">惊喜时刻！</Text>
                    <Text className="text-sm text-amber-800 font-bold opacity-70">无需游戏，直接获分</Text>
                </View>

                <View
                    className="w-full py-5 rounded-2xl bg-amber-500 text-white shadow-lg text-xl font-black mb-6 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    onClick={handleViewResult}
                >
                    <Image src={SVG_EYE} className="w-6 h-6 text-white" />
                    <Text>点击查看结果</Text>
                </View>
            </View>
        </View>
    )
}

export default EarnInstant
