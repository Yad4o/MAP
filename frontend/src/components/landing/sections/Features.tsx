import React from 'react';
import { 
  Database, 
  Layers, 
  Zap, 
  Shield, 
  Box, 
  Binary, 
  Key, 
  Activity 
} from 'lucide-react';

const CARDS = [
  { icon: Database, title: 'PostgreSQL', subtitle: 'Relational persistence' },
  { icon: Layers, title: 'Redis', subtitle: 'Queue, cache, locks' },
  { icon: Zap, title: 'Celery', subtitle: 'Distributed workers' },
  { icon: Shield, title: 'Circuit Breaker', subtitle: 'Resilient fallback' },
  { icon: Box, title: 'Docker', subtitle: 'Container orchestration' },
  { icon: Binary, title: 'Vector Store', subtitle: 'FAISS / Chroma' },
  { icon: Key, title: 'JWT Auth', subtitle: 'RS256 tokens' },
  { icon: Activity, title: 'Prometheus', subtitle: 'Metrics & alerts' },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        background: '#0b0e11',
        padding: '120px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Header Content */}
      <div style={{ maxWidth: 1200, width: '100%', marginBottom: 64 }}>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#FCD535',
          }}
        >
          THE SYSTEM
        </span>
        <h2
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
          Built for Scale
        </h2>
        <p
          style={{
            fontFamily: "'BinanceNova', system-ui, sans-serif",
            fontSize: 18,
            color: 'rgba(234, 236, 239, 0.65)',
            maxWidth: 500,
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          Every component designed for production workloads — async task
          queues, distributed locks, circuit breakers, and vector memory.
        </p>
      </div>

      {/* Grid of Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          maxWidth: 1200,
          width: '100%',
        }}
      >
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="surface-card"
              style={{
                borderRadius: 8,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                border: '1px solid rgba(234, 236, 239, 0.08)',
                background: 'rgba(234, 236, 239, 0.02)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
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
                  fontSize: 18,
                  fontWeight: 500,
                  color: '#EAECEF',
                  margin: 0,
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 13,
                  color: 'rgba(234, 236, 239, 0.45)',
                  marginTop: 8,
                  letterSpacing: '0.01em',
                }}
              >
                {card.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
