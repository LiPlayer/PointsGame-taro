import Taro from '@tarojs/taro'
import { calculateCurrentPoints } from './economy'
import { getDBUser, saveDBUser } from './db'
import { UserData } from '../types/common'

const DEFAULT_USER_DATA: UserData = {
    _openid: Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? undefined : 'MOCK_OPENID_12345',
    points: 0, // Reset to 0 as requested
    lastUpdatedAt: Date.now(),
    dailyPlayCount: 0,
    bestScores: {}
}

let userData: UserData | null = null
let initPromise: Promise<UserData> | null = null

export async function initUserData(): Promise<UserData> {
    // 1. If data exists, return immediately
    if (userData) return userData

    // 2. If initialization is in progress, wait for it (Concurrency Lock)
    if (initPromise) {
        return await initPromise
    }

    // 3. Start initialization
    initPromise = (async () => {
        try {
            const data = await getDBUser()
            if (data) {
                userData = data
                // Guarantee _openid in non-weapp environments for QR generation
                if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP && !userData._openid) {
                    userData._openid = 'MOCK_OPENID_12345'
                }
                refreshPoints()
            } else {
                // New user: Create and Save
                userData = { ...DEFAULT_USER_DATA, lastUpdatedAt: Date.now() }
                await saveUserData()

                // CRITICAL: Fetch again to get the system-generated _openid
                if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
                    const savedData = await getDBUser()
                    if (savedData) {
                        userData = savedData
                        console.log('[User] New user created, synced openid:', userData._openid)
                    }
                }
            }
        } catch (e) {
            console.error('[User] Data init failed:', e)
            userData = { ...DEFAULT_USER_DATA, lastUpdatedAt: Date.now() }
        } finally {
            initPromise = null // Reset lock
        }
        return userData as UserData
    })()

    return await initPromise
}

export async function saveUserData(): Promise<void> {
    if (!userData) return
    try {
        await saveDBUser(userData)
    } catch (e) {
        console.error('[User] Save failed:', e)
    }
}

export function refreshPoints(forceSave: boolean = false): number {
    if (!userData) return 0
    const currentPoints = calculateCurrentPoints(userData.points, userData.lastUpdatedAt)

    if (currentPoints !== userData.points) {
        userData.points = currentPoints
        userData.lastUpdatedAt = Date.now()
        if (forceSave) {
            saveUserData()
        }
    }
    return userData.points
}

export async function updatePoints(delta: number): Promise<number> {
    if (!userData) await initUserData()
    if (!userData) return 0 // Should not happen after init

    refreshPoints(true)

    userData.points += delta
    userData.lastUpdatedAt = Date.now()

    await saveUserData()
    return userData.points
}

export async function login(): Promise<{ success: boolean; error?: any }> {
    try {
        if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
            const { code } = await Taro.login()
            console.log('[Login] WeChat success, code:', code)
        } else {
            console.log('[Login] H5 Mock success')
        }

        // Note: We deliberately DO NOT call initUserData() here anymore.
        // Data fetching is deferred until the home page or specific features need it.
        return { success: true }
    } catch (e) {
        console.error('[Login] Failed:', e)
        return { success: false, error: e }
    }
}

export function getUserData(): UserData | null {
    return userData
}

export async function transferPoints(amount: number, targetOpenid: string): Promise<{ success: boolean; error?: string }> {
    if (!userData) await initUserData()
    if (!userData) return { success: false, error: 'User data not initialized' }

    try {
        if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
            // H5 Mock transfer
            console.log('[User] H5 Mock Transfer:', { amount, targetOpenid })
            userData.points -= amount
            userData.lastUpdatedAt = Date.now()
            await saveUserData()
            return { success: true }
        }

        const res = await Taro.cloud.callFunction({
            name: 'updatePoints',
            data: {
                action: 'transfer',
                points: amount,
                targetOpenid
            }
        })

        const result = res.result as any
        if (result.success) {
            // Refresh local points after transfer
            await refreshPoints(true)
            return { success: true }
        } else {
            return { success: false, error: result.error || 'Transfer failed' }
        }
    } catch (e: any) {
        console.error('[User] Transfer failed:', e)
        return { success: false, error: e.message || 'Network error' }
    }
}
