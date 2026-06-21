import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LiveSystemPanel } from '../components/landing/LiveSystemPanel';
import { PipelineModules } from '../components/landing/PipelineModules';
import { ArchitectureFlow } from '../components/landing/ArchitectureFlow';
import { ExecutionTimeline } from '../components/landing/ExecutionTimeline';
import { AgentNetwork } from '../components/landing/AgentNetwork';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { Terminal } from '../components/landing/Terminal';
import { SecurityFlow } from '../components/landing/SecurityFlow';
import { MetricsSection } from '../components/landing/MetricsSection';

// ─────────────────────────────────────────────────────────────────────────────
// SVG BACKGROUND CANVASES
// All are `absolute inset-0 w-full h-full pointer-events-none -z-0`
// Content in each section sits on `relative z-10`
// ─────────────────────────────────────────────────────────────────────────────

/** HERO — Vast star field + sweeping arc grid */
function HeroBg() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    cx: (i * 137.5) % 100,
    cy: (i * 97.3 + 11) % 100,
    r: 0.3 + (i % 4) * 0.25,
    op: 0.12 + (i % 5) * 0.08,
    dur: 2.5 + (i % 7) * 0.7,
    del: (i * 0.41) % 4,
  }));
  const arcs = [
    'M 0 60 Q 50 0 100 60',
    'M -10 80 Q 50 15 110 80',
    'M 0 45 Q 45 -15 100 45',
    'M 10 100 Q 55 30 100 100',
  ];
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <style>{`
          @keyframes star-twinkle {
            0%,100%{ opacity: var(--so); }
            50%    { opacity: calc(var(--so) * 4); }
          }
          @keyframes arc-flow {
            0%  { stroke-dashoffset: 280; opacity:0; }
            10% { opacity:0.07; }
            90% { opacity:0.07; }
            100%{ stroke-dashoffset: 0;   opacity:0; }
          }
          .star { animation: star-twinkle var(--sd) ease-in-out infinite; }
          .arc  { stroke-dasharray: 280; animation: arc-flow 9s ease-in-out infinite; }
        `}</style>
        <radialGradient id="h-glow" cx="35%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="#8B5CF6" stopOpacity="0.18" />
          <stop offset="60%"  stopColor="#4C1D95" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* Deep purple glow orb left-centre */}
      <ellipse cx="35" cy="50" rx="45" ry="45" fill="url(#h-glow)" />

      {/* Sweep arcs */}
      {arcs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#8B5CF6" strokeWidth="0.25"
          className="arc" style={{ animationDelay: `${i * 2.1}s` }} />
      ))}

      {/* Stars */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#ffffff" className="star"
          style={{ '--so': s.op, '--sd': `${s.dur}s`, animationDelay: `${s.del}s` } as React.CSSProperties} />
      ))}
    </svg>
  );
}

