import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'
import TaskListPage from './pages/TaskListPage'
import TaskCreatePage from './pages/TaskCreatePage'
import TaskDetailPage from './pages/TaskDetailPage'
import HistoryPage from './pages/HistoryPage'
import LogsPage from './pages/LogsPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import AppShell from './components/layout/AppShell'
import Toaster from './components/layout/Toaster'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const role = useAuthStore(state => state.user?.role)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'ADMIN' && role !== 'SYSTEM') return <Navigate to="/tasks" replace />

  return <>{children}</>
}

function RootRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/tasks" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <>
      {/* Galaxy background removed: it was a leftover from an earlier
          purple "Celestial Intelligence" theme and is no longer used by
          any route. It still rendered 4 fixed, infinitely-animating
          blur(70-80px) layers on every page (including the landing
          page's WebGL hero), which was a major source of jank. */}

      <Toaster />
      <Routes>
        <Route path="/" element={<RootRoute />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* All authenticated routes are rendered inside the AppShell layout */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/tasks/new" element={<TaskCreatePage />} />
          {/* PR fix: register TaskDetailPage under AppShell for polling, cancel/retry */}
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>

        {/* Catch-all 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
