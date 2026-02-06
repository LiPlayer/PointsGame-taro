import { View, Text, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, FC } from 'react'

const SVG_CLOSE = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E"
const SVG_QR_PLACEHOLDER = "data:image/svg+xml,%3Csvg%20fill%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%203h8v8H3V3zm10%200h8v8h-8V3zM3%2013h8v8H3v-8zm13%200h5v2h-5v-2zm0%203h2v5h-2v-5zm3%200h2v2h-2v-2zm0%203h2v2h-2v-2z%22%2F%3E%3C%2Fsvg%3E"
const SVG_SEND_ICON = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%2019l9%202-9-18-9%2018%209-2zm0%200v-8%22%2F%3E%3C%2Fsvg%3E"
const SVG_SCAN = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%209a2%202%200%20012-2h.93a2%202%200%20001.664-.89l.812-1.22A2%202%200%200110.07%204h3.86a2%202%200%20011.664.89l.812%201.22A2%202%200%200018.07%207H19a2%202%200%20012%202v9a2%202%200%2001-2%202H5a2%202%200%2001-2-2V9z%22%2F%3E%3C%2Fsvg%3E"

const Share: FC = () => {
    const [amount, setAmount] = useState('100')

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const handleScan = () => {
        Taro.scanCode({
            success: (res) => {
                Taro.showToast({ title: `扫描结果: ${res.result}`, icon: 'none' })
            }
        })
    }

    return (
        <View className="flex flex-col h-screen bg-[#f8fafc] pt-[50px] pb-[calc(24px+env(safe-area-inset-bottom))]">
            <View className="absolute top-6 left-6 p-2 rounded-full bg-white/50 text-slate-600 z-10 flex items-center justify-center active:bg-white/80" onClick={goHome}>
                <Image src={SVG_CLOSE} className="w-5 h-5" />
            </View>

            <View className="flex-1 bg-white rounded-b-[40px] shadow-sm flex flex-col items-center justify-center p-8 relative z-0 box-border">
                <Text className="text-lg font-black text-slate-900 mb-6">向我转积分</Text>
                <View className="w-48 h-48 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-4 shadow-lg">
                    <Image src={SVG_QR_PLACEHOLDER} className="w-20 h-20 opacity-50 text-white" />
                </View>
                <View className="bg-slate-100 px-4 py-1 rounded-full text-[10px] font-mono font-bold text-slate-500">
                    ID: TJ_88921
                </View>
            </View>

            <View className="flex-1 flex flex-col p-8 justify-center box-border">
                <View className="flex items-center gap-2 mb-6">
                    <Image src={SVG_SEND_ICON} className="w-5 h-5 text-purple-500" />
                    <Text className="text-lg font-black text-slate-900">转给朋友</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-slate-400 block mb-2">积分数量</Text>
                    <Input
                        type="number"
                        value={amount}
                        onInput={e => setAmount(e.detail.value)}
                        className="w-full h-14 text-3xl font-black bg-white border border-slate-200 rounded-2xl px-6 text-slate-900 focus:border-rose-500"
                    />
                </View>

                <View
                    className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    onClick={handleScan}
                >
                    <Image src={SVG_SCAN} className="w-5 h-5 text-white" />
                    <Text>扫码转出</Text>
                </View>
            </View>
        </View>
    )
}

export default Share
