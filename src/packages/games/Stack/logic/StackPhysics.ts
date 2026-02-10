import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { IPhysicsWorld } from '../../../../engine/IPhysicsWorld';
import { SoundManager } from '../../../../engine/SoundManager';

export enum GameState {
    IDLE,
    PLAYING,
    GAMEOVER
}

export enum MoveAxis {
    X,
    Z
}

export interface BlockData {
    position: THREE.Vector3;
    quaternion?: THREE.Quaternion;
    size: THREE.Vector3;
    color: number;
    body?: CANNON.Body; // For physics simulation
}

export interface PhysicsResult {
    perfect: boolean;
    combo: number;
    gameOver: boolean;
    score: number;
    currentColor: number;
}

export class StackPhysics implements IPhysicsWorld {
    public state: GameState = GameState.IDLE;
    public score: number = 0;
    public combo: number = 0;

    // Cannon.js World
    public world: CANNON.World;

    // Stack of placed blocks
    public stack: BlockData[] = [];

    // Current moving block
    public currentBlock: BlockData | null = null;

    // Debris from slicing
    public debris: BlockData[] = [];

    // Constants (Aligned with V4.0 Spec - Rescaled 1:100)
    private readonly INITIAL_SIZE = 1.0;
    private readonly BLOCK_HEIGHT = 0.1;
    private readonly BASE_HEIGHT = 1.0;
    private readonly PERFECT_TOLERANCE = 0.03;
    private readonly MOVE_SPEED_BASE = 0.01;

    private moveAxis: MoveAxis = MoveAxis.X;
    private moveDirection: number = 1; // 1 or -1
    private currentSpeed: number = 0.01;

    public startHue: number = 0;
    private readonly HUE_SHIFT_PER_BLOCK = 5.0; // Aligned with latest spec
    private readonly SATURATION_BLOCK = 0.9;
    private readonly LIGHTNESS_TOP = 0.65;

    constructor() {
        // Initialize Cannon World
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Standard Earth Gravity (meters)
        this.world.broadphase = new CANNON.NaiveBroadphase();
        (this.world.solver as CANNON.GSSolver).iterations = 10;

        // Ground plane removed per user request - debris falls into the void.
    }

    public init(width: number, height: number) {
        this.reset();
    }

    public resize(w: number, h: number) {
        // No specific resize logic for physics grid needed yet
    }

    public destroy() {
        // cleanup bodies if necessary
    }

    public reset() {
        this.state = GameState.IDLE;
        this.score = 0;
        this.combo = 0;

        // Clean up old bodies
        this.stack.forEach(b => { if (b.body) this.world.removeBody(b.body); });
        this.debris.forEach(b => { if (b.body) this.world.removeBody(b.body); });

        this.stack = [];
        this.debris = [];
        this.moveAxis = MoveAxis.X;
        this.moveDirection = 1;
        this.currentSpeed = this.MOVE_SPEED_BASE;
        this.startHue = Math.random() * 360; // Randomize start hue

        // Base block (Foundation)
        const baseSize = new THREE.Vector3(this.INITIAL_SIZE, this.BASE_HEIGHT, this.INITIAL_SIZE);
        const basePos = new THREE.Vector3(0, 0, 0);

        // Add static body for base block so debris can bounce off it
        const shape = new CANNON.Box(new CANNON.Vec3(baseSize.x / 2, baseSize.y / 2, baseSize.z / 2));
        const body = new CANNON.Body({ mass: 0 }); // Static
        body.addShape(shape);
        // Base Block: Center at (0, -50, 0)
        // Size: 100x100x100.
        // Y Range: -100 to 0. Top Face at Y=0.
        basePos.y = -this.BASE_HEIGHT / 2;
        body.position.set(basePos.x, basePos.y, basePos.z);
        this.world.addBody(body);

        this.stack.push({
            position: basePos,
            size: baseSize,
            color: this.calculateColor(0),
            body: body
        });

        // Don't spawn next block yet. Wait for start.
        this.state = GameState.IDLE;
    }

    public start() {
        if (this.state === GameState.IDLE) {
            this.spawnNextBlock();
        }
    }

