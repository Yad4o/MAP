/**
 * frontend/src/components/auth/AgentConstellation.tsx
 * ─────────────────────────────────────────────────────
 * Signature visual for the auth screens: four labeled nodes — Plan,
 * Execute, Validate, Remember — orbiting a central core, with light
 * pulses traveling the spokes between them. This is MAP's real
 * pipeline, not a decorative abstraction, so the motion encodes what
 * the product actually does instead of just filling space.
 *
 * Pauses on tab-hide and respects prefers-reduced-motion (renders one
 * static frame instead of looping).
 */
import { useEffect, useRef } from 'react';

type Node = { label: string; angle: number; x: number; y: number };
type Pulse = { from: number; progress: number; speed: number; reverse: boolean };

const LABELS = ['PLAN', 'EXECUTE', 'VALIDATE', 'REMEMBER'];

export function AgentConstellation() {
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
    let cx = 0;
    let cy = 0;
    let radius = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let rafId = 0;
    let visible = true;
    let rotation = 0;

    const nodes: Node[] = LABELS.map((label, i) => ({
      label,
      angle: (Math.PI / 2) * i - Math.PI / 2,
      x: 0,
      y: 0,
    }));

    let pulses: Pulse[] = nodes.map((_, i) => ({
      from: i,
      progress: i / nodes.length,
      speed: 0.0026,
      reverse: i % 2 === 1,
    }));

    function resize() {
      const parent = canvas!.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      cx = width * 0.5;
      cy = height * 0.42;
      radius = Math.min(width, height) * 0.19;
    }

    function layout() {
      for (const n of nodes) {
        const a = n.angle + rotation;
        n.x = cx + Math.cos(a) * radius;
        n.y = cy + Math.sin(a) * radius;
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      // Spokes: center to each node
      ctx!.lineWidth = 1;
      for (const n of nodes) {
        ctx!.strokeStyle = 'rgba(165,180,252,0.14)';
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(n.x, n.y);
        ctx!.stroke();
      }

      // Ring connecting nodes in sequence (the pipeline order)
      ctx!.strokeStyle = 'rgba(165,180,252,0.10)';
      ctx!.beginPath();
      nodes.forEach((n, i) => {
        if (i === 0) ctx!.moveTo(n.x, n.y);
        else ctx!.lineTo(n.x, n.y);
      });
      ctx!.closePath();
      ctx!.stroke();

      // Pulses traveling the spokes (data flowing through the pipeline)
      for (const p of pulses) {
        const n = nodes[p.from];
        const t = p.progress;
        const px = p.reverse ? n.x + (cx - n.x) * t : cx + (n.x - cx) * t;
        const py = p.reverse ? n.y + (cy - n.y) * t : cy + (n.y - cy) * t;
        const grad = ctx!.createRadialGradient(px, py, 0, px, py, 5);
        grad.addColorStop(0, 'rgba(147,197,253,0.9)');
        grad.addColorStop(1, 'rgba(147,197,253,0)');
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(px, py, 5, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Central core
      const coreGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 26);
      coreGrad.addColorStop(0, 'rgba(99,102,241,0.55)');
      coreGrad.addColorStop(1, 'rgba(99,102,241,0)');
      ctx!.fillStyle = coreGrad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = 'rgba(226,232,255,0.9)';
      ctx!.beginPath();
      ctx!.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx!.fill();

      // Nodes
      ctx!.font = "600 10px 'Space Grotesk', 'Inter', sans-serif";
      ctx!.textAlign = 'center';
      for (const n of nodes) {
        const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, 14);
        glow.addColorStop(0, 'rgba(129,140,248,0.5)');
        glow.addColorStop(1, 'rgba(129,140,248,0)');
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 14, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = 'rgba(255,255,255,0.95)';
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx!.fill();

        const labelY = n.y - cy > 0 ? n.y + 22 : n.y - 16;
        ctx!.fillStyle = 'rgba(199,210,254,0.55)';
        ctx!.fillText(n.label, n.x, labelY);
      }
    }

    function step() {
      rotation += 0.0007;
      layout();
      for (const p of pulses) {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
      }
      draw();
      if (visible) rafId = requestAnimationFrame(step);
    }

    function onVisibility() {
      visible = document.visibilityState === 'visible';
      if (visible) rafId = requestAnimationFrame(step);
      else cancelAnimationFrame(rafId);
    }

    resize();
    layout();
    draw();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
