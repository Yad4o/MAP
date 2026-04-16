/**
 * AppShell.tsx — Aetheric Intelligence Layout
 * ChatGPT/Claude-style sidebar navigation
 */

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  CheckSquare,
  Clock,
  Terminal,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/tasks',   label: 'Tasks',    icon: CheckSquare },
  { to: '/history', label: 'History',  icon: Clock },
  { to: '/logs',    label: 'Logs',     icon: Terminal },
  { to: '/settings',label: 'Settings', icon: Settings },
];

const adminItems = [
  { to: '/admin', label: 'Admin', icon: Shield },
];

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'text-[#ba9eff]'
        : 'hover:text-[#f9f5fd]'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo — no border, just generous space */}
      <div className="h-16 flex items-center px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8455ef 0%, #5e2c91 100%)', boxShadow: '0 4px 12px rgba(132,85,239,0.35)' }}
          >
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-[0.9375rem] font-bold tracking-tight"
            style={{ background: 'linear-gradient(90deg, #ba9eff 0%, #c08cf7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MAP Platform
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        <p className="px-3 mb-3 mt-1"
          style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--outline)' }}>
          Navigation
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
            style={({ isActive }) => isActive ? {
              backgroundColor: 'rgba(132, 85, 239, 0.12)',
            } : { color: 'var(--on-surface-variant)' }}
          >
            <item.icon size={16} className="flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 mb-3 mt-6"
              style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--outline)' }}>
              Administration
            </p>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => isActive ? {
                  backgroundColor: 'rgba(132, 85, 239, 0.12)',
                } : { color: 'var(--on-surface-variant)' }}
              >
                <item.icon size={16} className="flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer — tonal shift instead of border */}
      <div className="p-3" style={{ backgroundColor: 'var(--surface-low)', borderTop: 'none' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(132,85,239,0.3) 0%, rgba(94,44,145,0.3) 100%)',
              color: 'var(--primary)',
              border: '1px solid rgba(186,158,255,0.2)',
            }}
          >
            {(user?.username ?? user?.email ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--on-surface)' }}>
              {user?.username ?? 'User'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--outline)' }}>
              {user?.email ?? ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{ color: 'var(--on-surface-variant)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ff6e84';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,110,132,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--on-surface-variant)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40"
        style={{ backgroundColor: 'rgba(14,14,19,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(72,71,77,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8455ef 0%, #5e2c91 100%)' }}>
            <Zap size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>MAP</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--on-surface-variant)' }}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — background shift from surface to surface-low, no border */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-60 flex-shrink-0 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: 'var(--surface-low)' }}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pt-14 lg:pt-0"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
