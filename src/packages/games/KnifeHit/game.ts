import { IPhysicsWorld } from '../../../engine/IPhysicsWorld';
import { IRenderPipeline } from '../../../engine/IRenderPipeline';
import { KnifePhysics } from './logic/KnifePhysics';
import { KnifeRender } from './view/KnifeRender';

export class KnifeGameLoop {
    public physics: KnifePhysics;
    public renderer: KnifeRender;
    private frameId: number | null = null;
    private lastTime: number = 0;
    private isPaused: boolean = false;

    public onFirstFrameRendered?: () => void;

    constructor(canvas: any, width: number, height: number, dpr: number = 1) {
        this.physics = new KnifePhysics();
        this.renderer = new KnifeRender();

        this.physics.init(width, height);
        this.renderer.init(canvas, width, height, dpr);

        this.lastTime = Date.now();
    }

    public start() {
        this.isPaused = false;
        this.loop();
    }

    private loop() {
        if (this.isPaused) return;

        const now = Date.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        this.physics.update(dt);
        this.renderer.render(this.physics);

        if (this.onFirstFrameRendered) {
            this.onFirstFrameRendered();
            this.onFirstFrameRendered = undefined;
        }

        this.frameId = requestAnimationFrame(() => this.loop());
    }

    public handleTap() {
        return this.physics.throwKnife();
    }

    public pause() {
        this.isPaused = true;
        if (this.frameId) cancelAnimationFrame(this.frameId);
    }

    public resume() {
        this.isPaused = false;
        this.lastTime = Date.now();
        this.loop();
    }

    public destroy() {
        this.pause();
        this.renderer.destroy();
        this.physics.destroy();
    }
}
