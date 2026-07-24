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
    badgeBg: '#362a08', badgeText: '#ffd11a', dot: '#ffd11a',
    icon: Clock, label: 'Pending',
  },
  [TaskStatus.PROCESSING]: {
    badgeBg: '#123820', badgeText: '#7ee787', dot: '#2ead4b',
    icon: Zap, label: 'Running',
  },
  [TaskStatus.RETRYING]: {
    badgeBg: '#123820', badgeText: '#7ee787', dot: '#2ead4b',
    icon: RefreshCcw, label: 'Retrying',
  },
  [TaskStatus.COMPLETED]: {
    badgeBg: '#123820', badgeText: '#7ee787', dot: '#2ead4b',
    icon: CheckSquare, label: 'Completed',
  },
  [TaskStatus.FAILED]: {
    badgeBg: '#3e1414', badgeText: '#f85149', dot: '#d03238',
    icon: AlertCircle, label: 'Failed',
  },
  [TaskStatus.CANCELLED]: {
    badgeBg: '#1e232a', badgeText: '#8b949e', dot: '#868685',
    icon: Ban, label: 'Cancelled',
  },
};

const priorityConfig = (p: number) =>
  p >= 7
    ? { label: 'High', color: '#f85149', bg: '#3e1414' }
    : p >= 4
    ? { label: 'Med',  color: '#ffd11a', bg: '#362a08' }
    : { label: 'Low',  color: '#8b949e', bg: '#1e232a' };

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
    sectionBg: '#123820', sectionColor: '#7ee787',
    defaultOpen: true,
  },
  {
    key: 'Pending',
    statuses: [TaskStatus.PENDING],
    sectionBg: '#362a08', sectionColor: '#ffd11a',
    defaultOpen: true,
  },
  {
    key: 'Failed',
    statuses: [TaskStatus.FAILED],
    sectionBg: '#3e1414', sectionColor: '#f85149',
    defaultOpen: true,
  },
  {
    key: 'Completed',
    statuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
    sectionBg: '#1e232a', sectionColor: '#8b949e',
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
      className="wise-card-dark-surface group flex flex-col transition-shadow duration-200 hover:shadow-card-hover"
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
          style={{ color: '#848e9c' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#3e1414';
            (e.currentTarget as HTMLButtonElement).style.color = '#f85149';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#848e9c';
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
        style={{ color: '#eaecef', fontFamily: 'Inter, sans-serif' }}
        title={task.title}
      >
        {task.title}
      </h3>

      {/* Footer — secondary, muted */}
      <div
        className="flex items-center justify-between pt-3 mt-auto"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: '#848e9c' }}>
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
          style={{ color: '#eaecef' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#9fe870')}
          onMouseLeave={e => (e.currentTarget.style.color = '#eaecef')}
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
        <span style={{ color: '#848e9c' }}>
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
      <div className="flex wise-card-dark-surface h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#9fe870' }} />
          <p className="text-sm" style={{ color: '#848e9c' }}>Loading tasks…</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (isError) {
    return (
      <div className="wise-card-dark-surface flex flex-col items-center justify-center p-12" style={{ border: '1px solid rgba(208,50,56,0.3)' }}>
        <AlertCircle className="w-10 h-10 mb-3" style={{ color: '#f85149' }} />
        <p className="font-semibold text-lg" style={{ color: '#eaecef' }}>Failed to load tasks</p>
        <p className="text-sm mt-1" style={{ color: '#848e9c' }}>Please check your connection and try again.</p>
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
    { label: 'Total',     value: total,     color: '#eaecef', dot: '#868685', dotBg: '#1e232a' },
    { label: 'Completed', value: completed, color: '#7ee787', dot: '#2ead4b', dotBg: '#123820' },
    { label: 'Running',   value: running,   color: '#7ee787', dot: '#2ead4b', dotBg: '#123820' },
    { label: 'Pending',   value: pending,   color: '#ffd11a', dot: '#ffd11a', dotBg: '#362a08' },
    { label: 'Failed',    value: failed,    color: '#f85149', dot: '#d03238', dotBg: '#3e1414' },
  ];

  /* ── Sort tasks newest-first for use in sections ── */
  const sorted = [...(tasks ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 animate-wise-fade-up">

      {/* ── Welcome banner ── */}
      <div className="wise-card-dark-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
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
              color: '#eaecef',
              letterSpacing: '-0.5px',
            }}
          >
            {greeting()}{user?.username ? `, ${user.username}` : ''} 👋
          </h1>
          <p className="text-sm" style={{ color: '#848e9c', lineHeight: '1.6' }}>
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
            <div key={s.label} className="wise-card-dark-surface flex items-center gap-4 py-5">
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
                  style={{ color: '#848e9c' }}
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
        <div className="wise-card-dark-surface text-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: '#123820' }}
          >
            <CheckSquare className="w-8 h-8" style={{ color: '#7ee787' }} />
          </div>
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, color: '#eaecef' }}
          >
            No tasks yet
          </h3>
          <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: '#848e9c', lineHeight: '1.6' }}>
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
      <div className="wise-card-dark-surface mt-6">
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-5"
          style={{ color: '#848e9c' }}
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
                style={{ color: 'rgba(255,255,255,0.1)', fontFamily: 'Manrope, sans-serif' }}
              >
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#eaecef' }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#848e9c' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
