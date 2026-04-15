'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ─── Particle Globe ─────────────────────────────────────────
// Creates a rotating sphere of blue particles with neural connections

interface Particle {
  x: number; y: number; z: number;
  ox: number; oy: number; oz: number;
  vx: number; vy: number;
}

function createParticles(count: number, radius: number): Particle[] {
  const particles: Particle[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const rAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * rAtY;
    const z = Math.sin(theta) * rAtY;
    particles.push({
      x: x * radius, y: y * radius, z: z * radius,
      ox: x * radius, oy: y * radius, oz: z * radius,
      vx: 0, vy: 0,
    });
  }
  return particles;
}

function ParticleGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const radius = Math.min(width, height) * 0.35;
    const particles = createParticles(1200, radius);
    let rotation = 0;
    const connectionDistance = radius * 0.25;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      rotation += 0.002;

      // Subtle parallax from mouse
      const mx = (mouseRef.current.x / width - 0.5) * 0.3;
      const my = (mouseRef.current.y / height - 0.5) * 0.3;

      const cosR = Math.cos(rotation + mx);
      const sinR = Math.sin(rotation + mx);
      const cosP = Math.cos(my * 0.5);
      const sinP = Math.sin(my * 0.5);

      // Project particles
      const projected: { x: number; y: number; z: number; depth: number; idx: number }[] = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Rotate Y
        let x1 = p.ox * cosR - p.oz * sinR;
        let z1 = p.ox * sinR + p.oz * cosR;
        let y1 = p.oy;
        // Rotate X (tilt)
        let y2 = y1 * cosP - z1 * sinP;
        let z2 = y1 * sinP + z1 * cosP;

        const scale = 1000 / (1000 + z2);
        projected.push({
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          z: z2,
          depth: scale,
          idx: i,
        });
      }

      // Sort by depth (back to front)
      projected.sort((a, b) => a.z - b.z);

      // Draw connections (only between close particles, limited for perf)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        if (a.z < 0) continue; // only front-facing
        for (let j = i + 1; j < Math.min(i + 15, projected.length); j++) {
          const b = projected[j];
          if (b.z < 0) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance * 0.6) {
            const alpha = (1 - dist / (connectionDistance * 0.6)) * 0.15 * a.depth;
            ctx.strokeStyle = `rgba(10, 132, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of projected) {
        const alpha = p.z > 0
          ? 0.3 + 0.7 * p.depth
          : 0.05 + 0.1 * p.depth;
        const size = p.z > 0 ? 1.2 + p.depth * 1.2 : 0.5;

        // Glow
        if (p.z > 100 && Math.random() > 0.97) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 6);
          grad.addColorStop(0, `rgba(10, 132, 255, ${alpha * 0.3})`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(10, 132, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    animate();

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ opacity: 0.85 }}
    />
  );
}

// ─── Hero Component ─────────────────────────────────────────

export default function AuctorumHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative w-full min-h-screen overflow-hidden" style={{ background: '#05070A' }}>
      {/* Animated particle globe */}
      <ParticleGlobe />

      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(11,31,58,0.4) 0%, transparent 70%)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-40 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(to top, #05070A, transparent)' }}
      />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 md:px-16 pt-8">
        <div className="flex items-center">
          <span
            className="text-white text-xl font-light"
            style={{ letterSpacing: '0.4em', fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            AUCTORUM
          </span>
        </div>
        {/* Hamburger */}
        <button className="flex flex-col gap-[5px] p-2 group" aria-label="Menu">
          <span className="w-6 h-[1.5px] bg-slate-400 group-hover:bg-white transition-colors" />
          <span className="w-4 h-[1.5px] bg-slate-400 group-hover:bg-white transition-colors ml-auto" />
          <span className="w-6 h-[1.5px] bg-slate-400 group-hover:bg-white transition-colors" />
        </button>
      </nav>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-6 text-center">
        {/* Headline */}
        <h1
          className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight transition-all duration-[1500ms] ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            color: '#E8ECF1',
            lineHeight: 1.05,
          }}
        >
          Sovereign<br />
          <span style={{
            background: 'linear-gradient(135deg, #0A84FF 0%, #4DA8FF 50%, #0A84FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Intelligence
          </span><br />
          Infrastructure
        </h1>

        {/* Subheadline */}
        <p
          className={`mt-8 max-w-2xl text-lg md:text-xl leading-relaxed transition-all duration-[1500ms] delay-300 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ color: '#6B7A8D' }}
        >
          Auctorum builds advanced AI systems designed to operate, adapt,
          and scale independently across complex environments.
        </p>

        {/* CTAs */}
        <div
          className={`mt-12 flex flex-col sm:flex-row items-center gap-4 transition-all duration-[1500ms] delay-500 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Link
            href="/signup"
            className="px-10 py-4 text-sm font-medium tracking-wider uppercase text-white rounded-none border border-[#0A84FF] hover:bg-[#0A84FF]/10 transition-all duration-500"
            style={{ background: 'rgba(10, 132, 255, 0.08)' }}
          >
            Enter Auctorum
          </Link>
          <Link
            href="/systems"
            className="px-10 py-4 text-sm font-medium tracking-wider uppercase rounded-none border transition-all duration-500"
            style={{
              color: '#6B7A8D',
              borderColor: 'rgba(107, 122, 141, 0.3)',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.borderColor = '#0A84FF';
              (e.target as HTMLElement).style.color = '#E8ECF1';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.borderColor = 'rgba(107, 122, 141, 0.3)';
              (e.target as HTMLElement).style.color = '#6B7A8D';
            }}
          >
            Explore Systems
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 transition-all duration-[2000ms] delay-[1200ms] ${
        loaded ? 'opacity-40' : 'opacity-0'
      }`}>
        <div className="w-[1px] h-8 overflow-hidden">
          <div className="w-[1px] h-8 bg-gradient-to-b from-transparent via-[#0A84FF] to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  );
}
