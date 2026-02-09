import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { FC, useMemo } from 'react'

import BtnPrimary from '../../components/BtnPrimary'
import LabelCaps from '../../components/LabelCaps'
import { getWeappContentPaddingTopPx, isWeapp } from '../../utils/weappLayout'
import { setEvaporationPaused } from '../../utils/user'

const SVG_CLOSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"
const SVG_STORE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M16%2011V7a4%204%200%2000-8%200v4M5%209h14l1%2012H4L5%209z%22%2F%3E%3C%2Fsvg%3E"
const SVG_THUNDER = "data:image/svg+xml,%3Csvg%20fill%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%202l3.09%206.26L22%209.27l-5%204.87%201.18%206.88L12%2017.77l-6.18%203.25L7%2014.14%202%209.27l6.91-1.01L12%202z%22%2F%3E%3C%2Fsvg%3E"
const SVG_CHECK = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M9%2012l2%202%204-4m6%202a9%209%200%2011-18%200%209%209%200%200118%200z%22%20%2F%3E%3C%2Fsvg%3E"

const PayConfirm: FC = () => {
    Taro.useDidShow(() => {
        setEvaporationPaused(true)
    })

    Taro.useDidHide(() => {
        setEvaporationPaused(false)
    })

    Taro.useUnload(() => {
        setEvaporationPaused(false)
    })
    const handlePay = () => {
        Taro.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(() => {
            Taro.reLaunch({ url: '/pages/home/index' })
        }, 1500)
    }

    const handleCancel = () => {
        Taro.redirectTo({ url: '/pages/pay-scan/index' })
    }

    const contentPaddingTop = useMemo(
        () => (isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50),
        []
    )

    return (
        <View
            className={`flex flex-col h-screen bg-[#f8fafc] px-6 pb-[calc(24px+env(safe-area-inset-bottom))] justify-center ${isWeapp() ? '' : 'pt-[50px]'}`}
            style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
        >
            <View className="bg-white rounded-[40px] p-8 shadow-card border border-slate-100 box-border">
                <View className="flex flex-col items-center mb-8 border-b border-slate-100 pb-8">
                    <View className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                        <Image src={SVG_STORE} className="w-8 h-8 text-rose-600" />
                    </View>
                    <Text className="text-xl font-black text-slate-900">订单确认</Text>
                    <Text className="text-xs text-slate-400 font-bold mt-1">婷姐•贵州炒鸡 (总店)</Text>
                </View>

                <View className="space-y-4 mb-8">
                    <View className="flex justify-between items-center">
                        <Text className="text-sm font-bold text-slate-500">订单总额</Text>
                        <Text className="text-lg font-black text-slate-900">¥ 108.00</Text>
                    </View>
                    <View className="flex justify-between items-center">
                        <View className="flex items-center gap-1 text-rose-500">
                            <Image src={SVG_THUNDER} className="w-4 h-4 text-rose-500" />
                            <Text className="text-sm font-bold">积分抵扣 (1240分)</Text>
                        </View>
                        <Text className="text-lg font-black text-rose-600">- ¥ 12.40</Text>
                    </View>
                </View>

                <View className="bg-slate-50 rounded-2xl p-6 text-center mb-6">
                    <LabelCaps className="block mb-1">还需要支付</LabelCaps>
                    <Text className="text-4xl font-black text-slate-900 tracking-tighter">¥ 95.60</Text>
                </View>

                <BtnPrimary className="text-lg mb-3" onClick={handlePay}>
                    <Image src={SVG_CHECK} className="w-6 h-6 text-white" />
                    <Text className="text-lg font-black">确认支付</Text>
                </BtnPrimary>

                <View
                    className="w-full py-3 flex items-center justify-center gap-1 active:opacity-60"
                    onClick={handleCancel}
                >
                    <Image src={SVG_CLOSE} className="w-4 h-4 text-slate-400" />
                    <Text className="text-slate-400 text-xs font-bold uppercase">取消订单</Text>
                </View>
            </View>
        </View>
    )
}

export default PayConfirm
