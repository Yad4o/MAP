import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare } from 'lucide-react';

export default function AppShell() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-gray-900">MAP Platform</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* TODO: add <NavLink to="/dashboard"> once DashboardPage is implemented */}
          <NavLink to="/tasks" className={navLinkClass}>
            <CheckSquare size={20} />
            <span>Tasks</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
