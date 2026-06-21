import { useState } from 'react';

const AGENTS = [
  { name: 'Planner', role: 'Task decomposition', latency: '180ms', confidence: '0.94', status: 'Idle' },
  { name: 'Executor', role: 'Tool execution', latency: '420ms', confidence: '0.89', status: 'Running' },
  { name: 'Analyzer', role: 'Output validation', latency: '95ms', confidence: '0.97', status: 'Idle' },
  { name: 'Memory', role: 'Context retrieval', latency: '60ms', confidence: '0.99', status: 'Idle' },
];

export function AgentNetwork() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative mx-auto grid max-w-md grid-cols-2 gap-x-20 gap-y-16 py-8">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="25" y1="25" x2="75" y2="25" stroke="#1E1E1E" strokeWidth="0.5" />
        <line x1="25" y1="75" x2="75" y2="75" stroke="#1E1E1E" strokeWidth="0.5" />
        <line x1="25" y1="25" x2="25" y2="75" stroke="#1E1E1E" strokeWidth="0.5" />
        <line x1="75" y1="25" x2="75" y2="75" stroke="#1E1E1E" strokeWidth="0.5" />
        <line x1="25" y1="25" x2="75" y2="75" stroke="#1E1E1E" strokeWidth="0.3" />
        <line x1="75" y1="25" x2="25" y2="75" stroke="#1E1E1E" strokeWidth="0.3" />
      </svg>

      {AGENTS.map((agent, i) => (
        <div
          key={agent.name}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className="relative z-10 flex flex-col items-center"
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
              hovered === i ? 'border-[#E5E5E5] bg-[#111111] text-white' : 'border-[#1E1E1E] bg-[#0B0B0B] text-[#A1A1AA]'
            }`}
          >
            {agent.name}
          </div>
          {hovered === i && (
            <div className="absolute top-full z-20 mt-2 w-44 rounded-lg border border-[#1E1E1E] bg-[#111111] p-3 text-left text-[11px] text-[#A1A1AA] shadow-xl">
              <p className="mb-1 text-white">{agent.role}</p>
              <p>Latency: {agent.latency}</p>
              <p>Confidence: {agent.confidence}</p>
              <p>Status: {agent.status}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
