import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../api/tasks';
import { Task, TaskStatus } from '../types/task';
import { Plus, Trash2, Loader2, AlertCircle, CheckSquare, Clock, Zap, RefreshCcw, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';

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

export default function TaskListPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

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
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
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

  // ── Main render ──────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Tasks</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage your team's tasks and priorities.
          </p>
        </div>
        <Link
          to="/tasks/new"
          id="create-task-btn"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={18} />
          Create Task
        </Link>
      </div>

      {/* Empty state */}
      {!tasks || tasks.length === 0 ? (
        <div className="glass-card text-center p-16">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckSquare className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No tasks yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
            Create the first task to kick off your automation pipeline.
          </p>
          <Link
            to="/tasks/new"
            className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <Plus size={16} />
            Create Task
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: Task) => {
            const config = statusConfig[task.status as TaskStatus] ?? {
              bg: 'bg-slate-500/10 border-slate-500/20',
              text: 'text-slate-400',
              dot: 'bg-slate-400',
              icon: Clock,
            };
            const StatusIcon = config.icon;

            return (
              <div
                key={task.id}
                className="group glass-card p-5 hover:border-cyan-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5"
              >
                {/* Status badge + delete */}
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${config.bg} ${config.text}`}
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
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Delete task"
                  >
                    {deletingId === task.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>

                {/* Title */}
                <h3
                  className="text-base font-semibold text-white mb-2 truncate"
                  title={task.title}
                >
                  {task.title}
                </h3>

                {/* Description */}
                {task.description && (
                  <p className="text-slate-400 line-clamp-2 text-sm leading-relaxed mb-4">
                    {task.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-xs text-slate-500">
                    {new Date(task.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
