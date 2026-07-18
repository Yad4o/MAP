export default function Footer() {
  return (
    <footer
      style={{
        width: '100%',
        background: '#0d0e10',
        padding: '80px 40px 40px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 40,
          }}
        >
          {/* Left: brand */}
          <div>
            <div
              style={{
                fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                fontSize: 20,
                fontWeight: 400,
                color: '#F5F3EE',
              }}
            >
              Map
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(245, 243, 238, 0.3)',
                marginTop: 8,
              }}
            >
              Multi-Agent Orchestration
            </div>
          </div>

          {/* Center: nav links */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {['Features', 'Pipeline', 'Docs', 'Pricing'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={(e) => {
                  e.preventDefault();
                  const id = link === 'Docs' ? 'architecture' : link === 'Pricing' ? 'cta' : link.toLowerCase();
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  fontSize: 14,
                  color: 'rgba(245, 243, 238, 0.4)',
                  textDecoration: 'none',
                  lineHeight: 2.2,
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = '#F5F3EE')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'rgba(245, 243, 238, 0.4)')
                }
              >
                {link}
              </a>
            ))}
          </div>

          {/* Right: external links */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {['GitHub', 'Docker Hub', 'API Reference'].map((link) => (
              <a
                key={link}
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontSize: 14,
                  color: 'rgba(245, 243, 238, 0.4)',
                  textDecoration: 'none',
                  lineHeight: 2.2,
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = '#F5F3EE')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'rgba(245, 243, 238, 0.4)')
                }
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: 60,
            paddingTop: 24,
            borderTop: '1px solid rgba(245, 243, 238, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: 'rgba(245, 243, 238, 0.25)' }}>
            2025 Map. All rights reserved.
          </span>
          <span style={{ fontSize: 12, color: 'rgba(245, 243, 238, 0.25)' }}>
            Built with FastAPI, React, and Redis.
          </span>
        </div>
      </div>
    </footer>
  );
}
