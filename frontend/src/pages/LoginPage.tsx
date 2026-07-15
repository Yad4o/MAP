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
    <div className="flex min-h-screen bg-canvas-light theme-light">
      <AuthVisualPanel
        variant="login"
        tagline="Plan, execute, and validate work across a team of specialized agents."
      />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <div className="relative w-full max-w-[380px]">
          {/* Brand mark */}
          <div className="mb-7 flex flex-col items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <img
                src="/map-logo.png"
                alt="MAP"
                className="h-12 w-12 rounded-full object-contain bg-primary p-1"
              />
            </div>
            <div className="text-center">
              <h1 className="text-title-lg text-ink">
                Sign in to MAP
              </h1>
              <p className="mt-1.5 text-sm text-muted">Multi-Agent AI Automation Platform</p>
            </div>
          </div>

          {/* Card */}
          <div className="surface-card light p-8 shadow-sm">
            {serverError && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-5 text-sm text-red-600"
              >
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-muted-strong">
                  Email address
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  className={`form-input light ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-muted-strong">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:text-primary-active transition-colors font-medium"
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
                  className={`form-input light ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log In'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

