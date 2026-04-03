/**
 * frontend/src/pages/RegisterPage.tsx
 * Phase corresponding to this page — implement then.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  username: z.string().min(3, 'Minimum 3 characters'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function strengthScore(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pw, setPw] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const score = strengthScore(pw)
  const strengthLabel = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'][score] ?? ''
  const strengthColor = score <= 2 ? 'bg-red-400' : score === 3 ? 'bg-amber-400' : score === 4 ? 'bg-blue-400' : 'bg-green-400'

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await authApi.register({ email: data.email, username: data.username, password: data.password })
      await login(data.email, data.password)
      navigate('/tasks')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      setServerError(msg)
    }
  }

  const inputCls = (err: boolean) =>
    `w-full text-sm border rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-300 outline-none transition-colors ${
      err ? 'border-red-400' : 'border-gray-200 focus:border-gray-400'
    }`

  const EyeBtn = ({ show, onToggle, label }: { show: boolean; onToggle: () => void; label: string }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={show}
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded px-1 transition-colors"
    >
      {show
        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.477 10.477A3 3 0 0013.5 13.5M6.5 6.5A9.97 9.97 0 003 12c1.274 4.057 5.065 7 9.5 7a9.95 9.95 0 005-1.343M9 9a3 3 0 014.243 4.243M21 12c-.69 2.2-2.1 4.1-3.97 5.37" /></svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      }
    </button>
  )

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xs">

        {/* Wordmark */}
        <div className="mb-10">
          <span className="text-sm font-semibold tracking-widest text-gray-900 uppercase">MAP</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-400 mb-8">Free to get started.</p>

        {serverError && (
          <p className="text-xs text-red-500 mb-5">{serverError}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
              {...register('email')} className={inputCls(!!errors.email)} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-xs font-medium text-gray-500 mb-1.5">Username</label>
            <input id="username" type="text" autoComplete="username" placeholder="yourhandle"
              {...register('username')} className={inputCls(!!errors.username)} />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
            <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                placeholder="••••••••"
                {...register('password', { onChange: (e) => setPw(e.target.value) })}
                className={inputCls(!!errors.password) + ' pr-10'} />
              <EyeBtn 
                show={showPassword} 
                onToggle={() => setShowPassword((v) => !v)} 
                label={showPassword ? 'Hide password' : 'Show password'} 
              />
            </div>
            {pw && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-0.5 flex-1">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors ${i <= score ? strengthColor : 'bg-gray-100'}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 w-10 text-right">{strengthLabel}</span>
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {/* Confirm */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-500 mb-1.5">Confirm password</label>
            <div className="relative">
              <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={inputCls(!!errors.confirmPassword) + ' pr-10'} />
              <EyeBtn 
                show={showConfirm} 
                onToggle={() => setShowConfirm((v) => !v)} 
                label={showConfirm ? 'Hide confirmation' : 'Show confirmation'} 
              />
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting
              ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Creating account</>
              : 'Create account'
            }
          </button>
        </form>

        <p className="mt-8 text-xs text-gray-400">
          Have an account?{' '}
          <Link to="/login" className="text-gray-900 font-medium hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
