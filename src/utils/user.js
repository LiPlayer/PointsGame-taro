import Taro from '@tarojs/taro';
import { calculateCurrentPoints } from './economy';
import { getDBUser, saveDBUser } from './db';

const DEFAULT_USER_DATA = {
    points: 1240,
    lastUpdatedAt: Date.now(),
    dailyPlayCount: 0,
    bestScores: {}
};

let userData = null;

export async function initUserData() {
    try {
        const data = await getDBUser();
        if (data) {
            userData = data;
            console.log(`[User] Data loaded: ${userData.points}pts, lastUpdate: ${new Date(userData.lastUpdatedAt).toLocaleString()}`);
            // Apply evaporation on load
            refreshPoints();
        } else {
            console.log('[User] No existing user, creating default');
            userData = { ...DEFAULT_USER_DATA, lastUpdatedAt: Date.now() };
            await saveUserData();
        }
    } catch (e) {
        console.error('[User] Data init failed:', e);
        userData = { ...DEFAULT_USER_DATA, lastUpdatedAt: Date.now() };
    }
    return userData;
}

export async function saveUserData() {
    if (!userData) return;
    try {
        await saveDBUser(userData);
    } catch (e) {
        console.error('[User] Save failed:', e);
    }
}

/**
 * Calculate current points and update in-memory data
 * @param {boolean} forceSave - Whether to persist to DB immediately
 * @returns {number} Calculated points
 */
export function refreshPoints(forceSave = false) {
    if (!userData) return 0;
    const currentPoints = calculateCurrentPoints(userData.points, userData.lastUpdatedAt);

    if (currentPoints !== userData.points) {
        userData.points = currentPoints;
        userData.lastUpdatedAt = Date.now();
        if (forceSave) {
            saveUserData();
        }
    }
    return userData.points;
}

export async function updatePoints(delta) {
    if (!userData) await initUserData();

    refreshPoints(true);

    userData.points += delta;
    userData.lastUpdatedAt = Date.now();

    await saveUserData();
    return userData.points;
}

export async function login() {
    try {
        if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
            const { code } = await Taro.login();
            console.log('[Login] WeChat success, code:', code);
        } else {
            console.log('[Login] H5 Mock success');
        }

        await initUserData();
        return { success: true, userData };
    } catch (e) {
        console.error('[Login] Failed:', e);
        return { success: false, error: e };
    }
}

export function getUserData() {
    return userData;
}
