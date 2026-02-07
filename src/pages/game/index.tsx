import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC } from 'react'
import NavClose from '../../components/NavClose'

const Game: FC = () => {
    const router = Taro.useRouter()
    const isReplay = router.params.mode === 'replay'

    const goHome = () => {
        if (isReplay) {
            Taro.reLaunch({ url: '/pages/collection/index' })
        } else {
            Taro.reLaunch({ url: '/pages/home/index' })
        }
    }

    const handleGameOver = () => {
        const score = Math.floor(Math.random() * 50) + 50
        Taro.reLaunch({
            url: isReplay
                ? `/pages/result-replay/index?score=${score}`
                : `/pages/result-earn/index?score=${score}`
        })
    }

    return (
        <View className="flex flex-col h-screen bg-slate-900 relative overflow-hidden">
            <View className="absolute inset-0 bg-slate-800 flex items-center justify-center overflow-hidden" onClick={handleGameOver}>
                <Text className="text-slate-700 text-9xl font-black opacity-10 rotate-12 select-none">游戏中</Text>

                <View className="absolute top-1/4 left-1/3 w-12 h-12 bg-rose-500 rounded-full animate-pulse"></View>
                <View className="absolute bottom-1/3 right-1/4 w-16 h-4 bg-amber-400 rounded-full rotate-45"></View>
            </View>

            <NavClose
                className="bg-white/20 backdrop-blur text-white active:bg-white/40 hover:bg-white/40 border-none"
                onClick={goHome}
                alignToWeappMenu={true}
                theme="reverse"
            />

            <View className="absolute bottom-10 width-full text-center w-full z-10 pointer-events-none">
                <Text className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-bold">游戏进行中...</Text>
            </View>
        </View>
    )
}

export default Game
