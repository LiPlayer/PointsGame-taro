export const PHYSICS_CONFIG = {
    // 物理世界更新频率 (Hz)。
    frequency: 60,
    // 最大粒子数量
    maxParticles: 5000,
    // 物理世界重力
    gravity: { x: 0, y: 0.5 }, // 调优: 降低重力 (0.35 -> 0.25) 减少挤压抖动
    // 空间网格划分大小 (像素)
    cellSize: 15,
    // 墙壁厚度
    wallThickness: 100,
    // 边界与清理逻辑
    bounds: {
        bounce: 0.4,        // 调优: 降低反弹 (0.5 -> 0.4) 帮助静止
        ceilingMargin: -2000,
        collisionPasses: 3   // 调优: 增加解算次数 (2 -> 3) 提高稳定性
    },
    // 粒子（星星）物理与展示属性
    particle: {
        collisionRadius: 6.5,
        visualRadius: 6,
        frictionAir: 0.05,   // 调优: 增加阻力 (0.04 -> 0.12) 吸收震荡能量
        collisionFriction: 0.5, // 碰撞摩擦力: 粒子相互碰撞时损失的动能 (0.0 ~ 1.0)
        stiffness: 0.5,      // 调优: 降低硬度 (0.8 -> 0.6) 减少剧烈回弹
        maxPush: 6,          // 调优: 降低最大推力 (8 -> 6) 防止穿模爆发
        angularFriction: 1.0 // 旋转阻尼
    },
    // 消耗/删除动画
    consumption: {
        speed: 0.02,       // 缩放速度
        floatForce1: -2,   // 阶段1上浮力
        floatForce2: -1,   // 阶段2上浮力
        phase1Threshold: 0.4 // 阶段1阈值
    },
    // 用户交互属性
    interaction: {
        repulsionRadius: 40,   // 交互范围
        repulsionForce: 12.0   // 调优: 大力出奇迹 (1.0 -> 12.0) 对抗高重力
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
