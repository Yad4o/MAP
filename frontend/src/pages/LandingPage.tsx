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

// ─── Lightweight neural-net illustration (pure CSS/SVG, zero WebGL) ──────────
// Replaces Three.js BrainScene to eliminate hero lag entirely.
// Pinned to the right half of the hero; invisible on narrow screens.
function NeuralWeb() {
  const nodes: { cx: number; cy: number; r: number; delay: number }[] = [
    { cx: 72, cy: 18, r: 3.5, delay: 0 },
    { cx: 52, cy: 34, r: 2.5, delay: 0.4 },
    { cx: 88, cy: 38, r: 2, delay: 0.8 },
    { cx: 64, cy: 52, r: 4, delay: 0.2 },
    { cx: 40, cy: 55, r: 2.5, delay: 1.1 },
    { cx: 82, cy: 62, r: 2, delay: 0.6 },
    { cx: 58, cy: 72, r: 3, delay: 0.9 },
    { cx: 76, cy: 80, r: 2.5, delay: 0.3 },
    { cx: 44, cy: 78, r: 2, delay: 1.4 },
    { cx: 68, cy: 90, r: 2, delay: 0.7 },
    { cx: 90, cy: 50, r: 1.5, delay: 1.2 },
    { cx: 35, cy: 42, r: 1.5, delay: 1.6 },
  ];

  const edges: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [3, 5],
    [3, 6], [4, 8], [5, 7], [6, 7], [6, 8], [7, 9],
    [2, 10], [1, 11], [11, 4],
  ];

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block">
      <svg
        viewBox="0 0 120 110"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="nglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          {/* Travelling pulse along edges */}
          <style>{`
            @keyframes pulse-edge {
              0%   { stroke-dashoffset: 60; opacity: 0; }
              15%  { opacity: 0.55; }
              85%  { opacity: 0.55; }
              100% { stroke-dashoffset: 0;  opacity: 0; }
            }
            @keyframes node-breathe {
              0%, 100% { r: var(--rb); opacity: 0.45; }
              50%       { r: calc(var(--rb) * 1.55); opacity: 0.9; }
            }
            .n-edge { stroke-dasharray: 60; animation: pulse-edge 3.6s ease-in-out infinite; }
            .n-node { animation: node-breathe 3s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Static dim connectors */}
        {edges.map(([a, b], i) => (
          <line
            key={`s${i}`}
            x1={nodes[a].cx} y1={nodes[a].cy}
            x2={nodes[b].cx} y2={nodes[b].cy}
            stroke="#ffffff" strokeOpacity="0.07" strokeWidth="0.6"
          />
        ))}

        {/* Animated travelling pulses */}
        {edges.map(([a, b], i) => (
          <line
            key={`e${i}`}
            x1={nodes[a].cx} y1={nodes[a].cy}
            x2={nodes[b].cx} y2={nodes[b].cy}
            stroke="#ffffff" strokeWidth="0.8"
            className="n-edge"
            style={{ animationDelay: `${(i * 0.29) % 3.6}s` }}
          />
        ))}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.cx} cy={n.cy}
            r={n.r}
            fill="url(#nglow)"
            className="n-node"
            style={
              {
                '--rb': `${n.r}px`,
                animationDelay: `${n.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
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
            <a href="#agents" className="transition-colors hover:text-white">Agents</a>
            <a href="#terminal" className="transition-colors hover:text-white">Terminal</a>
            <a href="#security" className="transition-colors hover:text-white">Security</a>
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
        {/* Neural web — right side decoration, zero WebGL */}
        <NeuralWeb />

        {/* Radial vignette so text stays readable over the animation */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 38% 50%, transparent 30%, #050505 100%)',
          }}
        />

        <LiveSystemPanel />
        <PipelineModules />

        <div className="pointer-events-none relative z-10 px-6 text-center">
          {/* Pill badge */}
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
          {/* Stat strip */}
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

      {/* Architecture */}
      <section id="architecture" className="mx-auto max-w-5xl px-6 py-24">
        <SectionHeading eyebrow="System design" title="Request lifecycle" />
        <ArchitectureFlow />
      </section>

      {/* Execution timeline */}
      <section className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <SectionHeading eyebrow="Live execution" title="One task, end to end" />
        <ExecutionTimeline />
      </section>

      {/* Agent network */}
      <section id="agents" className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <SectionHeading eyebrow="Agent network" title="Four agents, one pipeline" />
        <AgentNetwork />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <SectionHeading eyebrow="Capabilities" title="Built for production" />
        <FeaturesGrid />
      </section>

      {/* Terminal */}
      <section id="terminal" className="mx-auto max-w-3xl border-t border-[#1E1E1E] px-6 py-24">
        <SectionHeading eyebrow="Direct access" title="Talk to it directly" />
        <Terminal />
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <SectionHeading eyebrow="Security" title="Every request, verified" />
        <SecurityFlow />
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-5xl border-t border-[#1E1E1E] px-6 py-24">
        <MetricsSection />
      </section>

      {/* Footer CTA */}
      <section className="border-t border-[#1E1E1E] py-16 text-center">
        <h2 className="mb-3 text-2xl font-semibold">Give it a task.</h2>
        <p className="mb-8 text-[#A1A1AA]">Free to run locally — no card required to try it.</p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Launch Platform <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
