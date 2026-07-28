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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/tasks/new',  label: 'New Task',  icon: Plus },
  { to: '/history',    label: 'History',   icon: Clock },
  { to: '/logs',       label: 'Logs',      icon: Terminal },
  { to: '/settings',   label: 'Settings',  icon: Settings },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('map-sidebar-collapsed') === '1'
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('map-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

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
      {/* Logo + collapse toggle */}
      <div
        className={`flex-shrink-0 flex items-center ${collapsed ? 'flex-col justify-center py-3 px-2' : 'h-[64px] justify-between px-4'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/map-icon.png"
              alt=""
              aria-hidden="true"
              className="w-7 h-7 object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <span
                className="font-display font-black text-[15px] text-[#eaecef] tracking-tight block truncate"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                MAP Platform
              </span>
              <p className="text-[10px] text-[#848e9c] font-semibold uppercase tracking-widest leading-none mt-0.5">
                Multi-Agent
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <img
            src="/map-icon.png"
            alt=""
            aria-hidden="true"
            className="w-6 h-6 object-contain flex-shrink-0 mb-2"
          />
        )}

        {/* Collapse toggle — desktop only, mirrors the Claude-style rail control */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-[#848e9c] hover:bg-white/[0.08] hover:text-[#eaecef] transition-colors flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-[#848e9c]">
            Navigation
          </p>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
            title={collapsed ? item.label : undefined}
            style={collapsed ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 } : undefined}
          >
            <item.icon size={17} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="my-4 mx-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            {!collapsed && (
              <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-[#848e9c]">
                Administration
              </p>
            )}
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                style={collapsed ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 } : undefined}
              >
                <item.icon size={17} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {!collapsed && recentTasks.length > 0 && (
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
      <div className={`p-2 flex-shrink-0 ${collapsed ? '' : 'p-3'}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
          title={collapsed ? 'Settings' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition-colors duration-150 group hover:bg-white/[0.06] ${
            collapsed ? 'justify-center py-2' : 'px-3 py-3'
          }`}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#f2f2f0] flex-shrink-0"
            style={{ background: '#3a3b3f' }}
          >
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-[#eaecef] truncate">
                  {user?.username ?? 'User'}
                </p>
                <p className="text-[11px] text-[#848e9c] truncate capitalize">{user?.tier ?? 'free'} plan</p>
              </div>
              <Settings size={14} className="text-[#848e9c] group-hover:text-[#eaecef] transition-colors flex-shrink-0" />
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          title={collapsed ? 'Sign out' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition-colors duration-150 mt-1 group hover:bg-[#3e1414] ${
            collapsed ? 'justify-center py-2' : 'px-3 py-2'
          }`}
        >
          <LogOut size={15} className="text-[#848e9c] group-hover:text-[#f85149] transition-colors flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold text-[#848e9c] group-hover:text-[#f85149] transition-colors">Sign out</span>
          )}
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
        style={{ background: '#191a1d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <img src="/map-icon.png" alt="" aria-hidden="true" className="w-6 h-6 object-contain" />
          <span className="text-sm font-black text-[#eaecef]" style={{ fontFamily: 'Manrope, sans-serif' }}>MAP</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-[#848e9c] hover:bg-white/[0.08] transition-colors"
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
        className={`fixed lg:static z-50 top-0 left-0 h-full flex-shrink-0 flex flex-col transition-[transform,width] duration-200 wise-sidebar w-[240px] ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-[240px]'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
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
