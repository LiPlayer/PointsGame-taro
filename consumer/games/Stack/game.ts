import { GameLoop } from '@/engine/GameLoop';
import { StackPhysics, PhysicsResult } from './logic/StackPhysics';
import { StackRender } from './view/StackRender';
import { PLATFORM } from 'three-platformize';
import { WechatPlatform } from 'three-platformize/src/WechatPlatform';

export class ThreeGameLoop extends GameLoop {

    constructor(canvas: any, width: number, height: number) {
        // Create Physics and Render instances
        const physics = new StackPhysics();
        const renderer = new StackRender();

        super(physics, renderer, canvas, width, height);
    }

    public get stackRenderer(): StackRender {
        return this.renderer as StackRender;
    }

    public start() {
        if (this.isRunning) return;

        // Initialize Three.js WeApp Adapter
        if (process.env.TARO_ENV === 'weapp') {
            const canvas = this.params.canvas;
            this.platform = new WechatPlatform(canvas);
            PLATFORM.set(this.platform);
        }

        super.start(this.platform);
    }

    public handleTap(): PhysicsResult {
        const physics = this.physics as any as StackPhysics;
        return physics.placeBlock();
    }

    public triggerPerfectRipple(combo: number) {
        const physics = this.physics as any as StackPhysics;
        const topBlock = physics.stack[physics.stack.length - 1];
        if (topBlock) {
            (this.renderer as StackRender).triggerPerfectRipple(topBlock.position, topBlock.size, combo);
        }
    }

    public triggerPerfectFlash(combo: number) {
        // Feature removed
    }

    public triggerScreenShake() {
        (this.renderer as StackRender).triggerScreenShake(0.08); // Scaled from 8.0
    }

    public destroy() {
        if (this.isDestroyed) return;
        super.destroy();
        // PLATFORM.dispose() is Three.js specific, keeping it here.
        // Base class handles this.platform.dispose()
        try {
            PLATFORM.dispose();
        } catch (e) {
            // Log only unexpected PLATFORM disposal errors
            if (!this.isHarmlessDisposalError(e)) {
                console.error('[ThreeGameLoop] PLATFORM disposal failed:', e);
            }
        }
    }
}
