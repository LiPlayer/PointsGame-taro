import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getUserData, refreshPoints } from '../../utils/user'

export default function Index() {
  const [points, setPoints] = useState(0)
  const [playCount, setPlayCount] = useState(0)

  useDidShow(() => {
    const data = getUserData()
    if (data) {
      setPoints(data.points)
      setPlayCount(data.dailyPlayCount)
    } else {
      // In case login hasn't finished, wait a bit or just retry
      setTimeout(() => {
        const retryData = getUserData()
        if (retryData) {
          setPoints(retryData.points)
          setPlayCount(retryData.dailyPlayCount)
        }
      }, 500)
    }
  })

  // Testing: Simulate time passing (e.g. 24 hours)
  const simulateDecay = () => {
    const data = getUserData()
    if (data) {
      // Set update time to 24 hours ago
      data.lastUpdatedAt -= 24 * 60 * 60 * 1000
      const newPoints = refreshPoints()
      setPoints(newPoints)
      Taro.showToast({ title: '已模拟24小时蒸发', icon: 'success' })
    }
  }

  return (
    <View className="min-h-screen bg-[#f8fafc] p-6 pt-8 text-[#0f172a] box-border pb-24">
      {/* Header / User Info */}
      <View className="flex flex-col items-center mt-4 mb-8">
        <View className="w-16 h-16 bg-brand-red rounded-2xl shadow-lg flex items-center justify-center text-white text-3xl font-black mb-4">
          婷
        </View>
        <Text className="text-xl font-black text-brand-dark">婷姐•贵州炒鸡</Text>
      </View>

      {/* Points Card */}
      <View className="bg-white border border-slate-100 rounded-[32px] p-6 text-center shadow-card mb-8 relative overflow-hidden box-border">
        {/* Background Decorative Icon */}
        <View className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Image
            src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJjdXJyZW50Q29sb3IiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMmwzLjA5IDYuMjZMMjIgOS4yN2wtNSA0Ljg3IDEuMTggNi44OEwxMiAxNy43N2wtNi4xOCAzLjI1TDcgMTQuMTQgMiA5LjI3bDYuOTEtMS4wMUwxMiAyeiIvPjwvc3ZnPg=="
            className="w-32 h-32 text-slate-900"
            style={{ width: '128px', height: '128px' }}
          />
        </View>

        <Text className="text-sm font-extrabold tracking-widest uppercase text-slate-400 block mb-2">当前可用积分</Text>
        <View className="text-6xl font-black text-brand-dark tracking-tighter mb-4">
          {points.toLocaleString()}
        </View>

        <View className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
          <Text className="text-sm">⚡</Text>
          <Text>今日已玩 {playCount}/3 次</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="space-y-4 mb-4 mt-4">
        {/* Earn Points Button */}
        <View
          className="w-full py-5 rounded-2xl bg-gradient-to-br from-[#e11d48] to-[#be123c] shadow-glow active:scale-95 transition-transform flex items-center justify-center gap-3"
          onClick={() => Taro.navigateTo({ url: '/pages/earn/index' })}
        >
          {/* Lightning Icon */}
          <Image
            src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJ3aGl0ZSIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMyAxMFYzTDQgMTRoN3Y3bDktMTFoLTd6Ii8+PC9zdmc+"
            className="w-6 h-6"
          />
          <Text className="text-white text-lg font-black">赚积分</Text>
        </View>

        {/* Secondary Buttons Grid */}
        <View className="grid grid-cols-2 gap-4">
          <View
            className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 active:bg-slate-50 transition-colors"
            onClick={() => Taro.navigateTo({ url: '/pages/collection/index' })}
          >
            {/* Sparkles Icon */}
            <Image
              src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik01IDN2NE0zIDVoNE02IDE3djRtLTItMmg0bTUtMTZsMi4yODYgNi44NTdMMjEgMTJsLTUuNzE0IDIuMTQzTDEzIDIxbC0yLjI4Ni02Ljg1N0w1IDEybDUuNzE0LTIuMTQzTDEzIDN6Ij48L3BhdGg+PC9zdmc+"
              className="w-6 h-6"
            />
            <Text className="text-sm font-bold text-slate-600">已收集游戏</Text>
          </View>
          <View
            className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 active:bg-slate-50 transition-colors"
            onClick={() => Taro.navigateTo({ url: '/pages/share/index' })}
          >
            {/* Gift Icon */}
            <Image
              src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMiA4djEzbTAtMTNWNmEyIDIgMCAxMTIgMmgtMnptMCAwVjUuNUEyLjUgMi41IDAgMTA5LjUgOEgxMnptLTcgNGgxNE01IDEyYTIgMiAwIDExMC00aDE0YTIgMiAwIDExMCA0TTUgMTJ2N2EyIDIgMCAwMDIgMmgxMGEyIDIgMCAwMDItMnYtNyIvPjwvc3ZnPg=="
              className="w-6 h-6"
            />
            <Text className="text-sm font-bold text-slate-600">分享积分</Text>
          </View>
        </View>

        {/* Pay Button */}
        <View
          className="w-full py-5 rounded-2xl bg-brand-dark text-white text-sm font-black flex items-center justify-center gap-3 active:opacity-90"
          onClick={() => Taro.navigateTo({ url: '/pages/pay/index' })}
        >
          {/* Card Icon */}
          <Image
            src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZS13aWR0aD0iMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMyAxMGgxOE03IDE1aDFtNCAwaDFtLTcgNGgxMmEzIDMgMCAwMDMtM1Y4YTMgMyAwIDAwLTMtM0g2YTMgMyAwIDAwLTMtM0g2YTMgMyAwIDAwLTMgM3Y4YTMgMyAwIDAwMyAzeiIvPjwvc3ZnPg=="
            className="w-5 h-5"
          />
          <Text>付款抵扣</Text>
        </View>
      </View>

      {/* Debug/Test Section */}
      <View className="mt-8 pt-8 border-t border-slate-100">
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">开发者测试工具</Text>
        <Button
          className="w-full bg-slate-100 text-slate-600 text-xs font-bold py-2 rounded-xl"
          onClick={simulateDecay}
        >
          模拟 24 小时后积分蒸发
        </Button>
      </View>
    </View>
  )
}