    private spawnNextBlock() {
        console.log('[StackPhysics] Spawning block at height:', this.stack.length);
        const top = this.stack[this.stack.length - 1];
        this.moveAxis = this.moveAxis === MoveAxis.X ? MoveAxis.Z : MoveAxis.X;

        // Target position (centered above top)
        const pos = top.position.clone();
        // Fix overlap: adjust Y based on half of previous block + half of new block
        // Base (Index 0): Size Y=100. Pos Y=-50. Top Y=0.
        // Block 1 (Index 1): Size Y=10. Pos Y = 0 + 5 = 5.
        // Logic: top.pos.y + top.size.y/2 + new.size.y/2.
        // -50 + 50 + 5 = 5. Correct.
        pos.y += (top.size.y + this.BLOCK_HEIGHT) / 2;

        // Start from distance (closer to view)
        // Ensure block is partially visible immediately to prevent "stuck" feeling
        // Camera frustum edge ~0.84 (at 9/16, d=1.5). StartDist 1.0 puts edge at -0.5.
        const startDist = 1.0;
        if (this.moveAxis === MoveAxis.X) {
            pos.x = -startDist;
        } else {
            pos.z = -startDist;
        }

        this.currentBlock = {
            position: pos,
            size: top.size.clone(),
            color: this.calculateColor(this.stack.length)
        };
        this.currentBlock.size.y = this.BLOCK_HEIGHT; // Force correct height (1), do not inherit Base height (5)

        this.moveDirection = 1;
        this.state = GameState.PLAYING;
    }

    private calculateColor(index: number): number {
        const color = new THREE.Color();
        const currentHue = (this.startHue + index * this.HUE_SHIFT_PER_BLOCK) % 360;
        // Returning just the hue as hex isn't quite right for HSL direct assignment, 
        // but let's keep it as number for now, we will handle HSL in material.
        color.setHSL(currentHue / 360, this.SATURATION_BLOCK, this.LIGHTNESS_TOP);
        return color.getHex();
    }

    public update(dt: number) {
        // Step physics world (Only need to step if we have dynamic debris)
        // If debris list is empty, there are no moving physics bodies, so we can skip step
        if (this.debris.length > 0) {
            try {
                this.world.step(1 / 60, dt / 1000, 3);
            } catch (e) {
                console.error('[StackPhysics] World Step Error:', e);
            }
        }

        // Sync debris positions and rotations from physics
        const topY = this.stack.length > 0 ? this.stack[this.stack.length - 1].position.y : 0;
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const deb = this.debris[i];
            if (deb.body) {
                deb.position.copy(deb.body.position as any);
                if (!deb.quaternion) deb.quaternion = new THREE.Quaternion();
                deb.quaternion.copy(deb.body.quaternion as any);
            }

            // Remove debris only when it's well below the current tower top
            // (Relative to the top block to ensure it's off-camera)
            // Rescaled to 8.0
            if (deb.position.y < topY - 8.0) {
                if (deb.body) this.world.removeBody(deb.body);
                this.debris.splice(i, 1);
            }
        }

        if (this.state !== GameState.PLAYING || !this.currentBlock) return;

        // Clamp dt to avoid massive jumps during lag spikes (max 3 frames approx)
        const safeDt = Math.min(dt, 50);
        const moveAmount = this.currentSpeed * (safeDt / 16.66);
        // console.log('[StackPhysics] Update: dt=', dt, 'move=', moveAmount, 'pos=', this.currentBlock.position); // Debug

        // range fixed to 1.5 * INITIAL_SIZE as per spec
        const range = this.INITIAL_SIZE * 1.5;

