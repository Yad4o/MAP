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

          {/* Right: agent pipeline artwork */}
          <div
            data-animate-child
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/images/img-pipeline.jpg"
              alt="Planner, Executor, Analyzer, Memory agent pipeline"
              style={{
                width: '100%',
                maxWidth: 520,
                objectFit: 'contain',
                opacity: 0.93,
                animation: 'pipelineFloat 6s ease-in-out infinite',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
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

      <style>{`
        @keyframes pipelineFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </section>
  );
}
