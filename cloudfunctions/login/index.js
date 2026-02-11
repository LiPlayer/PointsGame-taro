// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const db = cloud.database();
    const _ = db.command;

    try {
        // 1. Check if user exists
        const userRes = await db.collection('users').where({
            _openid: openid
        }).get();

        if (userRes.data.length > 0) {
            // User exists
            return {
                openid: openid,
                isNew: false,
                userData: userRes.data[0]
            };
        } else {
            // 2. Create new user
            const now = new Date().getTime();
            const newUser = {
                _openid: openid, // Explicitly set, though Cloud handles it
                points: 0,
                lastUpdatedAt: now,
                dailyPlayCount: 0,
                bestScores: {},
                createdAt: now
            };

            const addRes = await db.collection('users').add({
                data: newUser
            });

            return {
                openid: openid,
                isNew: true,
                userData: { ...newUser, _id: addRes._id }
            };
        }
    } catch (err) {
        console.error('[Cloud Login] Error:', err);
        return {
            error: err,
            openid: openid // Return openid regardless so rudimentary checks pass
        };
    }
};
