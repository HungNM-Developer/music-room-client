'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  vy: number;
  vx: number;
  life: number;
  rot: number;
  vr: number;
  emoji: string;
}

type Spawn = (x: number, y: number, emoji: string) => void;
let spawn: Spawn | null = null;
const MAX_PARTICLES = 120;

/** Floats an emoji up from (x, y) on the shared canvas. No-op with reduced motion. */
export function triggerReaction(x: number, y: number, emoji: string): void {
  spawn?.(x, y, emoji);
}

/**
 * Full-screen overlay for reactions. The animation loop runs only while particles
 * exist and stops by itself, so an idle room costs no CPU.
 */
export function HeartCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const particles: Particle[] = [];
    let raf = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };

    const frame = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y -= p.vy;
        p.rot += p.vr;
        p.life -= 0.012;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.6);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.font = `${p.size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }
      raf = particles.length ? requestAnimationFrame(frame) : 0;
    };

    spawn = (x, y, emoji) => {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push({
        x,
        y,
        emoji,
        size: 28 + Math.random() * 18,
        vy: 2 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 2.4,
        life: 1,
        rot: (Math.random() - 0.5) * 0.4,
        vr: (Math.random() - 0.5) * 0.04,
      });
      if (!raf) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => {
      spawn = null;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" aria-hidden />;
}
