import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { getApiErrorMessage, isNetworkError } from '../lib/errors';
import { toast } from '../store/toastStore';
import { AuthVisualPanel } from '../components/auth/AuthVisualPanel';

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

function PasswordStrength({ value }: { value: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-trading-down', 'bg-primary', 'bg-info', 'bg-trading-up'];
  if (!value) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-surface-elevated-dark'}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-strong font-medium">{labels[score]}</span>
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
    <div className="flex min-h-screen bg-canvas-light theme-light">
      <AuthVisualPanel
        variant="register"
        tagline="Spin up an account and hand off your first multi-step task to a team of AI agents in minutes."
      />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <div className="relative w-full max-w-[380px] py-8">
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
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-muted">Multi-Agent AI Automation Platform</p>
            </div>
          </div>

          <div className="surface-card light p-8 shadow-sm">
            {serverError && (
              <div role="alert" className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-5 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-muted-strong">
                  Username
                </label>
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  aria-invalid={!!errors.username}
                  className={`form-input light ${errors.username ? 'border-red-500' : ''}`}
                />
                {errors.username && <p className="text-xs text-red-500 mt-1.5">{errors.username.message}</p>}
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-muted-strong">
                  Email address
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  aria-invalid={!!errors.email}
                  className={`form-input light ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-muted-strong">
                  Password
                </label>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password"
                  aria-invalid={!!errors.password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className={`form-input light ${errors.password ? 'border-red-500' : ''}`}
                />
                <PasswordStrength value={passwordValue} />
                {errors.password && <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold text-muted-strong">
                  Confirm Password
                </label>
                <input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  aria-invalid={!!errors.confirmPassword}
                  className={`form-input light ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1.5">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="text-center mt-6 text-sm text-muted">
            Already have an account?{'  '}
            <Link to="/login" className="text-primary font-medium hover:underline underline-offset-2">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

