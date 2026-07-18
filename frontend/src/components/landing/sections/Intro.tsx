/**
 * Intro — the very first thing a visitor sees.
 * Job: give them a reason to scroll, in one breath. No auth chrome here —
 * that lives one section down in <Hero />. This section just has to earn
 * the scroll.
 */
export default function Intro() {
  const scrollToHero = () => {
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="intro" className="intro-v2">
      <div className="intro-v2__bg" aria-hidden="true">
        <div className="intro-v2__glow" />
        <div className="intro-v2__grid" />
      </div>

      <div className="intro-v2__content">
        <span className="intro-v2__eyebrow">MULTI-AGENT AI AUTOMATION</span>

        <h1 className="intro-v2__headline">
          Route work through a fleet of
          <br />
          <span className="intro-v2__headline-accent">specialized AI agents</span>
          , not one overloaded prompt.
        </h1>

        <p className="intro-v2__subtext">
          Every task gets its own role, tools, and fallback path — orchestrated,
          observable, and built to survive production.
        </p>

        <button type="button" className="intro-v2__cta" onClick={scrollToHero}>
          See how it works
        </button>
      </div>

      <button
        type="button"
        className="intro-v2__scroll-cue"
        onClick={scrollToHero}
        aria-label="Scroll to next section"
      >
        <span className="intro-v2__scroll-cue-line" />
        <svg width="14" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true">
          <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  );
}
