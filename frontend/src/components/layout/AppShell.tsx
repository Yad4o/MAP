import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../../api/tasks';
import { TaskStatus } from '../../types/task';
import {
  LayoutDashboard,
  Plus,
  Clock,
  Terminal,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks/new',  label: 'New Task',  icon: Plus },
  { to: '/history',    label: 'History',   icon: Clock },
  { to: '/logs',       label: 'Logs',      icon: Terminal },
  { to: '/settings',   label: 'Settings',  icon: Settings },
];

const adminItems = [
  { to: '/admin', label: 'Admin', icon: Shield },
];

const RECENT_LIMIT = 8;

const dotColor = (status: TaskStatus) => {
  if (status === TaskStatus.PROCESSING || status === TaskStatus.RETRYING) return '#7ee787';
  if (status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) return '#f85149';
  return '#ffd11a';
};

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const recentTasks = [...(tasks ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, RECENT_LIMIT);

  useEffect(() => {
    document.body.classList.add('theme-dark');
    return () => {
      // Keep theme-dark consistent on shell lifecycle
    };
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `wise-nav-link ${isActive ? 'active' : ''}`;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM';
  const initials = (user?.username ?? user?.email ?? 'U').charAt(0).toUpperCase();

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-[72px] flex items-center px-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#9fe870' }}>
            <img
              src="/map-logo.png"
              alt="MAP"
              className="w-5 h-5 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-sm font-black text-[#0e0f0c] hidden [img:not([style*='none'])~&]:hidden">M</span>
          </div>
          <div>
            <span className="font-display font-black text-[15px] text-[#eaecef] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              MAP Platform
            </span>
            <p className="text-[10px] text-[#848e9c] font-semibold uppercase tracking-widest leading-none mt-0.5">
              Multi-Agent
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-[#848e9c]">
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon size={17} className="flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="my-4 mx-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-[#848e9c]">
              Administration
            </p>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={17} className="flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {recentTasks.length > 0 && (
          <>
            <div className="my-4 mx-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#848e9c]">
              Recent
            </p>
            <div className="space-y-0.5">
              {recentTasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl transition-colors duration-150 hover:bg-white/[0.06]"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: dotColor(task.status as TaskStatus) }}
                  />
                  <span className="text-[13px] truncate text-[#8b949e] hover:text-[#eaecef]" title={task.title}>
                    {task.title}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors duration-150 group hover:bg-[#1e232a]"
        >
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-[#0e0f0c] flex-shrink-0"
            style={{ background: '#9fe870' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-[#eaecef] truncate">
              {user?.username ?? 'User'}
            </p>
            <p className="text-[11px] text-[#848e9c] truncate capitalize">{user?.tier ?? 'free'} plan</p>
          </div>
          <Settings size={14} className="text-[#848e9c] group-hover:text-[#eaecef] transition-colors flex-shrink-0" />
        </button>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 mt-1 group hover:bg-[#3e1414]"
        >
          <LogOut size={15} className="text-[#848e9c] group-hover:text-[#f85149] transition-colors flex-shrink-0" />
          <span className="text-sm font-semibold text-[#848e9c] group-hover:text-[#f85149] transition-colors">Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    /* Dark canvas fills the entire shell */
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#0b0e11', color: '#eaecef' }}>

      {/* ── Mobile header ── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40"
        style={{ background: '#0e1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#9fe870' }}>
            <span className="text-xs font-black text-[#0e0f0c]">M</span>
          </div>
          <span className="text-sm font-black text-[#eaecef]" style={{ fontFamily: 'Manrope, sans-serif' }}>MAP</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-[#848e9c] hover:bg-[#1e232a] transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-[240px] flex-shrink-0 flex flex-col transition-transform duration-300 wise-sidebar ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pt-14 lg:pt-0">
        <div className="flex-1 overflow-y-auto p-5 lg:p-8">
          <div className="max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
