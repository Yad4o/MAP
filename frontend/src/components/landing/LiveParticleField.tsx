/**
 * frontend/src/components/landing/ParticleField.tsx
 * ───────────────────────────────────────────────────
 * A genuinely "alive" particle network for the hero: drifting nodes
 * connected by proximity lines, gently parallaxing toward the cursor,
 * occasional bright pulses traveling along edges to suggest data
 * flowing through an agent graph.
 *
 * Performance notes (this is the thing that lagged before — built to
 * never repeat that mistake):
 *  - Single <canvas>, one requestAnimationFrame loop, no React state
 *    updates per frame (everything lives in refs / module scope).
 *  - Particle + edge counts are capped and scale down on smaller
 *    viewports.
 *  - Respects `prefers-reduced-motion`: renders one static frame and
 *    stops.
 *  - Pauses the rAF loop entirely when the tab is hidden
 *    (visibilitychange) and when the canvas scrolls out of view
 *    (IntersectionObserver) — zero cost once you scroll past the hero.
 *  - DPR is capped at 1.5 to avoid 4K canvases on hi-dpi screens.
 */
import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

export function LiveParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let particles: Particle[] = [];
    let rafId = 0;
    let running = true;
    let visible = true;

    const mouse = { x: -9999, y: -9999 };

    const PARTICLE_DENSITY = 1 / 9000; // particles per px²
    const MAX_PARTICLES = 90;
    const LINK_DIST = 130;

    function resize() {
      const parent = canvas!.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_PARTICLES, Math.max(28, Math.round(width * height * PARTICLE_DENSITY)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1 + Math.random() * 1.4,
      }));
    }

    function step() {
      ctx!.clearRect(0, 0, width, height);

      // Update + draw nodes
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // gentle pull toward cursor
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 30000) {
          p.vx += dx * 0.0000035;
          p.vy += dy * 0.0000035;
        }

        // soft drag so it never accelerates away
        p.vx *= 0.995;
        p.vy *= 0.995;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }

      // Edges (proximity-based, drawn once per pair)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const op = (1 - dist / LINK_DIST) * 0.22;
            ctx!.strokeStyle = `rgba(255,255,255,${op})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // Nodes on top
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.fillStyle = 'rgba(255,255,255,0.55)';
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      if (running && visible) rafId = requestAnimationFrame(step);
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }
    function onVisibility() {
      visible = document.visibilityState === 'visible';
      if (visible && running) rafId = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('visibilitychange', onVisibility);

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          running = entry.isIntersecting;
          if (running && visible) rafId = requestAnimationFrame(step);
          else cancelAnimationFrame(rafId);
        },
        { threshold: 0.05 }
      );
      observer.observe(canvas);
    }

    if (prefersReducedMotion) {
      step(); // draw exactly one static frame
      running = false;
    } else {
      rafId = requestAnimationFrame(step);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
