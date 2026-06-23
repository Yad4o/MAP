import { useEffect, useRef } from 'react';

const GLYPHS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>/\\|{}[]~^';

interface Column {
  posY: number;
  speed: number;
  length: number;
  glyphSet: string[];
  activeGlyph: number;
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridWidth = 30;
    const gridHeight = 40;
    const glyphSize = 20;
    const gridGap = 2;
    const speed = 0.5;
    const rgb = [245 / 255, 243 / 255, 238 / 255];
    const darkRgb = [0.03, 0.03, 0.03];

    let animId: number;
    let prevTime = 0;

    const columns: Column[] = [];
    for (let col = 0; col < gridWidth; col++) {
      const glyphSet: string[] = [];
      for (let g = 0; g < 5; g++) {
        glyphSet.push(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
      }
      columns.push({
        posY: Math.random() * gridHeight - 10,
        speed: 0.3 + Math.random() * 0.9,
        length: 5 + Math.floor(Math.random() * 20),
        glyphSet,
        activeGlyph: 0,
      });
    }

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function tick(time: number) {
      time *= 0.001;
      const dt = time - prevTime;
      prevTime = time;
      const timeMs = time * 1000;

      const w = canvas!.width;
      const h = canvas!.height;

      const cellW = glyphSize + gridGap;
      const cellH = glyphSize + gridGap;
      const totalWidth = gridWidth * cellW;
      const totalHeight = gridHeight * cellH;
      const startX = (w - totalWidth) / 2;
      const startY = (h - totalHeight) / 2;

      // Clear with deep navy
      ctx!.fillStyle = '#0C1222';
      ctx!.fillRect(0, 0, w, h);

      ctx!.font = `${glyphSize}px 'Geist Mono', monospace`;
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';

      for (let col = 0; col < gridWidth; col++) {
        const column = columns[col];
        column.posY += column.speed * dt * speed;
        if (column.posY >= gridHeight + column.length) {
          column.posY = -column.length;
          column.speed = 0.3 + Math.random() * 0.9;
          column.length = 5 + Math.floor(Math.random() * 20);
        }
        const headCell = Math.floor(column.posY);
        column.activeGlyph = Math.floor(timeMs / 100) % column.glyphSet.length;

        const glyphOffset = (timeMs % 1000) / 1000;

        for (let row = 0; row < gridHeight; row++) {
          const x = startX + col * cellW + cellW / 2;
          const y =
            startY + (row - glyphOffset) * cellH + cellH / 2;

          let inTrail = false;
          if (headCell >= 0) {
            for (let trail = 0; trail < column.length; trail++) {
              if (row === (headCell - trail + gridHeight) % gridHeight) {
                inTrail = true;
                break;
              }
            }
          }

          if (inTrail) {
            if (row === headCell) {
              // Head - bright
              ctx!.fillStyle = `rgba(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)}, 0.7)`;
              ctx!.fillText(column.glyphSet[column.activeGlyph], x, y);
            } else {
              // Trail - dim
              ctx!.fillStyle = `rgba(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)}, 0.08)`;
              ctx!.fillText(column.glyphSet[0], x, y);
            }
          } else {
            // Background - very dim dots
            ctx!.fillStyle = `rgba(${Math.round(darkRgb[0] * 255)}, ${Math.round(darkRgb[1] * 255)}, ${Math.round(darkRgb[2] * 255)}, 0.15)`;
            ctx!.fillText('.', x, y);
          }
        }
      }

      // Bloom/glow effect: draw semi-transparent overlay
      ctx!.globalCompositeOperation = 'screen';
      for (let col = 0; col < gridWidth; col++) {
        const column = columns[col];
        const headCell = Math.floor(column.posY);
        if (headCell >= 0 && headCell < gridHeight) {
          const x = startX + col * cellW + cellW / 2;
          const y = startY + headCell * cellH + cellH / 2;
          const gradient = ctx!.createRadialGradient(x, y, 0, x, y, cellH * 3);
          gradient.addColorStop(0, 'rgba(245, 243, 238, 0.15)');
          gradient.addColorStop(1, 'rgba(245, 243, 238, 0)');
          ctx!.fillStyle = gradient;
          ctx!.fillRect(x - cellH * 3, y - cellH * 3, cellH * 6, cellH * 6);
        }
      }
      ctx!.globalCompositeOperation = 'source-over';

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section
      id="hero"
      className="hero"
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <canvas
        id="matrix-canvas"
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />

      {/* Hero image bottom-right */}
      <img
        src="/images/img-hero.jpg"
        alt="Server infrastructure"
        style={{
          position: 'absolute',
          right: 60,
          bottom: 80,
          width: 420,
          borderRadius: 8,
          opacity: 0.85,
          mixBlendMode: 'screen',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Hero content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          height: '100%',
          paddingLeft: 60,
          paddingBottom: 80,
          maxWidth: 700,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#D4A574',
            marginBottom: 24,
          }}
        >
          MULTI-AGENT ORCHESTRATION
        </span>

        <h1
          className="display-heading"
          style={{
            textShadow: '0 2px 40px rgba(12, 18, 34, 0.8)',
          }}
        >
          <span style={{ display: 'block' }}>Intelligence,</span>
          <span style={{ display: 'block' }}>Decomposed.</span>
        </h1>

        <p
          style={{
            fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
            fontSize: 18,
            fontWeight: 400,
            color: 'rgba(245, 243, 238, 0.65)',
            maxWidth: 520,
            marginTop: 28,
            lineHeight: 1.6,
          }}
        >
          A production-grade distributed system that automates complex,
          multi-step workflows by routing tasks through specialized AI agents —
          each with defined roles, tool sets, and communication protocols.
        </p>

        <button
          onClick={() => {
            document
              .getElementById('features')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            fontFamily: "'PP Neue Montreal', system-ui, sans-serif",
            background: '#F5F3EE',
            color: '#0C1222',
            borderRadius: 100,
            padding: '14px 36px',
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: '-0.3px',
            marginTop: 40,
            border: 'none',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D4A574';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F5F3EE';
          }}
        >
          Explore the Architecture
        </button>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'rgba(245, 243, 238, 0.3)',
          }}
        >
          Scroll
        </span>
        <div
          style={{
            width: 1,
            height: 40,
            background: 'rgba(245, 243, 238, 0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: '#D4A574',
              position: 'absolute',
              left: -1,
              animation: 'scrollDot 2s ease-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes scrollDot {
          0% { top: 0; opacity: 1; }
          100% { top: 20px; opacity: 0; }
        }
      `}</style>
    </section>
  );
}
