'use client';

import { useEffect, useRef, useState } from 'react';
import type { GrassScene, SceneLayout } from './grass-scene';
import './home-scenery.css';

/**
 * The night hill behind the home page. CSS always draws the sky, the moon, the clouds and the
 * hill's outline; when the device allows it, a WebGL scene (grass-scene, loaded on its own
 * once the page is idle) adds the grass, flowers, the tree, the campfire, fireflies and stars.
 * The tree, the fire and the moon stand in the widest free space beside the page's content:
 * the page marks its text column `data-scenery="text"` and its form `data-scenery="panel"`.
 */

/** The text column's own width (max-w-xl): what lies right of it is free. */
const TEXT_WIDTH = 576;

function layoutOf(): SceneLayout {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const text = document.querySelector('[data-scenery="text"]')?.getBoundingClientRect();
  const panel = document.querySelector('[data-scenery="panel"]')?.getBoundingClientRect();
  // One column (phones, tablets): the right side, above the form.
  if (!text || !panel || panel.left < text.right - 1)
    return { focusX: W * 0.78, focusWidth: W * 0.4, moonX: W * 0.82, moonY: H * 0.07, guitarX: W * 0.5, guitarY: H * 0.9 };
  const textRight = text.left + Math.min(text.width, TEXT_WIDTH);
  const free = [
    [0, text.left],
    [textRight, panel.left],
    [panel.right, W],
  ]
    .map(([a, b]) => ({ x: (a + b) / 2, width: b - a }))
    // A tie (wide screens, equal margins): the right one, away from the headline.
    .reduce((a, b) => (b.width >= a.width ? b : a));
  // The hidden guitar: in the grass under the text column's last line, when there is room.
  const footer = document.querySelector('[data-scenery="text"] > :last-child')?.getBoundingClientRect();
  const below = footer ? H - footer.bottom : 0;
  const guitarX = text.left + Math.min(text.width, TEXT_WIDTH) * 0.45;
  const guitarY = below > 120 ? footer!.bottom + below * 0.55 : H * 0.9;
  return {
    guitarX,
    guitarY,
    focusX: free.x,
    focusWidth: free.width,
    // Above the tree, a little to the side when there is room.
    moonX: free.x + (free.width > 320 ? free.width * 0.18 : 0),
    moonY: H * 0.13,
  };
}

/** WebGL only when it will be enjoyed: no reduced motion, no data saver. */
function wantsScene(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !c?.saveData;
}

export function HomeScenery() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GrassScene | null>(null);
  const [live, setLive] = useState(false);

  // Where the tree and the moon go: measured now and whenever the page's layout changes.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const l = layoutOf();
        rootRef.current?.style.setProperty('--hs-moon-x', `${l.moonX}px`);
        rootRef.current?.style.setProperty('--hs-moon-y', `${l.moonY}px`);
        sceneRef.current?.setLayout(l);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of document.querySelectorAll('[data-scenery]')) ro.observe(el);
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!wantsScene()) return;
    let cancelled = false;
    const start = () => {
      void import('./grass-scene').then(({ createGrassScene }) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        try {
          const scene = createGrassScene(canvas, {
            // Too slow to enjoy: back to the CSS hill.
            onSlow: () => {
              sceneRef.current?.dispose();
              sceneRef.current = null;
              setLive(false);
            },
          });
          scene.setLayout(layoutOf());
          sceneRef.current = scene;
          setLive(true);
        } catch {
          // No WebGL: the CSS hill stays.
        }
      });
    };
    // After the page is usable: the scene is decoration.
    const idle = window.requestIdleCallback?.(start, { timeout: 2500 });
    const timer = idle === undefined ? window.setTimeout(start, 900) : undefined;
    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div ref={rootRef} className="home-scenery" data-live={live || undefined} aria-hidden>
      <div className="hs-sky" />
      <div className="hs-moon" />
      <div className="hs-clouds">
        <span />
        <span />
        <span />
      </div>
      <div className="hs-hill" />
      <canvas ref={canvasRef} className="hs-canvas" />
      <div className="hs-scrim" />
    </div>
  );
}
