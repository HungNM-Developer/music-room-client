'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  rotation: number;
  rotateSpeed: number;
  color: string;
  emoji?: string;
}

export const HeartCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);

  const createParticle = useCallback((x: number, y: number, emoji?: string) => {
    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#fb7185'];
    return {
      x,
      y,
      size: emoji ? Math.random() * 20 + 30 : Math.random() * 20 + 20,
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 4,
      opacity: 1,
      rotation: (Math.random() - 0.5) * 0.5,
      rotateSpeed: (Math.random() - 0.5) * 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      emoji
    };
  }, []);

  useEffect(() => {
    const handleAddReaction = (e: CustomEvent) => {
      const { x, y, emoji } = e.detail;
      const count = emoji ? 1 : 5; // Hearts come in bursts, emojis single but bigger
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(x, y, emoji));
      }
    };

    window.addEventListener('add-reaction' as any, handleAddReaction);
    return () => window.removeEventListener('add-reaction' as any, handleAddReaction);
  }, [createParticle]);

  const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    
    if (p.emoji) {
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
    } else {
      ctx.fillStyle = p.color;
      const size = p.size;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size / 2, -size / 2, -size, size / 3, 0, size);
      ctx.bezierCurveTo(size, size / 3, size / 2, -size / 2, 0, 0);
      ctx.fill();
    }
    ctx.restore();
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((p) => {
      p.y -= p.speedY;
      p.x += p.speedX;
      p.opacity -= 0.01;
      p.rotation += p.rotateSpeed;
      
      if (p.opacity > 0) {
        drawParticle(ctx, p);
        return true;
      }
      return false;
    });

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
};

export const triggerHearts = (x: number, y: number) => {
  const event = new CustomEvent('add-reaction', { detail: { x, y } });
  window.dispatchEvent(event);
};

export const triggerReaction = (x: number, y: number, emoji: string) => {
  const event = new CustomEvent('add-reaction', { detail: { x, y, emoji } });
  window.dispatchEvent(event);
};
