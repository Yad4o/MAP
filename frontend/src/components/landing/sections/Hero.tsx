import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [subtitleRef.current, titleRef.current, descRef.current, btnRef.current],
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        background: '#0b0e11',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Stark background: Subtle grid + faint radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(234, 236, 239, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(234, 236, 239, 0.03) 1px, transparent 1px)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80vw',
          height: '80vw',
          maxWidth: '800px',
          maxHeight: '800px',
          background: 'radial-gradient(circle, rgba(252, 213, 53, 0.05) 0%, rgba(11, 14, 17, 0) 70%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Hero content - centered, high contrast */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: 900,
          marginTop: -60, // Slight optical adjustment upwards
        }}
      >
        <span
          ref={subtitleRef}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#FCD535',
            marginBottom: 24,
            padding: '6px 12px',
            background: 'rgba(252, 213, 53, 0.1)',
            borderRadius: 100,
            border: '1px solid rgba(252, 213, 53, 0.2)',
          }}
        >
          Infrastructure for Agentic Systems
        </span>

        <h1
          ref={titleRef}
          className="display-heading"
          style={{
            textShadow: '0 2px 20px rgba(11, 14, 17, 0.8)',
            marginBottom: 28,
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: '-1.5px',
          }}
        >
          <span style={{ display: 'block' }}>Ship agentic pipelines without</span>
          <span style={{ display: 'block', color: 'rgba(234, 236, 239, 0.8)' }}>babysitting the orchestration.</span>
        </h1>

        <p
          ref={descRef}
          style={{
            fontFamily: "'BinanceNova', system-ui, sans-serif",
            fontSize: 20,
            fontWeight: 400,
            color: 'rgba(234, 236, 239, 0.65)',
            maxWidth: 680,
            lineHeight: 1.6,
            marginBottom: 48,
          }}
        >
          A production-grade engine that routes tasks, enforces timeouts, and manages state across specialized AI agents—so you can focus on building intelligent features, not distributed systems.
        </p>

        <button
          ref={btnRef}
          onClick={() => {
            document
              .getElementById('features')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            fontFamily: "'BinanceNova', system-ui, sans-serif",
            background: '#EAECEF',
            color: '#0b0e11',
            borderRadius: 6,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '-0.2px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px 0 rgba(234, 236, 239, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FCD535';
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(252, 213, 53, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#EAECEF';
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(234, 236, 239, 0.15)';
          }}
        >
          Explore the Architecture
        </button>
      </div>
    </section>
  );
}
