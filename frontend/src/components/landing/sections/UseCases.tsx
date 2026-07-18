const USE_CASES = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
    title: 'Automated Research',
    body: 'Decompose a topic into search, summarize, compare, and conclude steps. Each phase handled by the right agent with the right tools.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: 'Code Review',
    body: 'Analyze repositories for anti-patterns, security issues, and improvements. The Executor runs static analysis tools; the Analyzer scores findings.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'Document Processing',
    body: 'Extract, cross-reference, and flag compliance issues in legal and regulatory documents. Memory retrieves precedent cases automatically.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: 'Pipeline Monitoring',
    body: 'Parse logs, detect anomalies, correlate errors, and generate root cause reports. Real-time alerts via WebSocket to your dashboard.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
    title: 'Customer Support',
    body: 'Classify intent, retrieve from knowledge base, draft responses, and escalate when confidence is below threshold. Fully autonomous.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    title: 'Content Generation',
    body: 'Research audiences, generate copy variants, analyze compliance — all through a coordinated multi-agent pipeline with human oversight gates.',
  },
];

export default function UseCases() {
  return (
    <section
      id="usecases"
      style={{
        width: '100%',
        background: '#131417',
        padding: '140px 40px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#D4A574',
            marginBottom: 48,
            display: 'block',
          }}
        >
          USE CASES
        </span>

        <div
          data-usecases
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 32,
          }}
        >
          {USE_CASES.map((uc, i) => (
            <div
              key={i}
              data-usecase-card
              style={{
                background: 'rgba(245, 243, 238, 0.05)',
                border: '1px solid rgba(245, 243, 238, 0.1)',
                borderRadius: 12,
                padding: 40,
                transition:
                  'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow =
                  '0 12px 40px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(245, 243, 238, 0.1)';
              }}
            >
              {uc.icon}
              <h3
                style={{
                  fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: '-0.48px',
                  color: '#F5F3EE',
                  marginTop: 20,
                  lineHeight: 1.3,
                }}
              >
                {uc.title}
              </h3>
              <p
                style={{
                  fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                  fontSize: 15,
                  color: 'rgba(245, 243, 238, 0.55)',
                  marginTop: 12,
                  lineHeight: 1.6,
                }}
              >
                {uc.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
