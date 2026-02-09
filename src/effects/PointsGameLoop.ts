import { GameLoop as BaseGameLoop } from '../engine/GameLoop'
import { PhysicsSystem } from './PointsPhysics'
import { RenderSystem } from './PointsRender'
import { PHYSICS_CONFIG } from './constants'

/**
 * 积分粒子游戏循环 (Points Particle Game Loop)
 * 继承通用 GameLoop，添加粒子专用方法
 */
export class GameLoop extends BaseGameLoop {
    // Pointer interaction
    private pointer = { x: 0, y: 0, active: false }

    // Typed getters for particle-specific access
    private get pointsPhysics(): PhysicsSystem { return this.physics as PhysicsSystem }
    private get pointsRenderer(): RenderSystem { return this.renderer as RenderSystem }

    constructor(pixi: any, canvas: any, width: number, height: number) {
        const physics = new PhysicsSystem()
        const renderer = new RenderSystem(pixi)

        super(physics, renderer, canvas, width, height)
    }

    // ========== 积分粒子专用方法 ==========

    public addStar(x: number, y: number): void {
        const id = this.pointsPhysics.addParticle(x, y)
        if (id !== -1) {
            const rad = PHYSICS_CONFIG.particle.visualRadius
            const z = this.pointsPhysics.zs[id]
            this.pointsRenderer.addSprite(id, x, y, rad, z)
        }
    }

    public removeStars(count: number): void {
        this.pointsPhysics.consume(count)
    }

    public explode(power?: number): void {
        this.pointsPhysics.applyExplosion(this.width / 2, this.height / 2, power)
    }

    public getStarCount(): number {
        return this.pointsPhysics.getStarCount()
    }

    public setPointer(x: number, y: number, active: boolean): void {
        this.pointer.x = x
        this.pointer.y = y
        this.pointer.active = active
    }

    public clear(): void {
        this.pointsPhysics.clear()
        this.pointsRenderer.clear()
    }

    public resize(width: number, height: number): void {
        super.resize(width, height)
        this.pointsRenderer.resize(width, height)
    }

    // ========== 覆写固定更新 ==========

    protected onFixedUpdate(): void {
        if (this.pointer.active) {
            this.pointsPhysics.applyRepulsion(this.pointer.x, this.pointer.y)
        }
    }
}
