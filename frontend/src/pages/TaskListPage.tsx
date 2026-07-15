import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../api/tasks';
import { Task, TaskStatus } from '../types/task';
import { Plus, Trash2, Loader2, AlertCircle, CheckSquare, Clock, Zap, RefreshCcw, Ban, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const statusConfig: Record<TaskStatus, { bg: string; text: string; dot: string; icon: typeof Clock }> = {
  [TaskStatus.PENDING]: {
    bg: 'bg-primary/10 border-primary/20',
    text: 'text-primary',
    dot: 'bg-primary',
    icon: Clock,
  },
  [TaskStatus.PROCESSING]: {
    bg: 'bg-info/10 border-info/20',
    text: 'text-info',
    dot: 'bg-info animate-pulse',
    icon: Zap,
  },
  [TaskStatus.RETRYING]: {
    bg: 'bg-info/10 border-info/20',
    text: 'text-info',
    dot: 'bg-info animate-pulse',
    icon: RefreshCcw,
  },
  [TaskStatus.COMPLETED]: {
    bg: 'bg-trading-up/10 border-trading-up/20',
    text: 'text-trading-up',
    dot: 'bg-trading-up',
    icon: CheckSquare,
  },
  [TaskStatus.FAILED]: {
    bg: 'bg-trading-down/10 border-trading-down/20',
    text: 'text-trading-down',
    dot: 'bg-trading-down',
    icon: AlertCircle,
  },
  [TaskStatus.CANCELLED]: {
    bg: 'bg-surface-elevated-dark border-hairline-on-dark',
    text: 'text-muted',
    dot: 'bg-muted',
    icon: Ban,
  },
};

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
      <div className="flex surface-card h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted">Loading tasks…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="surface-card p-8 flex flex-col items-center justify-center text-trading-down border border-trading-down/20">
        <AlertCircle className="w-10 h-10 mb-3 opacity-80" />
        <p className="font-semibold text-lg">Failed to load tasks</p>
        <p className="text-sm text-muted mt-1">
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
    <div className="space-y-[theme(spacing.md)] max-w-[1280px] mx-auto">
      {/* Welcome banner */}
      <div className="surface-card p-[theme(spacing.xl)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
              Multi-Agent Platform
            </p>
            <h1 className="text-display-sm text-on-dark">
              {greeting()}{user?.username ? `, ${user.username}` : ''} 👋
            </h1>
            <p className="text-muted mt-1 text-sm">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[theme(spacing.lg)]">
          {[
            { label: 'Total', value: total, color: 'text-on-dark', dot: 'bg-muted' },
            { label: 'Completed', value: completed, color: 'text-trading-up', dot: 'bg-trading-up' },
            { label: 'Running', value: running, color: 'text-info', dot: 'bg-info' },
            { label: 'Pending', value: pending, color: 'text-primary', dot: 'bg-primary' },
          ].map(s => (
            <div key={s.label} className="surface-card px-6 py-4 flex items-center gap-4">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <div>
                <div className={`text-number-display ${s.color} text-4xl`}>{s.value}</div>
                <div className="text-xs text-muted-strong uppercase tracking-widest font-semibold mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!tasks || tasks.length === 0 ? (
        <div className="surface-card text-center p-[theme(spacing.section)] relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <CheckSquare className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-title-lg text-on-dark mb-1">No tasks yet</h3>
            <p className="text-muted text-sm mb-6 max-w-xs mx-auto">
              Describe what you need done in plain language — MAP's agents will plan, execute, and validate it automatically.
            </p>
            <Link
              to="/tasks/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-surface-elevated-dark border border-hairline-on-dark text-on-dark hover:bg-surface-strong-light/10 font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              Create your first task
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mt-8">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-widest">
              All Tasks <span className="text-muted-strong ml-1">({total})</span>
            </h2>
          </div>
          <div className="grid gap-[theme(spacing.lg)] md:grid-cols-2 lg:grid-cols-3 mt-4">
            {tasks.map((task: Task) => {
              const config = statusConfig[task.status as TaskStatus] ?? {
                bg: 'bg-surface-elevated-dark border-hairline-on-dark',
                text: 'text-muted',
                dot: 'bg-muted',
                icon: Clock,
              };
              const priorityLabel = task.priority >= 7 ? 'High' : task.priority >= 4 ? 'Med' : 'Low';
              const priorityColor = task.priority >= 7 ? 'text-trading-down' : task.priority >= 4 ? 'text-primary' : 'text-muted';

              return (
                <div
                  key={task.id}
                  className="group surface-card p-[theme(spacing.lg)] border border-transparent hover:border-hairline-on-dark transition-all duration-300 flex flex-col"
                >
                  {/* Status badge + delete */}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${config.bg} ${config.text}`}
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
                      className="text-muted hover:text-trading-down p-1.5 rounded-md hover:bg-trading-down/10 transition-colors duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="text-title-sm text-on-dark mb-1.5 line-clamp-2 flex-1"
                    title={task.title}
                  >
                    {task.title}
                  </h3>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-strong font-medium">
                        {new Date(task.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className={`text-[11px] font-bold ${priorityColor}`}>· {priorityLabel}</span>
                    </div>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-active transition-colors"
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
      <div className="surface-card p-[theme(spacing.lg)] mt-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">How MAP works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
              <div key={item.step} className="flex gap-4">
                <span className="text-title-lg font-black text-muted-strong/30 leading-none mt-0.5 select-none">{item.step}</span>
                <div>
                  <p className="text-sm font-semibold text-on-dark mb-1">{item.title}</p>
                  <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

