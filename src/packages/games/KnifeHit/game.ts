import { GameLoop } from '../../../engine/GameLoop';
import { KnifePhysics } from './logic/KnifePhysics';
import { KnifeRender } from './view/KnifeRender';

export class KnifeGameLoop extends GameLoop {
    public physics: KnifePhysics;
    public renderer: KnifeRender;

    constructor(canvas: any, width: number, height: number, options?: { maxDPR?: number }) {
        const physics = new KnifePhysics();
        const renderer = new KnifeRender();
        super(physics, renderer, canvas, width, height, options);

        this.physics = physics;
        this.renderer = renderer;
    }

    public handleTap() {
        return this.physics.throwKnife();
    }
}
