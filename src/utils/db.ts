import Taro from '@tarojs/taro'
import { UserData } from '../types/common'

const COLLECTION_NAME = 'users'
const LOCAL_STORAGE_KEY = 'user_data_db'

const currentEnv = Taro.getEnv()
const isWeapp = currentEnv === Taro.ENV_TYPE.WEAPP

export function initDatabase() {
    if (isWeapp) {
        if (!Taro.cloud) {
            console.error('请在微信开发者工具中开启云开发能力')
            return
        }
        try {
            Taro.cloud.init({
                traceUser: true,
            })
            console.log('[DB] WeChat Cloud initialized. Env:', Taro.getEnv())
        } catch (e) {
            console.error('[DB] WeChat Cloud init failed:', e)
        }
    } else {
        console.log('[DB] H5 Mock Database active')
    }
}

/**
 * Get User Data from DB
 */
export async function getDBUser(): Promise<UserData | null> {
    const localData = Taro.getStorageSync(LOCAL_STORAGE_KEY) as UserData | null

    if (isWeapp) {
        try {
            const db = Taro.cloud.database()
            const { data } = await db.collection(COLLECTION_NAME)
                .where({
                    _openid: '{openid}' // Explicitly query current user's data
                })
                .limit(1)
                .get()

            const cloudData = (data[0] || null) as UserData | null

            // Sync/Merge logic
            if (cloudData && localData) {
                // If cloud data is same or newer, sync to local
                if ((cloudData.lastUpdatedAt || 0) >= (localData.lastUpdatedAt || 0)) {
                    Taro.setStorageSync(LOCAL_STORAGE_KEY, cloudData)
                    return cloudData
                } else {
                    return localData
                }
            } else if (cloudData) {
                Taro.setStorageSync(LOCAL_STORAGE_KEY, cloudData)
                return cloudData
            } else if (localData) {
                return localData
            }

            return null
        } catch (e) {
            console.error('[DB] Fetch failed:', e)
            return localData || null
        }
    } else {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(localData || null)
            }, 100)
        })
    }
}

/**
 * Save/Update User Data (Upsert)
 */
export async function saveDBUser(data: UserData): Promise<{ success: boolean; error?: any }> {
    Taro.setStorageSync(LOCAL_STORAGE_KEY, data)

    if (isWeapp) {
        try {
            const db = Taro.cloud.database()
            const users = db.collection(COLLECTION_NAME)
            const { data: existing } = await users.limit(1).get()

            if (existing.length > 0) {
                const docId = existing[0]._id
                if (docId === undefined || docId === null) {
                    throw new Error('[DB] Missing document _id for existing user record')
                }
                const { _id, _openid, ...updateBody } = data as any

                if (typeof updateBody.points === 'number') {
                    updateBody.points = Math.floor(updateBody.points)
                }

                await users.doc(docId).update({
                    data: updateBody
                })
                return { success: true }
            } else {
                const { _id, _openid, ...addBody } = data as any
                if (typeof addBody.points === 'number') {
                    addBody.points = Math.floor(addBody.points)
                }
                await users.add({
                    data: addBody
                })
                return { success: true }
            }
        } catch (e) {
            console.error('[DB] Cloud save failed!', e)
            return { success: false, error: e }
        }
    } else {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true })
            }, 50)
        })
    }
}
