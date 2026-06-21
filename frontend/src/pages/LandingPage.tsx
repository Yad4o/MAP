import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LiveSystemPanel } from '../components/landing/LiveSystemPanel';
import { LiveParticleField } from '../components/landing/LiveParticleField';
import { PipelineModules } from '../components/landing/PipelineModules';
import { ArchitectureFlow } from '../components/landing/ArchitectureFlow';
import { ExecutionTimeline } from '../components/landing/ExecutionTimeline';
import { AgentNetwork } from '../components/landing/AgentNetwork';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { Terminal } from '../components/landing/Terminal';
import { SecurityFlow } from '../components/landing/SecurityFlow';
import { MetricsSection } from '../components/landing/MetricsSection';

// ─── All SVG animations: pure CSS, zero JS per frame, zero WebGL ─────────────

// 1. HERO — Echo wave disc (right side). Inspired by sonar/echolocation
// point-cloud art: concentric dot rings tilted into a shallow ellipse.
// Pure SVG, fully static layout (no JS-driven geometry per frame) —
// the only animated cost is a single CSS opacity pulse on the core,
// so this carries effectively zero runtime weight versus the old
// node-graph despite the denser visual.
function EchoWave() {
  const rings = 9;
  const dotsPerRing = 28;
  const dots: { cx: number; cy: number; r: number; op: number }[] = [];
  for (let ring = 0; ring < rings; ring++) {
    const t = ring / (rings - 1); // 0 (inner) → 1 (outer)
    const rx = 8 + t * 46;
    const ry = rx * 0.34; // flatten into an ellipse, like a tilted disc
    const n = Math.round(10 + t * dotsPerRing);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      dots.push({
        cx: 62 + rx * Math.cos(a),
        cy: 58 + ry * Math.sin(a) - t * 4,
        r: 0.45 + (1 - t) * 0.55,
        op: 0.06 + (1 - t) * 0.3,
      });
    }
  }
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block">
      <svg viewBox="0 0 120 110" preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="echo-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"   />
          </radialGradient>
          <style>{`
            @keyframes echo-core-pulse {
              0%, 100% { opacity: 0.55; r: 1.6; }
              50%      { opacity: 1;    r: 2.4; }
            }
            .echo-core { animation: echo-core-pulse 3.4s ease-in-out infinite; }
          `}</style>
        </defs>
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#ffffff" fillOpacity={d.op} />
        ))}
        <circle cx="62" cy="46" r="2" fill="url(#echo-core)" className="echo-core" />
      </svg>
    </div>
  );
}

