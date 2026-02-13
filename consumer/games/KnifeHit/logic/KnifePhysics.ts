import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { IPhysicsWorld } from '@/engine/IPhysicsWorld';

export enum GameState {
    IDLE,
    PLAYING,
    GAMEOVER
}

export interface KnifeData {
    body: CANNON.Body;
    mesh?: THREE.Mesh;
    isStuck: boolean;
    angleOnLog?: number; // The angle relative to the log when it hit
}

// --- Rotation Behaviors ---

interface IRotationBehavior {
    update(dt: number, currentVelocity: number): number;
    isFinished?(): boolean;
}

class ConstantBehavior implements IRotationBehavior {
    constructor(private velocity: number) { }
    update() { return this.velocity; }
}

class OscillateBehavior implements IRotationBehavior {
    private time: number = 0;
    constructor(private amplitude: number, private frequency: number, private baseVelocity: number = 0) { }
    update(dt: number) {
        this.time += dt / 1000;
        return this.baseVelocity + Math.sin(this.time * this.frequency) * this.amplitude;
    }
}

class JerkBehavior implements IRotationBehavior {
    private timer: number = 0;
    constructor(private jerkVelocity: number, private duration: number, private nextVelocity: number) { }
    update(dt: number, current: number) {
        this.timer += dt;
        return this.timer < this.duration ? this.jerkVelocity : this.nextVelocity;
    }
    isFinished() { return this.timer >= this.duration; }
}

class LerpBehavior implements IRotationBehavior {
    private timer: number = 0;
    private startVelocity: number;
    constructor(private targetVelocity: number, private duration: number, currentVelocity: number) {
        this.startVelocity = currentVelocity;
    }
    update(dt: number) {
        this.timer += dt;
        const t = Math.min(this.timer / this.duration, 1);
        return this.startVelocity + (this.targetVelocity - this.startVelocity) * t;
    }
    isFinished() { return this.timer >= this.duration; }
}

// --- Main Physics Class ---

export class KnifePhysics implements IPhysicsWorld {
    public world: CANNON.World;
    public state: GameState = GameState.IDLE;
    public score: number = 0;

    // Target (Log)
    public targetBody: CANNON.Body;
    public targetRotation: number = 0;
    public targetAngularVelocity: number = 0;
    public readonly targetRadius: number = 1.0; // 1 meter in world units

    // Knives
    public knives: KnifeData[] = [];
    public currentKnife: KnifeData | null = null;
    public knivesRemaining: number = 7;
    public readonly knifeSpeed: number = 15; // m/s
    public readonly knifeHeight: number = 0.8;
    public readonly knifeProtrusion: number = 0.5; // How much sticks out
    public readonly spawnY: number = -3.5;

    // Behavior Management
    private behavior: IRotationBehavior = new ConstantBehavior(2.0);
    private behaviorTimer: number = 0;

