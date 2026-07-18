import { useEffect, useRef } from 'react';

function createWavePaths(
  group: SVGGElement,
  colors: string[],
  strokeWidth: number
) {
  const count = 40;
  const paths: SVGPathElement[] = [];
  for (let i = 0; i < count; i++) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'wave-path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colors[i % colors.length]);
    path.setAttribute('stroke-width', String(strokeWidth));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    group.appendChild(path);
    paths.push(path);
  }
  return paths;
}

function animateWave(
  paths: SVGPathElement[],
  config: {
    period: number;
    amplitude: number;
    phaseShift: number;
    yOffset: number;
    speed: number;
  }
) {
  let animId: number;
  function tick(time: number) {
    const t = time * config.speed;
    paths.forEach((path, i) => {
      const phase = config.phaseShift * i - t;
      const scaleX = Math.sin(phase);
      const dx = config.amplitude * scaleX;
      const d = `M0,${config.yOffset} Q${config.period / 4 + dx},${config.yOffset - config.amplitude} ${config.period / 2},${config.yOffset} T${config.period},${config.yOffset}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke-width', String(1.5 + 1.5 * Math.abs(scaleX)));
      path.setAttribute(
        'stroke-opacity',
        String(0.3 + 0.4 * Math.abs(scaleX))
      );
    });
    animId = requestAnimationFrame(tick);
  }
  animId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(animId);
}

function DualWaves() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const group1 = container.querySelector(
      '.wave-svg:nth-child(1) .wave-group'
    ) as SVGGElement;
    const group2 = container.querySelector(
      '.wave-svg:nth-child(2) .wave-group'
    ) as SVGGElement;
    if (!group1 || !group2) return;

    const paths1 = createWavePaths(group1, ['#0C4A6E', '#131417'], 3);
    const paths2 = createWavePaths(group2, ['#D4A574', '#F5F3EE'], 2.5);

    const cleanup1 = animateWave(paths1, {
      period: 400,
      amplitude: 60,
      phaseShift: 0.12,
      yOffset: 150,
      speed: 0.001,
    });
    const cleanup2 = animateWave(paths2, {
      period: 400,
      amplitude: 50,
      phaseShift: 0.15,
      yOffset: 150,
      speed: 0.0015,
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
      }}
    >
      <svg
        className="wave-svg"
        style={{ display: 'block', width: 400, height: 300 }}
        viewBox="0 0 400 300"
        aria-hidden="true"
      >
        <g className="wave-group" />
      </svg>
      <svg
        className="wave-svg"
        style={{ display: 'block', width: 400, height: 300 }}
        viewBox="0 0 400 300"
        aria-hidden="true"
      >
        <g className="wave-group" />
      </svg>
    </div>
  );
}

const STEPS = [
  {
    num: '01',
    title: 'Task Decomposition',
    desc: 'High-level requests are broken into discrete subtasks with dependency graphs and expected output schemas.',
  },
  {
    num: '02',
    title: 'Agent Execution',
    desc: 'Each subtask is routed to the appropriate agent with tool access, timeout enforcement, and iterative reasoning.',
  },
  {
    num: '03',
    title: 'Validation & Persistence',
    desc: 'Results are scored for confidence, stored in PostgreSQL, and embedded into vector memory for future retrieval.',
  },
];

const STATS = [
  { value: '4 Agents', label: 'Specialized roles' },
  { value: 'ReAct Loop', label: 'Reason-Act-Observe' },
  { value: '0.7 Threshold', label: 'Confidence scoring' },
  { value: 'FAISS', label: 'Vector memory' },
  { value: 'JSON Plans', label: 'Structured output' },
  { value: 'WebSocket', label: 'Real-time updates' },
];

export default function Pipeline() {
  return (
    <section
      id="pipeline"
      style={{
        width: '100%',
        background: '#131417',
        padding: '140px 40px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Two-column layout */}
        <div
          data-animate
          style={{
            display: 'grid',
            gridTemplateColumns: '55% 45%',
            gap: 60,
            alignItems: 'center',
          }}
        >
          {/* Left: text */}
          <div>
            <span
              data-animate-child
              style={{
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#D4A574',
              }}
            >
              AGENT PIPELINE
            </span>

            <h2
              data-animate-child
              style={{
                fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                fontSize: 'clamp(32px, 4vw, 48px)',
                fontWeight: 400,
                letterSpacing: '-1.92px',
                color: '#F5F3EE',
                marginTop: 16,
                lineHeight: 1.1,
              }}
            >
              Planner. Executor. Analyzer. Memory.
            </h2>

            <p
              data-animate-child
              style={{
                fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                fontSize: 16,
                color: 'rgba(245, 243, 238, 0.55)',
                maxWidth: 500,
                marginTop: 24,
                lineHeight: 1.7,
              }}
            >
              Each agent has a defined role, tool set, and communication
              protocol. The Planner decomposes tasks into structured steps. The
              Executor carries them out via ReAct loops. The Analyzer validates
              outputs and scores confidence. The Memory agent persists context
              across sessions.
            </p>

            {/* Steps */}
            <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 40 }}>
              {STEPS.map((step) => (
                <div key={step.num} data-animate-child>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 14,
                        color: '#D4A574',
                      }}
                    >
                      {step.num}
                    </span>
                    <h3
                      style={{
                        fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                        fontSize: 20,
                        fontWeight: 400,
                        color: '#F5F3EE',
                      }}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                      fontSize: 15,
                      color: 'rgba(245, 243, 238, 0.5)',
                      marginTop: 8,
                      paddingLeft: 36,
                      lineHeight: 1.6,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: agent pipeline artwork — blended into the section bg, no framed image */}
          <div
            data-animate-child
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              minHeight: 500,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '-15%',
                background:
                  'radial-gradient(ellipse 55% 55% at 55% 45%, rgba(212, 165, 116, 0.13) 0%, transparent 70%)',
                filter: 'blur(50px)',
                zIndex: 0,
              }}
            />

            <svg
              viewBox="0 0 520 520"
              width="100%"
              style={{ position: 'relative', zIndex: 1, maxWidth: 480, overflow: 'visible' }}
              aria-label="Planner hands off to Executor, Executor to Analyzer, Analyzer to Memory"
              role="img"
            >
              <defs>
                <filter id="pipeGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="pipeChip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>

              {/* Ambient rings + scattered points, same language as the Architecture diagram */}
              <g opacity="0.5">
                {[70, 130, 190, 250, 310].map((r) => (
                  <circle key={r} cx="330" cy="250" r={r} fill="none" stroke="rgba(245,243,238,0.06)" strokeDasharray="1 7" />
                ))}
              </g>
              {[[60, 40], [460, 70], [40, 260], [480, 220], [70, 460], [440, 480], [220, 20]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="1.6" fill="rgba(212,165,116,0.35)" />
              ))}

              {/* Flowing traces between stages */}
              <g fill="none" stroke="rgba(212,165,116,0.55)" strokeWidth="1.5" strokeLinecap="round" filter="url(#pipeGlow)">
                <path d="M280,98 C280,140 400,120 400,162" />
                <path d="M400,218 C400,260 260,240 260,282" />
                <path d="M260,338 C260,380 380,360 380,402" />
              </g>

              {/* Traveling pulse along the whole hand-off chain */}
              <circle r="3" fill="#F5F3EE" filter="url(#pipeGlow)">
                <animateMotion
                  dur="5s"
                  repeatCount="indefinite"
                  path="M280,70 V98 C280,140 400,120 400,162 V190 V218 C400,260 260,240 260,282 V310 V338 C260,380 380,360 380,402 V430"
                />
              </circle>

              {/* Stage chips */}
              {[
                { id: 'planner', x: 280, y: 70, num: '01', label: 'PLANNER', icon: 'branch' },
                { id: 'executor', x: 400, y: 190, num: '02', label: 'EXECUTOR', icon: 'play' },
                { id: 'analyzer', x: 260, y: 310, num: '03', label: 'ANALYZER', icon: 'bars' },
                { id: 'memory', x: 380, y: 430, num: '04', label: 'MEMORY', icon: 'stack' },
              ].map((chip) => (
                <g key={chip.id} transform={`translate(${chip.x - 60}, ${chip.y - 32})`}>
                  <rect width="120" height="64" rx="12" fill="#131417" stroke="rgba(212,165,116,0.4)" strokeWidth="1" />
                  <rect width="120" height="64" rx="12" fill="url(#pipeChip)" />
                  <text x="12" y="18" fontFamily="'Geist Mono', monospace" fontSize="9" fill="rgba(212,165,116,0.7)">
                    {chip.num}
                  </text>
                  <g transform="translate(48, 16)" stroke="#D4A574" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {chip.icon === 'branch' && (
                      <>
                        <circle cx="12" cy="2" r="1.8" />
                        <circle cx="2" cy="14" r="1.8" />
                        <circle cx="22" cy="14" r="1.8" />
                        <path d="M12 4v4 M12 8 4 12 M12 8l8 4" />
                      </>
                    )}
                    {chip.icon === 'play' && <path d="M4 1 20 9 4 17Z" fill="#D4A574" stroke="none" />}
                    {chip.icon === 'bars' && (
                      <>
                        <path d="M3 16V9 M11 16V3 M19 16v-6" />
                      </>
                    )}
                    {chip.icon === 'stack' && (
                      <>
                        <ellipse cx="11" cy="3" rx="8" ry="2.4" />
                        <path d="M3 3v10c0 1.3 3.6 2.4 8 2.4s8-1.1 8-2.4V3" />
                        <path d="M3 8.3c0 1.3 3.6 2.4 8 2.4s8-1.1 8-2.4" />
                      </>
                    )}
                  </g>
                  <text
                    x="60"
                    y="52"
                    textAnchor="middle"
                    fontFamily="'PP Neue Montreal', system-ui, sans-serif"
                    fontSize="10.5"
                    letterSpacing="0.05em"
                    fill="rgba(245,243,238,0.8)"
                  >
                    {chip.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: 1,
            background: 'rgba(245, 243, 238, 0.08)',
            marginTop: 80,
          }}
        />

        {/* Stats */}
        <div
          data-stats
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 24,
            marginTop: 80,
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.value} data-stat>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#D4A574',
                }}
              >
                {stat.label}
              </span>
              <div
                style={{
                  fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                  fontSize: 28,
                  fontWeight: 400,
                  letterSpacing: '-0.5px',
                  color: '#F5F3EE',
                  marginTop: 8,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
