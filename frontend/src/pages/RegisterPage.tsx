/**
 * frontend/src/pages/RegisterPage.tsx
 * ───────────────────────────────────
 * Premium Design Refactor: Glassmorphic Dark Edition.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function getStrengthScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const strengthScore = getStrengthScore(passwordValue);
  const strengthColor = 
    strengthScore <= 2 ? 'bg-red-500 shadow-red-500/20' : 
    strengthScore === 3 ? 'bg-amber-500 shadow-amber-500/20' : 
    strengthScore === 4 ? 'bg-blue-500 shadow-blue-500/20' : 
    'bg-green-500 shadow-green-500/20';

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await authApi.register({ email: data.email, username: data.username, password: data.password });
      await login(data.email, data.password);
      navigate('/tasks');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Registration failed. Please try again later.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-[#020617]">
      <div className="bg-mesh" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[480px] relative z-10"
      >
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-violet-400 w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">MAP Platform</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">Create an Account</h1>
          <p className="text-slate-500 text-sm">Join our specialized agent network</p>
        </div>

        <div className="glass-card p-8 sm:p-10">
          <AnimatePresence mode="wait">
            {serverError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"
              >
                <p className="text-xs text-red-400 font-medium leading-relaxed font-mono">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('username')}
                  type="text"
                  className="form-input pl-11"
                  placeholder="agent_nexus"
                />
              </div>
              {errors.username && (
                <p className="text-[10px] text-red-400 font-medium italic ml-1">{errors.username.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                Intelligence Handle (Email)
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('email')}
                  type="email"
                  className="form-input pl-11"
                  placeholder="nexus@matrix.ai"
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-red-400 font-medium italic ml-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                Access Secret
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className="form-input pl-11 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordValue && (
                <div className="px-1 pt-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Strength</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${strengthScore <= 2 ? 'text-red-400' : 'text-green-400'}`}>
                      {['Weak', 'Weak', 'Fair', 'Strong', 'Secure', 'Inderflectable'][strengthScore]}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div 
                        key={lvl}
                        className={`h-full flex-1 transition-all duration-500 rounded-full ${
                          strengthScore >= lvl ? strengthColor : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="text-[10px] text-red-400 font-medium italic ml-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">
                Verify Secret
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input pl-11 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] text-red-400 font-medium italic ml-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full shadow-violet-500/20 active:translate-y-0.5"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-bold tracking-widest uppercase">Initializing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-bold tracking-widest uppercase">Deploy Identity</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 text-xs tracking-wide">
          Already verified?{' '}
          <Link to="/login" className="text-violet-400 font-bold hover:text-violet-300 transition-colors">
            SIGN IN
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
