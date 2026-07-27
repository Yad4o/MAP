import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { getApiErrorMessage, isNetworkError } from '../lib/errors';
import { toast } from '../store/toastStore';
import { BASE_URL } from '../api/client';
import '../components/landing/landing.css';

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

const STRENGTH_COLORS = ['', '#f87171', '#fbbf24', '#38bdf8', '#34d399'];
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

function PasswordStrength({ value }: { value: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  if (!value) return null;
  return (
    <div className="auth-v2__strength">
      <div className="auth-v2__strength-track">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`auth-v2__strength-bar ${i <= score ? 'is-filled' : ''}`}
            style={i <= score ? ({ '--strength-color': STRENGTH_COLORS[score] } as React.CSSProperties) : undefined}
          />
        ))}
      </div>
      <span className="auth-v2__strength-label">{STRENGTH_LABELS[score]}</span>
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

  const startOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${BASE_URL}/auth/oauth/${provider}/login`;
  };

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
    <div className="flex min-h-screen">
      <section className="hero-v2 auth-v2 relative flex-1">
        <div className="hero-v2__bg" aria-hidden="true">
          <div className="hero-v2__glow" />
          <div className="hero-v2__grid" />
          <div className="hero-v2__symbols" />
        </div>

        <div className="hero-v2__content auth-v2__content">
          <img src="/map-icon.png" alt="" aria-hidden="true" className="auth-v2__mark" />
          <img src="/map-wordmark.png" alt="MAP" className="auth-v2__wordmark-img" />

          <p className="auth-v2__heading">Create your account</p>

          {serverError && (
            <p className="hero-v2__oauth-error" role="alert">
              {serverError}
            </p>
          )}

          <div className="hero-v2__actions">
            <button
              type="button"
              className="hero-v2__btn hero-v2__btn--google"
              onClick={() => startOAuth('google')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              className="hero-v2__btn hero-v2__btn--ghost"
              onClick={() => startOAuth('github')}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.44-2.43-.97-2.43-.97-.33-.83-.8-1.05-.8-1.05-.66-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.07-.46.25-.78.46-.96-1.61-.18-3.3-.8-3.3-3.59 0-.79.28-1.44.74-1.94-.07-.19-.32-.94.07-1.95 0 0 .61-.19 1.98.74a6.9 6.9 0 0 1 3.6 0c1.37-.93 1.98-.74 1.98-.74.39 1.01.14 1.76.07 1.95.46.5.74 1.15.74 1.94 0 2.8-1.7 3.41-3.32 3.59.26.22.49.66.49 1.33l-.01 1.98c0 .21.14.45.55.38A8 8 0 0 0 8 0Z" />
              </svg>
              Continue with GitHub
            </button>

            <div className="hero-v2__divider">
              <span />
              <em>OR</em>
              <span />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full">
              <div className="auth-v2__field">
                <label htmlFor="username" className="auth-v2__label">
                  Username
                </label>
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  aria-invalid={!!errors.username}
                  className={`auth-v2__input ${errors.username ? 'auth-v2__input--error' : ''}`}
                />
                {errors.username && <p className="auth-v2__error-text">{errors.username.message}</p>}
              </div>

              <div className="auth-v2__field">
                <label htmlFor="email" className="auth-v2__label">
                  Email address
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  aria-invalid={!!errors.email}
                  className={`auth-v2__input ${errors.email ? 'auth-v2__input--error' : ''}`}
                />
                {errors.email && <p className="auth-v2__error-text">{errors.email.message}</p>}
              </div>

              <div className="auth-v2__field">
                <label htmlFor="password" className="auth-v2__label">
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
                  className={`auth-v2__input ${errors.password ? 'auth-v2__input--error' : ''}`}
                />
                <PasswordStrength value={passwordValue} />
                {errors.password && <p className="auth-v2__error-text">{errors.password.message}</p>}
              </div>

              <div className="auth-v2__field">
                <label htmlFor="confirmPassword" className="auth-v2__label">
                  Confirm Password
                </label>
                <input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  aria-invalid={!!errors.confirmPassword}
                  className={`auth-v2__input ${errors.confirmPassword ? 'auth-v2__input--error' : ''}`}
                />
                {errors.confirmPassword && <p className="auth-v2__error-text">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="hero-v2__btn hero-v2__btn--primary auth-v2__submit"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="auth-v2__footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <p className="auth-v2__legal">
            By continuing, you accept our{' '}
            <Link to="/terms">Terms of Service</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
