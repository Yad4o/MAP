import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Cpu } from 'lucide-react';
import { authApi } from '../api/auth';
import { getApiErrorMessage, isNetworkError } from '../lib/errors';
import { toast } from '../store/toastStore';

const schema = z
  .object({
    username: z.string().min(3, 'At least 3 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

// Tiny decorative dots — pure CSS, zero cost
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

// Password strength indicator
function PasswordStrength({ value }: { value: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-400', 'bg-emerald-400'];
  if (!value) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-[#1E1E1E]'}`}
          />
        ))}
      </div>
      <span className="text-xs text-[#555]">{labels[score]}</span>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await authApi.register({ email: data.email, username: data.username, password: data.password });
      toast.success('Account created — please sign in.');
      navigate('/login');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setServerError(message);
      toast.error(isNetworkError(error) ? message : `Sign up failed: ${message}`);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 overflow-hidden">
      <DotGrid />

      {/* Soft glow behind card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm py-8">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1E1E1E] bg-white/[0.04]">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Create your account</h1>
          <p className="text-xs text-[#555]">Multi-Agent AI Automation Platform</p>
        </div>

        {serverError && (
          <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5 text-sm text-red-300">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <input
              {...register('username')}
              type="text"
              autoComplete="username"
              placeholder="Username"
              aria-invalid={!!errors.username}
              className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${errors.username ? 'border-red-500/50' : 'border-white/10'}`}
            />
            {errors.username && <p className="text-xs text-red-400 mt-1.5">{errors.username.message}</p>}
          </div>

          <div>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="Email address"
              aria-invalid={!!errors.email}
              className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${errors.email ? 'border-red-500/50' : 'border-white/10'}`}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
          </div>

          <div>
            <input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              placeholder="Password"
              aria-invalid={!!errors.password}
              onChange={(e) => setPasswordValue(e.target.value)}
              className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${errors.password ? 'border-red-500/50' : 'border-white/10'}`}
            />
            <PasswordStrength value={passwordValue} />
            {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>}
          </div>

          <div>
            <input
              {...register('confirmPassword')}
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              aria-invalid={!!errors.confirmPassword}
              className={`w-full rounded-lg bg-white/5 border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/30 ${errors.confirmPassword ? 'border-red-500/50' : 'border-white/10'}`}
            />
            {errors.confirmPassword && <p className="text-xs text-red-400 mt-1.5">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-white text-black text-sm font-medium py-2.5 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
          </button>
        </form>

        {/* Micro trust badges */}
        <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-[#444]">
          <span>Local-first</span>
          <span className="h-3 w-px bg-[#1E1E1E]" />
          <span>No card required</span>
          <span className="h-3 w-px bg-[#1E1E1E]" />
          <span>Open platform</span>
        </div>

        <p className="text-center mt-6 text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:underline underline-offset-2">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
