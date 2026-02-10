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

    // Constants
    private readonly INITIAL_SIZE = 100;
    private readonly BLOCK_HEIGHT = 20;
    private readonly PERFECT_TOLERANCE = 3.0; // Units - defined in spec
    private readonly GROWTH_COMBO_TRIGGER = 8;
    private readonly GROWTH_AMOUNT_PERCENT = 0.10; // 10% size increase
    private readonly MOVE_SPEED_BASE = 2.0;

    private moveAxis: MoveAxis = MoveAxis.X;
    private moveDirection: number = 1; // 1 or -1
    private currentSpeed: number = 2.0;

    private startHue: number = 0;
    private readonly HUE_SHIFT_PER_BLOCK = 4; // 3-5 degrees
    private readonly SATURATION = 0.60;
    private readonly LIGHTNESS = 0.65;

    constructor() {
        // Initialize Cannon World
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Standard gravity
        this.world.broadphase = new CANNON.NaiveBroadphase();
        (this.world.solver as CANNON.GSSolver).iterations = 10;

        // Ground plane for physics
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 }); // Static
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.position.set(0, -50, 0); // Well below the first block
        this.world.addBody(groundBody);
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

        // Base block
        const baseSize = new THREE.Vector3(this.INITIAL_SIZE, this.BLOCK_HEIGHT, this.INITIAL_SIZE);
        const basePos = new THREE.Vector3(0, 0, 0);

        // Add static body for base block so debris can bounce off it
        const shape = new CANNON.Box(new CANNON.Vec3(baseSize.x / 2, baseSize.y / 2, baseSize.z / 2));
        const body = new CANNON.Body({ mass: 0 }); // Static
        body.addShape(shape);
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
        pos.y += this.BLOCK_HEIGHT;

        // Start from distance
        const startDist = 180;
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

        this.moveDirection = 1;
        this.state = GameState.PLAYING;
    }

    private calculateColor(index: number): number {
        const color = new THREE.Color();
        // Shift hue slowly by index
        const currentHue = (this.startHue + index * this.HUE_SHIFT_PER_BLOCK) % 360;
        color.setHSL(currentHue / 360, this.SATURATION, this.LIGHTNESS);
        return color.getHex();
    }

    public update(dt: number) {
        // Step physics world
        this.world.step(1 / 60, dt / 1000, 3);

        // Sync debris positions and rotations from physics
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const deb = this.debris[i];
            if (deb.body) {
                deb.position.copy(deb.body.position as any);
                if (!deb.quaternion) deb.quaternion = new THREE.Quaternion();
                deb.quaternion.copy(deb.body.quaternion as any);
            }

            // Remove far away debris
            if (deb.position.y < -200) {
                if (deb.body) this.world.removeBody(deb.body);
                this.debris.splice(i, 1);
            }
        }

        if (this.state !== GameState.PLAYING || !this.currentBlock) return;

        const moveAmount = this.currentSpeed * (dt / 16.66);
        const range = 180; // 1.8x foundation size (100)
        if (this.moveAxis === MoveAxis.X) {
            this.currentBlock.position.x += moveAmount * this.moveDirection;
            if (Math.abs(this.currentBlock.position.x) > range) {
                this.moveDirection *= -1;
            }
        } else {
            this.currentBlock.position.z += moveAmount * this.moveDirection;
            if (Math.abs(this.currentBlock.position.z) > range) {
                this.moveDirection *= -1;
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

            // Gradual Growth (+2% per Perfect)
            const growthX = this.currentBlock.size.x * 0.02;
            const growthZ = this.currentBlock.size.z * 0.02;

            this.currentBlock.size.x = Math.min(this.currentBlock.size.x + growthX, this.INITIAL_SIZE);
            this.currentBlock.size.z = Math.min(this.currentBlock.size.z + growthZ, this.INITIAL_SIZE);
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
        this.score++;

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

        // Initial velocity logic
        // Push it away slightly or just let gravity take it?
        // If it was moving, maybe impart some velocity?
        // Let's give it a small push perpendicular to gravity
        body.velocity.set(
            (Math.random() - 0.5) * 5,
            0,
            (Math.random() - 0.5) * 5
        );

        // Add random rotation (tumbling)
        body.angularVelocity.set(
            Math.random() * 5,
            Math.random() * 5,
            Math.random() * 5
        );

        this.world.addBody(body);

        this.debris.push({
            position: pos.clone(),
            size: size.clone(),
            color: color,
            body: body
        });
    }
}
