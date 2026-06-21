import { useEffect, useRef, useState } from 'react';

function useCountUp(target: number, decimals = 0, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const scale = 10 ** decimals;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / durationMs);
            setValue(Math.floor(progress * target * scale) / scale);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, durationMs, scale]);

  return { ref, value };
}

function formatNumber(value: number, decimals: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

const METRICS = [
  { label: 'Tasks Processed', value: 184320, decimals: 0, suffix: '' },
  { label: 'Agent Executions', value: 742110, decimals: 0, suffix: '' },
  { label: 'Memory Records', value: 96400, decimals: 0, suffix: '' },
  { label: 'API Requests', value: 2840000, decimals: 0, suffix: '' },
  { label: 'System Reliability', value: 99.95, decimals: 2, suffix: '%' },
];

function MetricItem({
  label,
  value,
  decimals,
  suffix,
}: {
  label: string;
  value: number;
  decimals: number;
  suffix: string;
}) {
  const { ref, value: animated } = useCountUp(value, decimals);
  return (
    <div ref={ref} className="text-center">
      <p className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">
        {formatNumber(animated, decimals)}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-[#A1A1AA]">{label}</p>
    </div>
  );
}

export function MetricsSection() {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
      {METRICS.map((metric) => (
        <MetricItem key={metric.label} {...metric} />
      ))}
    </div>
  );
}
