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
import { AuthOrnament } from '../components/auth/AuthOrnament';
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 overflow-hidden">
      <DotGrid />
      <AuthLiveField />
      <AuthOrnament side="left" />
      <AuthOrnament side="right" />

      {/* Soft glow behind card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-2xl border border-indigo-400/20 animate-ping [animation-duration:2.4s]" />
            <img
              src="/map-logo.png"
              alt="MAP"
              className="h-14 w-14 rounded-2xl object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
            />
          </div>
          <h1 className="text-xl font-semibold text-white">Sign in to MAP</h1>
          <p className="text-xs text-[#555]">Multi-Agent AI Automation Platform</p>
          <div className="flex items-center gap-1.5 text-[10px] text-[#4f4f4f]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            System live
          </div>
        </div>

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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span />
              <Link
                to="/forgot-password"
                className="text-xs text-[#555] hover:text-[#A1A1AA] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              aria-invalid={!!errors.password}
              className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${
                errors.password ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
            {errors.password && (
              <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-white text-black text-sm font-medium py-2.5 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#1E1E1E]" />
          <span className="text-xs text-[#444]">or</span>
          <div className="h-px flex-1 bg-[#1E1E1E]" />
        </div>

        {/* Feature hints */}
        <div className="mb-6 rounded-lg border border-[#1E1E1E] bg-white/[0.02] px-4 py-3 space-y-2">
          {[
            'Plan → Execute → Validate → Remember',
            'LangGraph ReAct agent loop',
            'Real-time task streaming',
          ].map((hint) => (
            <p key={hint} className="flex items-center gap-2 text-xs text-[#555]">
              <span className="h-1 w-1 rounded-full bg-[#333] flex-shrink-0" />
              {hint}
            </p>
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
  );
}
