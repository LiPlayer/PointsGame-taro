import Taro from '@tarojs/taro'

/**
 * Star Animation Engine
 * Ported from V3.2 Prototype (Verlet Physics + Spatial Hash)
 */

export class StarAnimation {
    constructor(canvasNode, width, height, dpr, initialPoints = 0) {
        // Fallback for NaN or zero dimensions
        this.width = width || (canvasNode && canvasNode.width) || 300;
        this.height = height || (canvasNode && canvasNode.height) || 200;
        this.dpr = dpr || 1;

        console.log(`[StarAnimation] Initializing: ${this.width}x${this.height} @ ${this.dpr}dpr, points: ${initialPoints}`);
        this.canvas = canvasNode;
        this.ctx = this.canvas.getContext('2d');

        const logicalWidth = this.width / this.dpr;
        const widthFactor = logicalWidth / 375;
        this.CONFIG = {
            particleCount: Math.floor(Math.min(initialPoints, 1500)),
            radius: 8 * widthFactor,
            gravity: 0.15,
            friction: 0.96,
            repulsionRadius: 80 * widthFactor,
            repulsionForce: 1.0,
            colors: ['#fbbf24', '#f59e0b', '#d97706'],
            sleepThreshold: 0.05
        };

        // Physics State
        this.particles = [];
        this.grid = {};
        this.cellSize = this.CONFIG.radius * 2.2;

        // Interaction
        this.pointer = { x: -1000, y: -1000, active: false };

        // Offscreen Canvas for caching star image
        this.starImg = null;

        this.init();
    }

    init() {
        console.group('[StarAnimation] Init Sequence');
        this.initCachedImage();
        this.initParticles();
        this.loop = this.loop.bind(this);

        // requestAnimationFrame compatibility
        const raf = this.canvas.requestAnimationFrame ||
            (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : null) ||
            Taro.requestAnimationFrame;

        console.log(`[StarAnimation] RAF status: ${!!raf}, particles: ${this.particles.length}`);
        if (raf) {
            raf(this.loop);
        } else {
            console.error("StarAnimation: No requestAnimationFrame found");
        }
        console.groupEnd();
    }

