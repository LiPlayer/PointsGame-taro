import { View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useState, FC } from 'react'

import PointsHeroCard from '../../components/PointsHeroCard'
import ActionGrid from '../../components/ActionGrid'
import { getUserData, initUserData, refreshPoints } from '../../utils/user'

const Home: FC = () => {
    const [points, setPoints] = useState(0)
    const [dailyPlayCount, setDailyPlayCount] = useState(0)

    const platformClass = useMemo(() => `platform-${process.env.TARO_ENV || 'unknown'}`, [])

    const syncUser = async () => {
        const existing = getUserData()
        const data = existing || (await initUserData())
        if (!data) return

        const currentPoints = refreshPoints(false)
        setPoints(currentPoints)
        setDailyPlayCount(data.dailyPlayCount || 0)
    }

    useEffect(() => {
        syncUser()
    }, [])

    useDidShow(() => {
        syncUser()
    })

    return (
        <View className={`min-h-screen bg-brand-bg flex flex-col relative overflow-hidden ${platformClass} px-6 pt-[50px]`}>
            <PointsHeroCard
                className="relative isolate z-10 mt-4 mb-auto"
                points={points}
                dailyPlayCount={dailyPlayCount}
            />

            <ActionGrid
                className="relative z-20"
                onEarn={() => Taro.navigateTo({ url: '/pages/earn/index' })}
                onCollection={() => Taro.navigateTo({ url: '/pages/collection/index' })}
                onShare={() => Taro.navigateTo({ url: '/pages/share/index' })}
                onPay={() => Taro.navigateTo({ url: '/pages/pay/index' })}
            />

            <View className="pb-[env(safe-area-inset-bottom)] h5:pb-0" />
        </View>
    )
}

export default Home
