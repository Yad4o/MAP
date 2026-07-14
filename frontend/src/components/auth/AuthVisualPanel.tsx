/**
 * frontend/src/components/auth/AuthVisualPanel.tsx
 * ──────────────────────────────────────────────────
 * Left-hand visual panel for the login/register split-screen layout.
 * Renders the AgentConstellation signature — the Plan → Execute →
 * Validate → Remember pipeline as a live orbiting diagram — over a
 * deep indigo gradient field, blended into the page edges so it reads
 * as one continuous surface. Hidden below the lg breakpoint; small
 * screens keep the plain centered-card treatment.
 */
import { AgentConstellation } from './AgentConstellation';

export function AuthVisualPanel({
  variant: _variant,
  tagline,
}: {
  variant: 'login' | 'register';
  tagline: string;
}) {
  return (
    <div className="relative hidden h-screen w-[42%] flex-shrink-0 overflow-hidden border-r border-white/[0.06] bg-[#0a0a0a] lg:block xl:w-[38%]">
      {/* Base gradient field — brand indigo, not a stock photo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(76,29,149,0.35) 0%, rgba(10,10,10,0) 65%), ' +
            'linear-gradient(160deg, #0e0a1c 0%, #0a0a0a 55%, #0a0a0a 100%)',
        }}
      />

      <AgentConstellation />

      {/* Blend the panel into the page edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#0a0a0a]" />

      <div className="absolute left-0 right-0 top-0 p-10">
        <div className="flex items-center gap-2">
          <img src="/map-logo.png" alt="MAP" className="h-7 w-7 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-wide text-white/90">MAP</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-10">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/50">
          Multi-Agent AI Automation
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-white/60">{tagline}</p>
      </div>
    </div>
  );
}
