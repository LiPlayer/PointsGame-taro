import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

// --- Type Definitions ---
// --- Constants (Matching Taro Project) ---
const PHYSICS_CONFIG = {
  frequency: 60,
  maxParticles: 5000,
  gravity: { x: 0, y: 0.5 },
  cellSize: 15,
  bounds: {
    bounce: 0.4,
    ceilingMargin: -2000,
    collisionPasses: 3
  },
  particle: {
    collisionRadius: 6,
    visualRadius: 6,
    damping: 0.95,
    angularDamping: 0.0
  },
  consumption: {
    speed: 0.02,
    floatForce1: -2,
    floatForce2: -1,
    phase1Threshold: 0.4
  },
  interaction: {
    repulsionRadius: 40,
    repulsionForce: 16.0
  }
};

const RENDER_CONFIG = {
  backgroundColor: 0xFFFFFF,
  backgroundAlpha: 0,
  particleColor: 0xF59E0B, // Amber 500
  particleTextureSize: 64,
  maxDPR: 2.0,
  depth: {
    scaleRange: [0.5, 1.2],
    alphaRange: [0.6, 1.0],
    zLevels: 3
  },
  shape: {
    outerRadius: 19,
    innerRadius: 9,
    ringPadding: 4,
    bodyPadding: 6
  }
};

// --- Physics System (PBD) ---
class PhysicsSystem {
  public px: Float32Array;
  public py: Float32Array;
  public ox: Float32Array;
  public oy: Float32Array;
  public vx: Float32Array;
  public vy: Float32Array;
  public rads: Float32Array;
  public zs: Float32Array;
  public ids: Int32Array;
  public states: Int8Array; // 0: active, 1: dying, 2: cleanup
  public timers: Float32Array;
  public angles: Float32Array;
  public avs: Float32Array;

  private idPool: Int32Array;
  private poolPtr: number;
  public particleCount: number = 0;
  private zCounter: number = 0;

  private cellSize = PHYSICS_CONFIG.cellSize;
  private gridCols = 0;
  private gridRows = 0;
  private heads: Int32Array = new Int32Array(0);
  private nexts: Int32Array;

  private width: number = 0;
  private height: number = 0;

  constructor() {
    const max = PHYSICS_CONFIG.maxParticles;
    this.px = new Float32Array(max);
    this.py = new Float32Array(max);
    this.ox = new Float32Array(max);
    this.oy = new Float32Array(max);
    this.vx = new Float32Array(max);
    this.vy = new Float32Array(max);
    this.rads = new Float32Array(max);
    this.zs = new Float32Array(max);
    this.ids = new Int32Array(max);
    this.states = new Int8Array(max);
    this.timers = new Float32Array(max);
    this.angles = new Float32Array(max);
    this.avs = new Float32Array(max);
    this.nexts = new Int32Array(max);
    this.idPool = new Int32Array(max);
    this.poolPtr = max;
    for (let i = 0; i < max; i++) this.idPool[i] = max - 1 - i;
  }

  public init(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.gridCols = Math.ceil(w / this.cellSize);
    this.gridRows = Math.ceil(h / this.cellSize);
    this.heads = new Int32Array(this.gridCols * this.gridRows).fill(-1);
  }

  public update() {
    const n = this.particleCount;
    const w = this.width, h = this.height;
    const gravity = PHYSICS_CONFIG.gravity.y;
    const damping = PHYSICS_CONFIG.particle.damping;
    const consumption = PHYSICS_CONFIG.consumption;
    const iterations = PHYSICS_CONFIG.bounds.collisionPasses;

    for (let i = 0; i < n; i++) {
      if (this.states[i] === 1) {
        this.timers[i] += consumption.speed;
        if (this.timers[i] < consumption.phase1Threshold) {
          this.py[i] += consumption.floatForce1;
          this.angles[i] += 0.1;
        } else {
          this.py[i] += consumption.floatForce2;
          this.angles[i] += 0.2;
          if (this.timers[i] >= 1.0) this.states[i] = 2;
        }
        continue;
      }
      this.vy[i] += gravity;
      this.vx[i] *= damping;
      this.vy[i] *= damping;
      this.ox[i] = this.px[i];
      this.oy[i] = this.py[i];
      this.px[i] += this.vx[i];
      this.py[i] += this.vy[i];
      this.angles[i] += this.avs[i];
    }

    for (let iter = 0; iter < iterations; iter++) {
      this.rebuildGrid(n);
      this.solveConstraints(n);
      this.solveBoundaries(n, w, h);
    }

    for (let i = 0; i < n; i++) {
      if (this.states[i] !== 0) continue;
      this.vx[i] = this.px[i] - this.ox[i];
      this.vy[i] = this.py[i] - this.oy[i];
    }
  }

