// 云函数：获取用户积分
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    // Prioritize passed openid (for web view), fallback to context (for native)
    const openid = event.openid || wxContext.OPENID;

    try {
        // 查询用户积分
        const res = await db.collection('users').where({ _openid: openid }).get();

        if (res.data.length === 0) {
            // 新用户，创建记录
            await db.collection('users').add({
                data: {
                    _openid: openid,
                    points: 0,
                    collection: [],
                    lastUpdatedAt: db.serverDate(),
                    createdAt: db.serverDate()
                }
            });
            return { points: 0, collection: [], lastUpdatedAt: Date.now() };
        }

        const userData = res.data[0];

        // Convert DB date to timestamp if needed, or return as is (client handles it)
        // Usually db.serverDate() returns a Date object in JS SDK
        return {
            points: userData.points || 0,
            collection: userData.collection || [],
            lastUpdatedAt: userData.lastUpdatedAt || userData.createdAt
        };
    } catch (err) {
        console.error('获取积分失败:', err);
        return { error: err.message };
    }
};
