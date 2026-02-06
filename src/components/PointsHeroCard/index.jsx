import { View, Text, Image } from '@tarojs/components'

import BrandHeader from '../BrandHeader'

const SVG_THUNDER_AMBER =
  "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%223%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%2F%3E%3C%2Fsvg%3E"

function formatNumber(value) {
  const num = Number(value || 0)
  const s = String(Math.floor(num))
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function PointsHeroCard({
  className = '',
  points = 0,
  dailyPlayCount = 0
}) {
  return (
    <View
      className={`rounded-[32px] p-[1px] bg-gradient-to-t from-slate-100 to-transparent shadow-card ${className}`}
    >
      <View
        className="rounded-[31px] bg-white p-8 text-center relative overflow-hidden isolate"
      >
        {/* BrandHeader */}
        <BrandHeader className="relative z-20" />

        {/* Points Content */}
        <View className="relative z-10 pointer-events-none">
          <Text className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-slate-400 block mb-2">
            当前可用积分
          </Text>
          <View
            className="text-6xl font-black text-slate-900 tracking-tighter h5:mix-blend-multiply"
          >
            {formatNumber(points)}
          </View>
          <View className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-50/80 backdrop-blur-sm text-amber-700 rounded-full text-[10px] font-bold shadow-sm">
            <Image src={SVG_THUNDER_AMBER} className="w-3 h-3" />
            <Text>今日已玩 {dailyPlayCount}/3 次</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

PointsHeroCard.options = {
  addGlobalClass: true
}
