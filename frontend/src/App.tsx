import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TaskListPage from './pages/TaskListPage'
import TaskCreatePage from './pages/TaskCreatePage'
import TaskDetailPage from './pages/TaskDetailPage'
import HistoryPage from './pages/HistoryPage'
import LogsPage from './pages/LogsPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import AppShell from './components/layout/AppShell'

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tasks" replace />} />

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
    </Routes>
  )
}
