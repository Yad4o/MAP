const TECH_STACK = [
  { name: 'FastAPI', version: '0.115+' },
  { name: 'PostgreSQL', version: '16+' },
  { name: 'Redis', version: '7.2+' },
  { name: 'Celery', version: '5.4+' },
  { name: 'React', version: '18+' },
  { name: 'BentoML', version: '1.3+' },
];

export default function Architecture() {
  return (
    <section
      id="architecture"
      className="landing-section"
      style={{
        width: '100%',
        background: '#131417',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div
          data-animate
          className="split-grid"
          style={{
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
              INFRASTRUCTURE
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
              Every Layer, Purpose-Built.
            </h2>

            <p
              data-animate-child
              style={{
                fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                fontSize: 16,
                color: 'rgba(245, 243, 238, 0.55)',
                maxWidth: 480,
                marginTop: 24,
                lineHeight: 1.7,
              }}
            >
              React dashboard on port 3000. Nginx reverse proxy with TLS
              termination. FastAPI gateway with JWT validation and rate limiting.
              Redis-backed Celery queues. PostgreSQL for tasks, users, and logs.
              BentoML for local LLM fallback. Prometheus and Grafana for
              observability.
            </p>

            {/* Tech stack grid */}
            <div
              data-animate-child
              className="tech-stack-grid"
              style={{
                marginTop: 48,
              }}
            >
              {TECH_STACK.map((tech) => (
                <div key={tech.name}>
                  <div
                    style={{
                      fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                      fontSize: 15,
                      fontWeight: 400,
                      color: '#F5F3EE',
                    }}
                  >
                    {tech.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                      color: 'rgba(245, 243, 238, 0.35)',
                      marginTop: 4,
                    }}
                  >
                    {tech.version}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: diagram — blended straight into the section bg, no framed image */}
          <div
            data-animate-child
            className="diagram-wrap"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Ambient wash — same gold as the diagram traces, spread wide so it reads as part of the page, not a halo behind a card */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '-15%',
                background:
                  'radial-gradient(ellipse 60% 55% at 60% 45%, rgba(212, 165, 116, 0.14) 0%, transparent 70%)',
                filter: 'blur(50px)',
                zIndex: 0,
              }}
            />

            <svg
              viewBox="0 0 560 600"
              width="100%"
              style={{ position: 'relative', zIndex: 1, maxWidth: 560, overflow: 'visible' }}
              aria-label="Client request flowing through Nginx, FastAPI, Redis, PostgreSQL, Celery, Agents and the LLM fallback layer"
              role="img"
            >
              <defs>
                <filter id="archGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="archChip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <radialGradient id="archRings" cx="50%" cy="45%" r="65%">
                  <stop offset="0%" stopColor="rgba(245,243,238,0.10)" />
                  <stop offset="100%" stopColor="rgba(245,243,238,0)" />
                </radialGradient>
              </defs>

              {/* Ambient ring grid + scattered points, echoes the hero dot-grid so it reads as one system */}
              <g opacity="0.5">
                {[80, 140, 200, 260, 320].map((r) => (
                  <circle
                    key={r}
                    cx="330"
                    cy="300"
                    r={r}
                    fill="none"
                    stroke="rgba(245,243,238,0.06)"
                    strokeDasharray="1 7"
                  />
                ))}
              </g>
              {[
                [60, 60], [500, 90], [40, 340], [520, 300], [70, 520], [510, 520],
                [230, 30], [430, 560], [30, 220], [545, 190],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="1.6" fill="rgba(212,165,116,0.35)" />
              ))}

              {/* Traces — drawn first so chips sit on top of the wire ends */}
              <g
                fill="none"
                stroke="rgba(212,165,116,0.55)"
                strokeWidth="1.5"
                strokeLinecap="round"
                filter="url(#archGlow)"
              >
                <path d="M410,68 V102 H320 V122" />
                <path d="M430,68 V92 H480 V122" />
                <path d="M320,178 V222 H140 V252" />
                <path d="M320,178 V222 H270 V252" />
                <path d="M480,178 V222 H400 V252" />
                <path d="M480,178 V222 H520 V252" />
                <path d="M270,308 V350 H335 V382" />
                <path d="M400,308 V350 H335" />
                <path d="M140,308 V480 H300 V502" />
                <path d="M335,438 V502" />
                <path d="M520,308 V480 H370 V502" />
              </g>

              {/* Traveling pulse — a single light animating along the main spine for a sense of live traffic */}
              <circle r="3" fill="#F5F3EE" filter="url(#archGlow)">
                <animateMotion
                  dur="4.5s"
                  repeatCount="indefinite"
                  path="M420,40 V68 V102 H320 V122 V178 V222 H270 V252 V308 V350 H335 V382 V410 V438 V502 V530"
                />
              </circle>

              {/* Chips */}
              {[
                { id: 'client', x: 420, y: 40, label: 'CLIENT', icon: 'user' },
                { id: 'nginx', x: 320, y: 150, label: 'NGINX', icon: 'gateway' },
                { id: 'fastapi', x: 480, y: 150, label: 'FASTAPI', icon: 'bolt' },
                { id: 'redis', x: 140, y: 280, label: 'REDIS', icon: 'cube' },
                { id: 'postgresql', x: 270, y: 280, label: 'POSTGRESQL', icon: 'db' },
                { id: 'celery1', x: 400, y: 280, label: 'CELERY', icon: 'queue' },
                { id: 'agents', x: 520, y: 280, label: 'AGENTS', icon: 'node' },
                { id: 'celery2', x: 335, y: 410, label: 'CELERY', icon: 'queue' },
                { id: 'llm', x: 335, y: 530, label: 'LLM', icon: 'brain' },
              ].map((chip) => (
                <g key={chip.id} transform={`translate(${chip.x - 52}, ${chip.y - 28})`}>
                  <rect
                    width="104"
                    height="56"
                    rx="10"
                    fill="#131417"
                    stroke="rgba(212,165,116,0.4)"
                    strokeWidth="1"
                  />
                  <rect width="104" height="56" rx="10" fill="url(#archChip)" />
                  <g transform="translate(14, 12)" stroke="#D4A574" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {chip.icon === 'user' && (
                      <>
                        <circle cx="7" cy="4.5" r="3.2" />
                        <path d="M1 15c0-4 4-6 6-6s6 2 6 6" />
                      </>
                    )}
                    {chip.icon === 'gateway' && (
                      <>
                        <rect x="0.5" y="1" width="13" height="5" rx="1.5" />
                        <rect x="0.5" y="8" width="13" height="5" rx="1.5" />
                      </>
                    )}
                    {chip.icon === 'bolt' && <path d="M8 0 1 9h5l-1 8 8-10H8l1-7Z" fill="#D4A574" stroke="none" />}
                    {chip.icon === 'cube' && (
                      <path d="M7 0 13 3.5V10.5L7 14 1 10.5V3.5Z M1 3.5 7 7 13 3.5 M7 7V14" />
                    )}
                    {chip.icon === 'db' && (
                      <>
                        <ellipse cx="7" cy="2.6" rx="6.5" ry="2.2" />
                        <path d="M0.5 2.6V12c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2V2.6" />
                        <path d="M0.5 7.3c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2" />
                      </>
                    )}
                    {chip.icon === 'queue' && (
                      <>
                        <rect x="0.5" y="0.5" width="13" height="3.2" rx="1" />
                        <rect x="0.5" y="5.6" width="13" height="3.2" rx="1" />
                        <rect x="0.5" y="10.7" width="13" height="3.2" rx="1" />
                      </>
                    )}
                    {chip.icon === 'node' && (
                      <>
                        <circle cx="7" cy="7" r="2.6" />
                        <circle cx="1.5" cy="1.5" r="1.5" />
                        <circle cx="12.5" cy="1.5" r="1.5" />
                        <circle cx="1.5" cy="12.5" r="1.5" />
                        <circle cx="12.5" cy="12.5" r="1.5" />
                        <path d="M3 3 5.3 5.3 M11 3 8.7 5.3 M3 11 5.3 8.7 M11 11 8.7 8.7" />
                      </>
                    )}
                    {chip.icon === 'brain' && (
                      <path d="M5 0.5c-2 0-3.2 1.4-3.2 3 0 .6.2 1.1.5 1.5-.9.4-1.6 1.4-1.6 2.5 0 1 .6 1.9 1.4 2.3-.1.3-.2.7-.2 1.1 0 1.7 1.4 3.1 3.1 3.1M9 0.5c2 0 3.2 1.4 3.2 3 0 .6-.2 1.1-.5 1.5.9.4 1.6 1.4 1.6 2.5 0 1-.6 1.9-1.4 2.3.1.3.2.7.2 1.1 0 1.7-1.4 3.1-3.1 3.1M7 1v13" />
                    )}
                  </g>
                  <text
                    x="52"
                    y="44"
                    textAnchor="middle"
                    fontFamily="'PP Neue Montreal', system-ui, sans-serif"
                    fontSize="9.5"
                    letterSpacing="0.04em"
                    fill="rgba(245,243,238,0.8)"
                  >
                    {chip.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
