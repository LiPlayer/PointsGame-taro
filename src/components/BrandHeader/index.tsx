import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC } from 'react'

interface BrandHeaderProps {
    className?: string
}

const BrandHeader: FC<BrandHeaderProps> = ({ className = '' }) => {
    const paddingTop =
        process.env.TARO_ENV === 'weapp' ? (Taro.getSystemInfoSync().statusBarHeight || 0) : 0

    return (
        <View className={`flex flex-col items-center mt-2 mb-16 relative z-10 ${className}`} style={{ paddingTop }}>
            <View className="w-16 h-16 bg-rose-600 rounded-2xl shadow-logo flex items-center justify-center mb-4">
                <Text className="text-white text-3xl font-black-compensated">婷</Text>
            </View>
            <Text className="text-xl font-black text-slate-900">婷姐•贵州炒鸡</Text>
        </View>
    )
}

// @ts-ignore
BrandHeader.options = {
    addGlobalClass: true
}

export default BrandHeader