/** ARCHITECTURE — Horizontal data-bus grid with packet pulses */
function ArchBg() {
  const lanes = Array.from({ length: 14 }, (_, i) => ({
    y: 5 + i * 6.8,
    len: 40 + (i % 5) * 12,
    x0: (i % 3) * 8,
    delay: i * 0.35,
    speed: 3.5 + (i % 4) * 0.8,
  }));
  const vlines = Array.from({ length: 8 }, (_, i) => ({ x: 10 + i * 12, delay: i * 0.6 }));
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes pkt { 0%{offset-distance:0%;opacity:0} 8%{opacity:.9} 92%{opacity:.9} 100%{offset-distance:100%;opacity:0} }
          .pkt { animation: pkt var(--ps) linear infinite; }
        `}</style>
        <linearGradient id="arch-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#8B5CF6" stopOpacity="0" />
          <stop offset="30%"  stopColor="#8B5CF6" stopOpacity="0.12" />
          <stop offset="70%"  stopColor="#8B5CF6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal lanes */}
      {lanes.map((l, i) => {
        const path = `M ${l.x0} ${l.y} H ${l.x0 + l.len}`;
        return (
          <g key={i}>
            <line x1={l.x0} y1={l.y} x2={l.x0 + l.len} y2={l.y}
              stroke="#8B5CF6" strokeOpacity="0.07" strokeWidth="0.4" />
            <circle r="1.1" fill="#C4B5FD" className="pkt"
              style={{ '--ps': `${l.speed}s`, offsetPath: `path('${path}')`, animationDelay: `${l.delay}s` } as React.CSSProperties} />
          </g>
        );
      })}

      {/* Vertical crosshairs */}
      {vlines.map((v, i) => (
        <line key={i} x1={v.x} y1="0" x2={v.x} y2="100"
          stroke="#8B5CF6" strokeOpacity="0.04" strokeWidth="0.3"
          style={{ animationDelay: `${v.delay}s` }} />
      ))}

      {/* Horizontal gradient band */}
      <rect x="0" y="0" width="100" height="100" fill="url(#arch-fade)" opacity="0.5" />
    </svg>
  );
}

/** TIMELINE — Diagonal slash lines, very subtle depth */
function TimelineBg() {
  const slashes = Array.from({ length: 18 }, (_, i) => ({
    x1: -10 + i * 7,
    x2: i * 7 + 30,
    delay: i * 0.28,
    op: 0.03 + (i % 3) * 0.015,
  }));
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes slash-glow {
            0%,100%{ opacity: var(--sop); }
            50%    { opacity: calc(var(--sop) * 5); }
          }
          .slash { animation: slash-glow 5s ease-in-out infinite; }
        `}</style>
      </defs>
      {slashes.map((s, i) => (
        <line key={i} x1={s.x1} y1="0" x2={s.x2} y2="100"
          stroke="#ba9eff" strokeWidth="0.35" className="slash"
          style={{ '--sop': s.op, animationDelay: `${s.delay}s` } as React.CSSProperties} />
      ))}
    </svg>
  );
}

/** AGENTS — Hexagonal lattice */
function HexBg() {
  // Hex centres on a grid
  const rows = 8, cols = 9;
  const W = 11.5, H = 10;
  const hexes: { cx: number; cy: number; delay: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      hexes.push({
        cx: c * W + (r % 2) * (W / 2),
        cy: r * H,
        delay: (r * cols + c) * 0.06,
      });
    }
  }
  const hexPath = (cx: number, cy: number, s: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`;
    });
    return `M ${pts.join(' L ')} Z`;
  };
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes hex-pulse {
            0%,100%{ fill-opacity:.0; stroke-opacity:.06; }
            50%    { fill-opacity:.04; stroke-opacity:.18; }
          }
          .hex { animation: hex-pulse 4s ease-in-out infinite; }
        `}</style>
      </defs>
      {hexes.map((h, i) => (
        <path key={i} d={hexPath(h.cx, h.cy, 4.8)}
          fill="#8B5CF6" stroke="#8B5CF6" strokeWidth="0.3"
          className="hex"
          style={{ animationDelay: `${h.delay % 4}s` }} />
      ))}
    </svg>
  );
}

