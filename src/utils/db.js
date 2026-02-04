import Taro from '@tarojs/taro';

const COLLECTION_NAME = 'users';
const LOCAL_STORAGE_KEY = 'user_data_db';

const currentEnv = Taro.getEnv();
const isWeapp = currentEnv === Taro.ENV_TYPE.WEAPP;

/**
 * Initialize Database Environment
 */
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
                // env: 'points-game-xxx' 
            });
            console.log('[DB] WeChat Cloud initialized');
        } catch (e) {
            console.error('[DB] WeChat Cloud init failed:', e);
        }
    } else {
        console.log('[DB] H5 Mock Database active');
    }
}

/**
 * Get User Data from DB
 */
export async function getDBUser() {
    if (isWeapp) {
        try {
            const db = Taro.cloud.database();
            // 在云函数外，where({_openid: '{openid}'}) 是默认行为，简写为 limit(1)
            const { data } = await db.collection(COLLECTION_NAME).limit(1).get();
            return data[0] || null;
        } catch (e) {
            console.error('[DB] Failed to fetch user from Cloud:', e);
            return null;
        }
    } else {
        // H5 Mock with minor delay
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const data = Taro.getStorageSync(LOCAL_STORAGE_KEY);
                    resolve(data || null);
                } catch (e) {
                    resolve(null);
                }
            }, 100);
        });
    }
}

/**
 * Save/Update User Data (Upsert)
 */
export async function saveDBUser(data) {
    if (isWeapp) {
        try {
            const db = Taro.cloud.database();
            const users = db.collection(COLLECTION_NAME);

            const { data: existing } = await users.limit(1).get();

            if (existing.length > 0) {
                // Update
                const docId = existing[0]._id;
                // 移除数据中的 _id 和 _openid 避免更新冲突
                const { _id, _openid, ...updateBody } = data;
                return await users.doc(docId).update({
                    data: updateBody
                });
            } else {
                // Add
                return await users.add({
                    data: data
                });
            }
        } catch (e) {
            console.error('[DB] Failed to save user to Cloud:', e);
            throw e;
        }
    } else {
        // H5 Mock
        return new Promise((resolve) => {
            setTimeout(() => {
                Taro.setStorageSync(LOCAL_STORAGE_KEY, data);
                resolve(true);
            }, 50);
        });
    }
}
