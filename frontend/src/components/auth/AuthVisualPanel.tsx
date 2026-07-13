/**
 * frontend/src/components/auth/AuthVisualPanel.tsx
 * ──────────────────────────────────────────────────
 * Left-hand visual panel for the login/register split-screen layout.
 * Renders a generated, abstract dark gradient-mesh image (no literal
 * meaning — just mood) with a soft blend into the page background on
 * every edge so it reads as one continuous surface rather than a
 * pasted-in graphic. Hidden below the lg breakpoint; small screens
 * keep the plain centered-card treatment.
 */
export function AuthVisualPanel({
  variant,
  tagline,
}: {
  variant: 'login' | 'register';
  tagline: string;
}) {
  return (
    <div className="relative hidden h-screen w-[42%] flex-shrink-0 overflow-hidden border-r border-white/[0.06] lg:block xl:w-[38%]">
      <img
        src={`/auth/auth-visual-${variant}.webp`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover scale-[1.05]"
      />

      {/* Blend the image into the page edges so it never looks like a pasted-in box */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/30 via-transparent to-transparent" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#0a0a0a]" />

      <div className="absolute bottom-0 left-0 right-0 p-10">
        <div className="mb-4 flex items-center gap-2">
          <img src="/map-logo.png" alt="MAP" className="h-7 w-7 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-wide text-white/90">MAP</span>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-white/60">{tagline}</p>
      </div>
    </div>
  );
}
