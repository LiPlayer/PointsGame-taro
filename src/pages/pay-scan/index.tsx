import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { FC } from 'react'

import NavClose from '../../components/NavClose'
import { getWeappContentPaddingTopPx, isWeapp } from '../../utils/weappLayout'

const PayScan: FC = () => {
    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const handleScanSimulate = () => {
        Taro.showLoading({ title: '识别中...' })
        setTimeout(() => {
            Taro.hideLoading()
            Taro.redirectTo({ url: '/pages/pay-confirm/index' })
        }, 1500)
    }

    useDidShow(() => {
        if (process.env.TARO_ENV === 'weapp') {
            // No need to set brightness when scanning others
        }
    })

    const contentPaddingTop = isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50

    return (
        <View
            className={`flex flex-col h-screen box-border bg-black relative ${isWeapp() ? '' : 'pt-[50px]'}`}
            style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
        >
            <NavClose className="bg-black/40 text-white active:bg-black/60" onClick={goHome} theme="reverse" />

            <View className="absolute inset-0 bg-slate-800">
                <View className="absolute inset-0 pay-scan-bg bg-cover bg-center opacity-40"></View>
            </View>

            <View className="absolute inset-0 flex flex-col items-center justify-center p-12" onClick={handleScanSimulate}>
                <Text className="text-white font-bold mb-12 drop-shadow-md text-center">请扫描商户收款码</Text>
                <View className="w-64 h-64 border-2 border-white/50 rounded-3xl relative overflow-hidden bg-white/5 backdrop-blur-sm">
                    <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-lg"></View>
                    <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-lg"></View>
                    <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-lg"></View>
                    <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-lg"></View>
                    <View className="scan-anim"></View>
                </View>
                <Text className="text-white/70 text-sm mt-8 text-center">识别成功后{`\n`}积分将自动全额抵扣</Text>
            </View>
        </View>
    )
}

export default PayScan
