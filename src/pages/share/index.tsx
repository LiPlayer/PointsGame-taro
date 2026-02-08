import { View, Text, Image, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, FC, useMemo, useEffect } from 'react'

import LabelCaps from '../../components/LabelCaps'
import NavClose from '../../components/NavClose'
import { getWeappContentPaddingTopPx, isWeapp } from '../../utils/weappLayout'
import { getUserData, transferPoints, initUserData } from '../../utils/user'
import { generateQRCode } from '../../utils/qr'

const SVG_SEND_ICON = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222.5%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%2019l9%202-9-18-9%2018%209-2zm0%200v-8%22%2F%3E%3C%2Fsvg%3E"
const SVG_SCAN = "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%209a2%202%200%20012-2h.93a2%202%200%20001.664-.89l.812-1.22A2%202%200%200110.07%204h3.86a2%202%200%20011.664.89l.812%201.22A2%202%200%200018.07%207H19a2%202%200%20012%202v9a2%202%200%2001-2%202H5a2%202%200%2001-2-2V9z%22%2F%3E%3C%2Fsvg%3E"

const Share: FC = () => {
    const [amount, setAmount] = useState('100')
    const [qrCode, setQrCode] = useState('')

    const goHome = () => {
        Taro.reLaunch({ url: '/pages/home/index' })
    }

    const initQR = async () => {
        let user = getUserData()
        if (!user) {
            user = await initUserData()
        }
        const openid = user?._openid
        if (openid) {
            const code = await generateQRCode(openid)
            setQrCode(code)
        } else {
            console.error('[Share] No openid found for QR generation')
        }
    }

    useEffect(() => {
        initQR()
    }, [])

    useDidShow(() => {
        initQR()
    })

    const handleScan = () => {
        Taro.scanCode({
            success: async (res) => {
                const targetOpenid = res.result
                if (!targetOpenid) {
                    Taro.showToast({ title: '无效的二维码', icon: 'none' })
                    return
                }

                const numAmount = parseInt(amount)
                if (isNaN(numAmount) || numAmount <= 0) {
                    Taro.showToast({ title: '请输入有效的积分数量', icon: 'none' })
                    return
                }

                Taro.showModal({
                    title: '确认转账',
                    content: `是否转出 ${numAmount} 积分？`,
                    success: async (modalRes) => {
                        if (modalRes.confirm) {
                            Taro.showLoading({ title: '转账中...' })
                            const transferRes = await transferPoints(numAmount, targetOpenid)
                            Taro.hideLoading()

                            if (transferRes.success) {
                                Taro.showToast({ title: '转账成功', icon: 'success' })
                            } else {
                                Taro.showToast({ title: transferRes.error || '转账失败', icon: 'none' })
                            }
                        }
                    }
                })
            }
        })
    }

    const contentPaddingTop = useMemo(
        () => (isWeapp() ? getWeappContentPaddingTopPx(50, 12) : 50),
        []
    )

    return (
        <View
            className={`flex flex-col h-screen bg-[#f8fafc] pb-[calc(24px+env(safe-area-inset-bottom))] relative ${isWeapp() ? '' : 'pt-[50px]'}`}
            style={isWeapp() ? { paddingTop: `${contentPaddingTop}px` } : undefined}
        >
            <NavClose onClick={goHome} />

            <View className="flex-1 bg-white rounded-b-[40px] shadow-sm flex flex-col items-center justify-center p-8 relative z-0 box-border">
                <Text className="text-lg font-black text-slate-900 mb-6">向我转积分</Text>
                <View className="w-48 h-48 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-4 shadow-lg overflow-hidden">
                    {qrCode ? (
                        <Image src={qrCode} className="w-full h-full" />
                    ) : (
                        <View className="text-white/50 text-xs">生成中...</View>
                    )}
                </View>
            </View>

            <View className="flex-1 flex flex-col p-8 justify-center box-border">
                <View className="flex items-center gap-2 mb-6">
                    <Image src={SVG_SEND_ICON} className="w-5 h-5 text-purple-500" />
                    <Text className="text-lg font-black text-slate-900">转给朋友</Text>
                </View>

                <View className="mb-6">
                    <LabelCaps className="block mb-2">积分数量</LabelCaps>
                    <Input
                        type="number"
                        value={amount}
                        onInput={e => setAmount(e.detail.value)}
                        className="w-full text-3xl font-black bg-white border border-slate-200 rounded-2xl py-4 px-6 text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                </View>

                <View
                    className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
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
