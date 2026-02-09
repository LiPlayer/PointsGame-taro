export const PHYSICS_CONFIG = {
    frequency: 60,              // 物理世界更新频率 (Hz)
    maxParticles: 5000,         // 最大粒子数量
    gravity: { x: 0, y: 0.5 },  // 物理世界重力
    cellSize: 15,               // 空间网格划分大小 (像素)

    bounds: {
        bounce: 0.4,            // 边界反弹系数
        ceilingMargin: -2000,   // 天花板清理边界
        collisionPasses: 3      // PBD约束求解次数
    },

    particle: {
        collisionRadius: 6,     // 碰撞半径
        visualRadius: 6,        // 视觉半径
        damping: 0.95,          // PBD速度衰减 (0.95~0.99)
        angularDamping: 0.0     // 旋转阻尼
    },

    consumption: {
        speed: 0.02,            // 消失动画速度
        floatForce1: -2,        // 阶段1上浮力
        floatForce2: -1,        // 阶段2上浮力
        phase1Threshold: 0.4    // 阶段1阈值
    },

    interaction: {
        repulsionRadius: 40,    // 交互范围
        repulsionForce: 16.0    // 排斥力
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