/** FEATURES — Floating diamonds / rhombus grid */
function DiamondBg() {
  const diamonds = Array.from({ length: 24 }, (_, i) => ({
    cx: (i * 19.3) % 100,
    cy: (i * 13.7 + 7) % 100,
    s: 3 + (i % 4) * 2,
    delay: (i * 0.55) % 5,
    op: 0.04 + (i % 4) * 0.02,
  }));
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes dia-float {
            0%,100%{ transform:translateY(0) rotate(45deg); opacity:var(--dop); }
            50%    { transform:translateY(-3px) rotate(45deg); opacity:calc(var(--dop)*3.5); }
          }
          .dia { animation: dia-float var(--dd) ease-in-out infinite; }
        `}</style>
      </defs>
      {diamonds.map((d, i) => (
        <rect key={i}
          x={d.cx - d.s / 2} y={d.cy - d.s / 2}
          width={d.s} height={d.s}
          fill="none" stroke="#C4B5FD" strokeWidth="0.35"
          className="dia"
          style={{ '--dop': d.op, '--dd': `${3 + (i % 5) * 0.8}s`, animationDelay: `${d.delay}s`,
            transformOrigin: `${d.cx}px ${d.cy}px`, transform: 'rotate(45deg)' } as React.CSSProperties} />
      ))}
    </svg>
  );
}

/** TERMINAL — Matrix cascade columns (wider, more columns) */
function MatrixBg() {
  const chars = '01アイウエオカキクケコABCDEF';
  const cols = Array.from({ length: 22 }, (_, i) => ({
    x: 3 + i * 4.4,
    chars: Array.from({ length: 12 }, (_, j) => chars[(i * 7 + j * 3) % chars.length]),
    delay: (i * 0.31) % 5,
    speed: 2.8 + (i % 5) * 0.7,
  }));
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes mat-drop {
            0%  { opacity:0; transform:translateY(-8px); }
            20% { opacity:1; }
            80% { opacity:1; }
            100%{ opacity:0; transform:translateY(8px); }
          }
          .mat { font-family:monospace; font-size:3.5px; fill:#8ce7ff; animation:mat-drop var(--ms) ease-in-out infinite; }
        `}</style>
      </defs>
      {cols.map((col, ci) =>
        col.chars.map((ch, chi) => (
          <text key={`${ci}-${chi}`}
            x={col.x} y={6 + chi * 8.5}
            className="mat"
            style={{ '--ms': `${col.speed}s`, animationDelay: `${col.delay + chi * 0.15}s` } as React.CSSProperties}>
            {ch}
          </text>
        ))
      )}
    </svg>
  );
}

/** SECURITY — Radar sweep + concentric rings + scan lines */
function RadarBg() {
  const rings = [12, 22, 32, 42, 50];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes radar-sweep {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes ping-blip {
            0%,100%{ opacity:0; r:1; }
            50%    { opacity:1; r:2.5; }
          }
          .sweep { animation: radar-sweep 5s linear infinite; transform-origin: 50px 50px; }
          .blip  { animation: ping-blip 3s ease-in-out infinite; }
        `}</style>
        <linearGradient id="sweep-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#4ADE80" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="55" fill="url(#radar-glow)" />

      {rings.map((r, i) => (
        <circle key={i} cx="50" cy="50" r={r}
          fill="none" stroke="#4ADE80" strokeOpacity="0.08" strokeWidth="0.4" />
      ))}

      {/* Cross hairs */}
      <line x1="50" y1="0" x2="50" y2="100" stroke="#4ADE80" strokeOpacity="0.05" strokeWidth="0.3" />
      <line x1="0" y1="50" x2="100" y2="50" stroke="#4ADE80" strokeOpacity="0.05" strokeWidth="0.3" />

      {/* Sweep wedge */}
      <g className="sweep">
        <path d={`M 50 50 L 50 8 A 42 42 0 0 1 ${50 + 42 * Math.sin(Math.PI / 6)} ${50 - 42 * Math.cos(Math.PI / 6)} Z`}
          fill="url(#sweep-fade)" opacity="0.55" />
        <line x1="50" y1="50" x2="50" y2="8" stroke="#4ADE80" strokeOpacity="0.5" strokeWidth="0.4" />
      </g>

      {/* Blips */}
      {[{cx:65,cy:32,del:0},{cx:38,cy:28,del:1.2},{cx:58,cy:68,del:2.4},{cx:28,cy:60,del:0.7}].map((b,i)=>(
        <circle key={i} cx={b.cx} cy={b.cy} r="1"
          fill="#4ADE80" className="blip"
          style={{ animationDelay: `${b.del}s` }} />
      ))}
    </svg>
  );
}

/** METRICS — Waveform / oscilloscope lines */
function WaveBg() {
  const waves = [
    { pts: '0,50 10,42 20,55 30,38 40,60 50,44 60,52 70,36 80,58 90,45 100,50', op: 0.1,  delay: 0   },
    { pts: '0,60 12,48 22,62 35,40 45,58 55,46 65,55 75,38 85,56 95,42 100,60', op: 0.07, delay: 0.6 },
    { pts: '0,40 8,52 18,38 28,58 42,42 52,54 62,40 72,56 82,44 92,52 100,40',  op: 0.05, delay: 1.2 },
  ];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes wave-shift {
            0%  { stroke-dashoffset: 400; opacity: 0; }
            10% { opacity: var(--wop); }
            90% { opacity: var(--wop); }
            100%{ stroke-dashoffset: 0;  opacity: 0; }
          }
          .wave { stroke-dasharray: 400; animation: wave-shift var(--ws) ease-in-out infinite; }
        `}</style>
      </defs>
      {waves.map((w, i) => (
        <polyline key={i} points={w.pts}
          fill="none" stroke="#ba9eff" strokeWidth="0.5"
          className="wave"
          style={{ '--wop': w.op, '--ws': `${6 + i}s`, animationDelay: `${w.delay}s` } as React.CSSProperties} />
      ))}
    </svg>
  );
}