    // Callbacks for UI
    public onHit?: (knife: KnifeData) => void;
    public onFail?: (knife: KnifeData) => void;
    public onScoreUpdate?: (score: number) => void;
    public onKnivesCountUpdate?: (count: number) => void;

    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0); // Stronger gravity for fail state

        // Initialize target
        this.targetBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Sphere(this.targetRadius),
            position: new CANNON.Vec3(0, 3.5, 0)
        });
        this.world.addBody(this.targetBody);
    }

    public init(width: number, height: number) {
        this.reset();
    }

    public reset() {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.targetRotation = 0;
        this.targetAngularVelocity = 2.0;
        this.behavior = new ConstantBehavior(2.0);
        this.behaviorTimer = 0;
        this.knivesRemaining = 7;

        // Clear knives
        this.knives.forEach(k => this.world.removeBody(k.body));
        this.knives = [];
        if (this.currentKnife) this.world.removeBody(this.currentKnife.body);
        this.currentKnife = null;

        this.spawnReadyKnife();
        if (this.onKnivesCountUpdate) this.onKnivesCountUpdate(this.knivesRemaining);
    }

    public update(dt: number) {
        if (this.state === GameState.IDLE) return;

        // 1. Update Rotation Behavior
        this.updateBehavior(dt);
        this.targetRotation += this.targetAngularVelocity * (dt / 1000);
        this.targetBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.targetRotation);

        // 2. Physics Step
        this.world.step(1 / 60, dt / 1000, 3);

        // 3. Update Flying Knife
        const logY = this.targetBody.position.y;
        if (this.currentKnife && !this.currentKnife.isStuck && this.currentKnife.body.velocity.y > 0) {
            const body = this.currentKnife.body;

            // Basic hit detection: check if tip reached log boundary
            const tipY = body.position.y + this.knifeHeight / 2;

            if (tipY >= logY - this.targetRadius) {
                this.checkCollision();
            }
        }

        // 4. Update Stuck Knives (keep them attached to log visually)
        this.knives.forEach(k => {
            if (k.isStuck && k.angleOnLog !== undefined) {
                const finalAngle = this.targetRotation + k.angleOnLog;
                const dist = this.targetRadius - (this.knifeHeight / 2 - this.knifeProtrusion);
                k.body.position.set(
                    Math.sin(-finalAngle) * dist,
                    logY + Math.cos(-finalAngle) * dist,
                    0
                );
                k.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), finalAngle);
            }
        });
    }

    private updateBehavior(dt: number) {
        this.behaviorTimer += dt;
        this.targetAngularVelocity = this.behavior.update(dt, this.targetAngularVelocity);

        // Change behavior every 3-6 seconds
        if (this.behaviorTimer > 3000 + Math.random() * 3000 || (this.behavior.isFinished && this.behavior.isFinished())) {
            this.behaviorTimer = 0;
            this.pickNextBehavior();
        }
    }

    private pickNextBehavior() {
        const r = Math.random();
        if (r < 0.4) {
            this.behavior = new ConstantBehavior((Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3));
        } else if (r < 0.7) {
            this.behavior = new OscillateBehavior(3 + Math.random() * 5, 1 + Math.random() * 2);
        } else if (r < 0.9) {
            this.behavior = new LerpBehavior((Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 4), 1000, this.targetAngularVelocity);
        } else {
            this.behavior = new JerkBehavior(0, 500, this.targetAngularVelocity > 0 ? 6 : -6);
        }
    }

    public spawnReadyKnife() {
        if (this.state !== GameState.PLAYING || this.knivesRemaining <= 0) return;

        const body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(0.05, this.knifeHeight / 2, 0.05)),
            position: new CANNON.Vec3(0, this.spawnY, 0)
        });
        body.collisionResponse = false;

        this.currentKnife = { body, isStuck: false };
        this.world.addBody(body);
    }

    public throwKnife() {
        if (this.state !== GameState.PLAYING || !this.currentKnife || this.currentKnife.isStuck || this.currentKnife.body.velocity.y > 0) return;

        this.currentKnife.body.velocity.set(0, this.knifeSpeed, 0);
        this.knivesRemaining--;
        if (this.onKnivesCountUpdate) this.onKnivesCountUpdate(this.knivesRemaining);
    }

    private checkCollision() {
        if (!this.currentKnife) return;

        // Check if we hit another knife
        const hitAnother = this.knives.some(k => {
            const angle = (this.targetRotation + (k.angleOnLog || 0)) % (Math.PI * 2);
            const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            return Math.abs(normalizedAngle - Math.PI) < 0.15;
        });

        if (hitAnother) {
            this.handleFail();
        } else {
            this.handleHit();
        }
    }

    private handleHit() {
        if (!this.currentKnife) return;

        const knife = this.currentKnife;
        knife.isStuck = true;
        knife.body.velocity.set(0, 0, 0);

        knife.angleOnLog = Math.PI - this.targetRotation;

        this.knives.push(knife);
        this.score++;
        this.currentKnife = null;

        // Recoil effect
        this.targetBody.position.y += 0.05;
        setTimeout(() => { if (this.targetBody) this.targetBody.position.y = 3.5; }, 50);

        if (this.onHit) this.onHit(knife);
        if (this.onScoreUpdate) this.onScoreUpdate(this.score);

        // Check if round cleared
        if (this.knivesRemaining === 0) {
            // Classically Knife Hit does a "break" effect and moves to next level
            // For now, let's just reset the round (7 knives) without clearing stuck ones immediately
            // Or better, clear stuck ones after a small delay
            setTimeout(() => {
                this.knives.forEach(k => this.world.removeBody(k.body));
                this.knives = [];
                this.knivesRemaining = 7;
                if (this.onKnivesCountUpdate) this.onKnivesCountUpdate(this.knivesRemaining);
                this.spawnReadyKnife();
            }, 500);
        } else {
            this.spawnReadyKnife();
        }
    }

    private handleFail() {
        if (!this.currentKnife) return;

        this.state = GameState.GAMEOVER;
        const knife = this.currentKnife;
        knife.body.collisionResponse = true;
        knife.body.velocity.set((Math.random() - 0.5) * 10, -5, 0);
        knife.body.angularVelocity.set(0, 0, (Math.random() - 0.5) * 20);

        if (this.onFail) this.onFail(knife);
    }

    public resize(w: number, h: number) { }
    public destroy() {
        this.knives.forEach(k => this.world.removeBody(k.body));
        if (this.currentKnife) this.world.removeBody(this.currentKnife.body);
        this.world.removeBody(this.targetBody);
    }
}
