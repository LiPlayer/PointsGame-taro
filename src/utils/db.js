import Taro from '@tarojs/taro';

const COLLECTION_NAME = 'users';
const LOCAL_STORAGE_KEY = 'user_data_db';

const currentEnv = Taro.getEnv();
const isWeapp = currentEnv === Taro.ENV_TYPE.WEAPP;

/**
 * Get current user openid (WeApp only)
 */
async function getOpenID() {
    if (!isWeapp) return 'mock-id';
    try {
        const { result } = await Taro.cloud.callFunction({ name: 'login' });
        return result.openid;
    } catch (e) {
        // Fallback or use a different method if login function isn't deployed
        return null;
    }
}
export function initDatabase() {
    if (isWeapp) {
        if (!Taro.cloud) {
            console.error('请在微信开发者工具中开启云开发能力');
            return;
        }
        // 注意：在实际使用中，env ID 建议从配置文件读取
        try {
            Taro.cloud.init({
                traceUser: true,
            });
            console.log('[DB] WeChat Cloud initialized. Env:', Taro.getEnv());
        } catch (e) {
            console.error('[DB] WeChat Cloud init failed. Check if Cloud IDs are configured in project.config.json or cloud.init:', e);
        }
    } else {
        console.log('[DB] H5 Mock Database active');
    }
}

/**
 * Get User Data from DB
 */
export async function getDBUser() {
    const localData = Taro.getStorageSync(LOCAL_STORAGE_KEY);

    if (isWeapp) {
        try {
            const db = Taro.cloud.database();
            const { data } = await db.collection(COLLECTION_NAME).limit(1).get();
            const cloudData = data[0] || null;

            // Merge Logic: Use the one with the latest timestamp
            if (cloudData && localData) {
                const cloudDateStr = cloudData.lastUpdatedAt ? new Date(cloudData.lastUpdatedAt).toLocaleString() : 'N/A';
                const localDateStr = localData.lastUpdatedAt ? new Date(localData.lastUpdatedAt).toLocaleString() : 'N/A';
                console.log(`[DB] Sync Check - Cloud: ${Math.floor(cloudData.points)}pts (${cloudDateStr}), Local: ${Math.floor(localData.points)}pts (${localDateStr})`);

                if ((cloudData.lastUpdatedAt || 0) >= (localData.lastUpdatedAt || 0)) {
                    console.log('[DB] Cloud is newer or equal, using cloud');
                    // Sync local to match cloud just in case
                    Taro.setStorageSync(LOCAL_STORAGE_KEY, cloudData);
                    return cloudData;
                } else {
                    console.log('[DB] Local is newer! Using local fallback');
                    return localData;
                }
            } else if (cloudData) {
                console.log(`[DB] No local data, using cloud: ${cloudData.points}pts`);
                Taro.setStorageSync(LOCAL_STORAGE_KEY, cloudData);
                return cloudData;
            } else if (localData) {
                console.log(`[DB] No cloud data, using local: ${localData.points}pts`);
                return localData;
            }

            console.log('[DB] No user data found in any source');
            return null;
        } catch (e) {
            console.error('[DB] Cloud fetch failed, using local fallback:', e);
            return localData || null;
        }
    } else {
        // H5 Mock with minor delay
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(localData || null);
            }, 100);
        });
    }
}

/**
 * Save/Update User Data (Upsert)
 */
export async function saveDBUser(data) {
    // 1. Always save to Local Storage first for immediate reliability
    Taro.setStorageSync(LOCAL_STORAGE_KEY, data);
    console.log(`[DB] Saving data: ${Math.floor(data.points)}pts (precise: ${data.points}), timestamp: ${data.lastUpdatedAt}`);

    if (isWeapp) {
        try {
            const db = Taro.cloud.database();
            const users = db.collection(COLLECTION_NAME);

            // Explicitly query by openid would be better, but limit(1) usually works in user-private mode.
            // Let's at least log the doc count.
            const { data: existing } = await users.limit(1).get();

            if (existing.length > 0) {
                // Update
                const docId = existing[0]._id;
                const { _id, _openid, openid, id, ...updateBody } = data;

                if (typeof updateBody.points === 'number') {
                    updateBody.points = Math.floor(updateBody.points);
                }

                const res = await users.doc(docId).update({
                    data: updateBody
                });

                if (res.stats && res.stats.updated === 0) {
                    console.warn('[DB] Cloud update failed: 0 docs updated. Check permissions.');
                } else {
                    console.log('[DB] Cloud sync success');
                }
                return { success: true };
            } else {
                // Add
                const { _id, _openid, openid, id, ...addBody } = data;
                if (typeof addBody.points === 'number') {
                    addBody.points = Math.floor(addBody.points);
                }
                await users.add({
                    data: addBody
                });
                console.log('[DB] Cloud initial record created');
                return { success: true };
            }
        } catch (e) {
            console.error('[DB] Cloud save failed!', e);
            return { success: false, error: e };
        }
    } else {
        // H5 Mock
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 50);
        });
    }
}
