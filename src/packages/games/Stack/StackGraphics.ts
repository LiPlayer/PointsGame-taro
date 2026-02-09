import * as PIXI from 'pixi.js';
import { ColorUtils } from '../../engine/ColorUtils';

export class StackGraphics {
    /**
     * Generates a 2.5D Isometric Block Texture
     */
    public static createIsometricBlockTexture(renderer: PIXI.Renderer, width: number, height: number, color: number): PIXI.Texture {
        const graphics = new PIXI.Graphics();

        // Top Face (Lightest)
        graphics.beginFill(ColorUtils.lighten(color, 0.2));
        graphics.moveTo(0, -height / 2);
        graphics.lineTo(width / 2, -height / 2 - width / 4);
        graphics.lineTo(0, -height / 2 - width / 2);
        graphics.lineTo(-width / 2, -height / 2 - width / 4);
        graphics.endFill();

        // Right Face (Darkest)
        graphics.beginFill(ColorUtils.darken(color, 0.2));
        graphics.moveTo(0, -height / 2);
        graphics.lineTo(width / 2, -height / 2 - width / 4);
        graphics.lineTo(width / 2, height / 2 - width / 4);
        graphics.lineTo(0, height / 2);
        graphics.endFill();

        // Left Face (Base Color)
        graphics.beginFill(color);
        graphics.moveTo(0, -height / 2);
        graphics.lineTo(-width / 2, -height / 2 - width / 4);
        graphics.lineTo(-width / 2, height / 2 - width / 4);
        graphics.lineTo(0, height / 2);
        graphics.endFill();

        return renderer.generateTexture(graphics);
    }
}
