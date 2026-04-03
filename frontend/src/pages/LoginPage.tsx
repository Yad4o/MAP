/**
 * frontend/src/pages/LoginPage.tsx
 * Phase 1: Implement using authStore.login() and React Hook Form.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await login(data.email, data.password)
      navigate('/tasks')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed. Please try again.'
      setServerError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-xs">

        {/* Wordmark */}
        <div className="mb-10">
          <span className="text-sm font-semibold tracking-widest text-gray-900 uppercase">MAP</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-400 mb-8">Welcome back.</p>

        {serverError && (
          <p className="text-xs text-red-500 mb-5">{serverError}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              className={`w-full text-sm border rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-300 outline-none transition-colors
                ${errors.email ? 'border-red-400' : 'border-gray-200 focus:border-gray-400'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full text-sm border rounded-lg px-3 py-2.5 pr-10 text-gray-900 placeholder-gray-300 outline-none transition-colors
                  ${errors.password ? 'border-red-400' : 'border-gray-200 focus:border-gray-400'}`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded px-1 transition-colors"
              >
                {showPassword
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.477 10.477A3 3 0 0013.5 13.5M6.5 6.5A9.97 9.97 0 003 12c1.274 4.057 5.065 7 9.5 7a9.95 9.95 0 005-1.343M9 9a3 3 0 014.243 4.243M21 12c-.69 2.2-2.1 4.1-3.97 5.37" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting
              ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Signing in</>
              : 'Sign in'
            }
          </button>
        </form>

        <p className="mt-8 text-xs text-gray-400">
          No account?{' '}
          <Link to="/register" className="text-gray-900 font-medium hover:underline underline-offset-2">
            Register
          </Link>
        </p>

      </div>
    </div>
  )
}
