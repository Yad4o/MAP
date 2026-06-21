import { useEffect, useState } from 'react';

const STEPS = ['Task Received', 'Planning', 'Execution', 'Validation', 'Memory Storage', 'Completed'];

export function ExecutionTimeline() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % (STEPS.length + 1));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={step} className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
                done
                  ? 'border-[#4ADE80] bg-[#4ADE80] text-black'
                  : current
                    ? 'border-[#E5E5E5] text-white'
                    : 'border-[#1E1E1E] text-[#A1A1AA]'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-sm ${done || current ? 'text-white' : 'text-[#A1A1AA]'}`}>{step}</span>
            {current && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-[#E5E5E5]" />}
          </div>
        );
      })}
    </div>
  );
}
