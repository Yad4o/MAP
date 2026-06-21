import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Workflow,
  Brain,
  ShieldCheck,
  Gauge,
  GitBranch,
  Database,
  Search,
  Code2,
  FileText,
  Network,
} from 'lucide-react';

const PIPELINE = [
  { name: 'Planner', desc: 'Decomposes the task into a structured plan with tools and dependencies.', icon: Workflow, color: 'text-blue-400 bg-blue-400/10' },
  { name: 'Executor', desc: 'Runs each step via a Reason → Act → Observe loop, with real tools.', icon: Code2, color: 'text-green-400 bg-green-400/10' },
  { name: 'Analyzer', desc: 'Validates outputs, scores confidence, and triggers re-execution if needed.', icon: ShieldCheck, color: 'text-orange-400 bg-orange-400/10' },
  { name: 'Memory', desc: 'Embeds results into vector memory for future context retrieval.', icon: Brain, color: 'text-purple-400 bg-purple-400/10' },
];

const FEATURES = [
  { icon: Network, title: 'Specialized agents', desc: 'Each agent owns one job instead of one model doing everything.' },
  { icon: Database, title: 'Persistent memory', desc: 'FAISS/Chroma vector store keeps context across steps and sessions.' },
  { icon: GitBranch, title: 'Fallback inference', desc: 'Circuit breaker switches to a local model if the primary provider fails.' },
  { icon: Search, title: 'Full observability', desc: 'Every agent step is logged, traced, and visualized end-to-end.' },
  { icon: Gauge, title: 'Queue-backed scale', desc: 'Redis + Celery workers handle concurrent tasks without contention.' },
  { icon: FileText, title: 'Access control', desc: 'JWT auth with role-based access and scoped API keys.' },
];

const TEAM = ['Om', 'Prajwal', 'Neha', 'Sanskruti', 'Shravni'];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <span className="font-semibold tracking-tight">MAP</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">
            Sign in
          </Link>
          <Link to="/register" className="text-sm bg-white text-black rounded-lg px-4 py-1.5 font-medium hover:opacity-90 transition-opacity">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Multi-Agent AI Automation Platform
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
          MAP takes a high-level task and routes it through specialized AI agents — Planner,
          Executor, Analyzer, and Memory — instead of relying on a single model to do everything.
          Every step is observable, validated, and persisted.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-white text-black rounded-lg px-6 py-3 font-medium hover:opacity-90 transition-opacity"
        >
          Get started <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Pipeline */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6 text-center">
          The Agent Pipeline
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE.map((agent, i) => (
            <div key={agent.name} className="relative rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-4 ${agent.color}`}>
                <agent.icon className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-medium mb-1.5">{agent.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{agent.desc}</p>
              {i < PIPELINE.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6 text-center">
          What it solves
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <f.icon className="w-4.5 h-4.5 text-slate-400 mb-3" />
              <h3 className="text-sm font-medium mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6 text-center">
          Built with
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {['FastAPI', 'PostgreSQL', 'Redis', 'Celery', 'LangGraph', 'React 18', 'TypeScript', 'Docker', 'BentoML', 'FAISS'].map((t) => (
            <span key={t} className="text-xs text-slate-400 border border-white/10 rounded-full px-3 py-1.5">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">
          Built by
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {TEAM.map((name) => (
            <span key={name} className="text-sm bg-white/5 border border-white/10 rounded-full px-4 py-2">
              {name}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-4">Full Stack AI Engineers</p>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-white/10 py-10 text-center">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-white text-black rounded-lg px-6 py-3 font-medium hover:opacity-90 transition-opacity"
        >
          Get started <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
