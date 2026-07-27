/**
 * frontend/src/pages/ResetPasswordPage.tsx
 * ──────────────────────────────────────────
 * Handles the link from the password reset email:
 * /reset-password?token=...
 *
 * Reads the token from the query string, lets the user pick a new
 * password, and calls the confirm endpoint.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { authApi } from '../api/auth';
import { getApiErrorMessage, isNetworkError } from '../lib/errors';
import { toast } from '../store/toastStore';
import { AuthLiveField } from '../components/auth/AuthLiveField';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
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

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    try {
      await authApi.confirmResetPassword(token, data.password);
      setDone(true);
      toast.success('Password reset successfully. You can now sign in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      toast.error(isNetworkError(error) ? message : `Reset failed: ${message}`);
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
          <h1 className="text-xl font-semibold text-white">Choose a new password</h1>
          <p className="text-xs text-[#555]">Multi-Agent AI Automation Platform</p>
        </div>

        {!token ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-5 py-5 mb-7 space-y-3">
            <div className="flex justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
              </div>
            </div>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              This reset link is missing its token. Request a new one from the
              forgot password page.
            </p>
          </div>
        ) : done ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-5 mb-7 space-y-3">
            <div className="flex justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
              </div>
            </div>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              Your password has been reset. Redirecting you to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 text-left mb-7">
            <div>
              <input
                {...register('password')}
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                aria-invalid={!!errors.password}
                className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${
                  errors.password ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <div>
              <input
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                aria-invalid={!!errors.confirmPassword}
                className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${
                  errors.confirmPassword ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1.5">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-white text-black text-sm font-medium py-2.5 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset password'}
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
