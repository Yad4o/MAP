import React from 'react';
import { 
  Search, 
  Code, 
  FileText, 
  ActivitySquare, 
  Headphones, 
  PenTool 
} from 'lucide-react';

const USE_CASES = [
  {
    icon: Search,
    title: 'Automated Research',
    body: 'Decompose a topic into search, summarize, compare, and conclude steps. Each phase handled by the right agent with the right tools.',
  },
  {
    icon: Code,
    title: 'Code Review',
    body: 'Analyze repositories for anti-patterns, security issues, and improvements. The Executor runs static analysis tools; the Analyzer scores findings.',
  },
  {
    icon: FileText,
    title: 'Document Processing',
    body: 'Extract, cross-reference, and flag compliance issues in legal and regulatory documents. Memory retrieves precedent cases automatically.',
  },
  {
    icon: ActivitySquare,
    title: 'Pipeline Monitoring',
    body: 'Parse logs, detect anomalies, correlate errors, and generate root cause reports. Real-time alerts via WebSocket to your dashboard.',
  },
  {
    icon: Headphones,
    title: 'Customer Support',
    body: 'Classify intent, retrieve from knowledge base, draft responses, and escalate when confidence is below threshold. Fully autonomous.',
  },
  {
    icon: PenTool,
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
        background: '#0b0e11',
        padding: '120px 24px',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: 1200, width: '100%' }}>
        <div style={{ marginBottom: 64 }}>
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#FCD535',
              display: 'block',
            }}
          >
            USE CASES
          </span>
        </div>

        <div
          data-usecases
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {USE_CASES.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <div
                key={i}
                className="surface-card"
                data-usecase-card
                style={{
                  background: 'rgba(234, 236, 239, 0.02)',
                  border: '1px solid rgba(234, 236, 239, 0.08)',
                  borderRadius: 8,
                  padding: 40,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(252, 213, 53, 0.4)';
                  e.currentTarget.style.background = 'rgba(234, 236, 239, 0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(234, 236, 239, 0.08)';
                  e.currentTarget.style.background = 'rgba(234, 236, 239, 0.02)';
                }}
              >
                <div style={{ marginBottom: 24 }}>
                  <Icon strokeWidth={1.5} size={28} color="#FCD535" />
                </div>
                <h3
                  style={{
                    fontFamily: "'BinanceNova', system-ui, sans-serif",
                    fontSize: 20,
                    fontWeight: 500,
                    color: '#EAECEF',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {uc.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'BinanceNova', system-ui, sans-serif",
                    fontSize: 15,
                    color: 'rgba(234, 236, 239, 0.55)',
                    marginTop: 12,
                    lineHeight: 1.6,
                  }}
                >
                  {uc.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