  private rebuildGrid(n: number) {
    this.heads.fill(-1);
    for (let i = 0; i < n; i++) {
      if (this.states[i] !== 0) continue;
      const gx = Math.floor(this.px[i] / this.cellSize);
      const gy = Math.floor(this.py[i] / this.cellSize);
      if (gx >= 0 && gx < this.gridCols && gy >= 0 && gy < this.gridRows) {
        const idx = gx + gy * this.gridCols;
        this.nexts[i] = this.heads[idx];
        this.heads[idx] = i;
      }
    }
  }

  private solveConstraints(n: number) {
    for (let i = 0; i < n; i++) {
      if (this.states[i] !== 0) continue;
      const gx = Math.floor(this.px[i] / this.cellSize);
      const gy = Math.floor(this.py[i] / this.cellSize);
      const ri = this.rads[i], zi = this.zs[i];

      for (let dy = -1; dy <= 1; dy++) {
        const ny = gy + dy;
        if (ny < 0 || ny >= this.gridRows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx;
          if (nx < 0 || nx >= this.gridCols) continue;
          let j = this.heads[nx + ny * this.gridCols];
          while (j !== -1) {
            if (j > i && this.states[j] === 0 && Math.abs(zi - this.zs[j]) < 0.1) {
              const dx = this.px[i] - this.px[j], dy = this.py[i] - this.py[j];
              const d2 = dx * dx + dy * dy, minDist = ri + this.rads[j];
              if (d2 < minDist * minDist && d2 > 0.0001) {
                const dist = Math.sqrt(d2), overlap = (minDist - dist) * 0.5;
                const nx = dx / dist, ny = dy / dist;
                this.px[i] += nx * overlap; this.py[i] += ny * overlap;
                this.px[j] -= nx * overlap; this.py[j] -= ny * overlap;
              }
            }
            j = this.nexts[j];
          }
        }
      }
    }
  }

  private solveBoundaries(n: number, w: number, h: number) {
    const bounce = PHYSICS_CONFIG.bounds.bounce;
    for (let i = 0; i < n; i++) {
      if (this.states[i] !== 0) continue;
      const r = this.rads[i];
      if (this.px[i] < r) { this.px[i] = r; this.vx[i] *= -bounce; }
      if (this.px[i] > w - r) { this.px[i] = w - r; this.vx[i] *= -bounce; }
      if (this.py[i] > h - r) { this.py[i] = h - r; this.vy[i] *= -bounce; this.avs[i] *= 0.9; }
      if (this.py[i] < PHYSICS_CONFIG.bounds.ceilingMargin) this.states[i] = 2;
    }
  }

  public addParticle(x: number, y: number): number {
    if (this.particleCount >= PHYSICS_CONFIG.maxParticles || this.poolPtr <= 0) return -1;
    const i = this.particleCount;
    this.px[i] = this.ox[i] = x; this.py[i] = this.oy[i] = y;
    this.vx[i] = (Math.random() - 0.5) * 5; this.vy[i] = Math.random() * 0.5;
    this.states[i] = 0; this.timers[i] = 0;
    this.rads[i] = PHYSICS_CONFIG.particle.collisionRadius * (0.9 + Math.random() * 0.2);
    this.zs[i] = (this.zCounter % RENDER_CONFIG.depth.zLevels) / (RENDER_CONFIG.depth.zLevels - 1 || 1);
    this.zCounter++;
    this.angles[i] = Math.random() * Math.PI * 2; this.avs[i] = (Math.random() - 0.5) * 0.2;
    const id = this.idPool[--this.poolPtr]; this.ids[i] = id;
    this.particleCount++;
    return id;
  }

  public applyRepulsion(x: number, y: number) {
    const range = PHYSICS_CONFIG.interaction.repulsionRadius, rangeSq = range * range;
    const force = PHYSICS_CONFIG.interaction.repulsionForce;
    for (let i = 0; i < this.particleCount; i++) {
      if (this.states[i] !== 0) continue;
      const dx = this.px[i] - x, dy = this.py[i] - y, d2 = dx * dx + dy * dy;
      if (d2 < rangeSq && d2 > 0) {
        const dist = Math.sqrt(d2), f = (1 - dist / range) * force;
        this.vx[i] += (dx / dist) * f; this.vy[i] += (dy / dist) * f;
      }
    }
  }

  public applyExplosion(x: number, y: number, power: number = 20) {
    for (let i = 0; i < this.particleCount; i++) {
      if (this.states[i] !== 0) continue;
      const dx = this.px[i] - x, dy = this.py[i] - y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const f = power / dist;
      this.vx[i] += (dx / dist) * f; this.vy[i] += (dy / dist) * f;
    }
  }

