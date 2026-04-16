/**
 * RegisterPage.tsx — Aetheric Intelligence Design
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

function getStrengthScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Secure'];
const strengthColors = [
  '',
  '#ff6e84',
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#10b981',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const strengthScore = getStrengthScore(passwordValue);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await authApi.register({ email: data.email, username: data.username, password: data.password });
      await login(data.email, data.password);
      navigate('/tasks');
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <div className="auth-bg" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #8455ef 0%, #5e2c91 100%)', boxShadow: '0 8px 32px rgba(132,85,239,0.3)' }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <circle cx="13" cy="5"  r="2.5" fill="white" fillOpacity="0.9"/>
              <circle cx="4"  cy="20" r="2.5" fill="white" fillOpacity="0.9"/>
              <circle cx="22" cy="20" r="2.5" fill="white" fillOpacity="0.9"/>
              <circle cx="13" cy="13.5" r="1.8" fill="white" fillOpacity="0.6"/>
              <line x1="13" y1="7.5"  x2="13"  y2="11.7" stroke="white" strokeOpacity="0.5" strokeWidth="1.2"/>
              <line x1="11.5" y1="14.5" x2="5.5"  y2="18"   stroke="white" strokeOpacity="0.5" strokeWidth="1.2"/>
              <line x1="14.5" y1="14.5" x2="20.5" y2="18"   stroke="white" strokeOpacity="0.5" strokeWidth="1.2"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f9f5fd] mb-1">Create your account</h1>
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Join the MAP Platform network</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-start gap-2.5 p-3.5 rounded-lg"
                style={{ background: 'rgba(255,110,132,0.08)', border: '1px solid rgba(255,110,132,0.2)' }}
              >
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--error)' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--error)' }}>{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="label-xs block mb-2">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--outline)' }} />
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="agent_nexus"
                  className={`form-input pl-10 ${errors.username ? 'ring-1 ring-[rgba(255,110,132,0.5)]' : ''}`}
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label-xs block mb-2">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--outline)' }} />
                <input
                  {...register('email')}
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={`form-input pl-10 ${errors.email ? 'ring-1 ring-[rgba(255,110,132,0.5)]' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Password + strength */}
            <div>
              <label htmlFor="reg-password" className="label-xs block mb-2">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--outline)' }} />
                <input
                  {...register('password', {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`form-input pl-10 pr-10 ${errors.password ? 'ring-1 ring-[rgba(255,110,132,0.5)]' : ''}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--outline)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength meter */}
              {passwordValue && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((lvl) => (
                      <div key={lvl} className="h-1 flex-1 rounded-full transition-all duration-400"
                        style={{
                          backgroundColor: strengthScore >= lvl
                            ? strengthColors[strengthScore]
                            : 'var(--surface-bright)',
                          opacity: strengthScore >= lvl ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium"
                    style={{ color: strengthScore >= 1 ? strengthColors[strengthScore] : 'var(--outline)' }}>
                    {strengthLabels[strengthScore] || 'Too weak'}
                  </p>
                </div>
              )}

              {errors.password && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="label-xs block mb-2">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--outline)' }} />
                <input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`form-input pl-10 pr-10 ${errors.confirmPassword ? 'ring-1 ring-[rgba(255,110,132,0.5)]' : ''}`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--outline)' }}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              id="register-submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
