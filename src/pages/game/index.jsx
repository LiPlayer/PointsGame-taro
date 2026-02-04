import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

const SVG_CLOSE_REVERSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"

export default function Game() {
    const router = Taro.useRouter()
    const isReplay = router.params.mode === 'replay'

    const goHome = () => {
        if (isReplay) {
            Taro.reLaunch({ url: '/pages/collection/index' })
        } else {
            Taro.reLaunch({ url: '/pages/index/index' })
        }
    }

    const handleGameOver = () => {
        const score = Math.floor(Math.random() * 50) + 50 // Mock score between 50 and 100
        Taro.reLaunch({
            url: `/pages/result/index?mode=${isReplay ? 'replay' : 'earn'}&score=${score}`
        })
    }

    return (
        <View className="flex flex-col h-screen bg-slate-900 relative overflow-hidden">
            {/* Game Canvas Placeholder */}
            <View className="absolute inset-0 bg-slate-800 flex items-center justify-center overflow-hidden" onClick={handleGameOver}>
                <Text className="text-slate-700 text-8xl font-black opacity-10 rotate-12 select-none">游戏中</Text>
                <Text className="absolute bottom-20 text-white/30 text-xs font-bold uppercase tracking-widest">(点击屏幕模拟游戏结束)</Text>

                {/* Mock Objects */}
                <View className="absolute top-1/4 left-1/3 w-12 h-12 bg-rose-500 rounded-full animate-pulse"></View>
                <View className="absolute bottom-1/3 right-1/4 w-16 h-4 bg-amber-400 rounded-full rotate-45"></View>
            </View>

            {/* Overlay UI */}
            <View className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 box-border pt-12">
                <View
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center active:bg-white/40"
                    onClick={goHome}
                >
                    <Image src={SVG_CLOSE_REVERSE} className="w-5 h-5 text-white" />
                </View>

                {isReplay && (
                    <View className="px-3 py-1 bg-blue-500 rounded-full text-white text-sm font-bold">
                        练习模式
                    </View>
                )}
            </View>

            {/* Footer Info */}
            <View className="absolute bottom-10 width-full text-center w-full z-10 pointer-events-none">
                <Text className="text-white/50 text-sm uppercase tracking-[0.2em] font-bold">游戏进行中...</Text>
            </View>
        </View>
    )
}
