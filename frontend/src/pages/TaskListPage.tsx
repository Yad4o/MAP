import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../api/tasks';
import { Task, TaskStatus } from '../types/task';
import {
  Plus, Trash2, Loader2, AlertCircle, CheckSquare,
  Clock, Zap, RefreshCcw, Ban, ArrowRight, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/* ── Status configuration ─────────────────────────────────────────────────── */
const statusConfig: Record<TaskStatus, {
  badgeBg: string; badgeText: string; dot: string; icon: typeof Clock; label: string;
}> = {
  [TaskStatus.PENDING]: {
    badgeBg: '#fff5c2', badgeText: '#4a3b1c', dot: '#ffd11a',
    icon: Clock, label: 'Pending',
  },
  [TaskStatus.PROCESSING]: {
    badgeBg: '#e2f6d5', badgeText: '#054d28', dot: '#2ead4b',
    icon: Zap, label: 'Running',
  },
  [TaskStatus.RETRYING]: {
    badgeBg: '#e2f6d5', badgeText: '#054d28', dot: '#2ead4b',
    icon: RefreshCcw, label: 'Retrying',
  },
  [TaskStatus.COMPLETED]: {
    badgeBg: '#e2f6d5', badgeText: '#054d28', dot: '#2ead4b',
    icon: CheckSquare, label: 'Completed',
  },
  [TaskStatus.FAILED]: {
    badgeBg: '#fde8e9', badgeText: '#a7000d', dot: '#d03238',
    icon: AlertCircle, label: 'Failed',
  },
  [TaskStatus.CANCELLED]: {
    badgeBg: '#e8ebe6', badgeText: '#454745', dot: '#868685',
    icon: Ban, label: 'Cancelled',
  },
};

const priorityConfig = (p: number) =>
  p >= 7
    ? { label: 'High', color: '#d03238', bg: '#fde8e9' }
    : p >= 4
    ? { label: 'Med',  color: '#b86700', bg: '#fff5c2' }
    : { label: 'Low',  color: '#868685', bg: '#e8ebe6' };

/* ── Status section definitions ───────────────────────────────────────────── */
type SectionKey = 'Running' | 'Pending' | 'Failed' | 'Completed';

const SECTIONS: {
  key: SectionKey;
  statuses: TaskStatus[];
  sectionBg: string;
  sectionColor: string;
  defaultOpen: boolean;
}[] = [
  {
    key: 'Running',
    statuses: [TaskStatus.PROCESSING, TaskStatus.RETRYING],
    sectionBg: '#e2f6d5', sectionColor: '#054d28',
    defaultOpen: true,
  },
  {
    key: 'Pending',
    statuses: [TaskStatus.PENDING],
    sectionBg: '#fff5c2', sectionColor: '#4a3b1c',
    defaultOpen: true,
  },
  {
    key: 'Failed',
    statuses: [TaskStatus.FAILED],
    sectionBg: '#fde8e9', sectionColor: '#a7000d',
    defaultOpen: true,
  },
  {
    key: 'Completed',
    statuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
    sectionBg: '#e8ebe6', sectionColor: '#454745',
    defaultOpen: false, // Collapsed by default — largest group
  },
];

/* ── Task Card ────────────────────────────────────────────────────────────── */
function TaskCard({
  task,
  deletingId,
  onDelete,
}: {
  task: Task;
  deletingId: string | number | null;
  onDelete: (id: string | number) => void;
}) {
  const cfg = statusConfig[task.status as TaskStatus] ?? statusConfig[TaskStatus.CANCELLED];
  const pCfg = priorityConfig(task.priority);
  const Icon = cfg.icon;
  const isLive = task.status === TaskStatus.PROCESSING || task.status === TaskStatus.RETRYING;

  return (
    <div
      className="wise-card group flex flex-col transition-shadow duration-200 hover:shadow-card-hover"
      style={{ padding: '20px' }}
    >
      {/* Top: badge + delete */}
      <div className="flex justify-between items-start mb-3">
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold"
          style={{ background: cfg.badgeBg, color: cfg.badgeText }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: cfg.dot,
              animation: isLive ? 'pulse 1.5s infinite' : 'none',
            }}
          />
          <Icon size={11} />
          {cfg.label}
        </span>

        <button
          onClick={() => {
            if (window.confirm('Delete this task?')) onDelete(task.id);
          }}
          disabled={deletingId === task.id}
          aria-label="Delete task"
          className="p-1.5 rounded-lg transition-colors duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: '#868685' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fde8e9';
            (e.currentTarget as HTMLButtonElement).style.color = '#d03238';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#868685';
          }}
        >
          {deletingId === task.id
            ? <Loader2 size={14} className="animate-spin" />
            : <Trash2 size={14} />
          }
        </button>
      </div>

      {/* Title — primary hierarchy */}
      <h3
        className="text-base font-semibold leading-snug mb-2 line-clamp-2 flex-1"
        style={{ color: '#0e0f0c', fontFamily: 'Inter, sans-serif' }}
        title={task.title}
      >
        {task.title}
      </h3>

      {/* Footer — secondary, muted */}
      <div
        className="flex items-center justify-between pt-3 mt-auto"
        style={{ borderTop: '1px solid #e8ebe6' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: '#868685' }}>
            {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: pCfg.bg, color: pCfg.color }}
          >
            {pCfg.label}
          </span>
        </div>
        <Link
          to={`/tasks/${task.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
          style={{ color: '#0e0f0c' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#454745')}
          onMouseLeave={e => (e.currentTarget.style.color = '#0e0f0c')}
        >
          View <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

/* ── Section Row ──────────────────────────────────────────────────────────── */
function StatusSection({
  label,
  tasks,
  sectionBg,
  sectionColor,
  defaultOpen,
  deletingId,
  onDelete,
}: {
  label: string;
  tasks: Task[];
  sectionBg: string;
  sectionColor: string;
  defaultOpen: boolean;
  deletingId: string | number | null;
  onDelete: (id: string | number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (tasks.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 mb-3 w-full text-left group"
      >
        <span
          className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
          style={{ background: sectionBg, color: sectionColor }}
        >
          {label}
        </span>
        <span
          className="text-[11px] font-bold"
          style={{ color: sectionColor }}
        >
          {tasks.length}
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: `${sectionBg}` }}
        />
        <span style={{ color: '#868685' }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* Cards grid */}
      {open && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              deletingId={deletingId}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
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
    onError: () => setDeletingId(null),
  });

  const handleDelete = (id: string | number) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex wise-card h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#9fe870' }} />
          <p className="text-sm" style={{ color: '#868685' }}>Loading tasks…</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (isError) {
    return (
      <div className="wise-card flex flex-col items-center justify-center p-12" style={{ border: '1px solid #fde8e9' }}>
        <AlertCircle className="w-10 h-10 mb-3" style={{ color: '#d03238' }} />
        <p className="font-semibold text-lg" style={{ color: '#0e0f0c' }}>Failed to load tasks</p>
        <p className="text-sm mt-1" style={{ color: '#868685' }}>Please check your connection and try again.</p>
      </div>
    );
  }

  /* ── Derived counts ── */
  const total     = tasks?.length ?? 0;
  const completed = tasks?.filter(t => t.status === TaskStatus.COMPLETED).length ?? 0;
  const running   = tasks?.filter(t => t.status === TaskStatus.PROCESSING || t.status === TaskStatus.RETRYING).length ?? 0;
  const pending   = tasks?.filter(t => t.status === TaskStatus.PENDING).length ?? 0;
  const failed    = tasks?.filter(t => t.status === TaskStatus.FAILED).length ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /* ── Stat cards ── */
  const stats = [
    { label: 'Total',     value: total,     color: '#0e0f0c', dot: '#868685', dotBg: '#e8ebe6' },
    { label: 'Completed', value: completed, color: '#054d28', dot: '#2ead4b', dotBg: '#e2f6d5' },
    { label: 'Running',   value: running,   color: '#054d28', dot: '#2ead4b', dotBg: '#e2f6d5' },
    { label: 'Pending',   value: pending,   color: '#4a3b1c', dot: '#ffd11a', dotBg: '#fff5c2' },
    { label: 'Failed',    value: failed,    color: '#a7000d', dot: '#d03238', dotBg: '#fde8e9' },
  ];

  /* ── Sort tasks newest-first for use in sections ── */
  const sorted = [...(tasks ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-5 animate-wise-fade-up">

      {/* ── Welcome banner ── */}
      <div className="wise-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-2"
            style={{ color: '#9fe870', fontFamily: 'Inter, sans-serif' }}
          >
            Multi-Agent Platform
          </p>
          <h1
            className="text-3xl leading-tight mb-1"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 900,
              color: '#0e0f0c',
              letterSpacing: '-0.5px',
            }}
          >
            {greeting()}{user?.username ? `, ${user.username}` : ''} 👋
          </h1>
          <p className="text-sm" style={{ color: '#454745' }}>
            Your intelligent automation workspace. Describe a task — MAP handles the rest.
          </p>
        </div>
        <Link
          to="/tasks/new"
          id="create-task-btn"
          className="btn-wise-primary inline-flex items-center gap-2 whitespace-nowrap flex-shrink-0"
          style={{ fontSize: '14px', padding: '10px 20px' }}
        >
          <Plus size={16} />
          New Task
        </Link>
      </div>

      {/* ── Stats row ── */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {stats.map(s => (
            <div key={s.label} className="wise-card flex items-center gap-4 py-5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: s.dotBg }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
              </div>
              <div>
                <div className="text-number-display text-3xl" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div
                  className="text-[11px] uppercase tracking-widest font-semibold mt-0.5"
                  style={{ color: '#868685' }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!tasks || tasks.length === 0 ? (
        <div className="wise-card text-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: '#e2f6d5' }}
          >
            <CheckSquare className="w-8 h-8" style={{ color: '#2ead4b' }} />
          </div>
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, color: '#0e0f0c' }}
          >
            No tasks yet
          </h3>
          <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: '#454745' }}>
            Describe what you need done in plain language — MAP's agents will plan,
            execute, and validate it automatically.
          </p>
          <Link
            to="/tasks/new"
            className="btn-wise-primary inline-flex items-center gap-2"
            style={{ fontSize: '14px', padding: '10px 22px' }}
          >
            <Plus size={16} />
            Create your first task
          </Link>
        </div>
      ) : (
        /* ── Status-grouped sections ── */
        <div className="space-y-6 pt-2">
          {SECTIONS.map(sec => {
            const sectionTasks = sorted.filter(t => sec.statuses.includes(t.status as TaskStatus));
            return (
              <StatusSection
                key={sec.key}
                label={sec.key}
                tasks={sectionTasks}
                sectionBg={sec.sectionBg}
                sectionColor={sec.sectionColor}
                defaultOpen={sec.defaultOpen}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* ── How MAP Works ── */}
      <div className="wise-card mt-4">
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-5"
          style={{ color: '#868685' }}
        >
          How MAP works
        </p>
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
              <span
                className="text-4xl font-black leading-none mt-0.5 select-none flex-shrink-0"
                style={{ color: '#e8ebe6', fontFamily: 'Manrope, sans-serif' }}
              >
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#0e0f0c' }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#454745' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
