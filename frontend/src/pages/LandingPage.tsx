import { lazy, Suspense } from 'react';
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

// Code-split: three.js + @react-three/fiber + drei stay out of the main bundle
// and only load once the hero mounts.
const BrainScene = lazy(() => import('../components/landing/BrainScene'));

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
      {/* Faint engineering grid, present everywhere */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Subtle film-grain noise */}
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
            <a href="#architecture" className="transition-colors hover:text-white">
              Architecture
            </a>
            <a href="#agents" className="transition-colors hover:text-white">
              Agents
            </a>
            <a href="#terminal" className="transition-colors hover:text-white">
              Terminal
            </a>
            <a href="#security" className="transition-colors hover:text-white">
              Security
            </a>
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

      {/* Hero */}
      <section className="relative flex h-[88vh] min-h-[640px] items-center justify-center overflow-hidden border-b border-[#1E1E1E]">
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-48 w-48 animate-pulse rounded-full border border-[#1E1E1E]" />
              </div>
            }
          >
            <BrainScene />
          </Suspense>
        </div>

        <LiveSystemPanel />
        <PipelineModules />

        <div className="pointer-events-none relative z-10 px-6 text-center">
          <h1 className="mb-5 text-4xl font-semibold tracking-tight sm:text-6xl">Autonomous AI Workflows.</h1>
          <p className="mx-auto mb-9 max-w-xl text-base text-[#A1A1AA] sm:text-lg">
            Designed for planning, execution, validation, and memory across complex AI systems.
          </p>
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
