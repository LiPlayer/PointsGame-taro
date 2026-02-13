import { View, Text } from '@tarojs/components'
import { FC } from 'react'

const Home: FC = () => {
    return (
        <View className='min-h-screen bg-slate-50 flex flex-col items-center justify-center'>
            <Text className='text-3xl font-black text-slate-900 mb-4'>商户端 · 筹备中</Text>
            <Text className='text-sm text-slate-400'>极简营销遥控器，即将上线</Text>
        </View>
    )
}

export default Home
