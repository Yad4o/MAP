/**
 * frontend/src/pages/LoginPage.tsx
 * ────────────────────────────────
 * Minimal, chatbot-style login screen — a single centered card, no
 * gradients/mesh/sparkle branding, similar to ChatGPT/Claude's login.
 *
 * Error handling:
 * - getApiErrorMessage() extracts the REAL backend reason (e.g. "Invalid
 *   email or password") instead of Axios's generic "Request failed with
 *   status code 401".
 * - The error is shown two ways at once: inline under the form (so it's
 *   visible immediately, doesn't require noticing a toast) AND as a toast
 *   (so it's visible even if focus/scroll position make the inline banner
 *   easy to miss). Neither approach involves a page reload — submission is
 *   always via handleSubmit, which calls preventDefault() internally.
 * - Network failures (server unreachable) are distinguished from invalid
 *   credentials so the message is accurate either way.
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

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-white text-center mb-8">
          Sign in to MAP
        </h1>

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

        <p className="text-center mt-6 text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-white hover:underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
