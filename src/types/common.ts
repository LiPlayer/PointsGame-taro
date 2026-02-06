/**
 * Common Type Definitions
 */

export interface UserData {
    points: number
    lastUpdatedAt: number
    dailyPlayCount: number
    bestScores: Record<string, number>
    _id?: string
    _openid?: string
}

export interface PointRecord {
    id: string
    amount: number
    type: 'earn' | 'pay' | 'share'
    timestamp: number
    description: string
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'tt' | 'h5' | 'rn' | 'qq' | 'jd' | 'quickapp'
        }
    }
}
