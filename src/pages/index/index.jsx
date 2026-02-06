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
      style={{
        '--status-bar-height': `${statusBarHeight}px`,
        '--page-padding-top': `${Math.max(50, statusBarHeight + 16)}px`
      }}
    >
      {/* Scrollable Content */}
      <View className='page-content'>

        {/* Points Card */}
        <View className='points-card-container'>
          <View className='points-card gradient-border shadow-card'>

            {/* Brand Header */}
            <View className='brand-header'>
              <View className='logo shadow-logo'>
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
                <View className='icon-svg icon-bolt-svg' />
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
            <View className='icon-svg-lg icon-bolt-fill' />
            赚积分
          </Button>

          <View className='secondary-actions'>
            <View className='btn-secondary'>
              <View className='icon-svg-lg icon-trophy-svg' />
              <Text>已收集游戏</Text>
            </View>
            <View className='btn-secondary'>
              <View className='icon-svg-lg icon-share-svg' />
              <Text>分享积分</Text>
            </View>
          </View>

          <View className='btn-dark shadow-lg'>
            <View className='icon-svg-md icon-card-svg' />
            付款抵扣
          </View>
        </View>

      </View>
    </View>
  )
}
