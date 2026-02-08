import * as PIXI from 'pixi.js' // We need to import the whole namespace or specific parts based on how pixi.js exposes itself in this environment
// However, the user environment seems to use specific imports or global PIXI. Let's stick to standard imports first.
// If it fails, I will adjust. The previous files used `import { Application } from 'pixi.js'` style or `PIXI.Application`.
// Let's assume `import * as PIXI` is safe or `import { ... }`.
// Checking `usePixi.ts`, it uses `import { Application } from '@pixi/app'` etc, but also `import * as PIXI`.
// I will use `import * as PIXI` to be safe and compatible with v7.

import { RENDER_CONFIG, PHYSICS_CONFIG } from './Constants'

export class RenderSystem {
    private PIXI: any // Stored injected module
    public app: PIXI.Application
    public container: PIXI.ParticleContainer
    public texture: PIXI.Texture | null = null

    // 存储渲染实体数组: index -> PixiSprite
    public sprites: (PIXI.Sprite | null)[] = []
    private baseScales: Float32Array = new Float32Array(5000)
    private baseAlphas: Float32Array = new Float32Array(5000)
    private dpr: number

    constructor(pixi: any, canvas: any, width: number, height: number, dpr: number) {
        this.PIXI = pixi
        this.dpr = dpr
        const PIXI = pixi // Keep local shadow for constructor logic
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

        this.texture = this.createTexture() // Moved and renamed property

        // 使用 ParticleContainer 提升 1000+ 粒子的渲染性能
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

    public addSprite(id: number, x: number, y: number, radius: number, z: number) {
        if (!this.texture) return

        const sprite = new this.PIXI.Sprite(this.texture)
        sprite.anchor.set(0.5)
        sprite.position.set(x, y)

        // 匹配配置中的缩放公式
        const sizeScale = (radius * 2) / RENDER_CONFIG.particleTextureSize
        const scaleRange = RENDER_CONFIG.depth.scaleRange
        const depthScale = scaleRange[0] + z * (scaleRange[1] - scaleRange[0])
        const finalScale = sizeScale * depthScale
        sprite.scale.set(finalScale)
        this.baseScales[id] = finalScale

        // 匹配配置中的透明度公式
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

    public removeSprite(id: number) {
        const sprite = this.sprites[id]
        if (sprite) {
            this.container.removeChild(sprite)
            this.sprites[id] = null
            sprite.destroy()
        }
    }

    public updateBody(id: number, x: number, y: number, rotation: number, scaleMultiplier?: number, alphaMultiplier?: number) {
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

    public clear() {
        this.container.removeChildren()
        // Destroy all active sprites
        for (const sprite of this.sprites) {
            if (sprite) sprite.destroy()
        }
        this.sprites = []
    }

    public destroy() {
        this.app.destroy(true, { children: true, texture: true, baseTexture: true })
    }

    private createTexture(): PIXI.Texture {
        const size = RENDER_CONFIG.particleTextureSize
        const shape = RENDER_CONFIG.shape
        const graphics = new this.PIXI.Graphics()
        const cx = size / 2, cy = size / 2, r = size / 2 - shape.ringPadding

        // Ring
        graphics.beginFill(0xFDE68A) // Amber 200
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

        // Generate texture from graphics
        return this.app.renderer.generateTexture(graphics)
    }
}
