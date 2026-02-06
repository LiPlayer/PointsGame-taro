import { View, Text, Button } from '@tarojs/components'
import { useRef, useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import PointsCanvas from '../../components/PointsCanvas'
import './index.scss'

export default function Index() {
  const canvasRef = useRef(null)
  const [statusBarHeight, setStatusBarHeight] = useState(20)

  useEffect(() => {
    const info = Taro.getSystemInfoSync()
    setStatusBarHeight(info.statusBarHeight || 20)
  }, [])

  return (
    <View
      className='home-page'
      style={{ '--status-bar-height': `${statusBarHeight}px` }}
    >
      {/* Scrollable Content */}
      <View className='page-content'>

        {/* Points Card */}
        <View className='points-card-container'>
          <View className='points-card gradient-border shadow-card'>

            {/* Brand Header */}
            <View className='brand-header'>
              <View className='logo shadow-glow'>
                <Text>婷</Text>
              </View>
              <Text className='title'>婷姐•贵州炒鸡</Text>
            </View>

            {/* Dynamic Canvas Background */}
            <PointsCanvas ref={canvasRef} initialPoints={1240} />

            {/* Information Layer */}
            <View className='info-layer'>
              <Text className='label'>当前可用积分</Text>
              <View className='points-value font-black-compensated'>
                1,240
              </View>
              <View className='daily-badge shadow-sm'>
                <svg className='icon-svg' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='3'>
                  <path d='M13 10V3L4 14h7v7l9-11h-7z'></path>
                </svg>
                <Text>今日已玩 0/3 次</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Action Buttons */}
        <View className='action-group'>
          <Button
            className='btn-primary main-action shadow-glow'
            onClick={() => canvasRef.current?.add(50)}
          >
            <svg className='icon-svg-lg' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M13 10V3L4 14h7v7l9-11h-7z'></path>
            </svg>
            赚积分
          </Button>

          <View className='secondary-actions'>
            <View className='btn-secondary'>
              <svg className='icon-svg-lg text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2'>
                <path d='M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'></path>
              </svg>
              <Text>已收集游戏</Text>
            </View>
            <View className='btn-secondary'>
              <svg className='icon-svg-lg text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2'>
                <path d='M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'></path>
              </svg>
              <Text>分享积分</Text>
            </View>
          </View>

          <View className='btn-dark shadow-lg'>
            <svg className='icon-svg-md' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2'>
              <path d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'></path>
            </svg>
            付款抵扣
          </View>
        </View>

      </View>
    </View>
  )
}
