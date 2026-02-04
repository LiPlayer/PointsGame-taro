import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useEffect } from 'react'

export default function Game() {

    useLoad(() => {
        console.log('Game loaded')
    })

    useEffect(() => {
        // Simulate game running for 3 seconds then go to result
        const timer = setTimeout(() => {
            Taro.reLaunch({ url: '/pages/result/index' })
        }, 3000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <View className="h-screen bg-slate-900 flex items-center justify-center relative">
            <View className="absolute top-10 left-0 w-full text-center">
                <Text className="text-white opacity-50 text-[10px] tracking-[0.2em] font-bold">GAME RUNNING...</Text>
            </View>
            <Text className="text-9xl font-black text-slate-700 -rotate-12 opacity-20 select-none">PLAY</Text>

            {/* Mock Objects */}
            <View className="absolute top-1/3 left-1/4 w-12 h-12 bg-rose-500 rounded-full animate-bounce"></View>
            <View className="absolute bottom-1/3 right-1/4 w-16 h-4 bg-amber-400 rounded-full rotate-45"></View>
        </View>
    )
}
