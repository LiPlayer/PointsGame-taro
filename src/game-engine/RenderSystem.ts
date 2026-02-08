import * as PIXI from 'pixi.js' // We need to import the whole namespace or specific parts based on how pixi.js exposes itself in this environment
// However, the user environment seems to use specific imports or global PIXI. Let's stick to standard imports first.
// If it fails, I will adjust. The previous files used `import { Application } from 'pixi.js'` style or `PIXI.Application`.
// Let's assume `import * as PIXI` is safe or `import { ... }`.
// Checking `usePixi.ts`, it uses `import { Application } from '@pixi/app'` etc, but also `import * as PIXI`.
// I will use `import * as PIXI` to be safe and compatible with v7.

import { RENDER_CONFIG, PHYSICS_CONFIG } from './Constants'

export class RenderSystem {
    public app: PIXI.Application
    public container: PIXI.ParticleContainer
    public texture: PIXI.Texture | null = null

    // 存储渲染实体数组: index -> PixiSprite
    public sprites: (PIXI.Sprite | null)[] = []

    constructor(canvas: HTMLCanvasElement, width: number, height: number, dpr: number) {
        this.app = new PIXI.Application({
            view: canvas,
            width,
            height,
            resolution: dpr,
            autoDensity: true,
            backgroundAlpha: 0, // Changed from RENDER_CONFIG.backgroundAlpha
            antialias: false, // 禁用抗锯齿提升性能
            powerPreference: 'high-performance' // Added
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

        const sprite = new PIXI.Sprite(this.texture)
        sprite.anchor.set(0.5)
        sprite.position.set(x, y)

        // 匹配原型缩放公式
        const sizeScale = (radius * 2) / RENDER_CONFIG.particleTextureSize
        const depthScale = 0.5 + z * 0.7
        sprite.scale.set(sizeScale * depthScale)

        // 匹配原型透明度公式
        if (z > 0.7) {
            sprite.alpha = 1.0
        } else {
            sprite.alpha = 0.6 + z * 0.4
        }

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

    public updateBody(id: number, x: number, y: number, rotation: number) {
        const sprite = this.sprites[id]
        if (sprite) {
            sprite.position.set(x, y)
            sprite.rotation = rotation
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
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return PIXI.Texture.WHITE

        const cx = size / 2, cy = size / 2, r = size / 2 - 4

        // Ring
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = '#fde68a' // Amber 200
        ctx.fill()

        // White Body
        ctx.beginPath()
        ctx.arc(cx, cy, r - 6, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        // Star Shape
        ctx.translate(cx, cy)
        ctx.beginPath()
        ctx.fillStyle = '#f59e0b' // Amber 500
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 19, -Math.sin((18 + i * 72) * Math.PI / 180) * 19)
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 9, -Math.sin((54 + i * 72) * Math.PI / 180) * 9)
        }
        ctx.closePath()
        ctx.fill()

        return PIXI.Texture.from(canvas)
    }
}