  public cleanup(onRemove: (id: number) => void) {
    for (let i = this.particleCount - 1; i >= 0; i--) {
      if (this.states[i] === 2) {
        const id = this.ids[i]; onRemove(id);
        this.idPool[this.poolPtr++] = id;
        const last = this.particleCount - 1;
        if (i !== last) {
          this.px[i] = this.px[last]; this.py[i] = this.py[last];
          this.ox[i] = this.ox[last]; this.oy[i] = this.oy[last];
          this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last];
          this.rads[i] = this.rads[last]; this.zs[i] = this.zs[last];
          this.ids[i] = this.ids[last]; this.states[i] = this.states[last];
          this.timers[i] = this.timers[last]; this.angles[i] = this.angles[last]; this.avs[i] = this.avs[last];
        }
        this.particleCount--;
      }
    }
  }
}

// --- Render System (PixiJS ParticleContainer) ---
class RenderSystem {
  public app: PIXI.Application;
  public container: PIXI.ParticleContainer;
  public texture: PIXI.Texture;
  public sprites: (PIXI.Sprite | null)[] = [];
  private baseScales: Float32Array = new Float32Array(PHYSICS_CONFIG.maxParticles);
  private baseAlphas: Float32Array = new Float32Array(PHYSICS_CONFIG.maxParticles);

  constructor(canvas: HTMLCanvasElement, width: number, height: number, dpr: number) {
    this.app = new PIXI.Application({
      view: canvas, width, height, resolution: dpr, autoDensity: true,
      backgroundAlpha: 0, antialias: false, powerPreference: 'high-performance'
    });
    this.texture = this.createTexture();
    this.container = new PIXI.ParticleContainer(PHYSICS_CONFIG.maxParticles, {
      position: true, rotation: true, scale: true, alpha: true
    });
    this.app.stage.addChild(this.container);
  }

  private createTexture(): PIXI.Texture {
    const size = RENDER_CONFIG.particleTextureSize;
    const shape = RENDER_CONFIG.shape;
    const graphics = new PIXI.Graphics();
    const cx = size / 2, cy = size / 2, r = size / 2 - shape.ringPadding;
    graphics.beginFill(0xFDE68A).drawCircle(cx, cy, r).endFill();
    graphics.beginFill(0xFFFFFF).drawCircle(cx, cy, r - shape.bodyPadding).endFill();
    graphics.beginFill(RENDER_CONFIG.particleColor);
    const pts: number[] = [];
    for (let i = 0; i < 5; i++) {
      const a1 = (18 + i * 72) * Math.PI / 180, a2 = (54 + i * 72) * Math.PI / 180;
      pts.push(cx + Math.cos(a1) * shape.outerRadius, cy - Math.sin(a1) * shape.outerRadius);
      pts.push(cx + Math.cos(a2) * shape.innerRadius, cy - Math.sin(a2) * shape.innerRadius);
    }
    graphics.drawPolygon(pts).endFill();
    return this.app.renderer.generateTexture(graphics);
  }

  public addSprite(id: number, x: number, y: number, radius: number, z: number) {
    const sprite = new PIXI.Sprite(this.texture);
    sprite.anchor.set(0.5); sprite.position.set(x, y);
    const finalScale = ((radius * 2) / RENDER_CONFIG.particleTextureSize) * (RENDER_CONFIG.depth.scaleRange[0] + z * (RENDER_CONFIG.depth.scaleRange[1] - RENDER_CONFIG.depth.scaleRange[0]));
    sprite.scale.set(finalScale); this.baseScales[id] = finalScale;
    const finalAlpha = z <= 0.7 ? (RENDER_CONFIG.depth.alphaRange[0] + z * (RENDER_CONFIG.depth.alphaRange[1] - RENDER_CONFIG.depth.alphaRange[0])) : 1.0;
    sprite.alpha = finalAlpha; this.baseAlphas[id] = finalAlpha;
    this.container.addChild(sprite); this.sprites[id] = sprite;
  }

  public removeSprite(id: number) {
    const s = this.sprites[id];
    if (s) { this.container.removeChild(s); this.sprites[id] = null; s.destroy(); }
  }

  public updateBody(id: number, x: number, y: number, rotation: number, scaleMult?: number, alphaMult?: number) {
    const s = this.sprites[id];
    if (s) {
      s.position.set(x, y); s.rotation = rotation;
      if (scaleMult !== undefined) s.scale.set(this.baseScales[id] * scaleMult);
      if (alphaMult !== undefined) s.alpha = this.baseAlphas[id] * alphaMult;
    }
  }

  public destroy() { this.app.destroy(true, { children: true, texture: true, baseTexture: true }); }
}