// 2. ARCHITECTURE — Circuit traces (left side)
// Horizontal PCB-style traces with a travelling signal dot on each line.
function CircuitTraces() {
  const traces = [
    { y: 12,  len: 55, branches: [{ at: 30, dy: 14 }, { at: 48, dy: -8 }], delay: 0    },
    { y: 28,  len: 62, branches: [{ at: 20, dy: 18 }],                      delay: 0.7  },
    { y: 46,  len: 48, branches: [{ at: 35, dy: -12 }, { at: 44, dy: 10 }], delay: 1.3  },
    { y: 62,  len: 58, branches: [{ at: 15, dy: 8  }],                      delay: 0.4  },
    { y: 76,  len: 52, branches: [{ at: 28, dy: -16 }, { at: 50, dy: 14 }], delay: 1.9  },
    { y: 90,  len: 44, branches: [],                                          delay: 0.9  },
  ];
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[18%] lg:block opacity-[0.55]">
      <svg viewBox="0 0 80 110" preserveAspectRatio="xMaxYMid meet" className="h-full w-full" aria-hidden="true">
        <defs>
          <style>{`
            @keyframes signal-travel {
              0%   { offset-distance: 0%;   opacity: 0; }
              8%   { opacity: 1; }
              90%  { opacity: 1; }
              100% { offset-distance: 100%; opacity: 0; }
            }
            .sig { animation: signal-travel 4s linear infinite; }
          `}</style>
        </defs>
        {traces.map((t, ti) => {
          const pathD = `M 4 ${t.y} H ${t.len}` +
            t.branches.map(b => ` M ${4 + b.at} ${t.y} V ${t.y + b.dy} H ${t.len - 4}`).join('');
          const mainPath = `M 4 ${t.y} H ${t.len}`;
          return (
            <g key={ti}>
              {/* Static dim trace */}
              <path d={pathD} fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.7" />
              {/* Travelling dot on main line */}
              <circle r="1.4" fill="#ffffff" fillOpacity="0.7" className="sig"
                style={{
                  offsetPath: `path('${mainPath}')`,
                  animationDelay: `${t.delay}s`,
                } as React.CSSProperties} />
              {/* Corner pads */}
              <circle cx={4}    cy={t.y} r="1.6" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.6" />
              <circle cx={t.len} cy={t.y} r="1.6" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.6" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 3. TERMINAL — Binary rain (right side)
// Columns of 0/1 digits that fade in from top, CSS-only.
function BinaryRain() {
  const cols = [
    { x: 12,  digits: ['1','0','1','1','0','1','0','0','1'], delay: 0    },
    { x: 26,  digits: ['0','1','0','0','1','0','1','1','0'], delay: 0.8  },
    { x: 40,  digits: ['1','1','0','1','0','0','1','0','1'], delay: 0.3  },
    { x: 54,  digits: ['0','0','1','0','1','1','0','1','0'], delay: 1.2  },
    { x: 68,  digits: ['1','0','0','1','1','0','1','0','1'], delay: 0.6  },
    { x: 82,  digits: ['0','1','1','0','0','1','0','1','1'], delay: 1.7  },
    { x: 96,  digits: ['1','0','1','0','1','0','0','1','0'], delay: 0.2  },
  ];
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[22%] lg:block opacity-[0.45]">
      <svg viewBox="0 0 110 110" preserveAspectRatio="xMinYMid meet" className="h-full w-full" aria-hidden="true">
        <defs>
          <style>{`
            @keyframes rain-fall {
              0%   { opacity: 0; transform: translateY(-4px); }
              20%  { opacity: 1; }
              80%  { opacity: 1; }
              100% { opacity: 0; transform: translateY(4px); }
            }
            .bit { font-family: monospace; font-size: 6px; fill: #ffffff; animation: rain-fall 3.2s ease-in-out infinite; }
          `}</style>
        </defs>
        {cols.map((col, ci) =>
          col.digits.map((d, di) => (
            <text
              key={`${ci}-${di}`}
              x={col.x} y={10 + di * 11}
              className="bit"
              style={{ animationDelay: `${col.delay + di * 0.18}s` }}
            >
              {d}
            </text>
          ))
        )}
      </svg>
    </div>
  );
}

// 4. SECURITY — Concentric orbit rings (left side)
// Three rings slowly rotating at different speeds with a tiny dot orbiting each.
function OrbitRings() {
  const rings = [
    { cx: 50, cy: 55, rx: 28, ry: 10, speed: '12s', dotDelay: 0   },
    { cx: 50, cy: 55, rx: 20, ry: 7,  speed: '8s',  dotDelay: 0.5 },
    { cx: 50, cy: 55, rx: 11, ry: 4,  speed: '5s',  dotDelay: 1   },
  ];
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[18%] lg:block opacity-[0.5]">
      <svg viewBox="0 0 100 110" preserveAspectRatio="xMaxYMid meet" className="h-full w-full" aria-hidden="true">
        <defs>
          <style>{`
            @keyframes orbit-spin {
              from { transform: rotate(0deg);   }
              to   { transform: rotate(360deg); }
            }
            @keyframes orbit-dot-pulse {
              0%, 100% { opacity: 0.4; r: 1.8; }
              50%      { opacity: 1;   r: 2.6; }
            }
          `}</style>
        </defs>
        {/* Static rings */}
        {rings.map((r, i) => (
          <ellipse key={`r${i}`} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
            fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.7" />
        ))}
        {/* Core dot */}
        <circle cx={50} cy={55} r={3} fill="#ffffff" fillOpacity="0.15" />
        <circle cx={50} cy={55} r={1.2} fill="#ffffff" fillOpacity="0.6" />
        {/* Orbiting dots */}
        {rings.map((r, i) => (
          <g key={`g${i}`} style={{ transformOrigin: `${r.cx}px ${r.cy}px`, animation: `orbit-spin ${r.speed} linear infinite` }}>
            <circle
              cx={r.cx + r.rx} cy={r.cy}
              r={0} fill="#ffffff"
              style={{ animationDelay: `${r.dotDelay}s` }}
            >
              <animate attributeName="r" values="2;2.8;2" dur="2s" repeatCount="indefinite" begin={`${r.dotDelay}s`} />
              <animate attributeName="fill-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin={`${r.dotDelay}s`} />
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

// 5. FOOTER — Particle scatter (full bleed behind CTA)
// Static scattered dots at varying opacities — no animation, truly zero cost.
function ParticleField() {
  const pts = [
    [8,20],[15,72],[24,38],[32,85],[42,15],[51,60],[58,30],[67,78],[74,45],[83,12],
    [88,68],[94,35],[12,55],[28,18],[36,90],[46,42],[55,8],[63,65],[71,28],[79,82],
    [5,48],[19,88],[39,22],[61,95],[85,52],[96,18],[22,70],[48,80],[76,14],[91,75],
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <style>{`
            @keyframes twinkle {
              0%, 100% { opacity: var(--base-op); }
              50%      { opacity: calc(var(--base-op) * 3); }
            }
            .star { animation: twinkle var(--dur) ease-in-out infinite; }
          `}</style>
        </defs>
        {pts.map(([x, y], i) => {
          const baseOp = 0.04 + (i % 5) * 0.025;
          const dur = 2.5 + (i % 7) * 0.6;
          return (
            <circle key={i} cx={x} cy={y} r={0.8 + (i % 3) * 0.4}
              fill="#ffffff"
              className="star"
              style={{ '--base-op': baseOp, '--dur': `${dur}s`, animationDelay: `${(i * 0.37) % dur}s` } as React.CSSProperties}
            />
          );
        })}
      </svg>
    </div>
  );
}

// 6. AGENT NETWORK — Radar wheel (right side). A circular instrument
// dial with rim labels and a scattered noise/constellation field inside,
// echoing sonar-chart reference art. Static SVG + one slow CSS rotation
// on the sweep line only — negligible cost.
function RadarWheel() {
  const labels = ['SIGNAL', 'MEMORY', 'OUTPUT', 'VALIDATE', 'EXECUTE', 'PLAN'];
  // Deterministic pseudo-random noise field inside the dial
  const noise = Array.from({ length: 90 }, (_, i) => {
    const a = (i * 47) % 360;
    const r = 6 + ((i * 13) % 38);
    return {
      cx: 50 + r * Math.cos((a * Math.PI) / 180),
      cy: 50 + r * Math.sin((a * Math.PI) / 180),
      op: 0.05 + ((i * 7) % 10) * 0.02,
    };
  });
  return (
    <div className="pointer-events-none absolute -right-6 top-1/2 hidden w-[300px] -translate-y-1/2 xl:block opacity-[0.5]">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <defs>
          <style>{`
            @keyframes wheel-spin { to { transform: rotate(360deg); } }
            .wheel-rim { animation: wheel-spin 90s linear infinite; transform-origin: 50px 50px; }
          `}</style>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.3" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.3" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.3" />
        {noise.map((n, i) => (
          <circle key={i} cx={n.cx} cy={n.cy} r="0.5" fill="#ffffff" fillOpacity={n.op} />
        ))}
        <g className="wheel-rim">
          {labels.map((label, i) => {
            const a = (i / labels.length) * 360 - 90;
            const rad = (a * Math.PI) / 180;
            const x = 50 + 46 * Math.cos(rad);
            const y = 50 + 46 * Math.sin(rad);
            return (
              <text key={label} x={x} y={y} fontSize="2.6" fill="#ffffff" fillOpacity="0.25"
                fontFamily="monospace" textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${a + 90}, ${x}, ${y})`}>
                {label}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}


function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-12 text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#A1A1AA]">{eyebrow}</p>
      <h2 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      {/* Engineering grid */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Film-grain noise */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-[#1E1E1E] bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="font-semibold tracking-tight">MAP</span>
          <div className="hidden items-center gap-7 text-sm text-[#A1A1AA] sm:flex">
            <a href="#architecture" className="transition-colors hover:text-white">Architecture</a>
            <a href="#agents"       className="transition-colors hover:text-white">Agents</a>
            <a href="#terminal"     className="transition-colors hover:text-white">Terminal</a>
            <a href="#security"     className="transition-colors hover:text-white">Security</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-2 text-sm text-[#A1A1AA] transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Launch Platform
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex h-[88vh] min-h-[640px] items-center justify-center overflow-hidden border-b border-[#1E1E1E]">
        <LiveParticleField />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 38% 50%, transparent 30%, #050505 100%)' }}
        />
        <LiveSystemPanel />
        <PipelineModules />
        <div className="pointer-events-none relative z-10 px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1E1E1E] bg-white/[0.04] px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-[#A1A1AA]">Multi-Agent AI Automation Platform</span>
          </div>
          <h1 className="mb-5 text-4xl font-semibold tracking-tight sm:text-6xl">
            Autonomous AI Workflows.
          </h1>
          <p className="mx-auto mb-3 max-w-xl text-base text-[#A1A1AA] sm:text-lg">
            Designed for planning, execution, validation, and memory across complex AI systems.
          </p>
          <div className="mx-auto mb-9 flex max-w-xs items-center justify-center gap-6 text-xs text-[#555]">
            <span>4 Agents</span>
            <span className="h-3 w-px bg-[#2E2E2E]" />
            <span>LangGraph ReAct</span>
            <span className="h-3 w-px bg-[#2E2E2E]" />
            <span>FastAPI · Redis</span>
          </div>
          <div className="pointer-events-auto flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Launch Platform <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#architecture"
              className="inline-flex items-center gap-2 rounded-lg border border-[#1E1E1E] px-6 py-3 text-sm font-medium text-white transition-colors hover:border-[#2E2E2E]"
            >
              View Architecture
            </a>
          </div>
        </div>
      </section>

      {/* ── Architecture — circuit traces left side ── */}
      <section id="architecture" className="relative mx-auto max-w-5xl px-6 py-24">
        <CircuitTraces />
        <SectionHeading eyebrow="System design" title="Request lifecycle" />
        <ArchitectureFlow />
      </section>

      {/* Execution timeline */}
      <section className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <SectionHeading eyebrow="Live execution" title="One task, end to end" />
        <ExecutionTimeline />
      </section>

      {/* Agent network */}
      <section id="agents" className="relative mx-auto max-w-5xl overflow-hidden border-t border-[#1E1E1E] px-6 py-24">
        <RadarWheel />
        <SectionHeading eyebrow="Agent network" title="Four agents, one pipeline" />
        <AgentNetwork />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <SectionHeading eyebrow="Capabilities" title="Built for production" />
        <FeaturesGrid />
      </section>

      {/* ── Terminal — binary rain right side ── */}
      <section id="terminal" className="relative mx-auto max-w-3xl border-t border-[#1E1E1E] px-6 py-24">
        <BinaryRain />
        <SectionHeading eyebrow="Direct access" title="Talk to it directly" />
        <Terminal />
      </section>

      {/* ── Security — orbit rings left side ── */}
      <section id="security" className="relative mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <OrbitRings />
        <SectionHeading eyebrow="Security" title="Every request, verified" />
        <SecurityFlow />
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <MetricsSection />
      </section>

      {/* ── Footer CTA — particle field behind ── */}
      <section className="relative border-t border-[#1E1E1E] py-16 text-center overflow-hidden">
        <ParticleField />
        <div className="relative z-10">
          <h2 className="mb-3 text-2xl font-semibold">Give it a task.</h2>
          <p className="mb-8 text-[#A1A1AA]">Free to run locally — no card required to try it.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Launch Platform <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
