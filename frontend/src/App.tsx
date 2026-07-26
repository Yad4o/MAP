import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import AppShell from './components/layout/AppShell'
import Toaster from './components/layout/Toaster'

// Every route is code-split so the first paint only downloads what that
// specific page needs. Before this, App.tsx statically imported every page
// — including the landing page's GSAP/Lenis scroll animations, the
// @xyflow/react agent flow chart, and the admin panel — into one ~1.2MB
// bundle that shipped on every load, even a plain login screen.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TaskListPage = lazy(() => import('./pages/TaskListPage'))
const TaskCreatePage = lazy(() => import('./pages/TaskCreatePage'))
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const LogsPage = lazy(() => import('./pages/LogsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Minimal, dependency-free fallback — no spinner library, no CSS import,
// so it can render instantly while the actual route chunk streams in.
function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0d0d',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2px solid #2a2a2a',
          borderTopColor: '#9fe870',
          animation: 'route-fallback-spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes route-fallback-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const role = useAuthStore(state => state.user?.role)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'ADMIN' && role !== 'SYSTEM') return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

function RootRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/tasks/new" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <>
      <Toaster />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* All authenticated routes are rendered inside the AppShell layout */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<TaskListPage />} />
            <Route path="/tasks" element={<Navigate to="/dashboard" replace />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          </Route>

          {/* Catch-all 404 route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}
