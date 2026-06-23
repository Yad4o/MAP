import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CARDS = [
  { icon: 'grid', title: 'PostgreSQL', subtitle: 'Relational persistence' },
  { icon: 'layers', title: 'Redis', subtitle: 'Queue, cache, locks' },
  { icon: 'zap', title: 'Celery', subtitle: 'Distributed workers' },
  { icon: 'shield', title: 'Circuit Breaker', subtitle: 'Resilient fallback' },
  { icon: 'box', title: 'Docker', subtitle: 'Container orchestration' },
  { icon: 'database', title: 'Vector Store', subtitle: 'FAISS / Chroma' },
  { icon: 'lock', title: 'JWT Auth', subtitle: 'RS256 tokens' },
  { icon: 'activity', title: 'Prometheus', subtitle: 'Metrics & alerts' },
];

function FeatureIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
    layers: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    zap: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    shield: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    box: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    database: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    lock: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    activity: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  };
  return icons[name] || null;
}

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const grid = gridRef.current;
    if (!section || !scene || !grid) return;

    let mouseX = 0;
    let mouseY = 0;
    let targetRotateX = 0;
    let targetRotateY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    document.addEventListener('mousemove', onMouseMove);

    const ticker = () => {
      targetRotateY = mouseX * 15;
      targetRotateX = -mouseY * 10;
      gsap.set(scene, { rotateX: targetRotateX, rotateY: targetRotateY });
    };
    gsap.ticker.add(ticker);

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=150%',
      pin: true,
      scrub: 1.5,
      onUpdate: (self) => {
        const progress = self.progress;
        gsap.set(grid, { z: -1000 + progress * 2500 });
      },
    });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      gsap.ticker.remove(ticker);
      st.kill();
    };
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#0C1222',
        overflow: 'hidden',
        perspective: 1000,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Content overlay */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 60,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#D4A574',
            }}
          >
            THE SYSTEM
          </span>
          <h2
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
            Built for Scale
          </h2>
          <p
            style={{
              fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
              fontSize: 16,
              color: 'rgba(245, 243, 238, 0.55)',
              maxWidth: 400,
              marginTop: 20,
              lineHeight: 1.6,
            }}
          >
            Every component designed for production workloads — async task
            queues, distributed locks, circuit breakers, and vector memory.
          </p>
          <a
            href="#architecture"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('architecture')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              display: 'inline-block',
              marginTop: 24,
              fontSize: 14,
              color: '#D4A574',
              borderBottom: '1px solid #D4A574',
              paddingBottom: 2,
              textDecoration: 'none',
              transition: 'opacity 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            View Documentation
          </a>
        </div>
      </div>

      {/* 3D Card scene */}
      <div
        ref={sceneRef}
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 20vw)',
            gridTemplateRows: 'repeat(2, 20vw)',
            gap: '2vw',
            transformStyle: 'preserve-3d',
            transform: 'translateZ(-1000px)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {CARDS.map((card, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(245, 243, 238, 0.05)',
                border: '1px solid rgba(245, 243, 238, 0.1)',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                transformStyle: 'preserve-3d',
                transition:
                  'transform 0.3s ease, border-color 0.3s ease, background 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateZ(20px) scale(1.02)';
                e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.4)';
                e.currentTarget.style.background = 'rgba(245, 243, 238, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateZ(0) scale(1)';
                e.currentTarget.style.borderColor =
                  'rgba(245, 243, 238, 0.1)';
                e.currentTarget.style.background = 'rgba(245, 243, 238, 0.05)';
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <FeatureIcon name={card.icon} />
              </div>
              <h3
                style={{
                  fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: '-0.3px',
                  color: '#F5F3EE',
                  margin: 0,
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 12,
                  color: 'rgba(245, 243, 238, 0.4)',
                  marginTop: 6,
                  letterSpacing: '0.02em',
                }}
              >
                {card.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
