import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Workflow,
  Brain,
  ShieldCheck,
  Code2,
  Network,
  Database,
  GitBranch,
  Search,
  Gauge,
  Lock,
  Layers,
  Server,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────
   CONTENT — sourced from the MAP technical spec
───────────────────────────────────────────────────── */

const PIPELINE = [
  {
    name: 'Planner',
    desc: 'Breaks a high-level task into a structured plan — steps, tool assignments, and a dependency graph.',
    icon: Workflow,
  },
  {
    name: 'Executor',
    desc: 'Works each step through a Reason → Act → Observe loop using real tools: search, code, files, APIs.',
    icon: Code2,
  },
  {
    name: 'Analyzer',
    desc: 'Checks every output against the plan, scores confidence, and sends weak steps back for a retry.',
    icon: ShieldCheck,
  },
  {
    name: 'Memory',
    desc: 'Embeds the result into vector memory so later steps — and later tasks — can recall it.',
    icon: Brain,
  },
];

const SOLUTIONS = [
  { problem: 'One model handling every kind of reasoning', solution: 'Four agents, each with a single job' },
  { problem: 'No memory of earlier steps in a task', solution: 'Vector memory recalled before every step' },
  { problem: 'A single point of failure on one AI provider', solution: 'Local fallback behind a circuit breaker' },
  { problem: 'No way to see what an agent actually did', solution: 'Every step logged, scored, and traced' },
];

const FEATURES = [
  { icon: Network, title: 'Specialized agents', desc: 'Planning, execution, validation, and memory are owned by separate agents instead of one model doing all of it.' },
  { icon: Database, title: 'Persistent memory', desc: 'A FAISS-backed vector store keeps task context alive across steps, sessions, and users.' },
  { icon: GitBranch, title: 'Automatic fallback', desc: 'A circuit breaker switches to a local model the moment the primary provider rate-limits or times out.' },
  { icon: Search, title: 'Full observability', desc: 'Structured logs and confidence scores for every agent step, down to tokens and latency.' },
  { icon: Gauge, title: 'Queue-backed scale', desc: 'Redis and Celery workers absorb concurrent tasks without one user blocking another.' },
  { icon: Lock, title: 'Real access control', desc: 'RS256 JWTs, role-based routes, and scoped API keys — not a shared admin password.' },
];

const STACK_GROUPS = [
  { label: 'API & Orchestration', items: ['FastAPI', 'LangGraph', 'LangChain', 'Celery'] },
  { label: 'Data & Memory', items: ['PostgreSQL', 'Redis', 'FAISS', 'SQLAlchemy'] },
  { label: 'Inference', items: ['Gemini', 'OpenAI', 'BentoML'] },
  { label: 'Frontend & Ops', items: ['React 18', 'TypeScript', 'Docker', 'Prometheus'] },
];

const TEAM = ['Om', 'Prajwal', 'Neha', 'Sanskruti', 'Shravni'];

