/**
 * LoginPage.tsx — Aetheric Intelligence Design
 * Clean, minimal AI-tool aesthetic inspired by Claude.ai
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate('/tasks');
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : 'Invalid credentials.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Ambient background */}
      <div className="auth-bg" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          {/* Neural network logo */}
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
          <h1 className="text-2xl font-bold tracking-tight text-[#f9f5fd] mb-1">
            MAP Platform
          </h1>
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Multi-Agent Platform
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-[#f9f5fd] mb-6 tracking-tight">
            Welcome back
          </h2>

          {/* Server error */}
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
            {/* Email */}
            <div>
              <label htmlFor="email" className="label-xs block mb-2">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--outline)' }} />
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className={`form-input pl-10 ${errors.email ? 'ring-1 ring-[rgba(255,110,132,0.5)]' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="label-xs">Password</label>
                <Link to="/forgot-password"
                  className="text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--primary)' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--outline)' }} />
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`form-input pl-10 pr-10 ${errors.password ? 'ring-1 ring-[rgba(255,110,132,0.5)]' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--outline)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <hr className="flex-1 divider" />
            <span className="text-xs" style={{ color: 'var(--outline)' }}>New here?</span>
            <hr className="flex-1 divider" />
          </div>

          <Link to="/register"
            className="btn-ghost w-full justify-center text-sm"
          >
            Create an account
          </Link>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--outline)' }}>
          By signing in you agree to our{' '}
          <span className="cursor-default" style={{ color: 'var(--on-surface-variant)' }}>Terms of Service</span>
          {' '}and{' '}
          <span className="cursor-default" style={{ color: 'var(--on-surface-variant)' }}>Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
}
