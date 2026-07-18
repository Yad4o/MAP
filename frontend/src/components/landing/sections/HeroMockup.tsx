/**
 * HeroMockup — sits on the left of the split Hero section.
 * Purpose: make MAP look *installed inside* a real product surface rather
 * than floating as a standalone marketing graphic — a browser-chrome card
 * with a live-looking agent dashboard inside it.
 */
export default function HeroMockup() {
  const rows = [
    { agent: 'Router', task: 'Classify incoming request', status: 'done' },
    { agent: 'Research', task: 'Pull context from vector store', status: 'done' },
    { agent: 'Executor', task: 'Call billing.update_plan()', status: 'active' },
    { agent: 'Fallback', task: 'Standing by', status: 'idle' },
  ];

  return (
    <div className="hero-mockup" aria-hidden="true">
      <div className="hero-mockup__glow" />

      <div className="hero-mockup__window">
        <div className="hero-mockup__chrome">
          <span className="hero-mockup__dot hero-mockup__dot--a" />
          <span className="hero-mockup__dot hero-mockup__dot--b" />
          <span className="hero-mockup__dot hero-mockup__dot--c" />
          <span className="hero-mockup__chrome-url">app.yourproduct.com/tasks</span>
        </div>

        <div className="hero-mockup__body">
          <div className="hero-mockup__body-header">
            <span className="hero-mockup__badge">MAP</span>
            <span className="hero-mockup__body-title">Agent pipeline · Task #4471</span>
          </div>

          <div className="hero-mockup__rows">
            {rows.map((row) => (
              <div className="hero-mockup__row" key={row.agent}>
                <span className={`hero-mockup__status hero-mockup__status--${row.status}`} />
                <span className="hero-mockup__row-agent">{row.agent}</span>
                <span className="hero-mockup__row-task">{row.task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hero-mockup__chip hero-mockup__chip--top">Circuit breaker armed</div>
      <div className="hero-mockup__chip hero-mockup__chip--bottom">3 workers online</div>
    </div>
  );
}
