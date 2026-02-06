import { View, Text, Image, Button, Canvas } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { getUserData, refreshPoints } from '../../utils/user'
import { calculateCurrentPoints } from '../../utils/economy'
import { StarAnimation } from '../../utils/starAnimation'

export default function Index() {
  const [displayPoints, setDisplayPoints] = useState(0)
  const [playCount, setPlayCount] = useState(0)
  const animationRef = useRef(null)

  // Update loop for real-time evaporation
  useEffect(() => {
    const timer = setInterval(() => {
      const data = getUserData()
      if (data) {
        const current = calculateCurrentPoints(data.points, data.lastUpdatedAt)
        setDisplayPoints(current)
        if (animationRef.current) {
          animationRef.current.setParticleCount(current)
        }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useDidShow(async () => {
    // Wait for user data to be ready if it's still null
    let data = getUserData()
    if (!data) {
      // Simple polling or wait for login() to finish
      // For better UX, we could use a global state or event emitter, 
      // but for now, we'll try to refresh again.
      await new Promise(r => setTimeout(r, 500))
      data = getUserData()
    }

    if (data) {
      const current = calculateCurrentPoints(data.points, data.lastUpdatedAt)
      setDisplayPoints(current)
      setPlayCount(data.dailyPlayCount)
      if (animationRef.current) {
        animationRef.current.setParticleCount(current)
      }
    }

    // Cache rect for touch interaction
    Taro.nextTick(() => {
      Taro.createSelectorQuery()
        .select('#points-canvas')
        .boundingClientRect()
        .exec((res) => {
          if (res && res[0]) {
            cardRectRef.current = res[0]
          }
        })
    })
  })

  // Initialize Star Animation
  useEffect(() => {
    // Wait for the view to be ready
    const timer = setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query.select('#points-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]) {
            const canvas = res[0].node
            // In H5, res[0].width/height might be missing depending on Taro version/environment
            // Fallback to clientWidth/Height if needed
            const width = res[0].width || (canvas && canvas.clientWidth) || 300
            const height = res[0].height || (canvas && canvas.clientHeight) || 200
            const dpr = Taro.getSystemInfoSync().pixelRatio

            if (canvas) {
              canvas.width = width * dpr
              canvas.height = height * dpr

              // Init Engine
              const data = getUserData()
              const initialCount = data ? calculateCurrentPoints(data.points, data.lastUpdatedAt) : 0
              animationRef.current = new StarAnimation(canvas, width * dpr, height * dpr, dpr, initialCount)
              if (initialCount > 0) {
                setDisplayPoints(initialCount)
              }
            } else {
              console.error("[Index] Canvas node not found in SelectorQuery result");
            }
          }
        })
    }, 200) // Slightly longer delay to ensure node layout
    return () => clearTimeout(timer)
  }, []) // Run once on mount

  // Lazy update: Save to storage when page is hidden
  Taro.useDidHide(() => {
    refreshPoints(true) // Force save actual state to DB
  })



  const cardRectRef = useRef(null)

  return (
    <View className="min-h-screen bg-[#f8fafc] flex flex-col box-border px-6 pt-[50px] pb-[calc(24px+env(safe-area-inset-bottom))]">
      {/* Points Card */}
      <View
        className="bg-white gradient-border rounded-[32px] p-8 text-center shadow-card mb-4 relative overflow-hidden box-border isolate"
        style={{ transform: 'translateZ(0)', webkitMaskImage: '-webkit-radial-gradient(white, black)' }} // Enhanced clipping for some engines
        onTouchStart={(e) => {
          if (animationRef.current && e.touches && e.touches[0]) {
            const touch = e.touches[0];
            const x = touch.clientX || touch.pageX;
            const y = touch.clientY || touch.pageY;

            if (cardRectRef.current) {
              animationRef.current.handleInput(x - cardRectRef.current.left, y - cardRectRef.current.top);
            } else {
              Taro.createSelectorQuery().select('#points-canvas').boundingClientRect().exec(res => {
                if (res && res[0]) {
                  cardRectRef.current = res[0];
                  animationRef.current.handleInput(x - res[0].left, y - res[0].top);
                }
              });
            }
          }
        }}
        onTouchMove={(e) => {
          if (animationRef.current && e.touches && e.touches[0] && cardRectRef.current) {
            const touch = e.touches[0];
            const x = touch.clientX || touch.pageX;
            const y = touch.clientY || touch.pageY;
            animationRef.current.handleInput(x - cardRectRef.current.left, y - cardRectRef.current.top);
          }
        }}
        onTouchEnd={() => {
          if (animationRef.current) animationRef.current.stopInput();
        }}
        onMouseMove={(e) => {
          if (animationRef.current && cardRectRef.current) {
            animationRef.current.handleInput(e.clientX - cardRectRef.current.left, e.clientY - cardRectRef.current.top);
          }
        }}
        onMouseLeave={() => {
          if (animationRef.current) animationRef.current.stopInput();
        }}
      >
        {/* Brand Header (Inside Card as per V3.2 Prototype) */}
        <View className="flex flex-col items-center mt-2 mb-16 relative z-20 pointer-events-none">
          <View className="w-16 h-16 bg-brand-red rounded-2xl shadow-lg flex items-center justify-center text-white text-3xl font-black mb-4">
            婷
          </View>
          <Text className="text-xl font-black text-brand-dark">婷姐•贵州炒鸡</Text>
        </View>

        {/* Canvas Background */}
        <Canvas
          type="2d"
          id="points-canvas"
          className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-90"
          style={{ width: '100%', height: '100%', borderRadius: '32px', overflow: 'hidden', transform: 'translateZ(0)' }}
        />

        {/* Content (Higher z-index) */}
        <View className="relative z-10 pointer-events-none">
          <Text className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-slate-400 block mb-2">当前可用积分</Text>
          <View className="text-6xl font-black text-brand-dark tracking-tighter mb-4 mix-blend-multiply">
            {Math.floor(displayPoints).toLocaleString()}
          </View>

          <View className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50/80 backdrop-blur-sm text-amber-700 rounded-full text-[10px] font-bold shadow-sm">
            <Image
              src="data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%223%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
              className="w-3 h-3"
            />
            <Text>今日已玩 {playCount}/3 次</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="space-y-4 mt-auto">
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
            src="data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%2010h18M7%2015h1m4%200h1m-7%204h12a3%203%200%20003-3V8a3%203%200%2000-3-3H6a3%203%200%2000-3%203v8a3%203%200%20003%203z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
            className="w-5 h-5"
          />
          <Text>付款抵扣</Text>
        </View>
      </View>


    </View>
  )
}
