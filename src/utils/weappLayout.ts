import Taro from '@tarojs/taro'

export type WeappMenuButtonRect = ReturnType<typeof Taro.getMenuButtonBoundingClientRect>

export const isWeapp = () => process.env.TARO_ENV === 'weapp'

export const getWeappMenuButtonRect = (): WeappMenuButtonRect | null => {
    if (!isWeapp()) return null
    if (typeof (Taro as any).getMenuButtonBoundingClientRect !== 'function') return null
    try {
        return Taro.getMenuButtonBoundingClientRect()
    } catch {
        return null
    }
}

export const getWeappContentPaddingTopPx = (fallbackPx = 50, extraGapPx = 0): number => {
    const rect = getWeappMenuButtonRect()
    if (!rect) return fallbackPx
    // Fixed directly below the capsule button
    return Math.ceil((rect.bottom || 0) + extraGapPx)
}

export const getWeappCloseTopPx = (closeHeightPx = 40, fallbackTopPx = 24): number => {
    const rect = getWeappMenuButtonRect()
    if (!rect) return fallbackTopPx

    const top = rect.top || 0
    const height = rect.height || 32
    // Perfect vertical center alignment with the capsule button
    return Math.max(0, Math.round(top + (height - closeHeightPx) / 2))
}

