import Taro from '@tarojs/taro'
import { calculateCurrentPoints } from './economy'
import { getDBUser, saveDBUser } from './db'
import { UserData } from '../types/common'

const DEFAULT_USER_DATA: UserData = {
    points: 1240,
    lastUpdatedAt: Date.now(),
    dailyPlayCount: 0,
    bestScores: {}
}

let userData: UserData | null = null

export async function initUserData(): Promise<UserData> {
    try {
        const data = await getDBUser()
        if (data) {
            userData = data
            refreshPoints()
        } else {
            userData = { ...DEFAULT_USER_DATA, lastUpdatedAt: Date.now() }
            await saveUserData()
        }
    } catch (e) {
        console.error('[User] Data init failed:', e)
        userData = { ...DEFAULT_USER_DATA, lastUpdatedAt: Date.now() }
    }
    return userData as UserData
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

export async function login(): Promise<{ success: boolean; userData?: UserData; error?: any }> {
    try {
        if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
            const { code } = await Taro.login()
            console.log('[Login] WeChat success, code:', code)
        } else {
            console.log('[Login] H5 Mock success')
        }

        const data = await initUserData()
        return { success: true, userData: data }
    } catch (e) {
        console.error('[Login] Failed:', e)
        return { success: false, error: e }
    }
}

export function getUserData(): UserData | null {
    return userData
}
