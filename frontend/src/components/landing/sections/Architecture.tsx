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
        background: '#0b0e11',
        padding: '120px 24px',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: 1200, width: '100%' }}>
        <div
          data-animate
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 80,
            alignItems: 'center',
          }}
        >
          {/* Left: text */}
          <div>
            <span
              data-animate-child
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#FCD535',
              }}
            >
              INFRASTRUCTURE
            </span>

            <h2
              data-animate-child
              style={{
                fontFamily: "'BinanceNova', system-ui, sans-serif",
                fontSize: 'clamp(32px, 4vw, 48px)',
                fontWeight: 600,
                letterSpacing: '-1px',
                color: '#EAECEF',
                marginTop: 16,
                lineHeight: 1.1,
              }}
            >
              Every Layer, Purpose-Built.
            </h2>

            <p
              data-animate-child
              style={{
                fontFamily: "'BinanceNova', system-ui, sans-serif",
                fontSize: 18,
                color: 'rgba(234, 236, 239, 0.65)',
                marginTop: 24,
                lineHeight: 1.6,
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 32,
                marginTop: 48,
              }}
            >
              {TECH_STACK.map((tech) => (
                <div key={tech.name}>
                  <div
                    style={{
                      fontFamily: "'BinanceNova', system-ui, sans-serif",
                      fontSize: 16,
                      fontWeight: 500,
                      color: '#EAECEF',
                    }}
                  >
                    {tech.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 13,
                      color: 'rgba(234, 236, 239, 0.45)',
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
          <div
            data-animate-child
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              background: 'rgba(234, 236, 239, 0.02)',
              border: '1px solid rgba(234, 236, 239, 0.08)',
              borderRadius: 8,
              padding: 40,
            }}
          >
            <img
              src="/images/img-diagram.jpg"
              alt="System architecture diagram"
              style={{
                width: '100%',
                maxWidth: 480,
                objectFit: 'contain',
                opacity: 0.9,
                pointerEvents: 'none',
                userSelect: 'none',
                filter: 'grayscale(30%) contrast(1.1)',
                display: 'block',
                position: 'relative',
                zIndex: 1,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