// --- Game Loop (Fixed Timestep) ---
class GameLoop {
  private physics = new PhysicsSystem();
  private renderer: RenderSystem;
  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private fixedDelta = 1000 / PHYSICS_CONFIG.frequency;
  private pointer = { x: 0, y: 0, active: false };

  constructor(canvas: HTMLCanvasElement, width: number, height: number, dpr: number) {
    this.renderer = new RenderSystem(canvas, width, height, dpr);
    this.physics.init(width, height);
  }

  public start() {
    this.isRunning = true; this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  public stop() { this.isRunning = false; }

  public addStar(x: number, y: number) {
    const id = this.physics.addParticle(x, y);
    if (id !== -1) this.renderer.addSprite(id, x, y, PHYSICS_CONFIG.particle.visualRadius, this.physics.zs[this.physics.particleCount - 1]);
  }

  public removeStars(count: number) {
    const n = this.physics.particleCount;
    const indices = Array.from({ length: n }, (_, i) => i).filter(i => this.physics.states[i] === 0);
    for (let i = 0; i < count && indices.length > 0; i++) {
      const pIdx = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
      this.physics.states[pIdx] = 1; this.physics.timers[pIdx] = 0;
    }
  }

  public explode(x?: number, y?: number, power?: number) {
    const centerX = x !== undefined ? x : this.physics.px.length > 0 ? 187 : 0; // Default to center of 375px phone
    const centerY = y !== undefined ? y : 406; // Default to center of 812px phone
    // Actually use the mid-point of the card if called without params
    this.physics.applyExplosion(centerX, centerY, power || 25);
  }

  public setPointer(x: number, y: number, active: boolean) {
    this.pointer.x = x; this.pointer.y = y; this.pointer.active = active;
  }

  private loop(time: number) {
    if (!this.isRunning) return;
    let delta = time - this.lastTime; this.lastTime = time;
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= this.fixedDelta) {
      if (this.pointer.active) this.physics.applyRepulsion(this.pointer.x, this.pointer.y);
      this.physics.update();
      this.accumulator -= this.fixedDelta;
    }
    this.physics.cleanup(id => this.renderer.removeSprite(id));
    const alpha = this.accumulator / this.fixedDelta;
    for (let i = 0; i < this.physics.particleCount; i++) {
      const ix = this.physics.px[i] * alpha + this.physics.ox[i] * (1 - alpha);
      const iy = this.physics.py[i] * alpha + this.physics.oy[i] * (1 - alpha);
      let s = 1, a = 1;
      if (this.physics.states[i] === 1) {
        const p = this.physics.timers[i];
        if (p >= 0.4) { s = a = 1 - (p - 0.4) / 0.6; }
      }
      this.renderer.updateBody(this.physics.ids[i], ix, iy, this.physics.angles[i], s, a);
    }
    this.renderer.app.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  public destroy() { this.stop(); this.renderer.destroy(); }
  public getStarCount() { return this.physics.particleCount; }
}

declare global {
  interface Window {
    PointsSystem: {
      add: (count: number) => void;
      consume: (count: number) => void;
      explode: () => void;
    };
  }
}

// --- CSS & Animations ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&family=Noto+Sans+SC:wght@400;700;900&display=swap');

    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif;
      background-color: #f8fafc;
      margin: 0;
    }

    .gradient-border {
      border: 1px solid transparent;
      background-clip: padding-box, border-box;
      background-origin: padding-box, border-box;
      background-image: linear-gradient(white, white), linear-gradient(to top, rgba(241, 245, 249, 1), rgba(241, 245, 249, 0));
    }

    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
    .animate-float {
      animation: float 4s ease-in-out infinite;
    }

    @keyframes pulse-glow {
      0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4); }
      70% { box-shadow: 0 0 0 15px rgba(225, 29, 72, 0); }
      100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
    }
    .animate-pulse-glow {
      animation: pulse-glow 2s infinite;
    }

    @keyframes scan-line {
      0% { top: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    .scan-anim {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #e11d48;
      box-shadow: 0 0 10px #e11d48;
      animation: scan-line 2s linear infinite;
    }

    /* Custom Scrollbar for list */
    ::-webkit-scrollbar {
      width: 4px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
  `}</style>
);

// --- Reusable Components ---

const PhoneShell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`w-[375px] h-[812px] bg-white border-[12px] border-slate-800 rounded-[50px] relative overflow-hidden shadow-2xl flex flex-col ${className}`}>
    {children}
  </div>
);

const NavClose = ({ className = "" }: { className?: string }) => (
  <div className={`absolute top-6 left-6 p-2 rounded-full bg-slate-50 text-slate-400 cursor-pointer z-50 hover:bg-slate-100 active:bg-slate-200 transition-all duration-100 ${className}`}>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  </div>
);

const BtnPrimary: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <button className={`w-full py-5 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-[0_10px_20px_-5px_rgba(225,29,72,0.4)] active:scale-95 transition-all duration-100 font-black flex items-center justify-center gap-2 ${className}`}>
    {children}
  </button>
);

const LabelCaps: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`text-[10px] font-extrabold tracking-widest uppercase text-slate-400 ${className}`}>
    {children}
  </span>
);

// --- Game Logic / Physics Component (PixiJS Version) ---

const PointsCard = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<GameLoop | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, RENDER_CONFIG.maxDPR);

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.borderRadius = '32px';

    if (containerRef.current.firstChild) {
      containerRef.current.insertBefore(canvas, containerRef.current.firstChild);
    } else {
      containerRef.current.appendChild(canvas);
    }

    const loop = new GameLoop(canvas, width, height, dpr);
    loopRef.current = loop;
    loop.start();

    // Initial stars
    const initialPoints = 1240;
    const spacing = PHYSICS_CONFIG.particle.collisionRadius * 2.0;
    const cols = Math.floor(width / spacing);
    for (let i = 0; i < initialPoints; i++) {
      const x = (i % cols + 0.5) * spacing + (Math.random() - 0.5) * 5;
      const y = height - (Math.floor(i / cols) + 0.5) * spacing - 20;
      loop.addStar(x, y);
    }

    window.PointsSystem = {
      add: (count: number) => {
        const w = width;
        for (let i = 0; i < count; i++) {
          loop.addStar(Math.random() * w, -20 - Math.random() * 100);
        }
        if (displayRef.current) {
          const current = parseInt(displayRef.current.innerText.replace(/,/g, '')) || 0;
          displayRef.current.innerText = (current + count).toLocaleString();
        }
      },
      consume: (count: number) => {
        loop.removeStars(count);
        if (displayRef.current) {
          const current = parseInt(displayRef.current.innerText.replace(/,/g, '')) || 0;
          displayRef.current.innerText = Math.max(0, current - count).toLocaleString();
        }
      },
      explode: () => {
        loop.explode(width / 2, height / 2, 30);
      }
    };

    return () => {
      loop.destroy();
      delete (window as any).PointsSystem;
    };
  }, []);

  const handlePointer = (e: any, active: boolean) => {
    if (!loopRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX || e.touches?.[0]?.clientX) || 0) - rect.left;
    const y = ((e.clientY || e.touches?.[0]?.clientY) || 0) - rect.top;
    loopRef.current.setPointer(x, y, active);
  };

  return (
    <div
      ref={containerRef}
      className="bg-white gradient-border rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden isolate mt-4"
      onMouseMove={(e) => handlePointer(e, true)}
      onTouchMove={(e) => handlePointer(e, true)}
      onTouchStart={(e) => handlePointer(e, true)}
      onMouseLeave={() => loopRef.current?.setPointer(0, 0, false)}
      onTouchEnd={() => loopRef.current?.setPointer(0, 0, false)}
    >
      <div className="flex flex-col items-center mt-2 mb-16 relative z-10">
        <div className="w-16 h-16 bg-rose-600 rounded-2xl shadow-lg flex items-center justify-center text-white text-3xl font-black mb-4">
          婷
        </div>
        <h1 className="text-xl font-black text-slate-900">婷姐•贵州炒鸡</h1>
      </div>

      <div className="relative z-10 pointer-events-none">
        <LabelCaps className="block mb-2">当前可用积分</LabelCaps>
        <div ref={displayRef} className="text-6xl font-black text-slate-900 tracking-tighter mix-blend-multiply">
          1,240
        </div>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-50/80 backdrop-blur-sm text-amber-700 rounded-full text-[10px] font-bold shadow-sm">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          今日已玩 0/3 次
        </div>
      </div>
    </div>
  );
};


// --- App Component ---

export default function App() {
  return (
    <div className="p-10 bg-slate-50 min-h-screen text-slate-900">
      <GlobalStyles />

      <div className="text-center mb-16">
        <h1 className="text-4xl font-black text-slate-900 mb-4">婷姐贵州炒鸡 · V3.2 全量原型</h1>
        <p className="text-slate-500 font-medium">包含所有 10 个核心状态页面 (纯中文版)</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(375px,1fr))] gap-[60px] justify-items-center">

        {/* 01. Home */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-slate-200 px-4 py-1 rounded-full text-xs font-bold text-slate-600">01. 首页 (入口)</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col">
              <PointsCard />
              <div className="space-y-4 mb-6">
                <BtnPrimary className="text-lg">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  赚积分
                </BtnPrimary>
                <div className="grid grid-cols-2 gap-4">
                  <button className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 active:bg-slate-100 transition-all duration-100">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                    <span className="text-xs font-bold text-slate-600">已收集游戏</span>
                  </button>
                  <button className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 active:bg-slate-100 transition-all duration-100">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                    </svg>
                    <span className="text-xs font-bold text-slate-600">分享积分</span>
                  </button>
                </div>
                <button className="w-full py-5 rounded-2xl bg-slate-900 text-white text-sm font-black flex items-center justify-center gap-3 active:scale-95 transition-all duration-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                  </svg>
                  付款抵扣
                </button>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 02a. Earn (Entry) */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-rose-100 px-4 py-1 rounded-full text-xs font-bold text-rose-700">02a. 赚积分 (开始页)</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col text-center">
              <NavClose />
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-48 h-48 bg-slate-50 rounded-[48px] border-4 border-white shadow-xl flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 rounded-[44px] bg-gradient-to-tr from-rose-50 to-white opacity-50"></div>
                  <svg className="w-24 h-24 text-rose-500 animate-float" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 6H7c-3 0-5.1 2.5-5 5.5C2.1 14.4 4.5 17 7.5 17h9c3 0 5.4-2.6 5.5-5.5.1-3-2-5.5-5-5.5zM7.5 14c-1.4 0-2.5-1.1-2.5-2.5S6.1 9 7.5 9s2.5 1.1 2.5 2.5S8.9 14 7.5 14zm10.5-1c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm-2-2c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm0 4c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm2 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">准备好了吗？</h2>
                <p className="text-sm text-slate-400 px-8">点击开始，系统将为你随机匹配<br />一个小挑战或惊喜奖励。</p>
              </div>
              <BtnPrimary className="text-xl mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                开始
              </BtnPrimary>
            </div>
          </PhoneShell>
        </div>

        {/* 02b. Instant Win */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-amber-100 px-4 py-1 rounded-full text-xs font-bold text-amber-700">02b. 赚积分 (直接获分)</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col text-center bg-amber-50">
              <NavClose className="bg-white/50" />
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 animate-pulse-glow border-4 border-amber-200">
                  <svg className="w-20 h-20 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-black text-amber-600 mb-2">惊喜时刻！</h2>
                <p className="text-sm text-amber-800 font-bold opacity-70">无需游戏，直接获分</p>
              </div>
              <button className="w-full py-5 rounded-2xl bg-amber-500 text-white shadow-lg text-xl font-black mb-6 flex items-center justify-center gap-2 active:scale-95 transition-all duration-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                点击查看结果
              </button>
            </div>
          </PhoneShell>
        </div>

        {/* 02c. Earn (Game Encounter) */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-rose-100 px-4 py-1 rounded-full text-xs font-bold text-rose-700">02c. 赚积分 (游戏遭遇)</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col text-center bg-rose-50">
              <NavClose className="bg-white/50" />
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 animate-float border-4 border-rose-200 relative">
                  <div className="absolute -top-3 px-3 py-1 bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm z-10">
                    新游戏解锁
                  </div>
                  <svg className="w-20 h-20 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-black text-rose-600 mb-2">疯狂炒鸡</h2>
                <p className="text-sm text-rose-800 font-bold opacity-70">首次挑战 · 难度 ★★★</p>
              </div>
              <BtnPrimary className="text-xl mb-6 shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                开始挑战
              </BtnPrimary>
            </div>
          </PhoneShell>
        </div>

        {/* 03. Game Running */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-slate-200 px-4 py-1 rounded-full text-xs font-bold text-slate-600">03. 游戏运行态</span>
          <PhoneShell className="bg-slate-900">
            <div className="relative h-full w-full">
              {/* Game Canvas Placeholder */}
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center overflow-hidden">
                <div className="text-slate-700 text-9xl font-black opacity-10 rotate-12 select-none">游戏中</div>
                <div className="absolute top-1/4 left-1/3 w-12 h-12 bg-rose-500 rounded-full"></div>
                <div className="absolute bottom-1/3 right-1/4 w-16 h-4 bg-amber-400 rounded-full rotate-45"></div>
              </div>

              {/* Overlay UI */}
              <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center mt-6">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              </div>

              {/* No Points UI in Game! */}
              <div className="absolute bottom-10 width-full text-center w-full z-10">
                <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-bold">游戏进行中...</p>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 04a. Result - EARN MODE */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-emerald-100 px-4 py-1 rounded-full text-xs font-bold text-emerald-700">04a. 结果页 (Earn模式)</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col text-center">
              <NavClose />
              <div className="flex-1 flex flex-col items-center justify-center pt-10">
                <LabelCaps className="mb-2 text-emerald-600">挑战成功</LabelCaps>

                <div className="relative mb-10">
                  <div className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                    <span>+20</span>
                    <span className="text-2xl mt-4">积分</span>
                  </div>
                  <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2">
                    🎉 新纪录奖励
                  </div>
                </div>

                <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">本次得分</span>
                      <span className="text-3xl font-black text-slate-900">85</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">历史最高</span>
                      <span className="text-3xl font-black text-slate-400">70</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-slate-400 w-[82%]"></div>
                    <div className="h-full bg-emerald-500 w-[18%]"></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">打破纪录</span>
                    <span className="text-[10px] text-emerald-600 font-bold">+15 (突破)</span>
                  </div>
                </div>

                <div className="bg-rose-50 rounded-2xl p-4 w-full border border-rose-100 mb-4 flex items-center justify-between">
                  <span className="text-rose-700 font-bold text-sm">当前总积分</span>
                  <span className="text-rose-700 font-black text-xl tracking-tight">1,260</span>
                </div>
              </div>

              <div className="mt-auto space-y-3 mb-6">
                <button className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all duration-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  再玩一次
                </button>
                <BtnPrimary className="text-sm shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  换个挑战
                </BtnPrimary>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 04b. Result - INSTANT WIN */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-amber-100 px-4 py-1 rounded-full text-xs font-bold text-amber-700">04b. 结果页 (直接获分)</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col text-center">
              <NavClose />
              <div className="flex-1 flex flex-col items-center justify-center pt-10">
                <div className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center shadow-lg mb-8 border-4 border-amber-100">
                  <svg className="w-16 h-16 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"></path>
                  </svg>
                </div>

                <div className="text-center mb-10">
                  <LabelCaps className="mb-2 text-emerald-600">惊喜时刻！</LabelCaps>
                  <p className="text-[10px] text-slate-400 font-bold opacity-70 mb-4 uppercase tracking-widest">无需任何挑战，系统赠送</p>
                  <div className="text-7xl font-black text-emerald-600 tracking-tighter flex items-center justify-center gap-2">
                    <span>+10</span>
                    <span className="text-2xl mt-4">积分</span>
                  </div>
                </div>

                <div className="bg-rose-50 rounded-2xl p-4 w-full border border-rose-100 mb-4 flex items-center justify-between">
                  <span className="text-rose-700 font-bold text-sm">当前总积分</span>
                  <span className="text-rose-700 font-black text-xl tracking-tight">1,250</span>
                </div>
              </div>

              <div className="mt-auto mb-6">
                <BtnPrimary className="text-sm shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  换个挑战
                </BtnPrimary>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 05. Share */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-purple-100 px-4 py-1 rounded-full text-xs font-bold text-purple-700">05. 分享 (收/发)</span>
          <PhoneShell className="bg-slate-50">
            <div className="flex-1 flex flex-col">
              <NavClose />
              <div className="flex-1 bg-white rounded-b-[40px] shadow-sm flex flex-col items-center justify-center p-8 relative z-0">
                <h2 className="text-lg font-black text-slate-900 mb-6">向我转积分</h2>
                <div className="w-48 h-48 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-4">
                  <svg className="w-20 h-20 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm13 0h5v2h-5v-2zm0 3h2v5h-2v-5zm3 0h2v2h-2v-2zm0 3h2v2h-2v-2z"></path>
                  </svg>
                </div>
                <div className="bg-slate-100 px-4 py-1 rounded-full text-[10px] font-mono font-bold text-slate-500">ID: TJ_88921</div>
              </div>
              <div className="flex-1 flex flex-col p-8 justify-center">
                <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                  转给朋友
                </h2>
                <div className="mb-4">
                  <LabelCaps className="block mb-2">积分数量</LabelCaps>
                  <input type="number" defaultValue="100" className="w-full text-3xl font-black bg-white border border-slate-200 rounded-2xl py-4 px-6 text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" />
                </div>
                <button className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all duration-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                  </svg>
                  扫码转出
                </button>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 06a. Pay (Scan) */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-slate-200 px-4 py-1 rounded-full text-xs font-bold text-slate-600">06a. 门店支付 (扫码)</span>
          <PhoneShell className="bg-black">
            <div className="relative h-full w-full">
              <div className="absolute top-6 left-6 p-2 rounded-full bg-black/40 text-white z-20 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>

              <div className="absolute inset-0 bg-slate-800">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=375&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                <h2 className="text-white font-bold mb-12 drop-shadow-md">请扫描商户收款码</h2>
                <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative overflow-hidden bg-white/5 backdrop-blur-sm">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-lg"></div>
                  <div className="scan-anim"></div>
                </div>
                <p className="text-white/70 text-sm mt-8 text-center">识别成功后<br />积分将自动全额抵扣</p>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 06b. Pay (Confirm) */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-slate-200 px-4 py-1 rounded-full text-xs font-bold text-slate-600">06b. 门店支付 (确认)</span>
          <PhoneShell className="bg-slate-50">
            <div className="flex-1 flex flex-col justify-center px-6 pt-[50px]">
              <div className="bg-white rounded-[40px] p-8 shadow-card border border-slate-100">
                <div className="flex flex-col items-center mb-8 border-b border-slate-100 pb-8">
                  <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">订单确认</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">婷姐•贵州炒鸡 (总店)</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">订单总额</span>
                    <span className="text-lg font-black text-slate-900">¥ 108.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-rose-500 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                      积分抵扣 (1240分)
                    </span>
                    <span className="text-lg font-black text-rose-600">- ¥ 12.40</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 text-center mb-6">
                  <LabelCaps className="block mb-1">还需要支付</LabelCaps>
                  <div className="text-4xl font-black text-slate-900 tracking-tighter">¥ 95.60</div>
                </div>

                <BtnPrimary className="text-lg mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  确认支付
                </BtnPrimary>
                <button className="w-full py-3 text-slate-400 text-xs font-bold uppercase hover:text-slate-600 flex items-center justify-center gap-1 transition-all duration-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  取消订单
                </button>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 07. Collection */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-blue-100 px-4 py-1 rounded-full text-xs font-bold text-blue-700">07. 游戏图鉴</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                <NavClose className="!relative !top-0 !left-0 !bg-slate-50" />
                <h2 className="text-xl font-black text-slate-900">已收集的游戏</h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Game 1 */}
                <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="font-black text-slate-900">疯狂炒鸡</p>
                      <p className="text-[10px] font-bold text-slate-400">已玩 12 次</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all duration-100">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    复玩
                  </button>
                </div>

                {/* Game 2 */}
                <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="font-black text-slate-900">砂锅围筷子</p>
                      <p className="text-[10px] font-bold text-slate-400">已玩 3 次</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all duration-100">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    复玩
                  </button>
                </div>

                {/* Game 3 (Locked) */}
                <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 flex items-center gap-4 opacity-60 grayscale">
                  <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <p className="font-bold text-slate-400 text-sm">???</p>
                </div>
              </div>

              <div className="py-4 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">复玩不会获得积分</p>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* 07b. Result (Collection Replay) */}
        <div className="flex flex-col items-center gap-4">
          <span className="bg-blue-100 px-4 py-1 rounded-full text-xs font-bold text-blue-700">07b. 结果页 (复玩模式)</span>
          <PhoneShell>
            <div className="p-6 pt-[50px] flex-1 flex flex-col text-center">
              <NavClose />

              <div className="flex-1 flex flex-col items-center justify-center pt-10">
                <LabelCaps className="mb-2 text-slate-400">练习模式</LabelCaps>

                <div className="relative mb-6">
                  <div className="text-8xl font-black text-slate-900 tracking-tighter">
                    85
                  </div>
                  <div className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full inline-block mt-2">
                    复玩不计分
                  </div>
                </div>

                <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">本次表现</span>
                      <span className="text-xl font-black text-slate-700">表现优异</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">历史最佳</span>
                      <span className="text-xl font-black text-slate-700">70</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 border-t border-slate-200 pt-2">
                    <span className="text-[10px] text-slate-400">分差</span>
                    <span className="text-[10px] text-emerald-600 font-bold">+15 (练习)</span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 w-full border border-blue-100 mb-4">
                  <p className="text-blue-700 font-bold text-xs">💡 仅作为练习记录，不影响总积分。</p>
                </div>
              </div>

              <div className="mt-auto space-y-3 mb-6">
                <button className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all duration-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  再玩一次
                </button>
                <button className="w-full py-5 rounded-2xl bg-slate-900 text-white text-sm font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all duration-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                  返回图鉴
                </button>
              </div>
            </div>
          </PhoneShell>
        </div>

        {/* Debug Panel */}
        <div className="fixed bottom-5 right-5 bg-black/80 p-4 rounded-2xl backdrop-blur-md text-white border border-white/10 z-[9999]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Debug Controls</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => window.PointsSystem?.add(50)} className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-500 active:scale-95 transition-all duration-100">
              + Add 50 Stars
            </button>
            <button onClick={() => window.PointsSystem?.consume(50)} className="px-4 py-2 bg-rose-600 rounded-lg text-xs font-bold hover:bg-rose-500 active:scale-95 transition-all duration-100">
              - Consume 50 Stars
            </button>
            <button onClick={() => window.PointsSystem?.explode()} className="px-4 py-2 bg-amber-600 rounded-lg text-xs font-bold hover:bg-amber-500 active:scale-95 transition-all duration-100">
              ! Shake / Explode
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}