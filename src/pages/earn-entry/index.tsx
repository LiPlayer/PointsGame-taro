import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, FC, useMemo } from 'react'

import BtnPrimary from '../../components/BtnPrimary'
import NavClose from '../../components/NavClose'
import { getWeappContentPaddingTopPx, isWeapp } from '../../utils/weappLayout'

const SVG_GAMEPAD = "data:image/svg+xml,%3Csvg%20fill%3D%22%23e11d48%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M17%206H7c-3%200-5.1%202.5-5%205.5C2.1%2014.4%204.5%2017%207.5%2017h9c3%200%205.4-2.6%205.5-5.5.1-3-2-5.5-5-5.5zM7.5%2014c-1.4%200-2.5-1.1-2.5-2.5S6.1%209%207.5%209s2.5%201.1%202.5%202.5S8.9%2014%207.5%2014zm10.5-1c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm-2-2c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm0%204c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201zm2%200c-.6%200-1-.4-1-1s.4-1%201-1%201%20.4%201%201-.4%201-1%201z%22%2F%3E%3C%2Fsvg%3E"
const SVG_PLAY = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M14.752%2011.168l-3.197-2.132A1%201%200%200010%209.87v4.263a1%201%200%20001.555.832l3.197-2.132a1%201%200%20000-1.664z%22%20%2F%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M21%2012a9%209%200%2011-18%200%209%209%200%200118%200z%22%20%2F%3E%3C%2Fsvg%3E"

const EarnEntry: FC = () => {
    const router = Taro.useRouter()
    const autoStart = router.params.autoStart === 'true'
    const contentPaddingTop = useMemo(
        () => (isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50),
        []
    )

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const handleStart = () => {
        const random = Math.random()
        if (random < 0.3) {
            Taro.redirectTo({ url: '/pages/earn-instant/index' })
        } else {
            Taro.redirectTo({ url: '/pages/earn-encounter/index' })
        }
    }

    useEffect(() => {
        if (autoStart) {
            handleStart()
        }
    }, [autoStart])

    return (
        <View className="text-center flex flex-col h-screen items-center bg-white relative overflow-hidden">
            <NavClose onClick={goHome} />

            <View
                className={`flex-1 flex flex-col items-center w-full px-6 pb-[calc(24px+env(safe-area-inset-bottom))] box-border ${isWeapp() ? '' : 'pt-[50px]'}`}
                style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
            >
                <View className="flex-1 flex flex-col items-center justify-center w-full">
                    <View className="w-48 h-48 bg-slate-50 rounded-[48px] border-4 border-white shadow-xl flex items-center justify-center mb-8 relative">
                        <View className="absolute inset-0 rounded-[44px] bg-gradient-to-tr from-rose-50 to-white opacity-50 pointer-events-none"></View>
                        <View className="animate-float">
                            <Image
                                src={SVG_GAMEPAD}
                                className="w-24 h-24"
                            />
                        </View>
                    </View>
                    <Text className="text-2xl font-black text-slate-900 mb-2">准备好了吗？</Text>
                    <Text className="text-sm text-slate-400 px-8 leading-relaxed">点击开始，系统将为你随机匹配{`\n`}一个小挑战或惊喜奖励。</Text>
                </View>

                <BtnPrimary className="text-xl mb-6" onClick={handleStart}>
                    <Image src={SVG_PLAY} className="w-6 h-6 text-white" />
                    <Text className="text-white text-xl font-black">开始</Text>
                </BtnPrimary>
            </View>
        </View>
    )
}

export default EarnEntry
