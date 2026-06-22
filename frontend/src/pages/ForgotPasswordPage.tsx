/**
 * frontend/src/pages/ForgotPasswordPage.tsx
 * ──────────────────────────────────────────
 * Password reset is not yet wired to an email backend.
 * Shows an honest message instead of a broken flow.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { AuthOrnament } from '../components/auth/AuthOrnament';
import { AuthLiveField } from '../components/auth/AuthLiveField';

function DotGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 overflow-hidden">
      <DotGrid />
      <AuthLiveField />
      <AuthOrnament side="left" />
      <AuthOrnament side="right" />

      {/* Soft glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(6,182,212,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm text-center">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-2xl border border-cyan-400/20 animate-ping [animation-duration:2.4s]" />
            <img
              src="/map-logo.png"
              alt="MAP"
              className="h-14 w-14 rounded-2xl object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]"
            />
          </div>
          <h1 className="text-xl font-semibold text-white">Reset your password</h1>
          <p className="text-xs text-[#555]">Multi-Agent AI Automation Platform</p>
        </div>

        {/* Notice */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-5 py-5 mb-7 space-y-3">
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
            </div>
          </div>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            Password reset via email isn't available yet — email delivery is not configured on this deployment.
          </p>
          <p className="text-xs text-[#555] leading-relaxed">
            Contact your administrator or whoever set up this instance to reset your password manually.
          </p>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
