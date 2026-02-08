export const PHYSICS_CONFIG = {
    // 物理世界更新频率 (Hz)。推荐 60。
    frequency: 60,
    // 最大粒子数量
    maxParticles: 5000,
    // 物理世界重力坐标。
    gravity: { x: 0, y: 0.5 },
    // 空间网格划分大小 (像素)。影响碰撞检测性能。
    cellSize: 18,
    // 边界与清理
    bounds: {
        bounce: 0.5,       // 墙壁/地面反弹系数
        ceilingMargin: -2000 // 星星飞出此高度后将被清理
    },
    // 粒子（星星）属性
    particle: {
        collisionRadius: 8, // 星星的基础碰撞半径 (从 7 增加到 8)
        visualRadius: 10,   // 星星的基础显示半径 (从 7 增加到 10，产生适度视觉重叠)
        frictionAir: 0.1,  // 空气阻力
        stiffness: 0.3,    // 碰撞硬度
        maxPush: 2,        // 单帧最大碰撞位移偏移
        angularFriction: 0.99 // 自转衰减
    },
    // 消耗/删除动画
    consumption: {
        speed: 0.02,       // 缩放演变速度
        floatForce1: -2,   // 阶段1上浮力
        floatForce2: -1,   // 阶段2上浮力
        phase1Threshold: 0.4 // 阶段1阈值
    },
    // 用户交互属性
    interaction: {
        repulsionRadius: 50,   // 手指排斥范围
        repulsionForce: 2.4    // 触摸推开力度
    }
}

export const RENDER_CONFIG = {
    backgroundColor: 0xFFFFFF,
    backgroundAlpha: 0,
    particleColor: 0xF59E0B, // Amber 500
    particleTextureSize: 64,
    // 最高分辨率限制
    maxDPR: process.env.TARO_ENV === 'weapp' ? 1.5 : 2.0,
    // 深度效果配置
    depth: {
        scaleRange: [0.5, 1.2], // [最小缩放偏移, 最大缩放偏移]
        alphaRange: [0.6, 1.0], // [最小透明度, 最大透明度]
        zLevels: 3              // 随机 Z 轴层级数量
    },
    // 星星形状绘制参数
    shape: {
        outerRadius: 19,
        innerRadius: 9,
        ringPadding: 4,
        bodyPadding: 6
    }
}
