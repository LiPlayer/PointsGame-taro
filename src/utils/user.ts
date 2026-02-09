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

let isEvaporationPaused = false
let pauseStartTime: number | null = null

export function setEvaporationPaused(paused: boolean) {
    console.log('[User] Evaporation paused:', paused)

    if (paused) {
        if (!isEvaporationPaused) {
            isEvaporationPaused = true
            pauseStartTime = Date.now()
        }
    } else {
        if (isEvaporationPaused && pauseStartTime && userData) {
            const now = Date.now()
            const pausedDuration = now - pauseStartTime

            // Shift lastUpdatedAt forward by the pause duration
            // This makes it as if time stood still during the pause
            userData.lastUpdatedAt += pausedDuration
            console.log('[User] Evaporation resumed. Time shifted by:', pausedDuration, 'ms')

            // Save the adjusted time to DB so it persists
            saveUserData()

            isEvaporationPaused = false
            pauseStartTime = null
        } else {
            // Just in case
            isEvaporationPaused = false
            pauseStartTime = null
        }
    }
}

export async function saveUserData(): Promise<void> {
    if (!userData) return
    try {
        // Create a copy to save integer points without modifying in-memory float points
        const dataToSave = { ...userData, points: Math.round(userData.points) }
        await saveDBUser(dataToSave)
    } catch (e) {
        console.error('[User] Save failed:', e)
    }
}

export function refreshPoints(forceSave: boolean = false): number {
    if (!userData) return 0

    // If paused, return current points without decay
    if (isEvaporationPaused) {
        return userData.points
    }

    const currentPoints = calculateCurrentPoints(userData.points, userData.lastUpdatedAt)

    if (currentPoints !== userData.points) {
        userData.points = currentPoints
        // Don't update lastUpdatedAt on every decay tick to preserve precision? 
        // Actually economy model needs lastUpdatedAt to stay fixed until an Interaction happens?
        // Wait, calculateCurrentPoints uses (now - lastUpdatedAt). 
        // If we update lastUpdatedAt every tick, deltaH is small.
        // Standard implementation: 
        // - Either we DON'T update lastUpdatedAt (just calc view), 
        // - OR we update points and update lastUpdatedAt. 
        // The economy model P_real(t) assumes P_last is fixed at t_0. 
        // If we update continuously: P(t+dt) from P(t). 
        // Continuous decay.
        // Let's stick to updating both.

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

    // Force refresh before update
    refreshPoints(true)

    // Apply delta (keep float precision in memory)
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
            // Update local cache immediately to reflect deduction
            userData.points -= amount
            userData.lastUpdatedAt = Date.now()
            await saveUserData()

            return { success: true }
        } else {
            return { success: false, error: result.error || 'Transfer failed' }
        }
    } catch (e: any) {
        console.error('[User] Transfer failed:', e)
        return { success: false, error: e.message || 'Network error' }
    }
}

/**
 * Start listening for real-time points updates (WeChat only)
 * @param onPointsChange Callback when points change
 * @returns Unsubscribe function
 */
export function startPointsListener(onPointsChange: (points: number) => void): () => void {
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP || !userData || !userData._id) {
        // Not supported or user not ready
        return () => { }
    }

    try {
        const db = Taro.cloud.database()
        const watcher = (db.collection('users').doc(userData._id) as any).watch({
            onChange: function (snapshot: any) {
                // Check if doc exists and has data
                if (snapshot.docs && snapshot.docs.length > 0) {
                    const freshData = snapshot.docs[0] as UserData

                    // Only update if points changed (ignore local updates if we want, but here we sync everything)
                    // We specifically care about POINTS for the animation
                    if (freshData.points !== userData?.points) {
                        console.log('[User] Watch update:', freshData.points)

                        // Update local cache
                        if (userData) {
                            userData.points = freshData.points
                            userData.lastUpdatedAt = freshData.lastUpdatedAt
                            userData.dailyPlayCount = freshData.dailyPlayCount
                        }

                        // Notify UI
                        onPointsChange(freshData.points)
                    }
                }
            },
            onError: function (err: any) {
                console.error('[User] Watch error:', err)
            }
        })

        // Return unsubscribe function
        return () => {
            watcher.close()
        }
    } catch (e) {
        console.error('[User] Failed to start watcher:', e)
        return () => { }
    }
}
