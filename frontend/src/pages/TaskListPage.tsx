/**
 * TaskListPage.tsx — Aetheric Intelligence Design
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../api/tasks';
import { Task, TaskStatus } from '../types/task';
import { Plus, Trash2, Loader2, AlertCircle, CheckSquare, Clock, Zap, RefreshCcw, Ban, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type StatusConfig = {
  badge: string;
  dotColor: string;
  icon: typeof Clock;
  label: string;
};

const statusConfig: Record<TaskStatus, StatusConfig> = {
  [TaskStatus.PENDING]:    { badge: 'badge-pending',    dotColor: '#f59e0b', icon: Clock,       label: 'Pending' },
  [TaskStatus.PROCESSING]: { badge: 'badge-processing', dotColor: '#818cf8', icon: Zap,         label: 'Processing' },
  [TaskStatus.RETRYING]:  { badge: 'badge-retrying',   dotColor: '#ba9eff', icon: RefreshCcw,  label: 'Retrying' },
  [TaskStatus.COMPLETED]: { badge: 'badge-completed',  dotColor: '#10b981', icon: CheckSquare, label: 'Completed' },
  [TaskStatus.FAILED]:    { badge: 'badge-failed',     dotColor: '#ff6e84', icon: AlertCircle, label: 'Failed' },
  [TaskStatus.CANCELLED]: { badge: 'badge-cancelled',  dotColor: '#76747b', icon: Ban,         label: 'Cancelled' },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
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
    onSuccess: () => { setDeletingId(null); queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
    onError: () => setDeletingId(null),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading tasks…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card p-12 flex flex-col items-center text-center max-w-md mx-auto mt-20">
        <AlertCircle size={40} className="mb-4" style={{ color: 'var(--error)', opacity: 0.7 }} />
        <p className="font-semibold text-lg mb-1" style={{ color: 'var(--on-surface)' }}>Failed to load tasks</p>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Check your connection and try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Tasks
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            {tasks?.length ? `${tasks.length} task${tasks.length !== 1 ? 's' : ''}` : 'No tasks yet'}
          </p>
        </div>
        <Link to="/tasks/new" id="create-task-btn" className="btn-primary self-start sm:self-auto">
          <Plus size={16} />
          New Task
        </Link>
      </div>

      {/* Empty state */}
      {(!tasks || tasks.length === 0) ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card text-center py-24 px-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'rgba(132,85,239,0.1)', border: '1px solid rgba(186,158,255,0.15)' }}>
            <CheckSquare size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--on-surface)' }}>No tasks yet</h3>
          <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: 'var(--on-surface-variant)' }}>
            Create your first task to start the automation pipeline.
          </p>
          <Link to="/tasks/new" className="btn-primary inline-flex">
            <Plus size={16} />
            Create Task
          </Link>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {tasks.map((task: Task) => {
              const cfg = statusConfig[task.status as TaskStatus] ?? statusConfig[TaskStatus.PENDING];
              const StatusIcon = cfg.icon;
              const isDeleting = deletingId === task.id;

              return (
                <motion.div
                  key={task.id}
                  variants={cardVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card group flex flex-col p-5 cursor-default transition-all duration-200"
                  style={{ minHeight: 180 }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--surface-high)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--surface-container)';
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <span className={`badge ${cfg.badge}`}>
                      <span className="badge-dot"
                        style={{
                          backgroundColor: cfg.dotColor,
                          animation: (task.status === TaskStatus.PROCESSING || task.status === TaskStatus.RETRYING)
                            ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                        }}
                      />
                      <StatusIcon size={10} />
                      {cfg.label}
                    </span>

                    <button
                      onClick={() => {
                        if (window.confirm('Delete this task?')) {
                          setDeletingId(task.id);
                          deleteMutation.mutate(task.id);
                        }
                      }}
                      disabled={isDeleting}
                      aria-label="Delete task"
                      className="p-1.5 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: 'var(--outline)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,110,132,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--outline)';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {isDeleting
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold mb-2 truncate" style={{ color: 'var(--on-surface)' }} title={task.title}>
                    {task.title}
                  </h3>

                  {/* Description */}
                  {task.description && (
                    <p className="text-sm leading-relaxed flex-1 mb-4"
                      style={{
                        color: 'var(--on-surface-variant)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                      {task.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-3"
                    style={{ borderTop: '1px solid rgba(72,71,77,0.18)' }}>
                    <span className="text-xs" style={{ color: 'var(--outline)' }}>
                      {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: 'var(--primary)' }}
                    >
                      View <ChevronRight size={13} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
