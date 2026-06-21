import { ArrowRight, Globe, KeyRound, ShieldCheck, Cpu, Database } from 'lucide-react';

const STEPS = [
  { label: 'Request', icon: Globe },
  { label: 'Authentication', icon: KeyRound },
  { label: 'Authorization', icon: ShieldCheck },
  { label: 'Execution', icon: Cpu },
  { label: 'Storage', icon: Database },
];

export function SecurityFlow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3">
          <div className="flex min-w-[120px] flex-col items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#111111] px-5 py-4">
            <step.icon className="h-4 w-4 text-[#E5E5E5]" />
            <span className="text-xs text-white">{step.label}</span>
          </div>
          {i < STEPS.length - 1 && <ArrowRight className="h-4 w-4 text-[#2E2E2E]" />}
        </div>
      ))}
    </div>
  );
}