    initCachedImage() {
        // Create an offscreen canvas for the star asset
        const size = 64;
        let offscreen;
        let sCtx;

        if (Taro.getEnv() === Taro.ENV_TYPE.WEB) {
            // H5 / Web Environment
            offscreen = document.createElement('canvas');
            offscreen.width = size;
            offscreen.height = size;
            sCtx = offscreen.getContext('2d');
        } else {
            // MiniProgram Environment
            offscreen = Taro.createOffscreenCanvas({ type: '2d', width: size, height: size });
            sCtx = offscreen.getContext('2d');
        }

        if (!sCtx) {
            console.error("StarAnimation: Failed to create offscreen context");
            this.starImg = null;
            return;
        }

        const cx = 32;
        const cy = 32;
        const r = 28;

        // 1. Outer Ring (Pale Yellow Border)
        sCtx.beginPath();
        sCtx.arc(cx, cy, r, 0, Math.PI * 2);
        sCtx.fillStyle = '#fef3c7'; // amber-100
        sCtx.fill();

        // 2. White Body
        sCtx.beginPath();
        sCtx.arc(cx, cy, r - 6, 0, Math.PI * 2);
        sCtx.fillStyle = '#ffffff';
        sCtx.fill();

        // 3. Gold Star
        sCtx.translate(cx, cy);
        sCtx.beginPath();
        for (let i = 0; i < 5; i++) {
            sCtx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 19,
                -Math.sin((18 + i * 72) * Math.PI / 180) * 19);
            sCtx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 9,
                -Math.sin((54 + i * 72) * Math.PI / 180) * 9);
        }
        sCtx.closePath();
        sCtx.fillStyle = '#f59e0b'; // amber-500
        sCtx.fill();

        this.starImg = offscreen;
    }

    initParticles() {
        this.particles = [];
        const cols = Math.floor(this.width / (this.CONFIG.radius * 2));

        for (let i = 0; i < this.CONFIG.particleCount; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);

            // Start from bottom up
            const x = (col + 0.5) * (this.CONFIG.radius * 2) + (Math.random() - 0.5) * 5;
            const y = this.height - (row + 0.5) * (this.CONFIG.radius * 2) - 20;

            this.particles.push(this.createParticle(x, y));
        }
    }

    createParticle(x, y) {
        return {
            x: x,
            y: y,
            oldX: x + (Math.random() - 0.5) * 2,
            oldY: y + (Math.random() - 0.5) * 2,
            radius: this.CONFIG.radius * (0.8 + Math.random() * 0.4),
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 0.1,
            z: Math.floor(Math.random() * 3) / 2, // 0, 0.5, 1.0
            color: this.CONFIG.colors[Math.floor(Math.random() * this.CONFIG.colors.length)],
            isSleeping: false,
            isDying: false,
            deathTimer: 0,
            scale: 1.0
        };
    }

    handleInput(x, y) {
        // x, y are logical pixels from touch/mouse
        this.pointer.x = x;
        this.pointer.y = y;
        this.pointer.active = true;
    }

    stopInput() {
        this.pointer.active = false;
    }

    solve() {
        // 1. Spatial Hash
        this.grid = {};
        for (let p of this.particles) {
            if (p.isDying) continue;
            const key = `${Math.floor(p.x / this.cellSize)},${Math.floor(p.y / this.cellSize)}`;
            if (!this.grid[key]) this.grid[key] = [];
            this.grid[key].push(p);
        }

        // 2. Constraints
        for (let p of this.particles) {
            if (p.isDying) continue;

            // Mouse Repulsion
            if (this.pointer.active) {
                const dx = p.x - this.pointer.x;
                const dy = p.y - this.pointer.y;
                const distSq = dx * dx + dy * dy;
                const radiusSq = this.CONFIG.repulsionRadius * this.CONFIG.repulsionRadius;

                if (distSq < radiusSq) {
                    const dist = Math.sqrt(distSq);
                    const force = (1 - dist / this.CONFIG.repulsionRadius) * this.CONFIG.repulsionForce;
                    const angle = Math.atan2(dy, dx);

                    p.x += Math.cos(angle) * force * 2;
                    p.y += Math.sin(angle) * force * 2;
                    p.isSleeping = false;
                }
            }

            // Particle vs Particle behavior (Simplified for performance on mobile)
            // We only check 3x3 grid
            const cellX = Math.floor(p.x / this.cellSize);
            const cellY = Math.floor(p.y / this.cellSize);

            for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
                for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
                    const key = `${cx},${cy}`;
                    const cell = this.grid[key];
                    if (!cell) continue;

                    for (let other of cell) {
                        if (p === other) continue;
                        if (Math.abs(p.z - other.z) > 0.1) continue;

                        const dx = p.x - other.x;
                        const dy = p.y - other.y;
                        const distSq = dx * dx + dy * dy;
                        const minDist = p.radius + other.radius;

                        if (distSq < minDist * minDist && distSq > 0) {
                            const dist = Math.sqrt(distSq);
                            const overlap = minDist - dist;
                            const nx = dx / dist;
                            const ny = dy / dist;
                            const factor = 0.5;

                            p.x += nx * overlap * factor;
                            p.y += ny * overlap * factor;
                            other.x -= nx * overlap * factor;
                            other.y -= ny * overlap * factor;

                            p.isSleeping = false;
                            other.isSleeping = false;
                        }
                    }
                }
            }
        }
    }

    update() {
        for (let p of this.particles) {
            if (p.isDying) {
                p.deathTimer += 0.02;
                if (p.deathTimer < 0.4) {
                    p.y -= 2;
                    p.angle += 0.1;
                } else {
                    const phase2 = (p.deathTimer - 0.4) / 0.6;
                    p.scale = 1 - phase2;
                    p.angle += 0.3;
                    p.y -= 1;
                }
                continue;
            }

            if (p.isSleeping) continue;

            const vx = (p.x - p.oldX) * this.CONFIG.friction;
            const vy = (p.y - p.oldY) * this.CONFIG.friction;

            p.oldX = p.x;
            p.oldY = p.y;

            p.x += vx;
            p.y += vy + this.CONFIG.gravity;
            p.angle += p.angularVelocity;

            // Walls
            const logicalWidth = this.width / this.dpr;
            const logicalHeight = this.height / this.dpr;
            if (p.y + p.radius > logicalHeight) {
                p.y = logicalHeight - p.radius;
                const impact = vy;
                p.oldY = p.y + impact * 0.5;
                p.angularVelocity *= 0.9;
            }

            if (p.x + p.radius > logicalWidth) {
                p.x = logicalWidth - p.radius;
                p.oldX = p.x + vx * 0.5;
            } else if (p.x - p.radius < 0) {
                p.x = p.radius;
                p.oldX = p.x + vx * 0.5;
            }
        }

        // Prune dead
        // Note: iterating backwards in separate loop to avoid index issues if we were splicing, 
        // but here we might just filter or splice carefully.
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].isDying && this.particles[i].deathTimer >= 1.0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // MUST clear the entire PHYSICAL buffer.
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.ctx.save();
        this.ctx.scale(this.dpr, this.dpr);

        // Sort slightly expensive but crucial for Z-order
        this.particles.sort((a, b) => a.z - b.z);

        for (let p of this.particles) {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);

            const baseScale = p.radius * 2 / 64;
            const zScale = 0.5 + p.z * 0.7;
            const finalScale = baseScale * zScale * p.scale;

            this.ctx.scale(finalScale, finalScale);

            // Use cached image (centered at origin of cached image, so -32, -32)
            if (this.starImg) {
                this.ctx.drawImage(this.starImg, -32, -32);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 32, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
            }

            // Shine
            if (p.z > 0.7) {
                this.ctx.beginPath();
                this.ctx.arc(-10, -10, 8, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                this.ctx.fill();
            }

            this.ctx.restore();
        }
        this.ctx.restore();
    }

    loop() {
        this.update();
        this.solve();
        this.solve(); // Stability
        this.draw();

        const raf = this.canvas.requestAnimationFrame ||
            (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : null) ||
            Taro.requestAnimationFrame;

        if (raf) raf(this.loop);
    }

    // API
    addParticles(count) {
        const MAX_STARS = 1500;
        const currentActive = this.particles.filter(p => !p.isDying).length;
        const spaceLeft = Math.max(0, MAX_STARS - currentActive);
        const canAdd = Math.min(count, spaceLeft);

        for (let i = 0; i < canAdd; i++) {
            const x = Math.random() * this.width;
            const y = -20 - Math.random() * 100;
            this.particles.push(this.createParticle(x, y));
        }
    }

    consumeParticles(count) {
        let candidates = this.particles.filter(p => !p.isDying);
        for (let i = 0; i < count; i++) {
            if (candidates.length > 0) {
                const idx = Math.floor(Math.random() * candidates.length);
                candidates[idx].isDying = true;
                candidates.splice(idx, 1);
            }
        }
    }

    setParticleCount(count) {
        const targetCount = Math.floor(Math.min(count, 1500));
        const currentActive = this.particles.filter(p => !p.isDying).length;

        if (targetCount > currentActive) {
            this.addParticles(targetCount - currentActive);
        } else if (targetCount < currentActive) {
            this.consumeParticles(currentActive - targetCount);
        }
    }
}
