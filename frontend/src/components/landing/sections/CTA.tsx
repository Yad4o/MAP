interface CTAProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function CTA({ onGetStarted, onLogin }: CTAProps) {
  return (
    <section
      id="cta"
      style={{
        width: '100%',
        background: '#0b0e11',
        padding: '160px 40px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div data-animate style={{ maxWidth: 900, margin: '0 auto' }}>
        <span
          data-animate-child
          style={{
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#FCD535',
          }}
        >
          START BUILDING
        </span>

        <h2
          data-animate-child
          style={{
            fontFamily: "'BinanceNova', system-ui, sans-serif",
            fontSize: 'clamp(40px, 5vw, 64px)',
            fontWeight: 400,
            letterSpacing: '-2.56px',
            color: '#EAECEF',
            marginTop: 20,
            lineHeight: 1.05,
          }}
        >
          Deploy Intelligent Agents in Minutes.
        </h2>

        <p
          data-animate-child
          style={{
            fontFamily: "'BinanceNova', system-ui, sans-serif",
            fontSize: 18,
            color: 'rgba(234, 236, 239, 0.55)',
            maxWidth: 560,
            margin: '28px auto 0',
            lineHeight: 1.7,
          }}
        >
          Clone the repo, run docker compose up, and submit your first task.
          The entire system — gateway, queue, workers, agents, and fallback —
          comes up ready to orchestrate.
        </p>

        <button
          data-animate-child
          onClick={onGetStarted}
          style={{
            fontFamily: "'BinanceNova', system-ui, sans-serif",
            background: '#FCD535',
            color: '#0b0e11',
            borderRadius: 100,
            padding: '16px 44px',
            fontSize: 17,
            fontWeight: 400,
            letterSpacing: '-0.3px',
            marginTop: 44,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EAECEF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FCD535';
          }}
        >
          Get Started
        </button>

        <div data-animate-child style={{ marginTop: 20, display: 'flex', gap: 24, justifyContent: 'center' }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onLogin();
            }}
            style={{
              fontSize: 14,
              color: 'rgba(234, 236, 239, 0.4)',
              textDecoration: 'none',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = '#EAECEF')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'rgba(234, 236, 239, 0.4)')
            }
          >
            Already have an account? Log in
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              fontSize: 14,
              color: 'rgba(234, 236, 239, 0.4)',
              textDecoration: 'none',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = '#EAECEF')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'rgba(234, 236, 239, 0.4)')
            }
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
