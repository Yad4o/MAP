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
      style={{
        width: '100%',
        background: '#0C1222',
        padding: '140px 40px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div
          data-animate
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
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
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
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

          {/* Right: diagram */}
          <div data-animate-child>
            <img
              src="/images/img-diagram.jpg"
              alt="System architecture diagram"
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(245, 243, 238, 0.08)',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
