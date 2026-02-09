import { StackAudio } from './StackAudio';
import { ColorUtils } from '../../engine/ColorUtils';
import { IPhysicsWorld } from '../../engine/IPhysicsWorld';

export interface BoxState {
    x: number;
    y: number;
    z: number; // For rendering order
    width: number;
    depth: number; // Fixed for now
    color: number;
    isMoving: boolean;
    vx: number;
    vy: number; // For falling debris
}

export class StackPhysics implements IPhysicsWorld {
    public boxes: BoxState[] = [];
    public debris: BoxState[] = [];
    public currentBoxIndex: number = -1;
    public score: number = 0;
    public gameOver: boolean = false;

    private width: number = 0;
    private height: number = 0;
    private speed: number = 2.0; // Base speed
    private direction: number = 1;
    private blockHeight: number = 20;
    private baseWidth: number = 150;
    private palette = [0xe11d48, 0xf59e0b]; // Rose to Amber gradient



    // Gradient helper
    private getColor(level: number): number {
        const t = Math.min(1, level / 50); // Gradient over 50 levels
        return ColorUtils.lerpColor(this.palette[0], this.palette[1], t);
    }

    public init(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.reset();
    }

    public reset() {
        this.boxes = [];
        this.debris = [];
        this.score = 0;
        this.gameOver = false;
        this.speed = 3.0; // Initial speed
        this.direction = 1;

        // Base block
        this.addBlock(0, 0, this.baseWidth, this.getColor(0), false);
        // First moving block
        this.spawnNextBlock();
    }

    private addBlock(x: number, level: number, w: number, c: number, moving: boolean) {
        this.boxes.push({
            x: x,
            y: -level * this.blockHeight, // Logic Y (reversed for render)
            z: level,
            width: w,
            depth: 100, // Fixed depth
            color: c,
            isMoving: moving,
            vx: moving ? this.speed : 0,
            vy: 0
        });
        if (moving) this.currentBoxIndex = this.boxes.length - 1;
    }

    private spawnNextBlock() {
        const prev = this.boxes[this.boxes.length - 1];
        const level = this.score + 1;
        // Alternate spawn direction
        const spawnX = (level % 2 === 0) ? -150 : 150;
        this.direction = (level % 2 === 0) ? 1 : -1;

        this.addBlock(spawnX, level, prev.width, this.getColor(level), true);
    }

    public update(dt: number) { // dt is roughly 16ms
        if (this.gameOver) {
            // Update debris physics
            for (let i = this.debris.length - 1; i >= 0; i--) {
                const d = this.debris[i];
                d.vy += 0.5; // Gravity
                d.y += d.vy;
                d.x += d.vx;
                if (d.y > 500) { // Off screen
                    this.debris.splice(i, 1);
                }
            }
            return;
        }

        // Move current block
        const curr = this.boxes[this.currentBoxIndex];
        if (curr && curr.isMoving) {
            curr.x += this.speed * this.direction;
            // Bounce check (optional, but usually Stack game reverses on edge)
            if (Math.abs(curr.x) > 200) {
                this.direction *= -1;
            }
        }
    }

    public placeBlock() {
        if (this.gameOver) {
            this.reset();
            return;
        }

        const curr = this.boxes[this.currentBoxIndex];
        const prev = this.boxes[this.currentBoxIndex - 1];

        if (!prev) return; // Should not happen

        const dist = curr.x - prev.x;
        const overlap = prev.width - Math.abs(dist);

        if (overlap <= 0) {
            // Missed completely
            this.gameOver = true;
            StackAudio.playCrash();
            // Drop current block as debris
            curr.vy = 0;
            curr.vx = this.direction * 2;
            this.debris.push(curr);
            this.boxes.pop();
            return;
        }

        // Cut logic
        const tolerance = 5; // Perfect hit tolerance
        if (Math.abs(dist) < tolerance) {
            // Perfect!
            curr.x = prev.x; // Snap
            StackAudio.playScore(this.score);
            // Maybe slight width bonus?
        } else {
            // Clip
            const newWidth = overlap;
            const newX = prev.x + dist / 2; // Center of overlap

            // Debris part
            const debrisWidth = Math.abs(dist);
            const debrisX = curr.x + (dist > 0 ? (newWidth / 2 + debrisWidth / 2) : -(newWidth / 2 + debrisWidth / 2));

            this.debris.push({
                ...curr,
                x: debrisX,
                width: debrisWidth,
                isMoving: false,
                vx: this.direction * 3, // Fly off
                vy: 0
            });

            curr.width = newWidth;
            curr.x = prev.x + dist / 2; // Align to previous center + offset? No.
            // Stack logic: The new block must sit exactly on top of the overlap part
            // If prev was at 0, width 100.
            // Curr (width 100) moves to 10.
            // Overlap is 90.
            // New block should be at 5 (center of 0..90? No, center of 10..100 is 55. Center of 0..100 is 50.)
            // Overlap region:
            // if dist > 0 (moved right): overlap is [dist, 100]. length = 100-dist. center = dist + (100-dist)/2 = 50 + dist/2.
            // Wait, simpler:
            // New center = prev.x + dist/2.
            curr.x = prev.x + dist / 2;

            StackAudio.playSlice();
        }

        curr.isMoving = false;
        this.score++;

        // Increase speed slightly
        if (this.score % 5 === 0) this.speed += 0.5;

        this.spawnNextBlock();
    }

    public resize(w: number, h: number) { }
    public destroy() { }
}
