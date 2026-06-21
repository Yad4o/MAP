/**
 * frontend/src/components/auth/AuthOrnament.tsx
 * ──────────────────────────────────────────────
 * Decorative side panel for the login/register screens, filling the
 * blank black space beside the form card on wide viewports. Inspired
 * by sonar/echolocation dial art: a radar wheel + scattered point
 * field. Pure static SVG (one slow CSS rotation only) — effectively
 * free to render, never competes with the form for attention since
 * it's `pointer-events-none` and dimmed.
 */
export function AuthOrnament({ side = 'left' }: { side?: 'left' | 'right' }) {
  const labels = ['SIGNAL', 'MEMORY', 'AGENTS', 'TASKS', 'SECURE', 'OUTPUT'];
  const noise = Array.from({ length: 70 }, (_, i) => {
    const a = (i * 53) % 360;
    const r = 6 + ((i * 11) % 38);
    return {
      cx: 50 + r * Math.cos((a * Math.PI) / 180),
      cy: 50 + r * Math.sin((a * Math.PI) / 180),
      op: 0.04 + ((i * 7) % 10) * 0.018,
    };
  });

  return (
    <div
      className={`pointer-events-none absolute top-1/2 hidden w-[320px] -translate-y-1/2 opacity-[0.45] lg:block ${
        side === 'left' ? 'left-[4%]' : 'right-[4%]'
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <style>{`
            @keyframes auth-wheel-spin { to { transform: rotate(360deg); } }
            .auth-wheel-rim { animation: auth-wheel-spin 100s linear infinite; transform-origin: 50px 50px; }
            @keyframes auth-core-pulse {
              0%, 100% { opacity: 0.4; }
              50%      { opacity: 0.9; }
            }
            .auth-core { animation: auth-core-pulse 3.2s ease-in-out infinite; }
          `}</style>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="20" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.3" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.3" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.3" />
        {noise.map((n, i) => (
          <circle key={i} cx={n.cx} cy={n.cy} r="0.5" fill="#ffffff" fillOpacity={n.op} />
        ))}
        <circle cx="50" cy="50" r="2" fill="#ffffff" className="auth-core" />
        <g className="auth-wheel-rim">
          {labels.map((label, i) => {
            const a = (i / labels.length) * 360 - 90;
            const rad = (a * Math.PI) / 180;
            const x = 50 + 46 * Math.cos(rad);
            const y = 50 + 46 * Math.sin(rad);
            return (
              <text
                key={label}
                x={x}
                y={y}
                fontSize="2.6"
                fill="#ffffff"
                fillOpacity="0.22"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${a + 90}, ${x}, ${y})`}
              >
                {label}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
