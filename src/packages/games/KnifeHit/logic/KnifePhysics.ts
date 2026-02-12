import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { IPhysicsWorld } from '../../../../engine/IPhysicsWorld';

export enum GameState {
    IDLE,
    PLAYING,
    GAMEOVER
}

export interface KnifeData {
    body: CANNON.Body;
    mesh?: THREE.Mesh;
    isStuck: boolean;
}

export class KnifePhysics implements IPhysicsWorld {
    public world: CANNON.World;
    public state: GameState = GameState.IDLE;
    public score: number = 0;

    // Target (Log/Pizza/Orange)
    public targetBody: CANNON.Body;
    public targetRotation: number = 0;
    public targetAngularVelocity: number = 2.0;

    // Knives
    public knives: KnifeData[] = [];
    public currentKnife: KnifeData | null = null;

    // Behavior Pool Settings
    private behaviorTimer: number = 0;
    private currentBehavior: 'constant' | 'oscillate' | 'jerk' = 'constant';

    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);

        // Initialize target
        this.targetBody = new CANNON.Body({ mass: 0 }); // Kinematic-like
        this.world.addBody(this.targetBody);
    }

    public init(width: number, height: number) {
        this.reset();
    }

    public reset() {
        this.state = GameState.IDLE;
        this.score = 0;
        this.targetRotation = 0;
        // Logic to clear knives...
    }

    public update(dt: number) {
        if (this.state === GameState.IDLE) return;

        // Update Target Rotation based on procedural scripts
        this.targetRotation += this.targetAngularVelocity * (dt / 1000);
        this.targetBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.targetRotation);

        // Step physics
        this.world.step(1 / 60, dt / 1000, 3);

        // Update current knife movement if flying
    }

    public throwKnife() {
        if (this.state !== GameState.PLAYING) return;
        // Spawn and launch knife
    }

    public resize(w: number, h: number) { }
    public destroy() { }
}
