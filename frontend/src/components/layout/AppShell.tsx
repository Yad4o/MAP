import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  CheckSquare,
  Clock,
  Terminal,
  Settings,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/logs', label: 'Logs', icon: Terminal },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { to: '/admin', label: 'Admin', icon: Shield },
];

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-surface-elevated-dark text-primary'
        : 'text-muted hover:text-on-dark hover:bg-surface-elevated-dark'
    }`;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM';

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-hairline-on-dark">
        <div className="flex items-center gap-3">
          <img
            src="/map-logo.png"
            alt="MAP"
            className="w-8 h-8 rounded-full object-contain bg-primary p-1"
          />
          <span className="text-title-md text-primary">
            MAP Platform
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon size={18} className="flex-shrink-0 transition-colors" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="my-4 mx-4 border-t border-hairline-on-dark" />
            <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
              Administration
            </p>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={18} className="flex-shrink-0 transition-colors" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Compact user footer — clicking navigates to Settings/Profile */}
      <div className="p-3 border-t border-hairline-on-dark">
        <button
          onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface-elevated-dark transition-colors duration-200 group"
        >
          <div className="w-8 h-8 rounded-full bg-surface-elevated-dark border border-hairline-on-dark flex items-center justify-center text-xs font-bold text-on-dark flex-shrink-0">
            {(user?.username ?? user?.email ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-on-dark truncate">
              {user?.username ?? 'User'}
            </p>
            <p className="text-[10px] text-muted truncate capitalize">{user?.tier ?? 'free'} plan</p>
          </div>
          <Settings size={14} className="text-muted group-hover:text-on-dark transition-colors flex-shrink-0" />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-canvas-dark overflow-hidden">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-canvas-dark border-b border-hairline-on-dark flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <img
            src="/map-logo.png"
            alt="MAP"
            className="w-7 h-7 rounded-full object-contain bg-primary p-1"
          />
          <span className="text-sm font-bold text-primary">MAP</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-muted hover:text-on-dark transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-64 flex-shrink-0 bg-canvas-dark border-r border-hairline-on-dark flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pt-14 lg:pt-0">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

