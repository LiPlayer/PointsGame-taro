import * as PIXI from 'pixi.js'
import { RENDER_CONFIG } from './constants'
import { IRenderPipeline } from '../engine/IRenderPipeline'
import { IPhysicsWorld } from '../engine/IPhysicsWorld'
import { PhysicsSystem } from './PointsPhysics'

/**
 * 积分粒子渲染器 (Points Particle Renderer)
 * 实现 IRenderPipeline 接口
 */
export class RenderSystem implements IRenderPipeline {
    private PIXI: any
    private app!: PIXI.Application
    private container!: PIXI.ParticleContainer
    private texture: PIXI.Texture | null = null

    // Sprite 管理
    public sprites: (PIXI.Sprite | null)[] = []
    private baseScales: Float32Array = new Float32Array(5000)
    private baseAlphas: Float32Array = new Float32Array(5000)
    private dpr: number = 1

    constructor(pixi: any) {
        this.PIXI = pixi
    }

    // ========== IRenderPipeline 接口实现 ==========

    public init(canvas: any, width: number, height: number, dpr: number): void {
        this.dpr = dpr
        const PIXI = this.PIXI

        this.app = new PIXI.Application({
            view: canvas,
            width,
            height,
            resolution: dpr,
            autoDensity: true,
            backgroundAlpha: 0,
            antialias: false,
            powerPreference: 'high-performance'
        })

        this.texture = this.createTexture()

        this.container = new PIXI.ParticleContainer(5000, {
            vertices: false,
            position: true,
            rotation: true,
            scale: true,
            uvs: false,
            tint: false,
            alpha: true
        })

        this.app.stage.addChild(this.container)
    }

    public render(physics: IPhysicsWorld, alpha: number): void {
        // 类型断言：我们知道这是 PhysicsSystem
        const p = physics as PhysicsSystem
        this.syncRender(p, alpha)
        this.app.render()
    }

    public destroy(): void {
        this.app.destroy(true, { children: true, texture: true, baseTexture: true })
    }

    // ========== 积分粒子专用方法 ==========

    public addSprite(id: number, x: number, y: number, radius: number, z: number): void {
        if (!this.texture) return

        const sprite = new this.PIXI.Sprite(this.texture)
        sprite.anchor.set(0.5)
        sprite.position.set(x, y)

        const sizeScale = (radius * 2) / RENDER_CONFIG.particleTextureSize
        const scaleRange = RENDER_CONFIG.depth.scaleRange
        const depthScale = scaleRange[0] + z * (scaleRange[1] - scaleRange[0])
        const finalScale = sizeScale * depthScale
        sprite.scale.set(finalScale)
        this.baseScales[id] = finalScale

        let finalAlpha = 1.0
        const alphaRange = RENDER_CONFIG.depth.alphaRange
        if (z <= 0.7) {
            finalAlpha = alphaRange[0] + z * (alphaRange[1] - alphaRange[0])
        }
        sprite.alpha = finalAlpha
        this.baseAlphas[id] = finalAlpha

        this.container.addChild(sprite)
        this.sprites[id] = sprite
    }

    public removeSprite(id: number): void {
        const sprite = this.sprites[id]
        if (sprite) {
            this.container.removeChild(sprite)
            this.sprites[id] = null
            sprite.destroy()
        }
    }

    public clear(): void {
        if (!this.container) return
        this.container.removeChildren()
        for (const sprite of this.sprites) {
            if (sprite) sprite.destroy()
        }
        this.sprites = []
    }

    public resize(width: number, height: number): void {
        this.app.renderer.resize(width, height)
    }

    // ========== 私有方法 ==========

    private syncRender(physics: PhysicsSystem, alpha: number): void {
        const n = physics.particleCount
        const { px, py, ox, oy, ids, states, timers, angles } = physics

        // Cleanup dead particles
        physics.cleanup((id) => {
            this.removeSprite(id)
        })

        for (let i = 0; i < n; i++) {
            const ix = px[i] * alpha + ox[i] * (1 - alpha)
            const iy = py[i] * alpha + oy[i] * (1 - alpha)
            const ir = angles[i]

            let scale = 1
            let opacity = 1

            if (states[i] === 1) {
                const p = timers[i]
                if (p >= 0.4) {
                    const p2 = (p - 0.4) / 0.6
                    opacity = 1 - p2
                    scale = 1 - p2
                }
            }

            this.updateBody(ids[i], ix, iy, ir, scale, opacity)
        }
    }

    private updateBody(id: number, x: number, y: number, rotation: number, scaleMultiplier?: number, alphaMultiplier?: number): void {
        const sprite = this.sprites[id]
        if (sprite) {
            sprite.position.set(x, y)
            sprite.rotation = rotation

            if (scaleMultiplier !== undefined) {
                sprite.scale.set(this.baseScales[id] * scaleMultiplier)
            }
            if (alphaMultiplier !== undefined) {
                sprite.alpha = this.baseAlphas[id] * alphaMultiplier
            }
        }
    }

    private createTexture(): PIXI.Texture {
        const size = RENDER_CONFIG.particleTextureSize
        const shape = RENDER_CONFIG.shape
        const graphics = new this.PIXI.Graphics()
        const cx = size / 2, cy = size / 2, r = size / 2 - shape.ringPadding

        // Ring
        graphics.beginFill(0xFDE68A)
        graphics.drawCircle(cx, cy, r)
        graphics.endFill()

        // White Body
        graphics.beginFill(0xFFFFFF)
        graphics.drawCircle(cx, cy, r - shape.bodyPadding)
        graphics.endFill()

        // Star Shape
        graphics.beginFill(RENDER_CONFIG.particleColor)
        const points: number[] = []
        for (let i = 0; i < 5; i++) {
            const outerR = shape.outerRadius
            const innerR = shape.innerRadius
            const angle1 = (18 + i * 72) * Math.PI / 180
            const angle2 = (54 + i * 72) * Math.PI / 180
            points.push(cx + Math.cos(angle1) * outerR, cy - Math.sin(angle1) * outerR)
            points.push(cx + Math.cos(angle2) * innerR, cy - Math.sin(angle2) * innerR)
        }
        graphics.drawPolygon(points)
        graphics.endFill()

        return this.app.renderer.generateTexture(graphics)
    }
}
