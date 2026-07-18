import { useCallback } from 'react';

interface NavigationProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function Navigation({ onGetStarted, onLogin }: NavigationProps) {
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
        background: 'rgba(19, 20, 23, 0.85)',
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
          className="nav-logo"
          aria-label="MAP — back to top"
        >
          <span className="nav-logo__letter">M</span>
          <span className="nav-logo__letter">A</span>
          <span className="nav-logo__letter">P</span>
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

          <button onClick={onLogin} className="nav-auth-btn nav-auth-btn--login">
            Log in
          </button>

          <button onClick={onGetStarted} className="nav-auth-btn nav-auth-btn--signup">
            Sign up
          </button>
        </div>
      </div>
    </nav>
  );
}
