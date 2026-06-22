/**
 * frontend/src/pages/ForgotPasswordPage.tsx
 * ──────────────────────────────────────────
 * Same visual language as LoginPage / RegisterPage:
 * dark bg, DotGrid, AuthLiveField, AuthOrnament radar wheels,
 * MAP logo, minimal card. Two states: form → sent confirmation.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { authApi } from '../api/auth';
import { getApiErrorMessage } from '../lib/errors';
import { AuthOrnament } from '../components/auth/AuthOrnament';
import { AuthLiveField } from '../components/auth/AuthLiveField';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormData = z.infer<typeof schema>;

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
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await authApi.forgotPassword(data.email);
    } catch (error: unknown) {
      // Swallow 501 / not-implemented gracefully — still show confirmation
      // so we don't leak whether an email exists (standard UX pattern).
      const msg = getApiErrorMessage(error);
      if (!msg.toLowerCase().includes('not implemented') && !msg.includes('501')) {
        setServerError(msg);
        return;
      }
    }
    setSentEmail(data.email);
    setSent(true);
  };

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

      <div className="relative w-full max-w-sm">
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
          <h1 className="text-xl font-semibold text-white">
            {sent ? 'Check your inbox' : 'Reset your password'}
          </h1>
          <p className="text-xs text-[#555]">Multi-Agent AI Automation Platform</p>
        </div>

        {sent ? (
          /* ── Confirmation state ── */
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <MailCheck className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              If <span className="text-white font-medium">{sentEmail}</span> is linked to an account,
              you'll receive a reset link shortly.
            </p>
            <p className="text-xs text-[#555]">
              Didn't get it? Check your spam folder or{' '}
              <button
                onClick={() => { setSent(false); setServerError(null); }}
                className="text-white hover:underline underline-offset-2"
              >
                try again
              </button>.
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <p className="mb-5 text-sm text-[#777] text-center leading-relaxed">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {serverError && (
              <div
                role="alert"
                className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5 text-sm text-red-300"
              >
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  aria-invalid={!!errors.email}
                  className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${
                    errors.email ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-white text-black text-sm font-medium py-2.5 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
