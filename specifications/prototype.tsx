import React, { useEffect, useRef } from 'react';

// --- Type Definitions for the Physics Engine ---
interface Particle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  radius: number;
  angle: number;
  angularVelocity: number;
  z: number;
  color: string;
  isSleeping: boolean;
  isDying: boolean;
  deathTimer: number;
  scale: number;
  update: () => void;
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
    /* System Font Stack replaces Google Fonts */

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
        'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
      background-color: #f8fafc;
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
  <div className={`absolute top-6 left-6 p-2 rounded-full bg-slate-50 text-slate-400 cursor-pointer z-50 hover:bg-slate-100 transition ${className}`}>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  </div>
);

const BtnPrimary: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <button className={`w-full py-5 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-[0_10px_20px_-5px_rgba(225,29,72,0.4)] active:scale-98 transition-transform font-black flex items-center justify-center gap-2 ${className}`}>
    {children}
  </button>
);

const LabelCaps: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`text-[10px] font-extrabold tracking-widest uppercase text-slate-400 ${className}`}>
    {children}
  </span>
);

// --- Game Logic / Physics Component ---

const PointsCard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let animationFrameId: number;

    // Configuration
    const CONFIG = {
      particleCount: 1240,
      radius: 8,
      gravity: 0.15,
      friction: 0.96,
      repulsionRadius: 80,
      repulsionForce: 1.0,
      colors: ['#fbbf24', '#f59e0b', '#d97706'], // Amber 400, 500, 600
    };

    const particles: Particle[] = [];
    let grid: Record<string, Particle[]> = {};
    const cellSize = CONFIG.radius * 2.2;

    class ParticleImpl implements Particle {
      x: number;
      y: number;
      oldX: number;
      oldY: number;
      radius: number;
      angle: number;
      angularVelocity: number;
      z: number;
      color: string;
      isSleeping: boolean;
      isDying: boolean;
      deathTimer: number;
      scale: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.oldX = x + (Math.random() - 0.5) * 2;
        this.oldY = y + (Math.random() - 0.5) * 2;
        this.radius = CONFIG.radius * (0.8 + Math.random() * 0.4);
        this.angle = Math.random() * Math.PI * 2;
        // High Fidelity: 保持自转，并略微提升速度确保肉眼可见
        this.angularVelocity = (Math.random() - 0.5) * 0.2;
        this.z = Math.floor(Math.random() * 3) / 2;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.isSleeping = false;
        this.isDying = false;
        this.deathTimer = 0;
        this.scale = 1.0;
      }

      update() {
        if (this.isDying) {
          this.deathTimer += 0.02;
          if (this.deathTimer < 0.4) {
            this.y -= 2;
            this.angle += 0.1;
          } else {
            const phase2 = (this.deathTimer - 0.4) / 0.6;
            this.scale = 1 - phase2;
            this.angle += 0.3;
            this.y -= 1;
          }
          return;
        }

        if (this.isSleeping) return;

        const vx = (this.x - this.oldX) * CONFIG.friction;
        const vy = (this.y - this.oldY) * CONFIG.friction;

        this.oldX = this.x;
        this.oldY = this.y;

        this.x += vx;
        this.y += vy + CONFIG.gravity;
        // Update rotation
        this.angle += this.angularVelocity;

        if (this.y + this.radius > height) {
          this.y = height - this.radius;
          const impact = vy;
          this.oldY = this.y + impact * 0.5;
          this.angularVelocity *= 0.9;
        }

        if (this.x + this.radius > width) {
          this.x = width - this.radius;
          this.oldX = this.x + vx * 0.5;
        } else if (this.x - this.radius < 0) {
          this.x = this.radius;
          this.oldX = this.x + vx * 0.5;
        }
      }
    }

    // Cache Star Image
    const starImg = document.createElement('canvas');
    starImg.width = 64;
    starImg.height = 64;
    const sCtx = starImg.getContext('2d');
    if (sCtx) {
      const cx = 32;
      const cy = 32;
      const r = 28;
      // Ring
      sCtx.beginPath();
      sCtx.arc(cx, cy, r, 0, Math.PI * 2);
      sCtx.fillStyle = '#fef3c7';
      sCtx.fill();
      // White Body
      sCtx.beginPath();
      sCtx.arc(cx, cy, r - 6, 0, Math.PI * 2);
      sCtx.fillStyle = '#ffffff';
      sCtx.fill();
      // Star
      sCtx.translate(cx, cy);
      sCtx.beginPath();
      for (let i = 0; i < 5; i++) {
        sCtx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 19, -Math.sin((18 + i * 72) * Math.PI / 180) * 19);
        sCtx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 9, -Math.sin((54 + i * 72) * Math.PI / 180) * 9);
      }
      sCtx.closePath();
      sCtx.fillStyle = '#f59e0b';
      sCtx.fill();
    }

    const init = () => {
      particles.length = 0;
      const cols = Math.floor(width / (CONFIG.radius * 2));
      for (let i = 0; i < CONFIG.particleCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col + 0.5) * (CONFIG.radius * 2) + (Math.random() - 0.5) * 5;
        const y = height - (row + 0.5) * (CONFIG.radius * 2) - 20;
        particles.push(new ParticleImpl(x, y));
      }
    };

    const pointer = { x: -1000, y: -1000, active: false };

    const handleInput = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (x - rect.left) * dpr;
      pointer.y = (y - rect.top) * dpr;
      pointer.active = true;
    };

    const listeners = {
      mousemove: (e: MouseEvent) => handleInput(e.clientX, e.clientY),
      touchmove: (e: TouchEvent) => { handleInput(e.touches[0].clientX, e.touches[0].clientY); },
      touchstart: (e: TouchEvent) => { handleInput(e.touches[0].clientX, e.touches[0].clientY); },
      mouseleave: () => { pointer.active = false; },
      touchend: () => { pointer.active = false; }
    };

    container.addEventListener('mousemove', listeners.mousemove);
    container.addEventListener('touchmove', listeners.touchmove, { passive: false });
    container.addEventListener('touchstart', listeners.touchstart, { passive: false });
    container.addEventListener('mouseleave', listeners.mouseleave);
    container.addEventListener('touchend', listeners.touchend);

    const solve = () => {
      // High Fidelity: 保持网格碰撞检测
      grid = {};
      for (let p of particles) {
        if (p.isDying) continue;
        const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(p);
      }

      for (let p of particles) {
        if (p.isDying) continue;
        // Mouse Repulsion
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = CONFIG.repulsionRadius * CONFIG.repulsionRadius;

          if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / CONFIG.repulsionRadius) * CONFIG.repulsionForce;
            const angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * force * 2;
            p.y += Math.sin(angle) * force * 2;
            p.isSleeping = false;
          }
        }

        // High Fidelity: 粒子碰撞检测与响应 (完整保留)
        const cellX = Math.floor(p.x / cellSize);
        const cellY = Math.floor(p.y / cellSize);

        for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
          for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
            const key = `${cx},${cy}`;
            const cell = grid[key];
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
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.sort((a, b) => a.z - b.z);

      for (let p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        // High Fidelity: 保持旋转渲染
        ctx.rotate(p.angle);
        const baseScale = p.radius * 2 / 64;
        const zScale = 0.5 + p.z * 0.7;
        const finalScale = baseScale * zScale * p.scale;
        ctx.scale(finalScale, finalScale);
        ctx.drawImage(starImg, -32, -32);
        if (p.z > 0.7) {
          ctx.beginPath();
          ctx.arc(-10, -10, 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fill();
        }
        ctx.restore();
      }
    };

    const loop = () => {
      for (let p of particles) p.update();
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].isDying && particles[i].deathTimer >= 1.0) {
          particles.splice(i, 1);
        }
      }
      solve();
      solve();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    const resize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = rect.width * dpr;
      height = rect.height * dpr;
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      init();
    };

    // Initialize System
    window.addEventListener('resize', resize);
    resize();
    loop();

    // Attach to Window for Debug Panel
    let currentPoints = 1240;
    window.PointsSystem = {
      add: (count: number) => {
        currentPoints += count;
        if (displayRef.current) displayRef.current.innerText = currentPoints.toLocaleString();
        const MAX_STARS = 3000; // Limit stars to 3000
        const currentActiveParticles = particles.filter(p => !p.isDying).length;
        const spaceLeft = Math.max(0, MAX_STARS - currentActiveParticles);
        const starsToAdd = Math.min(count, spaceLeft);
        for (let i = 0; i < starsToAdd; i++) {
          const x = Math.random() * width;
          const y = -20 - Math.random() * 100;
          particles.push(new ParticleImpl(x, y));
        }
      },
      consume: (count: number) => {
        currentPoints = Math.max(0, currentPoints - count);
        if (displayRef.current) displayRef.current.innerText = currentPoints.toLocaleString();
        let candidates = particles.filter(p => !p.isDying);
        for (let i = 0; i < count; i++) {
          if (candidates.length > 0) {
            const idx = Math.floor(Math.random() * candidates.length);
            candidates[idx].isDying = true;
            candidates.splice(idx, 1);
          }
        }
      },
      explode: () => {
        for (let p of particles) {
          const force = 10 + Math.random() * 20;
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
          p.oldX = p.x - Math.cos(angle) * force;
          p.oldY = p.y - Math.sin(angle) * force;
          p.isSleeping = false;
        }
      }
    };

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', listeners.mousemove);
      container.removeEventListener('touchmove', listeners.touchmove);
      container.removeEventListener('touchstart', listeners.touchstart);
      container.removeEventListener('mouseleave', listeners.mouseleave);
      container.removeEventListener('touchend', listeners.touchend);
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-white gradient-border rounded-[32px] p-8 text-center shadow-card mb-auto relative overflow-hidden isolate mt-4">
      {/* Brand Header */}
      <div className="flex flex-col items-center mt-2 mb-16 relative z-10">
        <div className="w-16 h-16 bg-rose-600 rounded-2xl shadow-lg flex items-center justify-center text-white text-3xl font-black mb-4">
          婷
        </div>
        <h1 className="text-xl font-black text-slate-900">婷姐•贵州炒鸡</h1>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 opacity-90" />

      {/* Content */}
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
                  <button className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                    <span className="text-xs font-bold text-slate-600">已收集游戏</span>
                  </button>
                  <button className="py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
                    </svg>
                    <span className="text-xs font-bold text-slate-600">分享积分</span>
                  </button>
                </div>
                <button className="w-full py-5 rounded-2xl bg-slate-900 text-white text-sm font-black flex items-center justify-center gap-3 active:scale-95 transition">
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
              <button className="w-full py-5 rounded-2xl bg-amber-500 text-white shadow-lg text-xl font-black mb-6 flex items-center justify-center gap-2 active:scale-95 transition">
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
                <button className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition">
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
                <button className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition">
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
                <button className="w-full py-3 text-slate-400 text-xs font-bold uppercase hover:text-slate-600 flex items-center justify-center gap-1 transition">
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
                  <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition">
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
                  <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition">
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
                <button className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  再玩一次
                </button>
                <button className="w-full py-5 rounded-2xl bg-slate-900 text-white text-sm font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition">
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
            <button onClick={() => window.PointsSystem?.add(50)} className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-500 active:scale-95 transition">
              + Add 50 Stars
            </button>
            <button onClick={() => window.PointsSystem?.consume(50)} className="px-4 py-2 bg-rose-600 rounded-lg text-xs font-bold hover:bg-rose-500 active:scale-95 transition">
              - Consume 50 Stars
            </button>
            <button onClick={() => window.PointsSystem?.explode()} className="px-4 py-2 bg-amber-600 rounded-lg text-xs font-bold hover:bg-amber-500 active:scale-95 transition">
              ! Shake / Explode
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}