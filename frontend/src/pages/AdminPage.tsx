import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { adminApi } from "../api/admin";
import {
  Users, Activity, CheckCircle2, Clock, Shield,
  User as UserIcon, Loader2, AlertCircle,
} from "lucide-react";
import { AdminUser } from "../types";

export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== "ADMIN") navigate("/tasks");
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
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminUser> }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  if (user?.role !== "ADMIN") return null;

  const metricCards = [
    { title: 'Tasks Today',    value: metrics?.total_tasks_today ?? 0,  icon: Activity,     iconBg: '#e2f6d5', iconColor: '#2ead4b' },
    { title: 'Success Rate',   value: `${metrics?.success_rate ?? 0}%`, icon: CheckCircle2, iconBg: '#e2f6d5', iconColor: '#054d28' },
    { title: 'Avg Duration',   value: `${metrics?.avg_task_duration ?? 0}s`, icon: Clock,  iconBg: '#fff5c2', iconColor: '#4a3b1c' },
    { title: 'Active Users',   value: metrics?.active_users ?? 0,       icon: Users,        iconBg: '#e2f6d5', iconColor: '#2ead4b' },
  ];

  return (
    <div className="space-y-5 animate-wise-fade-up max-w-[1200px] mx-auto">

      {/* ── Page header ── */}
      <div className="wise-card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: '#e2f6d5' }}
          >
            <Shield className="w-5 h-5" style={{ color: '#2ead4b' }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'Manrope, sans-serif', fontWeight: 900,
                fontSize: '26px', lineHeight: '1.2', color: '#0e0f0c',
              }}
            >
              Admin Dashboard
            </h1>
            <p className="text-sm" style={{ color: '#454745' }}>
              Global system overview and user management.
            </p>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {(metricsError || usersError) && (
        <div
          className="wise-card flex items-center gap-3 text-sm"
          style={{ background: '#fde8e9', border: '1px solid rgba(208,50,56,0.2)', color: '#a7000d' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>Failed to load some administrative data. Please refresh.</p>
        </div>
      )}

      {/* ── Metrics grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.title} className="wise-card">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
                  {m.title}
                </p>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: m.iconBg }}
                >
                  <Icon className="w-4 h-4" style={{ color: m.iconColor }} />
                </div>
              </div>
              {metricsLoading ? (
                <div className="h-8 rounded-xl animate-pulse" style={{ background: '#e8ebe6' }} />
              ) : (
                <p
                  className="text-3xl font-black"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0e0f0c' }}
                >
                  {m.value}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── User management card ── */}
      <div className="wise-card overflow-hidden" style={{ padding: 0 }}>
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #e8ebe6' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: '#e2f6d5' }}
            >
              <Users className="w-4 h-4" style={{ color: '#2ead4b' }} />
            </div>
            <h2 className="font-semibold text-sm" style={{ color: '#0e0f0c' }}>User Management</h2>
          </div>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: '#e8ebe6', color: '#454745' }}
          >
            {users?.length ?? 0} users
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: '#fafcf9', borderBottom: '1px solid #e8ebe6' }}>
                {['Identity', 'Role', 'Tier', 'Status', 'Last Login', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest ${i === 5 ? 'text-right' : ''}`}
                    style={{ color: '#868685' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: '#9fe870' }} />
                    <p className="text-sm" style={{ color: '#868685' }}>Loading users…</p>
                  </td>
                </tr>
              ) : (
                users?.map((u: AdminUser) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid #f0f2ef' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafcf9')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Identity */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: '#e2f6d5' }}
                        >
                          <UserIcon className="w-4 h-4" style={{ color: '#2ead4b' }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: '#0e0f0c' }}>{u.username}</div>
                          <div className="text-[11px] font-mono" style={{ color: '#868685' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={e => {
                          const newRole = e.target.value as AdminUser['role'];
                          if (window.confirm(`Change ${u.username}'s role to ${newRole}?`)) {
                            updateMutation.mutate({ id: u.id, data: { role: newRole } });
                          }
                        }}
                        className="text-sm font-semibold rounded-lg px-2 py-1 cursor-pointer outline-none"
                        style={{ background: '#e8ebe6', color: '#0e0f0c', border: 'none' }}
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>

                    {/* Tier */}
                    <td className="px-5 py-4">
                      <span
                        className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full"
                        style={{ background: '#e8ebe6', color: '#454745' }}
                      >
                        {u.tier}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          background: u.is_active ? '#e2f6d5' : '#fde8e9',
                          color:      u.is_active ? '#054d28' : '#a7000d',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: u.is_active ? '#2ead4b' : '#d03238' }}
                        />
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    {/* Last login */}
                    <td className="px-5 py-4">
                      <span className="text-[11px] font-mono" style={{ color: '#868685' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                        className="text-xs font-bold px-4 py-2 rounded-xl transition-all duration-150"
                        style={{
                          background: u.is_active ? '#fde8e9' : '#e2f6d5',
                          color:      u.is_active ? '#a7000d' : '#054d28',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
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
