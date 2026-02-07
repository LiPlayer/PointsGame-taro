import { View, Text } from '@tarojs/components'
import { FC } from 'react'

interface BrandHeaderProps {
    className?: string
}

const BrandHeader: FC<BrandHeaderProps> = ({ className = '' }) => (
    <View className={`flex flex-col items-center mt-2 mb-16 relative z-10 ${className}`}>
        <View className="w-16 h-16 bg-rose-600 rounded-2xl shadow-logo flex items-center justify-center mb-4">
            <Text className="text-white text-3xl font-black-compensated">娟</Text>
        </View>
        <Text className="text-xl font-black text-slate-900">娟姐•贵州炒鸡</Text>
    </View>
)

// @ts-ignore
BrandHeader.options = {
    addGlobalClass: true
}

export default BrandHeader
