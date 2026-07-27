/**
 * frontend/src/pages/ForgotPasswordPage.tsx
 * ──────────────────────────────────────────
 * Requests a password reset email. Always shows a generic success
 * message, matching the backend's behavior of never revealing
 * whether an email is registered.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { authApi } from '../api/auth';
import { getApiErrorMessage, isNetworkError } from '../lib/errors';
import { toast } from '../store/toastStore';
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      toast.error(isNetworkError(error) ? message : `Request failed: ${message}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <DotGrid />
        <AuthLiveField />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)',
          }}
        />

        <div className="relative w-full max-w-sm text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-2xl border border-indigo-400/20 animate-ping [animation-duration:2.4s]" />
            <img
              src="/map-logo.png"
              alt="MAP"
              className="h-14 w-14 rounded-2xl object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
            />
          </div>
          <h1 className="text-xl font-semibold text-white">Reset your password</h1>
          <p className="text-xs text-[#555]">Multi-Agent AI Automation Platform</p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-5 mb-7 space-y-3">
            <div className="flex justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <MailCheck className="h-4.5 w-4.5 text-emerald-400" />
              </div>
            </div>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              If that email is registered, a reset link is on its way. Check your inbox
              (and spam folder) — the link expires in 30 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 text-left mb-7">
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
        )}

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
        </div>
      </div>
    </div>
  );
}
