interface NavigationProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function Navigation({ onGetStarted, onLogin }: NavigationProps) {
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
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
