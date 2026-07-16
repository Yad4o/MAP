import { useEffect, useRef } from 'react';

export default function Fallback() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const turbulence = document.getElementById(
      'turbulence-liquid'
    ) as unknown as SVGFETurbulenceElement;
    const displacement = document.getElementById(
      'displacement-liquid'
    ) as unknown as SVGFEDisplacementMapElement;
    if (!turbulence || !displacement) return;

    let targetScale = 0;
    let currentScale = 0;
    let currentBaseFreq = 0.015;
    let rafId: number;

    const onMouseMove = () => {
      targetScale = 40;
      cancelAnimationFrame(rafId);
      updateDistort();
    };

    const onMouseLeave = () => {
      targetScale = 0;
    };

    function updateDistort() {
      currentScale += (targetScale - currentScale) * 0.08;
      if (Math.abs(targetScale - currentScale) < 0.5) {
        targetScale = 0;
      }
      currentBaseFreq += (0.015 - currentBaseFreq) * 0.05;
      displacement.setAttribute('scale', String(currentScale));
      turbulence.setAttribute(
        'baseFrequency',
        `${currentBaseFreq} ${currentBaseFreq}`
      );
      if (currentScale > 0.5) {
        rafId = requestAnimationFrame(updateDistort);
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="fallback"
      ref={sectionRef}
      style={{
        width: '100%',
        background: '#F5F3EE',
        padding: '140px 40px',
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden',
      }}
    >
      {/* SVG Filter Definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter
            id="liquid-distort"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              id="turbulence-liquid"
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves={3}
              result="warp"
            />
            <feOffset
              id="offset-liquid"
              dx="0"
              dy="0"
              result="warpOffset"
            />
            <feDisplacementMap
              id="displacement-liquid"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
              in="SourceGraphic"
              in2="warpOffset"
            />
          </filter>
        </defs>
      </svg>

      <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
        <div
          data-animate
          style={{ maxWidth: 560 }}
        >
          <span
            data-animate-child
            style={{
              fontSize: 12,
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#D4A574',
            }}
          >
            RESILIENCE
          </span>

          <h2
            data-animate-child
            style={{
              fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 400,
              letterSpacing: '-1.92px',
              color: '#0C1222',
              marginTop: 16,
              lineHeight: 1.1,
            }}
          >
            When APIs Fail, You Don't.
          </h2>

          <p
            data-animate-child
            style={{
              fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
              fontSize: 16,
              color: 'rgba(12, 18, 34, 0.55)',
              maxWidth: 560,
              marginTop: 24,
              lineHeight: 1.7,
            }}
          >
            A circuit breaker wraps every LLM call. Three failures in 60
            seconds triggers automatic failover to a local BentoML instance
            running Mistral-7B. The system recovers transparently — your agents
            never stop executing.
          </p>

          <button
            data-animate-child
            onClick={() => {
              document
                .getElementById('architecture')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
              border: '1px solid #0C1222',
              color: '#0C1222',
              borderRadius: 100,
              padding: '12px 32px',
              fontSize: 15,
              marginTop: 36,
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0C1222';
              e.currentTarget.style.color = '#F5F3EE';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#0C1222';
            }}
          >
            View Fallback Docs
          </button>
        </div>

        {/* Distorted image */}
        <img
          src="/images/img-fallback.jpg"
          alt="Fallback system visualization"
          className="distort-image"
          data-animate-child
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 500,
            height: 500,
            objectFit: 'cover',
            borderRadius: '50%',
            filter: 'url(#liquid-distort)',
            boxShadow: '0 20px 80px rgba(12, 18, 34, 0.15)',
          }}
        />
      </div>
    </section>
  );
}
