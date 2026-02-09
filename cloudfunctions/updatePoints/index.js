// 云函数：更新用户积分
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openid = event.openid || wxContext.OPENID;
    const { action, points, targetOpenid, gameId } = event;

    // --- Evaporation Logic Start ---
    const P_MAX = 1280;
    const DAYS_TO_CAP = 7;
    const G_DAILY = (8 * P_MAX) / (7 * DAYS_TO_CAP);
    const LAMBDA = G_DAILY / (24 * Math.pow(P_MAX, 3));

    const calculateEvaporatedPoints = (lastPoints, lastUpdatedAtDate) => {
        if (!lastPoints || lastPoints <= 0) return 0;
        if (!lastUpdatedAtDate) return lastPoints;

        const now = Date.now();
        const lastTime = lastUpdatedAtDate instanceof Date
            ? lastUpdatedAtDate.getTime()
            : new Date(lastUpdatedAtDate).getTime();

        const deltaH = (now - lastTime) / (1000 * 60 * 60);
        if (deltaH <= 0) return lastPoints;

        const denominator = Math.sqrt(1 + 2 * LAMBDA * Math.pow(lastPoints, 2) * deltaH);
        return Math.round(lastPoints / denominator);
    };
    // --- Evaporation Logic End ---

    try {
        // 1. Get current user data to apply evaporation
        const userRes = await db.collection('users').where({ _openid: openid }).get();
        let user = null;

        if (userRes.data.length > 0) {
            user = userRes.data[0];

            // Apply Evaporation
            const evaporatedPoints = calculateEvaporatedPoints(user.points, user.lastUpdatedAt || user.createdAt);

            // Update Base Points to Evaporated Value first (in memory)
            user.points = evaporatedPoints;
        } else {
            // Should not happen usually if flows are correct, but handle safely
            // Implicitly create if missing? Better to error or handle gracefully.
            // For now assume user exists or handled by getPoints
            return { error: 'User not found' };
        }

        switch (action) {
            case 'add':
                // 增加积分: Evaporated + New
                const newPointsAdd = Math.floor(user.points + points);
                await db.collection('users').where({ _openid: openid }).update({
                    data: {
                        points: newPointsAdd,
                        lastUpdatedAt: db.serverDate()
                    }
                });
                break;

            case 'addGame':
                // 添加游戏到收藏 (No point change, but explicit update time? Maybe not needed for collection)
                // But if we want to sync evaporation, we might as well update points to evaporated value?
                // Spec says: "每次 Update (Use/Earn) 时，先计算并扣除蒸发量"
                // Collection update might not trigger point update, but to keep consistent, let's just update collection only
                // OR update points alongside? Let's stick to updating points ONLY when points change to minimize writes/complexity
                // unless spec "Update (Use/Earn)" implies ANY update. 
                // Let's safe-keep: Only update collection here.
                await db.collection('users').where({ _openid: openid }).update({
                    data: { collection: _.addToSet(gameId) }
                });
                break;

            case 'transfer':
                // 积分转移
                // 1. Sender: Evaporated - Points
                const newPointsSender = Math.floor(user.points - points);
                if (newPointsSender < 0) return { error: 'Points insufficient' };

                // Validate: Use _openid to match system field
                const senderRes = await db.collection('users').where({ _openid: openid }).update({
                    data: {
                        points: newPointsSender,
                        lastUpdatedAt: db.serverDate()
                    }
                });

                if (senderRes.stats.updated === 0) {
                    return { error: 'Sender update failed' };
                }

                // 2. Receiver: Add directly
                // Use _openid to match system field
                // Ensure receiver exists or fail? For now, if receiver not found, sender already deducted.
                // Ideally this should be a transaction. But for simple impl, we try to update receiver.
                // If receiver fails, points are lost (burned). This is acceptable for now vs complexity.
                const receiverRes = await db.collection('users').where({ _openid: targetOpenid }).update({
                    data: { points: _.inc(points) }
                });

                if (receiverRes.stats.updated === 0) {
                    // Start Rollback (Optional but good) or just Warning
                    console.warn(`Receiver [${targetOpenid}] not found, points burned.`);
                    // Recover sender?
                    await db.collection('users').where({ _openid: openid }).update({
                        data: { points: _.inc(points) }
                    });
                    return { error: 'Receiver not found' };
                }
                break;

            case 'deduct':
                // 扣除积分: Evaporated - Points
                const newPointsDeduct = Math.floor(user.points - points);
                if (newPointsDeduct < 0) return { error: 'Insufficient points' };

                await db.collection('users').where({ openid }).update({
                    data: {
                        points: newPointsDeduct,
                        lastUpdatedAt: db.serverDate()
                    }
                });
                break;

            default:
                return { error: 'Unknown action' };
        }

        return { success: true };
    } catch (err) {
        console.error('更新积分失败:', err);
        return { error: err.message };
    }
};
