import { useCallback } from 'react';

interface NavigationProps {
  onGetStarted: () => void;
}

export default function Navigation({ onGetStarted }: NavigationProps) {
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(12, 18, 34, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(245, 243, 238, 0.06)',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 40px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: '-0.5px',
            color: '#F5F3EE',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Map
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'Features', id: 'features' },
              { label: 'Pipeline', id: 'pipeline' },
              { label: 'Docs', id: 'architecture' },
              { label: 'Pricing', id: 'cta' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="nav-link"
                style={{
                  fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: 'rgba(245, 243, 238, 0.6)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease',
                  padding: 0,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = '#F5F3EE')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'rgba(245, 243, 238, 0.6)')
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={onGetStarted}
            style={{
              fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
              border: '1px solid rgba(245, 243, 238, 0.3)',
              borderRadius: 100,
              padding: '8px 24px',
              fontSize: 14,
              color: '#F5F3EE',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F5F3EE';
              e.currentTarget.style.color = '#0C1222';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#F5F3EE';
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}