/* ─────────────────────────────────────────────────────
   SHARED MOTION
───────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary text-center mb-3">
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-on-surface overflow-x-hidden">
      <div className="galaxy-bg"><span /></div>
      <div className="galaxy-orb-3" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-surface/60 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="orb-hud" />
            MAP
          </span>
          <div className="hidden sm:flex items-center gap-7 text-sm text-on-variant">
            <a href="#pipeline" className="hover:text-on-surface transition-colors">Pipeline</a>
            <a href="#architecture" className="hover:text-on-surface transition-colors">Architecture</a>
            <a href="#stack" className="hover:text-on-surface transition-colors">Stack</a>
            <a href="#team" className="hover:text-on-surface transition-colors">Team</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-on-variant hover:text-on-surface transition-colors px-2">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.span
            variants={fadeUp}
            className="badge badge-violet mb-6"
          >
            <Sparkles className="w-3 h-3 mr-1.5" /> MAP — Multi-Agent AI Automation
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="gradient-title text-4xl sm:text-6xl font-extrabold mb-6"
          >
            One task in.<br className="hidden sm:block" /> Four agents working it.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-on-variant text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          >
            MAP takes a plain-language task and runs it through Planner, Executor, Analyzer,
            and Memory agents instead of one model improvising the whole thing. Every step is
            planned, validated, logged, and remembered.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-12">
            <Link to="/register" className="btn-primary">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#pipeline" className="btn-secondary">
              See the pipeline
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 flex-wrap text-xs text-on-variant">
            {PIPELINE.map((p, i) => (
              <span key={p.name} className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary shadow-glow-cyan" />
                {p.name}
                {i < PIPELINE.length - 1 && <span className="text-outline-var ml-1">→</span>}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Pipeline — signature section */}
      <section id="pipeline" className="max-w-6xl mx-auto px-6 pb-24">
        <Eyebrow>The agent pipeline</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
          Reason → Act → Observe, four times over
        </h2>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative"
        >
          {PIPELINE.map((agent, i) => (
            <motion.div key={agent.name} variants={fadeUp} className="glass-card p-6 relative">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 bg-primary/10 text-primary">
                <agent.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-2">{agent.name}</h3>
              <p className="text-sm text-on-variant leading-relaxed">{agent.desc}</p>
              {i < PIPELINE.length - 1 && (
                <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-surface-container border border-white/10 items-center justify-center z-10">
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Problem → Solution */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <Eyebrow>Why a pipeline at all</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
          What breaks with a single model
        </h2>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid sm:grid-cols-2 gap-4"
        >
          {SOLUTIONS.map((s) => (
            <motion.div key={s.problem} variants={fadeUp} className="glass-card p-5 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <span className="badge badge-error shrink-0 mt-0.5">Without MAP</span>
                <p className="text-sm text-on-variant leading-relaxed">{s.problem}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="badge badge-success shrink-0 mt-0.5">With MAP</span>
                <p className="text-sm leading-relaxed">{s.solution}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="max-w-5xl mx-auto px-6 pb-24">
        <Eyebrow>System design</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Built like a service, not a script
        </h2>
        <p className="text-on-variant text-center max-w-xl mx-auto mb-10">
          A request goes through the same path every time: gateway, queue, agent controller,
          inference — with a local fallback ready the moment the primary provider isn't.
        </p>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="glass-card p-2 sm:p-3 overflow-hidden"
        >
          <img
            src="https://github.com/user-attachments/assets/fc58a0be-18b4-4027-a799-8232d8020f42"
            alt="MAP system architecture — client, gateway, queue, agent controller, and inference layers"
            className="rounded-lg w-full"
            loading="lazy"
          />
        </motion.div>
        <div className="grid sm:grid-cols-4 gap-3 mt-6 text-center">
          {[
            { icon: Server, label: 'FastAPI gateway' },
            { icon: Layers, label: 'Redis + Celery queue' },
            { icon: Network, label: 'Agent controller' },
            { icon: Database, label: 'Postgres + FAISS' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 text-xs text-on-variant">
              <s.icon className="w-4 h-4 text-tertiary" />
              {s.label}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <Eyebrow>What it solves</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
          Production concerns, handled by default
        </h2>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className="glass-card p-5">
              <f.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-on-variant leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stack */}
      <section id="stack" className="max-w-4xl mx-auto px-6 pb-24">
        <Eyebrow>Under the hood</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Built with</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STACK_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="text-xs font-medium text-on-variant uppercase tracking-wide mb-3">{g.label}</p>
              <div className="flex flex-col gap-2">
                {g.items.map((item) => (
                  <span key={item} className="text-sm bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section id="team" className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <Eyebrow>Built by</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold mb-10">Five full-stack AI engineers</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {TEAM.map((name) => (
            <span key={name} className="text-sm glass-card !rounded-full px-5 py-2.5">
              {name}
            </span>
          ))}
        </div>
        <p className="text-xs text-on-variant mt-5">
          No specialists — everyone ships backend, frontend, agents, and infra.
        </p>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-white/5 py-16 text-center">
        <h2 className="text-2xl font-bold mb-3">Give it a task.</h2>
        <p className="text-on-variant mb-8">Free to run locally — no card required to try it.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register" className="btn-primary">
            Get started <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/Yad4o/MAP"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            <ExternalLink className="w-4 h-4" /> View on GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
