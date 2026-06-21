import { useEffect, useState } from 'react';

const ROWS = [
  '4 Agents Online',
  'Redis Connected',
  'Memory Active',
  'Inference Ready',
  'Queue Healthy',
  'WebSocket Active',
];

export function LiveSystemPanel() {
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    const id = setInterval(() => {
      setLatency((prev) => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1) * Math.round(Math.random() * 4);
        return Math.max(28, Math.min(64, next));
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute top-6 right-6 z-20 hidden w-56 rounded-xl border border-[#1E1E1E] bg-[#0B0B0B]/95 p-4 lg:block">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-white">MAP SYSTEM</span>
        <span className="text-[10px] tabular-nums text-[#A1A1AA]">{latency}ms</span>
      </div>
      <div className="flex flex-col gap-2">
        {ROWS.map((row) => (
          <div key={row} className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}
