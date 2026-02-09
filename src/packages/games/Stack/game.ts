import { GameLoop } from '../../../engine/GameLoop';
import { StackPhysics } from './logic/StackPhysics';
import { StackRender } from './view/StackRender';
import { PLATFORM } from 'three-platformize';
import { WechatPlatform } from 'three-platformize/src/WechatPlatform';

export class ThreeGameLoop extends GameLoop {
    private platform: any;

    constructor(canvas: any, width: number, height: number) {
        // Create Physics and Render instances
        const physics = new StackPhysics();
        const renderer = new StackRender();

        super(physics, renderer, canvas, width, height);
    }

    public start() {
        if (this.isRunning) return;

        // Initialize Three.js WeApp Adapter
        if (process.env.TARO_ENV === 'weapp') {
            console.log('[ThreeGameLoop] initializing WechatPlatform adapter');
            const canvas = this.params.canvas;
            this.platform = new WechatPlatform(canvas);
            PLATFORM.set(this.platform);
        }

        console.log('[ThreeGameLoop] Game started');
        super.start();
    }

    public handleTap(): { perfect: boolean, combo: number, gameOver: boolean } {
        console.log('[ThreeGameLoop] Tap handled');
        const physics = this.physics as any as StackPhysics;
        return physics.placeBlock();
    }

    public destroy() {
        super.destroy();
        if (this.platform) {
            this.platform.dispose();
            PLATFORM.dispose();
        }
    }
}
