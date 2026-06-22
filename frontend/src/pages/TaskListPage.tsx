import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../api/tasks';
import { Task, TaskStatus } from '../types/task';
import { Plus, Trash2, Loader2, AlertCircle, CheckSquare, Clock, Zap, RefreshCcw, Ban, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const statusConfig: Record<TaskStatus, { bg: string; text: string; dot: string; icon: typeof Clock }> = {
  [TaskStatus.PENDING]: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    icon: Clock,
  },
  [TaskStatus.PROCESSING]: {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
    dot: 'bg-blue-400 animate-pulse',
    icon: Zap,
  },
  [TaskStatus.RETRYING]: {
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    text: 'text-indigo-400',
    dot: 'bg-indigo-400 animate-pulse',
    icon: RefreshCcw,
  },
  [TaskStatus.COMPLETED]: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    icon: CheckSquare,
  },
  [TaskStatus.FAILED]: {
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-400',
    icon: AlertCircle,
  },
  [TaskStatus.CANCELLED]: {
    bg: 'bg-slate-500/10 border-slate-500/20',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    icon: Ban,
  },
};

// Lightweight decorative SVG — no WebGL, no animation, just a grid pattern
function GridDecoration() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="tl-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#tl-grid)" />
    </svg>
  );
}

export default function TaskListPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const user = useAuthStore((s) => s.user);

  const { data: tasks, isLoading, isError } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  // ── Loading ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex glass-card h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading tasks…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center text-red-400 border-red-500/20">
        <AlertCircle className="w-10 h-10 mb-3 opacity-80" />
        <p className="font-semibold text-lg">Failed to load tasks</p>
        <p className="text-sm text-slate-500 mt-1">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  const total = tasks?.length ?? 0;
  const completed = tasks?.filter(t => t.status === TaskStatus.COMPLETED).length ?? 0;
  const running = tasks?.filter(t => t.status === TaskStatus.PROCESSING || t.status === TaskStatus.RETRYING).length ?? 0;
  const pending = tasks?.filter(t => t.status === TaskStatus.PENDING).length ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ── Main render ──────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Welcome banner */}
      <div className="relative glass-card p-6 overflow-hidden">
        <GridDecoration />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">
              Multi-Agent Platform
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {greeting()}{user?.username ? `, ${user.username}` : ''} 👋
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Your intelligent automation workspace. Describe a task — MAP handles the rest.
            </p>
          </div>
          <Link
            to="/tasks/new"
            id="create-task-btn"
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} />
            New Task
          </Link>
        </div>
      </div>

      {/* Stats row */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: total, color: 'text-white', dot: 'bg-white/20' },
            { label: 'Completed', value: completed, color: 'text-emerald-400', dot: 'bg-emerald-400' },
            { label: 'Running', value: running, color: 'text-blue-400', dot: 'bg-blue-400' },
            { label: 'Pending', value: pending, color: 'text-amber-400', dot: 'bg-amber-400' },
          ].map(s => (
            <div key={s.label} className="glass-card px-4 py-3 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!tasks || tasks.length === 0 ? (
        <div className="glass-card text-center p-16 relative overflow-hidden">
          <GridDecoration />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckSquare className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No tasks yet</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
              Describe what you need done in plain language — MAP's agents will plan, execute, and validate it automatically.
            </p>
            <Link
              to="/tasks/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 font-medium text-sm transition-all"
            >
              <Plus size={16} />
              Create your first task
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              All Tasks <span className="text-slate-600 ml-1">({total})</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task: Task) => {
              const config = statusConfig[task.status as TaskStatus] ?? {
                bg: 'bg-slate-500/10 border-slate-500/20',
                text: 'text-slate-400',
                dot: 'bg-slate-400',
                icon: Clock,
              };
              const StatusIcon = config.icon;
              const priorityLabel = task.priority >= 7 ? 'High' : task.priority >= 4 ? 'Med' : 'Low';
              const priorityColor = task.priority >= 7 ? 'text-red-400' : task.priority >= 4 ? 'text-amber-400' : 'text-slate-500';

              return (
                <div
                  key={task.id}
                  className="group glass-card p-5 hover:border-indigo-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 flex flex-col"
                >
                  {/* Status badge + delete */}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${config.bg} ${config.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                      {task.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this task?')) {
                          setDeletingId(task.id);
                          deleteMutation.mutate(task.id);
                        }
                      }}
                      disabled={deletingId === task.id}
                      className="text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Delete task"
                    >
                      {deletingId === task.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-sm font-semibold text-white mb-1.5 line-clamp-2 flex-1"
                    title={task.title}
                  >
                    {task.title}
                  </h3>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">
                        {new Date(task.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className={`text-[10px] font-bold ${priorityColor}`}>· {priorityLabel}</span>
                    </div>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* About MAP — shown when there's content to not be empty */}
      <div className="glass-card p-6 relative overflow-hidden">
        <GridDecoration />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">How MAP works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Describe',
                desc: 'Type what you need in plain language — no syntax, no commands. Just your intent.',
              },
              {
                step: '02',
                title: 'Plan & Execute',
                desc: "MAP's orchestrator breaks it into steps, assigns specialized agents, and runs them in parallel.",
              },
              {
                step: '03',
                title: 'Review Results',
                desc: 'Each step is logged with timing, token usage, and confidence scores for full transparency.',
              },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <span className="text-2xl font-black text-white/10 leading-none mt-0.5 select-none">{item.step}</span>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