        if (this.moveAxis === MoveAxis.X) {
            this.currentBlock.position.x += moveAmount * this.moveDirection;
            const px = this.currentBlock.position.x;
            if ((px > range && this.moveDirection > 0) || (px < -range && this.moveDirection < 0)) {
                // console.log('[StackPhysics] Flip X. Range:', range, 'Pos:', px);
                this.moveDirection *= -1;
                // Clamp position to edge to prevent perpetual out-of-bounds flipping
                this.currentBlock.position.x = range * (px > 0 ? 1 : -1);
            }
        } else {
            this.currentBlock.position.z += moveAmount * this.moveDirection;
            const pz = this.currentBlock.position.z;
            if ((pz > range && this.moveDirection > 0) || (pz < -range && this.moveDirection < 0)) {
                // console.log('[StackPhysics] Flip Z. Range:', range, 'Pos:', pz);
                this.moveDirection *= -1;
                // Clamp position to edge to prevent perpetual out-of-bounds flipping
                this.currentBlock.position.z = range * (pz > 0 ? 1 : -1);
            }
        }
    }

    public placeBlock(): PhysicsResult {
        if (this.state === GameState.IDLE) {
            this.start();
            return { perfect: false, combo: 0, gameOver: false, score: 0, currentColor: this.calculateColor(0) };
        }

        if (!this.currentBlock || this.state !== GameState.PLAYING) {
            return { perfect: false, combo: 0, gameOver: false, score: this.score, currentColor: this.calculateColor(this.stack.length) };
        }

        const top = this.stack[this.stack.length - 1];
        const axis = this.moveAxis === MoveAxis.X ? 'x' : 'z';
        const sizeAxis = this.moveAxis === MoveAxis.X ? 'x' : 'z';

        const delta = this.currentBlock.position[axis] - top.position[axis];
        const overlap = top.size[sizeAxis] - Math.abs(delta);

        if (overlap <= 0) {
            console.log('[StackPhysics] Game Over: Overlap', overlap, 'Delta', delta, 'Size', top.size[sizeAxis]);
            this.state = GameState.GAMEOVER;

            // Current block falls as debris
            this.spawnDebris(
                this.currentBlock.position,
                this.currentBlock.size,
                this.currentBlock.color,
                new THREE.Vector3(0, 0, 0) // No slice offset, whole block falls
            );

            return { perfect: false, combo: 0, gameOver: true, score: this.score, currentColor: this.calculateColor(this.stack.length) };
        }

        const isPerfect = Math.abs(delta) < this.PERFECT_TOLERANCE;

        if (isPerfect) {
            this.combo++;
            this.currentBlock.position[axis] = top.position[axis];
            this.currentBlock.size[sizeAxis] = top.size[sizeAxis];
        } else {
            this.combo = 0;

            // Slice the block
            const oldSize = this.currentBlock.size[sizeAxis];
            const cutSize = Math.abs(delta);
            const keepSize = overlap;

            this.currentBlock.size[sizeAxis] = keepSize;

            // New center position for the kept part
            const centerShift = (oldSize - keepSize) / 2;
            const direction = delta > 0 ? 1 : -1;
            this.currentBlock.position[axis] = top.position[axis] + (centerShift * direction);

            // Spawn Debris for the cut part
            const debrisSize = cutSize;
            const debrisPos = this.currentBlock.position.clone();
            // Debris is offset by (keepSize/2 + debrisSize/2) * direction
            debrisPos[axis] += (keepSize / 2 + debrisSize / 2) * direction;

            const debrisBlockSize = this.currentBlock.size.clone();
            debrisBlockSize[sizeAxis] = debrisSize;

            this.spawnDebris(debrisPos, debrisBlockSize, this.currentBlock.color);
        }

        // Add static body for the new top block
        const shape = new CANNON.Box(new CANNON.Vec3(this.currentBlock.size.x / 2, this.currentBlock.size.y / 2, this.currentBlock.size.z / 2));
        const body = new CANNON.Body({ mass: 0 }); // Static
        body.addShape(shape);
        body.position.set(this.currentBlock.position.x, this.currentBlock.position.y, this.currentBlock.position.z);
        this.world.addBody(body);
        this.currentBlock.body = body;

        this.stack.push(this.currentBlock);

        // Scoring: +1 base. If Perfect and combo >= 4, + (combo - 3) bonus.
        let increment = 1;
        if (this.combo >= 4) {
            increment += (this.combo - 3);
        }
        this.score += increment;

        // Step-Function Speed Curve: Every 15 blocks, +15% speed. Cap at score 75.
        const speedIncrements = Math.floor(Math.min(this.score, 75) / 15);
        this.currentSpeed = this.MOVE_SPEED_BASE * (1 + speedIncrements * 0.15);

        this.spawnNextBlock();

        return {
            perfect: isPerfect,
            combo: this.combo,
            gameOver: false,
            score: this.score,
            currentColor: this.calculateColor(this.stack.length)
        };
    }

    private spawnDebris(pos: THREE.Vector3, size: THREE.Vector3, color: number, velocityOffset?: THREE.Vector3) {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({ mass: 5 }); // Dynamic
        body.addShape(shape);
        body.position.set(pos.x, pos.y, pos.z);

        // Initial velocity logic: Set to zero for "stay still first"
        body.velocity.set(0, 0, 0);

        // Initial angular velocity: Set to zero for no initial tumbling
        body.angularVelocity.set(0, 0, 0);

        this.world.addBody(body);

        this.debris.push({
            position: pos.clone(),
            size: size.clone(),
            color: color,
            body: body
        });
    }
}
