/**
 * frontend/src/pages/LoginPage.tsx
 * ────────────────────────────────
 * Minimal, chatbot-style login screen — a single centered card, no
 * gradients/mesh/sparkle branding, similar to ChatGPT/Claude's login.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getApiErrorMessage, isNetworkError } from '../lib/errors';
import { toast } from '../store/toastStore';
import { AuthVisualPanel } from '../components/auth/AuthVisualPanel';
import { AuthLiveField } from '../components/auth/AuthLiveField';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate('/tasks');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setServerError(message);
      toast.error(isNetworkError(error) ? message : `Sign in failed: ${message}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <AuthVisualPanel
        variant="login"
        tagline="Plan, execute, and validate work across a team of specialized agents — memory kept, nothing repeated."
      />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <DotGrid />
        <AuthLiveField />

        {/* Soft glow behind card */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)',
          }}
        />

        <div className="relative w-full max-w-[380px]">
        {/* Brand mark */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 rounded-2xl border border-indigo-400/20 animate-ping [animation-duration:2.4s]" />
            <img
              src="/map-logo.png"
              alt="MAP"
              className="h-12 w-12 rounded-2xl object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
            />
          </div>
          <div className="text-center">
            <h1
              className="text-2xl font-semibold text-white"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              Sign in to MAP
            </h1>
            <p className="mt-1.5 text-xs text-[#666]">Multi-Agent AI Automation Platform</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#4f4f4f]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            System live
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-sm">
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
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#888]">
                Email address
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                className={`w-full rounded-lg bg-white/[0.04] border px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/30 ${
                  errors.email ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-400/50'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-medium text-[#888]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#666] hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                className={`w-full rounded-lg bg-white/[0.04] border px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/30 ${
                  errors.password ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-400/50'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 text-white text-sm font-medium py-2.5 flex items-center justify-center gap-2 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_20px_-6px_rgba(99,102,241,0.55)] transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
            </button>
          </form>
        </div>

        {/* Feature hints */}
        <div className="mt-5 mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {[
            'Plan → Execute → Validate → Remember',
            'LangGraph ReAct loop',
            'Real-time streaming',
          ].map((hint) => (
            <span key={hint} className="flex items-center gap-1.5 text-[11px] text-[#5a5a5a]">
              <span className="h-1 w-1 rounded-full bg-indigo-400/40 flex-shrink-0" />
              {hint}
            </span>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-white hover:underline underline-offset-2">
            Sign up
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
