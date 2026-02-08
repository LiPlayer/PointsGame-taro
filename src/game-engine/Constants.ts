export const PHYSICS_CONFIG = {
    // 物理世界更新频率 (Hz)
    frequency: 60,
    // 物理世界重力
    gravity: { x: 0, y: 0.32 }, // Tuned for 60Hz feel
    // 墙壁厚度
    wallThickness: 100,
    // 粒子属性
    particle: {
        radius: 6,
        friction: 0,      // Matter.js friction is for collision, we use airFriction for damping
        frictionAir: 0.04, // Approx 0.96 per frame damping (1 - 0.96)
        restitution: 0.5, // 弹性
        density: 0.001
    },
    // 交互属性
    interaction: {
        repulsionRadius: 40,
        repulsionForce: 1.2 // Tuned for snappy response
    }
}

export const RENDER_CONFIG = {
    backgroundColor: 0xFFFFFF,
    backgroundAlpha: 0,
    particleColor: 0xF59E0B, // Amber 500
    particleTextureSize: 64,
    // 最高分辨率限制 (Prevent overdraw on high-DPI devices)
    maxDPR: process.env.TARO_ENV === 'weapp' ? 1.5 : 2.0
}
