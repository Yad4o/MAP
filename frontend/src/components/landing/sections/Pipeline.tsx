const STEPS = [
  {
    num: '01',
    title: 'Task Decomposition',
    desc: 'High-level requests are broken into discrete subtasks with dependency graphs and expected output schemas.',
  },
  {
    num: '02',
    title: 'Agent Execution',
    desc: 'Each subtask is routed to the appropriate agent with tool access, timeout enforcement, and iterative reasoning.',
  },
  {
    num: '03',
    title: 'Validation & Persistence',
    desc: 'Results are scored for confidence, stored in PostgreSQL, and embedded into vector memory for future retrieval.',
  },
];

const STATS = [
  { value: '4 Agents', label: 'Specialized roles' },
  { value: 'ReAct Loop', label: 'Reason-Act-Observe' },
  { value: '0.7 Threshold', label: 'Confidence scoring' },
  { value: 'FAISS', label: 'Vector memory' },
  { value: 'JSON Plans', label: 'Structured output' },
  { value: 'WebSocket', label: 'Real-time updates' },
];

export default function Pipeline() {
  return (
    <section
      id="pipeline"
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
        {/* Two-column layout */}
        <div
          data-animate
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 80,
            alignItems: 'center',
          }}
        >
          {/* Left: text */}
          <div>
            <span
              data-animate-child
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#FCD535',
              }}
            >
              AGENT LIFECYCLE
            </span>

            <h2
              data-animate-child
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
              Reason, execute, and validate in one unified loop.
            </h2>

            <p
              data-animate-child
              style={{
                fontFamily: "'BinanceNova', system-ui, sans-serif",
                fontSize: 18,
                color: 'rgba(234, 236, 239, 0.65)',
                marginTop: 24,
                lineHeight: 1.6,
              }}
            >
              A standard workflow relies on explicit, brittle logic. This system dynamically plans, executes, and self-corrects. The Planner breaks down the goal, the Executor utilizes your custom tools via a ReAct loop, and the Analyzer validates the output against your strict schemas.
            </p>

            {/* Steps */}
            <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', gap: 48 }}>
              {STEPS.map((step) => (
                <div key={step.num} data-animate-child style={{ display: 'flex', gap: 24 }}>
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 14,
                      color: '#FCD535',
                      paddingTop: 4,
                    }}
                  >
                    {step.num}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontFamily: "'BinanceNova', system-ui, sans-serif",
                        fontSize: 20,
                        fontWeight: 500,
                        color: '#EAECEF',
                        margin: 0,
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "'BinanceNova', system-ui, sans-serif",
                        fontSize: 15,
                        color: 'rgba(234, 236, 239, 0.45)',
                        marginTop: 8,
                        lineHeight: 1.6,
                      }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: agent pipeline artwork */}
          <div
            data-animate-child
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(234, 236, 239, 0.02)',
              border: '1px solid rgba(234, 236, 239, 0.08)',
              borderRadius: 8,
              padding: 40,
            }}
          >
            <img
              src="/images/img-pipeline.jpg"
              alt="Planner, Executor, Analyzer, Memory agent pipeline"
              style={{
                width: '100%',
                maxWidth: 480,
                objectFit: 'contain',
                opacity: 0.9,
                pointerEvents: 'none',
                userSelect: 'none',
                filter: 'grayscale(30%) contrast(1.1)', // More stark, less colorful
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: 1,
            background: 'rgba(234, 236, 239, 0.08)',
            margin: '80px 0',
          }}
        />

        {/* Stats */}
        <div
          data-stats
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 32,
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.value} data-stat>
              <div
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'rgba(234, 236, 239, 0.45)',
                  marginBottom: 8,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "'BinanceNova', system-ui, sans-serif",
                  fontSize: 28,
                  fontWeight: 500,
                  letterSpacing: '-0.5px',
                  color: '#EAECEF',
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
