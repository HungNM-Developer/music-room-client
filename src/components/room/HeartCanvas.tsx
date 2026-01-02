'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface Heart {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  rotation: number;
  rotateSpeed: number;
  color: string;
}

export const HeartCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartsRef = useRef<Heart[]>([]);
  const requestRef = useRef<number | null>(null);

  const createHeart = useCallback((x: number, y: number) => {
    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#fb7185'];
    return {
      x,
      y,
      size: Math.random() * 20 + 20,
      speedY: Math.random() * 2 + 2,
      speedX: (Math.random() - 0.5) * 2,
      opacity: 1,
      rotation: Math.random() * Math.PI * 2,
      rotateSpeed: (Math.random() - 0.5) * 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, []);

  useEffect(() => {
    const handleAddHeart = (e: CustomEvent) => {
      const { x, y } = e.detail;
      for (let i = 0; i < 5; i++) {
        heartsRef.current.push(createHeart(x, y));
      }
    };

    window.addEventListener('add-heart' as any, handleAddHeart);
    return () => window.removeEventListener('add-heart' as any, handleAddHeart);
  }, [createHeart]);

  const drawHeart = (ctx: CanvasRenderingContext2D, heart: Heart) => {
    ctx.save();
    ctx.translate(heart.x, heart.y);
    ctx.rotate(heart.rotation);
    ctx.globalAlpha = heart.opacity;
    ctx.fillStyle = heart.color;
    
    const size = heart.size;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size / 2, -size / 2, -size, size / 3, 0, size);
    ctx.bezierCurveTo(size, size / 3, size / 2, -size / 2, 0, 0);
    ctx.fill();
    ctx.restore();
  };

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    heartsRef.current = heartsRef.current.filter((heart) => {
      heart.y -= heart.speedY;
      heart.x += heart.speedX;
      heart.opacity -= 0.005;
      heart.rotation += heart.rotateSpeed;
      
      if (heart.opacity > 0) {
        drawHeart(ctx, heart);
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
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

// Helper function to trigger hearts from anywhere
export const triggerHearts = (x: number, y: number) => {
  const event = new CustomEvent('add-heart', { detail: { x, y } });
  window.dispatchEvent(event);
};
