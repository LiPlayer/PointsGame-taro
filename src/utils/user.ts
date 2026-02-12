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
            // 1. Call Cloud Login (which now handles Create/Get)
            const loginRes = await login()

            if (loginRes.success && loginRes.userData) {
                // Cloud returned valid data (New or Existing)
                userData = loginRes.userData

                // Cache it locally
                Taro.setStorageSync('user_data_db', userData)
            } else {
                // Fallback: Try local cache if Cloud fails (Offline mode?)
                // Or if H5 mock
                const data = await getDBUser()
                if (data) {
                    userData = data
                } else {
                    // Last Resort: Local Mock (will fail to save if Cloud enforces Admin-Only, but keeps app running)
                    userData = { ...DEFAULT_USER_DATA, lastUpdatedAt: Date.now() }
                    console.warn('[User] Using temporary local session')
                }
            }

            // Post-init processing
            if (userData) {
                // Determine implicit openid if missing (H5)
                if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP && !userData._openid) {
                    userData._openid = 'MOCK_OPENID_12345'
                }
            }
        } catch (e) {
            console.error('[User] Data init failed:', e)
            // Error resilience: don't crash, just give empty user
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

/**
 * Calculate the current points for display (extrapolation)
 * Does NOT update the underlying userData state.
 */
export function getDecayedPoints(): number {
    if (!userData) return 0
    if (isEvaporationPaused) return userData.points

    return calculateCurrentPoints(userData.points, userData.lastUpdatedAt)
}


export async function updatePoints(delta: number): Promise<number> {
    if (!userData) await initUserData()
    if (!userData) return 0 // Should not happen after init

    // Calculate current points before applying delta
    const currentBase = getDecayedPoints()
    userData.points = currentBase

    // Optimistic Update (UI reacts instantly)
    // We update the local memory state so the UI shows the new score immediately
    userData.points += delta
    userData.lastUpdatedAt = Date.now()

    // Save to LocalStorage for offline persistence/backup
    Taro.setStorageSync('user_data_db', userData)

    try {
        if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
            // Security: Call Cloud Function instead of direct DB write
            const res = await Taro.cloud.callFunction({
                name: 'updatePoints',
                data: {
                    action: delta >= 0 ? 'add' : 'deduct',
                    points: Math.abs(delta)
                }
            })
            const result = res.result as any
            if (!result.success) {
                console.error('[User] Cloud update failed:', result.error)
                // Rollback local state on error? 
                // For "Zero Friction", we might just log it. 
                // Serious implementation would rollback.
            }
        } else {
            // H5 Mock
            console.log('[User] H5 Mock Update:', delta)
            await saveUserData()
        }
    } catch (e) {
        console.error('[User] Update points failed:', e)
    }

    return userData.points
}

export async function login(): Promise<{ success: boolean; error?: any; userData?: UserData }> {
    try {
        if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
            // Call the enhanced cloud function
            const res = await Taro.cloud.callFunction({
                name: 'login'
            })
            const result = res.result as any

            if (result.userData) {
                return { success: true, userData: result.userData }
            } else {
                return { success: true } // Just openid, no user data (shouldn't happen with new logic)
            }
        } else {
            console.log('[Login] H5 Mock success')
            // Mock return
            return {
                success: true,
                userData: await getDBUser() || { ...DEFAULT_USER_DATA, _openid: 'MOCK_OPENID_12345' }
            }
        }
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
