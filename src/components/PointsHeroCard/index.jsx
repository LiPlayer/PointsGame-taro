import { View, Text, Canvas, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useRef } from 'react'

import BrandHeader from '../BrandHeader'
import { useCanvas2D } from '../../utils/useCanvas2D'
import { StarAnimation } from '../../utils/starAnimation'

const SVG_THUNDER_AMBER =
  "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%223%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M13%2010V3L4%2014h7v7l9-11h-7z%22%2F%3E%3C%2Fsvg%3E"

function formatNumber(value) {
  const num = Number(value || 0)
  const s = String(Math.floor(num))
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function getTouchPoint(e) {
  const t = e?.touches?.[0] || e?.changedTouches?.[0]
  return t || null
}

export default function PointsHeroCard({
  className = '',
  points = 0,
  dailyPlayCount = 0,
  isRunning = true
}) {
  const engineRef = useRef(null)
  const cardRectRef = useRef(null)

  const canvasId = useMemo(() => 'points-canvas', [])
  const cardId = useMemo(() => 'points-card', [])

  const syncCardRect = () => {
    if (process.env.TARO_ENV === 'h5') {
      const el = document.getElementById(cardId)
      if (!el) return
      cardRectRef.current = el.getBoundingClientRect()
      return
    }

    if (process.env.TARO_ENV === 'weapp') {
      Taro.createSelectorQuery()
        .select(`#${cardId}`)
        .boundingClientRect()
        .exec((res) => {
          if (!res?.[0]) return
          cardRectRef.current = res[0]
        })
    }
  }

  useCanvas2D(canvasId, (canvas, ctx, width, height, dpr) => {
    // Re-init engine (e.g. after hot reload / re-mount).
    if (engineRef.current) {
      engineRef.current.destroy()
      engineRef.current = null
    }

    engineRef.current = new StarAnimation(canvas, ctx, width, height, dpr, points)
    syncCardRect()

    if (isRunning) engineRef.current.start()
  })

  useEffect(() => {
    syncCardRect()
    // Best-effort: only on H5 do we track resizes.
    if (process.env.TARO_ENV !== 'h5') return
    window.addEventListener('resize', syncCardRect)
    return () => window.removeEventListener('resize', syncCardRect)
  }, [cardId])

  useEffect(() => {
    if (!engineRef.current) return
    engineRef.current.setParticleCount(points)
  }, [points])

  useEffect(() => {
    if (!engineRef.current) return
    if (isRunning) engineRef.current.start()
    else engineRef.current.stop()
  }, [isRunning])

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy()
        engineRef.current = null
      }
    }
  }, [])

  const setPointerFromEvent = (evt, active) => {
    if (!engineRef.current) return

    const rect = cardRectRef.current
    const point = getTouchPoint(evt)

    // Prefer Weapp's relative x/y when available.
    const xRel = point?.x
    const yRel = point?.y

    if (typeof xRel === 'number' && typeof yRel === 'number') {
      engineRef.current.setPointer(xRel, yRel, active)
      return
    }

    if (!rect) return

    const clientX = point?.clientX ?? point?.pageX ?? evt?.clientX ?? evt?.pageX
    const clientY = point?.clientY ?? point?.pageY ?? evt?.clientY ?? evt?.pageY
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return

    engineRef.current.setPointer(clientX - rect.left, clientY - rect.top, active)
  }

  return (
    <View
      className={`rounded-[32px] p-[1px] bg-gradient-to-t from-slate-100 to-transparent shadow-card ${className}`}
    >
      <View
        id={cardId}
        className="rounded-[31px] bg-white p-8 text-center relative overflow-hidden isolate"
        onTouchStart={(e) => setPointerFromEvent(e, true)}
        onTouchMove={(e) => setPointerFromEvent(e, true)}
        onTouchEnd={(e) => setPointerFromEvent(e, false)}
        onTouchCancel={(e) => setPointerFromEvent(e, false)}
        onMouseMove={(e) => setPointerFromEvent(e, true)}
        onMouseLeave={(e) => setPointerFromEvent(e, false)}
      >
        {/* Layer 0: Canvas must be first for stable stacking in Weapp */}
        <Canvas id={canvasId} type="2d" className="absolute inset-0 w-full h-full z-0 opacity-90" />

        {/* Layer 2: BrandHeader (above content to avoid overlap issues) */}
        <BrandHeader className="relative z-20" />

        {/* Layer 1: Points Content */}
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
