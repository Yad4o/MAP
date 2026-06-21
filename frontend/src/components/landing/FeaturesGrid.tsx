import { Workflow, Code2, ShieldCheck, Brain, GitBranch, Lock } from 'lucide-react';

const FEATURES = [
  { icon: Workflow, title: 'Planner Agent', desc: 'Decomposes tasks into structured, dependency-aware execution plans.' },
  { icon: Code2, title: 'Executor Agent', desc: 'Runs each step through a Reason, Act, Observe loop with real tools.' },
  { icon: ShieldCheck, title: 'Analyzer Agent', desc: 'Scores confidence and validates every output before it ships.' },
  { icon: Brain, title: 'Memory Engine', desc: 'Vector-backed recall across steps, sessions, and tasks.' },
  { icon: GitBranch, title: 'Fallback System', desc: 'Circuit breaker switches to a local model on provider failure.' },
  { icon: Lock, title: 'Security Layer', desc: 'RS256 JWTs, scoped keys, and role-based access control.' },
];

export function FeaturesGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="group rounded-xl border border-[#1E1E1E] bg-[#111111] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#2E2E2E]"
        >
          <feature.icon className="mb-4 h-5 w-5 text-[#E5E5E5]" />
          <h3 className="mb-2 text-sm font-semibold text-white">{feature.title}</h3>
          <p className="text-xs leading-relaxed text-[#A1A1AA]">{feature.desc}</p>
        </div>
      ))}
    </div>
  );
}
