// ALREADY EXISTS AS STUB — implementing content per task instructions

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { adminApi } from "../api/admin";
import { 
  Users, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Shield, 
  User as UserIcon,
  Loader2,
  AlertCircle,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { AdminUser } from "../types";

/**
 * AdminPage provides global system metrics and user management.
 * Access is restricted to users with the ADMIN role.
 * 
 * Requirements:
 * - Metrics cards: tasks today, success rate, duration, active users.
 * - User table with toggle active/inactive and role management.
 */
export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Redundant route guard if AdminRoute is used in App.tsx, but good for defense-in-depth
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      navigate("/tasks");
    }
  }, [user, navigate]);

  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: adminApi.getMetrics,
  });

  const { data: users, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.getUsers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminUser> }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  if (user?.role !== "ADMIN") return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-400 mt-2">Global system overview and user management.</p>
      </div>

      {(metricsError || usersError) && (
        <div className="glass-card p-4 border-red-500/20 bg-red-500/5 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Failed to synchronize some administrative data. Please refresh or try again later.</p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Tasks Today" 
          value={metrics?.total_tasks_today ?? 0} 
          icon={Activity} 
          color="text-blue-400"
          isLoading={metricsLoading}
        />
        <MetricCard 
          title="Success Rate" 
          value={`${metrics?.success_rate ?? 0}%`} 
          icon={CheckCircle2} 
          color="text-emerald-400"
          isLoading={metricsLoading}
        />
        <MetricCard 
          title="Avg Task Duration" 
          value={`${metrics?.avg_task_duration ?? 0}s`} 
          icon={Clock} 
          color="text-amber-400"
          isLoading={metricsLoading}
        />
        <MetricCard 
          title="Active Users" 
          value={metrics?.active_users ?? 0} 
          icon={Users} 
          color="text-violet-400"
          isLoading={metricsLoading}
        />
      </div>

      {/* User Management Section */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-violet-400" />
            <h2 className="text-xl font-semibold text-white">User Management</h2>
          </div>
          <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-slate-500 uppercase">
            {users?.length ?? 0} Users Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-500" />
                    <p className="text-sm">Fetching user directory...</p>
                  </td>
                </tr>
              ) : (
                users?.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center group-hover:border-violet-500/30 transition-colors shadow-inner">
                          <UserIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white leading-none mb-1">{u.username}</div>
                          <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={u.role}
                        onChange={(e) => {
                          const newRole = e.target.value as AdminUser['role'];
                          if (window.confirm(`Change ${u.username}'s role to ${newRole}?`)) {
                            updateMutation.mutate({ id: u.id, data: { role: newRole } });
                          }
                        }}
                        className="bg-transparent text-sm text-slate-300 border-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                      >
                        <option value="USER" className="bg-[#0f172a]">User</option>
                        <option value="ADMIN" className="bg-[#0f172a]">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{u.tier}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        u.is_active ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 font-mono">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-300 ${
                          u.is_active 
                          ? 'text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20' 
                          : 'text-emerald-400 hover:bg-emerald-400/10 border border-transparent hover:border-emerald-400/20'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
}

function MetricCard({ title, value, icon: Icon, color, isLoading }: MetricCardProps) {
  return (
    <div className="glass-card p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-500">
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-2" />
          ) : (
            <h3 className="text-3xl font-bold text-white tracking-tighter mt-1">{value}</h3>
          )}
        </div>
        <div className={`p-3 rounded-2xl bg-white/5 ${color} group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-black/20`}>
          <Icon size={22} />
        </div>
      </div>
      
      {/* Subtle background glow */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${color.replace('text', 'bg')}`} />
    </div>
  );
}
