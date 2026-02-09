import * as THREE from 'three';
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
    size: THREE.Vector3;
    color: number;
}

export interface PhysicsResult {
    perfect: boolean;
    combo: number;
    gameOver: boolean;
    score: number;
    currentHue: number;
}

export class StackPhysics implements IPhysicsWorld {
    public state: GameState = GameState.IDLE;
    public score: number = 0;
    public combo: number = 0;

    // Stack of placed blocks
    public stack: BlockData[] = [];

    // Current moving block
    public currentBlock: BlockData | null = null;

    // Debris from slicing
    public debris: BlockData[] = [];

    // Constants
    private readonly INITIAL_SIZE = 100;
    private readonly BLOCK_HEIGHT = 20;
    private readonly PERFECT_TOLERANCE = 2.5; // Units - tighter feel
    private readonly GROWTH_COMBO_TRIGGER = 8;
    private readonly GROWTH_AMOUNT = 2.5; // More subtle recovery
    private readonly MOVE_SPEED_BASE = 2.0;

    private moveAxis: MoveAxis = MoveAxis.X;
    private moveDirection: number = 1; // 1 or -1
    private currentSpeed: number = 2.0;

    constructor() {
        // We defer initialization to init()
    }

    public init(width: number, height: number) {
        this.reset();
    }

    public resize(w: number, h: number) {
        // No specific resize logic for physics grid needed yet
    }

    public destroy() {
        // Cleanup if needed
    }

    public reset() {
        this.state = GameState.IDLE;
        this.score = 0;
        this.combo = 0;
        this.stack = [];
        this.debris = [];
        this.moveAxis = MoveAxis.X;
        this.moveDirection = 1;
        this.currentSpeed = this.MOVE_SPEED_BASE;

        // Base block
        this.stack.push({
            position: new THREE.Vector3(0, 0, 0),
            size: new THREE.Vector3(this.INITIAL_SIZE, this.BLOCK_HEIGHT, this.INITIAL_SIZE),
            color: 0xE11D48 // Rose-600
        });

        this.spawnNextBlock();
    }

    private spawnNextBlock() {
        console.log('[StackPhysics] Spawning block at height:', this.stack.length);
        const top = this.stack[this.stack.length - 1];
        this.moveAxis = this.moveAxis === MoveAxis.X ? MoveAxis.Z : MoveAxis.X;

        // Target position (centered above top)
        const pos = top.position.clone();
        pos.y += this.BLOCK_HEIGHT;

        // Start from distance
        const startDist = 150;
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
        // Ketchapp style: Hue shifts according to height
        const hue = (index * 5) % 360; // 5 degrees shift per block
        const color = new THREE.Color();
        // S=80%, L=65% for a lighter, "candy-like" pastel look
        color.setHSL(hue / 360, 0.8, 0.65);
        return color.getHex();
    }

    public update(dt: number) {
        if (this.state !== GameState.PLAYING || !this.currentBlock) return;

        const moveAmount = this.currentSpeed * (dt / 16.66);
        if (this.moveAxis === MoveAxis.X) {
            this.currentBlock.position.x += moveAmount * this.moveDirection;
            if (Math.abs(this.currentBlock.position.x) > 200) {
                this.moveDirection *= -1;
            }
        } else {
            this.currentBlock.position.z += moveAmount * this.moveDirection;
            if (Math.abs(this.currentBlock.position.z) > 200) {
                this.moveDirection *= -1;
            }
        }
    }

    public placeBlock(): PhysicsResult {
        if (!this.currentBlock || this.state !== GameState.PLAYING) {
            return { perfect: false, combo: 0, gameOver: false, score: this.score, currentHue: 0 };
        }

        const top = this.stack[this.stack.length - 1];
        const axis = this.moveAxis === MoveAxis.X ? 'x' : 'z';
        const sizeAxis = this.moveAxis === MoveAxis.X ? 'x' : 'z';

        const delta = this.currentBlock.position[axis] - top.position[axis];
        const overlap = top.size[sizeAxis] - Math.abs(delta);

        if (overlap <= 0) {
            this.state = GameState.GAMEOVER;
            return { perfect: false, combo: 0, gameOver: true, score: this.score, currentHue: (this.stack.length * 5) % 360 };
        }

        const isPerfect = Math.abs(delta) < this.PERFECT_TOLERANCE;
        console.log(`[StackPhysics] Block placed. Delta: ${delta.toFixed(2)}, Overlap: ${overlap.toFixed(2)}, Perfect: ${isPerfect}`);

        if (isPerfect) {
            this.combo++;
            this.currentBlock.position[axis] = top.position[axis];
            this.currentBlock.size[sizeAxis] = top.size[sizeAxis];

            // Growth Mechanism (Ketchapp Style: Grows after 8 perfects)
            if (this.combo >= this.GROWTH_COMBO_TRIGGER) {
                // Grow in BOTH directions subtly
                this.currentBlock.size.x = Math.min(this.currentBlock.size.x + this.GROWTH_AMOUNT, this.INITIAL_SIZE);
                this.currentBlock.size.z = Math.min(this.currentBlock.size.z + this.GROWTH_AMOUNT, this.INITIAL_SIZE);
                console.log(`[StackPhysics] GROWTH TRIGGERED! New Size: ${this.currentBlock.size.x.toFixed(2)}x${this.currentBlock.size.z.toFixed(2)}`);
            }
        } else {
            this.combo = 0;

            // Slice the block
            const oldSize = this.currentBlock.size[sizeAxis];
            this.currentBlock.size[sizeAxis] = overlap;
            this.currentBlock.position[axis] = top.position[axis] + delta / 2;

            // Spawn Debris
            const debrisSize = oldSize - overlap;
            const debrisPos = this.currentBlock.position.clone();
            const sign = delta > 0 ? 1 : -1;
            debrisPos[axis] += (overlap / 2 + debrisSize / 2) * sign;

            const debrisBlockSize = this.currentBlock.size.clone();
            debrisBlockSize[sizeAxis] = debrisSize;

            this.debris.push({
                position: debrisPos,
                size: debrisBlockSize,
                color: this.currentBlock.color
            });
            console.log(`[StackPhysics] Sliced! New Size: ${this.currentBlock.size[sizeAxis].toFixed(2)}, Debris Size: ${debrisSize.toFixed(2)}`);
        }

        this.stack.push(this.currentBlock);
        this.score++;
        this.currentSpeed = this.MOVE_SPEED_BASE + Math.floor(this.score / 5) * 0.1;
        this.spawnNextBlock();

        return {
            perfect: isPerfect,
            combo: this.combo,
            gameOver: false,
            score: this.score,
            currentHue: (this.stack.length * 5) % 360
        };
    }
}
