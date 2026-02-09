import * as PIXI from 'pixi.js';
import { StackPhysics, BoxState } from './physics';
import { StackGraphics } from './StackGraphics';
import { IRenderPipeline } from '../../engine/IRenderPipeline';
import { IPhysicsWorld } from '../../engine/IPhysicsWorld';

export class StackRender implements IRenderPipeline {
    public app!: PIXI.Application;
    public container!: PIXI.Container;
    private sprites: Map<number, PIXI.Sprite> = new Map();
    private scoreText!: PIXI.Text;
    private logicalWidth: number = 0;
    private logicalHeight: number = 0;

    public init(canvas: HTMLCanvasElement, width: number, height: number, dpr: number) {
        this.app = new PIXI.Application({
            view: canvas,
            width,
            height,
            resolution: dpr,
            autoDensity: true,
            backgroundAlpha: 1,
            backgroundColor: 0xf8fafc, // Slate-50
            antialias: true,
        });

        // Store logical dimensions (not physical)
        this.logicalWidth = width;
        this.logicalHeight = height;

        this.container = new PIXI.Container();
        // Center the container horizontally, place near bottom
        this.container.x = width / 2;
        this.container.y = height * 0.85; // Base at 85% from top (near bottom)
        this.app.stage.addChild(this.container);

        // Score
        this.scoreText = new PIXI.Text('0', {
            fontFamily: 'Arial', // Fallback
            fontSize: 120,
            fontWeight: '900',
            fill: ['#0f172a'], // Slate-900
            align: 'center',
        });
        this.scoreText.alpha = 0.1;
        this.scoreText.anchor.set(0.5);
        this.scoreText.x = width / 2;
        this.scoreText.y = height * 0.2;
        this.app.stage.addChild(this.scoreText);
    }

    public render(physicsWorld: IPhysicsWorld, alpha: number) {
        const physics = physicsWorld as StackPhysics;
        if (!physics || !this.app) return;

        // Update Score
        if (this.scoreText) {
            this.scoreText.text = physics.score.toString();
        }

        // Camera follow: Move container down as stack grows (so we see new blocks)
        // As score increases, we need to shift the view upward by raising container.y
        const blockHeight = 20;
        const baseY = this.logicalHeight * 0.85;  // Use logical height, not renderer.height
        // Smoothly follow: target is baseY minus how tall the stack is
        const targetY = baseY - physics.score * blockHeight * 0.5; // Move up as stack grows
        const currentY = this.container.y;
        this.container.y += (targetY - currentY) * 0.1;

        // Render Blocks
        physics.boxes.forEach((box, index) => {
            let sprite = this.sprites.get(index);
            if (!sprite) {
                // Use StackGraphics for Isometric Texture
                const texture = StackGraphics.createIsometricBlockTexture(
                    this.app.renderer as PIXI.Renderer,
                    box.width,
                    40, // Height of the block visual
                    box.color
                );

                sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5, 0.7); // Adjust anchor for isometric feel
                this.container.addChild(sprite);
                this.sprites.set(index, sprite);
            }

            // Position: X from physics, Y based on stack level (z)
            sprite.x = box.x;
            sprite.y = -box.z * 20; // Stack upward (negative Y)

            // Should destroy texture when sprite is destroyed? 
            // Generic texture creation might leak if we don't cache. 
            // For now, per spec "Pool Logic", we should cache textures, 
            // but StackGraphics creates a new texture every time.
            // Optimization for later: Cache textures by color/size.

            // No alpha fade for now
            sprite.alpha = 1;
        });

        // Cleanup old sprites
        if (this.sprites.size > physics.boxes.length) {
            // e.g. Game Over reset
            this.sprites.forEach((s, k) => {
                if (k >= physics.boxes.length) {
                    this.container.removeChild(s);
                    s.destroy({ texture: true, baseTexture: true }); // Clean up generated texture
                    this.sprites.delete(k);
                }
            });
        }
    }

    public destroy() {
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
        }
    }
}

