/**
 * frontend/src/pages/LoginPage.tsx
 * ────────────────────────────────
 * Premium Design Refactor: Glassmorphic Dark Edition.
 * Features: Framer Motion animations, Lucide icons, Inter typography.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles } from 'lucide-react';
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
      const msg = error instanceof Error ? error.message : 'Invalid credentials. Please try again.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-[#020617]">
      {/* Background Mesh (defined in index.css) */}
      <div className="bg-mesh" />

      {/* Hero Content Stacking */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-xl shadow-violet-500/20"
          >
            <Sparkles className="text-white w-6 h-6" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-sm">Enter your credentials to access the platform</p>
        </div>

        {/* Glass Card */}
        <div className="glass-card p-8 sm:p-10">
          <AnimatePresence mode="wait">
            {serverError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"
              >
                <p className="text-xs text-red-400 font-medium leading-relaxed">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className={`form-input pl-11 ${errors.email ? 'border-red-500/50' : ''}`}
                  placeholder="name@company.com"
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-red-400 font-medium italic ml-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[10px] text-violet-400 font-semibold hover:text-violet-300 transition-colors">
                  FORGOT?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={`form-input pl-11 pr-11 ${errors.password ? 'border-red-500/50' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-400 font-medium italic ml-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-1 opacity-60 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-slate-500 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-violet-400 font-semibold hover:text-violet-300 underline-offset-4 hover:underline transition-all">
            Join the collective
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
