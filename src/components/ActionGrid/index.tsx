import { View, Text, Image } from '@tarojs/components'
import { FC } from 'react'

const SVG_THUNDER_WHITE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%2F%3E%3C%2Fsvg%3E"

const SVG_SPARKLE_SLATE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%203v4M3%205h4M6%2017v4m-2-2h4m5-16l2.286%206.857L21%2012l-5.714%202.143L13%2021l-2.286-6.857L5%2012l5.714-2.143L13%203z%22%2F%3E%3C%2Fsvg%3E"

const SVG_GIFT_SLATE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12%208v13m0-13V6a2%202%200%20112%202h-2zm0%200V5.5A2.5%202.5%200%20109.5%208H12zm-7%204h14M5%2012a2%202%200%20110-4h14a2%202%200%20110%204M5%2012v7a2%202%200%20002%202h10a2%202%200%20002-2v-7%22%2F%3E%3C%2Fsvg%3E"

const SVG_CARD_WHITE =
    "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22white%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%2010h18M7%2015h1m4%200h1m-7%204h12a3%203%200%20003-3V8a3%203%200%2000-3-3H6a3%203%200%2000-3%203v8a3%203%200%20003%203z%22%2F%3E%3C%2Fsvg%3E"

interface ActionGridProps {
    className?: string
    onEarn?: () => void
    onCollection?: () => void
    onShare?: () => void
    onPay?: () => void
}

const ActionGrid: FC<ActionGridProps> = ({
    className = '',
    onEarn,
    onCollection,
    onShare,
    onPay
}) => {
    return (
        <View className={`space-y-4 mb-6 ${className}`}>
            <View
                className="w-full py-5 rounded-2xl btn-primary text-lg font-black flex items-center justify-center gap-2 active:scale-98 transition-transform"
                onClick={onEarn}
            >
                <Image src={SVG_THUNDER_WHITE} className="w-6 h-6" />
                <Text>赚积分</Text>
            </View>

            <View className="grid grid-cols-2 gap-4">
                <View
                    className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 transition active:bg-slate-50"
                    onClick={onCollection}
                >
                    <Image src={SVG_SPARKLE_SLATE} className="w-6 h-6" />
                    <Text className="text-xs font-bold text-slate-600">已收集游戏</Text>
                </View>

                <View
                    className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 transition active:bg-slate-50"
                    onClick={onShare}
                >
                    <Image src={SVG_GIFT_SLATE} className="w-6 h-6" />
                    <Text className="text-xs font-bold text-slate-600">分享积分</Text>
                </View>
            </View>

            <View
                className="w-full py-5 rounded-2xl bg-slate-900 text-white text-sm font-black flex items-center justify-center gap-3 active:scale-95 transition"
                onClick={onPay}
            >
                <Image src={SVG_CARD_WHITE} className="w-5 h-5" />
                <Text>付款抵扣</Text>
            </View>
        </View>
    )
}

// @ts-ignore
ActionGrid.options = {
    addGlobalClass: true
}

export default ActionGrid
