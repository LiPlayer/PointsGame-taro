import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'

const STATE = {
    SCAN: 'SCAN',
    CONFIRM: 'CONFIRM'
}

const SVG_CLOSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"
const SVG_STORE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M16%2011V7a4%204%200%2000-8%200v4M5%209h14l1%2012H4L5%209z%22%2F%3E%3C%2Fsvg%3E"
const SVG_THUNDER = "data:image/svg+xml,%3Csvg%20fill%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%202l3.09%206.26L22%209.27l-5%204.87%201.18%206.88L12%2017.77l-6.18%203.25L7%2014.14%202%209.27l6.91-1.01L12%202z%22%2F%3E%3C%2Fsvg%3E"
const SVG_CHECK = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M9%2012l2%202%204-4m6%202a9%209%200%2011-18%200%209%209%200%200118%200z%22%2F%3E%3C%2Fsvg%3E"

export default function Pay() {
    const [pageState, setPageState] = useState(STATE.SCAN)

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/earn/index' })
    }

    // Simulate scanning
    const handleScanSimulate = () => {
        Taro.showLoading({ title: '识别中...' })
        setTimeout(() => {
            Taro.hideLoading()
            setPageState(STATE.CONFIRM)
        }, 1500)
    }

    const handlePay = () => {
        Taro.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(() => {
            Taro.reLaunch({ url: '/pages/earn/index' })
        }, 1500)
    }

    return (
        <View className="block">
            {pageState === STATE.SCAN ? (
                <View className="flex flex-col h-screen box-border bg-black relative pt-[50px]">
                    <View className="absolute top-6 left-6 p-2 rounded-full bg-black/40 text-white z-20 flex items-center justify-center active:bg-black/60" onClick={goHome}>
                        <Image src={SVG_CLOSE} className="w-5 h-5 text-white" />
                    </View>

                    {/* Camera Placeholder Background */}
                    <View className="absolute inset-0 bg-slate-800">
                        {/* Simulated Camera Feed */}
                        <View className="w-full h-full opacity-30 bg-gradient-to-br from-slate-700 to-slate-900"></View>
                    </View>

                    <View className="absolute inset-0 flex flex-col items-center justify-center p-12" onClick={handleScanSimulate}>
                        <Text className="text-white font-bold mb-12 drop-shadow-md text-center">请扫描商户收款码{'\n'}(点击模拟扫描)</Text>
                        <View className="w-64 h-64 border-2 border-white/50 rounded-3xl relative overflow-hidden bg-white/5 backdrop-blur-sm">
                            {/* Scan Corners */}
                            <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-lg"></View>
                            <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-lg"></View>
                            <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-lg"></View>
                            <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-lg"></View>
                            {/* Scan Line Animation - handled by CSS in app.scss typically, or inline style here */}
                            <View className="absolute left-0 right-0 h-[2px] bg-rose-500 shadow-[0_0_10px_#e11d48] animate-scan-line"></View>
                        </View>
                        <Text className="text-white/70 text-sm mt-8 text-center leading-relaxed">识别成功后{'\n'}积分将自动全额抵扣</Text>
                    </View>
                </View>
            ) : (
                <View className="flex flex-col h-screen bg-[#f8fafc] px-6 pt-[50px] pb-[calc(24px+env(safe-area-inset-bottom))] justify-center">
                    <View className="bg-white rounded-[40px] p-6 shadow-card border border-slate-100 box-border">
                        <View className="flex flex-col items-center mb-6 border-b border-slate-100 pb-6">
                            <View className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                                <Image src={SVG_STORE} className="w-8 h-8 text-rose-600" />
                            </View>
                            <Text className="text-xl font-black text-slate-900">订单确认</Text>
                            <Text className="text-xs text-slate-400 font-bold mt-1">婷姐•贵州炒鸡 (总店)</Text>
                        </View>

                        <View className="space-y-3 mb-6">
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
                            <Text className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-slate-400 block mb-1">还需要支付</Text>
                            <Text className="text-4xl font-black text-slate-900 tracking-tighter">¥ 95.60</Text>
                        </View>

                        <View
                            className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white shadow-lg flex items-center justify-center gap-2 mb-3 active:scale-95 transition-transform"
                            onClick={handlePay}
                        >
                            <Image src={SVG_CHECK} className="w-6 h-6 text-white" />
                            <Text className="text-lg font-black">确认支付</Text>
                        </View>

                        <View
                            className="w-full py-3 flex items-center justify-center gap-1 active:opacity-60"
                            onClick={() => setPageState(STATE.SCAN)}
                        >
                            <Image src={SVG_CLOSE} className="w-4 h-4 text-slate-400" />
                            <Text className="text-slate-400 text-xs font-bold uppercase">取消订单</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}