/** FOOTER — Constellation map */
function ConstellationBg() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    cx: (i * 7.3 + 3) % 100,
    cy: (i * 11.7 + 8) % 100,
    r: 0.5 + (i % 3) * 0.4,
    delay: (i * 0.37) % 4,
  }));
  // A few connecting lines
  const lines: [number, number][] = [
    [0, 4], [4, 9], [9, 14], [14, 19],
    [2, 6], [6, 11], [11, 16],
    [1, 5], [5, 10], [10, 15], [15, 20],
    [3, 7], [7, 12],
  ];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -z-0"
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes const-twinkle {
            0%,100%{ opacity:.08; r:.5; }
            50%    { opacity:.55; r:1.4; }
          }
          .cstar { animation: const-twinkle 3s ease-in-out infinite; }
        `}</style>
        <radialGradient id="footer-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor="#8B5CF6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="80" rx="60" ry="40" fill="url(#footer-glow)" />
      {lines.map(([a, b], i) => (
        <line key={i}
          x1={stars[a].cx} y1={stars[a].cy}
          x2={stars[b].cx} y2={stars[b].cy}
          stroke="#ba9eff" strokeOpacity="0.07" strokeWidth="0.3" />
      ))}
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r}
          fill="#ffffff" className="cstar"
          style={{ animationDelay: `${s.delay}s` }} />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-14 text-center">
      <p className="mb-4 inline-block rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.08)] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C4B5FD]">
        {eyebrow}
      </p>
      <h2
        className="gradient-title mb-3 text-3xl font-bold sm:text-4xl"
        style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.025em' }}
      >
        {title}
      </h2>
      {sub && <p className="mx-auto max-w-md text-sm leading-relaxed text-[#7e6f95]">{sub}</p>}
    </div>
  );
}

// Glassmorphism wrapper
function Glass({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        background: 'rgba(20,7,39,0.55)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 60px -15px rgba(0,0,0,0.7)',
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-white"
      style={{
        background: 'linear-gradient(160deg, #0a0315 0%, #0d0520 35%, #080212 70%, #050505 100%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Fixed engineering grid */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(#8B5CF6 1px, transparent 1px), linear-gradient(90deg, #8B5CF6 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          borderColor: 'rgba(139,92,246,0.12)',
          background: 'rgba(10,3,21,0.72)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span
            className="gradient-title text-lg font-bold tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            MAP
          </span>
          <div className="hidden items-center gap-8 text-sm text-[#7e6f95] sm:flex">
            {['Architecture', 'Agents', 'Terminal', 'Security'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="transition-colors hover:text-[#C4B5FD]"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-3 py-1.5 text-sm text-[#7e6f95] transition-colors hover:text-[#C4B5FD]"
            >
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-2">
              Launch Platform
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative flex h-[92vh] min-h-[680px] items-center justify-center overflow-hidden border-b border-[rgba(139,92,246,0.1)]">
        <HeroBg />

        {/* Top vignette */}
        <div className="pointer-events-none absolute inset-0 -z-0"
          style={{ background: 'radial-gradient(ellipse 70% 65% at 38% 52%, transparent 20%, rgba(5,5,5,0.85) 100%)' }} />

        <LiveSystemPanel />
        <PipelineModules />

        <div className="pointer-events-none relative z-10 px-6 text-center">
          {/* Badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.28)', backdropFilter: 'blur(12px)' }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold tracking-widest text-[#C4B5FD] uppercase">
              Multi-Agent AI Automation Platform
            </span>
          </div>

          {/* Headline */}
          <h1
            className="gradient-title mb-6 text-5xl font-black sm:text-7xl"
            style={{ letterSpacing: '-0.03em', lineHeight: 1.08 }}
          >
            Autonomous<br />AI Workflows.
          </h1>

          <p className="mx-auto mb-4 max-w-lg text-base leading-relaxed text-[#b5a4cd] sm:text-lg">
            Designed for planning, execution, validation, and memory<br className="hidden sm:block" />
            across complex AI systems.
          </p>

          {/* Stat strip */}
          <div className="mx-auto mb-10 flex max-w-sm items-center justify-center gap-5 text-xs text-[#4f4165]">
            <span className="text-[#7e6f95]">4 Agents</span>
            <span className="h-3 w-px bg-[#2E1C4B]" />
            <span className="text-[#7e6f95]">LangGraph ReAct</span>
            <span className="h-3 w-px bg-[#2E1C4B]" />
            <span className="text-[#7e6f95]">FastAPI · Redis</span>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="btn-primary">
              Launch Platform <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#architecture" className="btn-secondary">
              View Architecture
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ARCHITECTURE
      ══════════════════════════════════════════════ */}
      <section
        id="architecture"
        className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-28"
      >
        <ArchBg />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <SectionHeading
            eyebrow="System design"
            title="Request lifecycle"
            sub="Every task travels through a deterministic pipeline — from client to model and back."
          />
          <Glass className="p-8 sm:p-12">
            <ArchitectureFlow />
          </Glass>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          EXECUTION TIMELINE
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-28">
        <TimelineBg />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <SectionHeading
            eyebrow="Live execution"
            title="One task, end to end"
            sub="Watch a real task move through the agent pipeline in real time."
          />
          <Glass className="mx-auto max-w-lg p-8">
            <ExecutionTimeline />
          </Glass>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          AGENT NETWORK
      ══════════════════════════════════════════════ */}
      <section
        id="agents"
        className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-28"
      >
        <HexBg />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <SectionHeading
            eyebrow="Agent network"
            title="Four agents, one pipeline"
            sub="Hover each node to inspect latency, confidence, and live status."
          />
          <Glass className="p-8 sm:p-12">
            <AgentNetwork />
          </Glass>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-28">
        <DiamondBg />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <SectionHeading
            eyebrow="Capabilities"
            title="Built for production"
            sub="Every component is designed to operate reliably at scale."
          />
          <FeaturesGrid />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TERMINAL
      ══════════════════════════════════════════════ */}
      <section
        id="terminal"
        className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-28"
      >
        <MatrixBg />
        <div className="relative z-10 mx-auto max-w-3xl px-6">
          <SectionHeading
            eyebrow="Direct access"
            title="Talk to it directly"
            sub="Type a task. The agents handle the rest."
          />
          <Glass className="overflow-hidden p-0">
            <Terminal />
          </Glass>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECURITY
      ══════════════════════════════════════════════ */}
      <section
        id="security"
        className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-28"
      >
        <RadarBg />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <SectionHeading
            eyebrow="Security"
            title="Every request, verified"
            sub="RS256 JWTs, scoped keys, and role-based access control on every endpoint."
          />
          <Glass className="p-8 sm:p-12">
            <SecurityFlow />
          </Glass>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          METRICS
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-28">
        <WaveBg />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <SectionHeading eyebrow="Scale" title="Numbers don't lie" />
          <Glass className="p-8 sm:p-12">
            <MetricsSection />
          </Glass>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER CTA
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-[rgba(139,92,246,0.08)] py-24 text-center">
        <ConstellationBg />
        <div className="relative z-10 px-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#7e6f95]">
            Ready to start
          </p>
          <h2
            className="gradient-title mb-4 text-4xl font-black sm:text-5xl"
            style={{ letterSpacing: '-0.03em' }}
          >
            Give it a task.
          </h2>
          <p className="mb-10 text-[#7e6f95]">Free to run locally — no card required to try it.</p>
          <Link to="/register" className="btn-primary">
            Launch Platform <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
