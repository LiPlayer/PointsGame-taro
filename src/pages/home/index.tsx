import { View, Image, Text } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useState, FC } from 'react'

import BtnPrimary from '../../components/BtnPrimary'
import PointsCard from '../../components/PointsCard'
import { getUserData, initUserData, refreshPoints, startPointsListener } from '../../utils/user'
import { getWeappContentPaddingTopPx, isWeapp } from '../../utils/weappLayout'

const SVG_THUNDER_WHITE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%2F%3E%3C%2Fsvg%3E"

const SVG_SPARKLE_SLATE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%203v4M3%205h4M6%2017v4m-2-2h4m5-16l2.286%206.857L21%2012l-5.714%202.143L13%2021l-2.286-6.857L5%2012l5.714-2.143L13%203z%22%2F%3E%3C%2Fsvg%3E"

const SVG_GIFT_SLATE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%208v13m0-13V6a2%202%200%20112%202h-2zm0%200V5.5A2.5%202.5%200%20109.5%208H12zm-7%204h14M5%2012a2%202%200%20110-4h14a2%202%200%20110%204M5%2012v7a2%202%200%20002%202h10a2%202%200%20002-2v-7%22%2F%3E%3C%2Fsvg%3E"

const SVG_CARD_WHITE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%2010h18M7%2015h1m4%200h1m-7%204h12a3%203%200%20003-3V8a3%203%200%2000-3-3H6a3%203%200%2000-3%203v8a3%203%200%20003%203z%22%2F%3E%3C%2Fsvg%3E"

const Home: FC = () => {
    const [points, setPoints] = useState(0)
    const [dailyPlayCount, setDailyPlayCount] = useState(0)
    const [isActive, setIsActive] = useState(true)
    const [isReady, setIsReady] = useState(false)

    const platformClass = useMemo(() => `platform-${process.env.TARO_ENV || 'unknown'}`, [])
    const contentPaddingTop = useMemo(
        () => (isWeapp() ? getWeappContentPaddingTopPx(50, 0) : 50),
        []
    )

    const syncUser = async () => {
        const existing = getUserData()
        const data = existing || (await initUserData())
        if (!data) {
            setIsReady(true)
            return
        }

        const currentPoints = refreshPoints(false)

        // Only update UI if integer part changes or if first load (points=0)
        // Check against current state 'points'
        if (Math.floor(currentPoints) !== Math.floor(points)) {
            setPoints(currentPoints)
        }

        setDailyPlayCount(data.dailyPlayCount || 0)
        setIsReady(true)
    }

    useEffect(() => {
        syncUser()
        const timer = setInterval(syncUser, 1000)

        // Start Real-time Listener (WeChat only)
        const unsubscribe = startPointsListener((newPoints) => {
            console.log('[Home] Real-time points update:', newPoints)
            setPoints(newPoints)
        })

        return () => {
            clearInterval(timer)
            unsubscribe()
        }
    }, [])

    useDidShow(() => {
        syncUser()
        setIsActive(true)
    })

    useDidHide(() => {
        setIsActive(false)
    })

    return (
        <View className={`min-h-screen bg-white flex flex-col relative overflow-hidden ${platformClass}`}>
            <View
                className={`flex-1 flex flex-col relative overflow-hidden px-6 ${isWeapp() ? '' : 'pt-[50px]'}`}
                style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
            >
                <PointsCard
                    className="mt-0"
                    points={isReady ? points : 0}
                    dailyPlayCount={isReady ? dailyPlayCount : 0}
                    isActive={isActive}
                />

                <View className="space-y-4 mb-6 relative z-20">
                    <BtnPrimary className="text-lg" onClick={() => Taro.navigateTo({ url: '/pages/earn-entry/index' })}>
                        <Image src={SVG_THUNDER_WHITE} className="w-6 h-6" />
                        <Text>赚积分</Text>
                    </BtnPrimary>

                    <View className="grid grid-cols-2 gap-4">
                        <View
                            className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 transition active:bg-slate-50"
                            onClick={() => Taro.navigateTo({ url: '/pages/collection/index' })}
                        >
                            <Image src={SVG_SPARKLE_SLATE} className="w-6 h-6" />
                            <Text className="text-xs font-bold text-slate-600">已收集游戏</Text>
                        </View>
                        <View
                            className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 transition active:bg-slate-50"
                            onClick={() => Taro.navigateTo({ url: '/pages/share/index' })}
                        >
                            <Image src={SVG_GIFT_SLATE} className="w-6 h-6" />
                            <Text className="text-xs font-bold text-slate-600">分享积分</Text>
                        </View>
                    </View>

                    <View
                        className="w-full py-5 rounded-2xl bg-slate-900 text-white text-sm font-black flex items-center justify-center gap-3 active:scale-95 transition"
                        onClick={() => Taro.navigateTo({ url: '/pages/pay-scan/index' })}
                    >
                        <Image src={SVG_CARD_WHITE} className="w-5 h-5" />
                        <Text>付款抵扣</Text>
                    </View>
                </View>

                <View className="pb-[env(safe-area-inset-bottom)] h5:pb-0" />
            </View>
        </View>
    )
}

export default Home
