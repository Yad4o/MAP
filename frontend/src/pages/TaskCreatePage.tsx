import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createTask, getTasks } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import {
  Workflow, ArrowUp, Loader2, AlertTriangle,
  Flame, Gauge, Feather,
  FileText, Mail, Search, BarChart3,
  Clock, Zap, CheckSquare, CircleX, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

/* ── Priority options — grey/neutral, icon carries the meaning ─────────────── */
const PRIORITY_OPTIONS = [
  { value: 8, label: 'High', icon: Flame },
  { value: 5, label: 'Medium', icon: Gauge },
  { value: 2, label: 'Low', icon: Feather },
] as const;

/* ── Quick-start prompts ─────────────────────────────────────────────────── */
const QUICK_STARTS = [
  {
    icon: FileText,
    title: 'Summarize documents',
    prompt: 'Summarize the attached documents and pull out the key action items.',
  },
  {
    icon: Mail,
    title: 'Draft an email',
    prompt: 'Draft a follow-up email to a client about a delayed project timeline.',
  },
  {
    icon: Search,
    title: 'Research a topic',
    prompt: 'Research the top 3 competitors in the project management software space.',
  },
  {
    icon: BarChart3,
    title: 'Analyze data',
    prompt: 'Analyze last week\'s support tickets and flag anything urgent.',
  },
];

/* ── Compact status glyph for the recent-tasks strip ────────────────────── */
const recentStatusMeta: Record<TaskStatus, { icon: typeof Clock; color: string }> = {
  [TaskStatus.PENDING]: { icon: Clock, color: '#868685' },
  [TaskStatus.PROCESSING]: { icon: Zap, color: '#454745' },
  [TaskStatus.RETRYING]: { icon: Zap, color: '#454745' },
  [TaskStatus.COMPLETED]: { icon: CheckSquare, color: '#3a3c39' },
  [TaskStatus.FAILED]: { icon: CircleX, color: '#a3a5a1' },
  [TaskStatus.CANCELLED]: { icon: CircleX, color: '#a3a5a1' },
};

const MAX_TEXTAREA_HEIGHT = 220;

function deriveTitle(text: string): string {
  const firstLine = text.trim().split('\n')[0].replace(/\s+/g, ' ').trim();
  if (firstLine.length <= 80) return firstLine || 'Untitled task';
  return firstLine.slice(0, 77).trimEnd() + '…';
}

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const user = useAuthStore((s) => s.user);

  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/tasks');
    },
  });

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

  const submit = () => {
    const trimmed = description.trim();
    if (trimmed.length < 3) {
      setError('Tell me a bit more about what you need done.');
      return;
    }
    setError(null);
    const payload: TaskCreate = {
      title: deriveTitle(trimmed),
      description: trimmed,
      status: TaskStatus.PENDING,
      priority,
    };
    mutation.mutate(payload);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const applyQuickStart = (prompt: string) => {
    setDescription(prompt);
    setError(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    });
  };

  const canSubmit = !mutation.isPending && description.trim().length >= 3;

  const recentTasks = [...(tasks ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">

      {/* ── Scroll area: greeting, quick starts, recent tasks ── */}
      <div className="flex-1 space-y-8 pb-8 animate-wise-fade-up">

        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#eef0ec', border: '1px solid #dde1d9' }}
          >
            <Workflow className="w-5 h-5" style={{ color: '#3a3c39' }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 900,
                fontSize: '26px',
                lineHeight: '1.15',
                letterSpacing: '-0.4px',
                color: '#0e0f0c',
              }}
            >
              {greeting()}{user?.username ? `, ${user.username}` : ''}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#868685' }}>
              Describe what you need done — MAP will plan, execute, and validate it.
            </p>
          </div>
        </div>

        {/* Quick starts */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#868685' }}>
            Quick start
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_STARTS.map(qs => {
              const Icon = qs.icon;
              return (
                <button
                  key={qs.title}
                  type="button"
                  onClick={() => applyQuickStart(qs.prompt)}
                  className="text-left rounded-2xl p-4 transition-colors duration-150"
                  style={{ background: '#f3f4f1', border: '1px solid #e6e8e3' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ebede8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f1')}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: '#ffffff', border: '1px solid #e6e8e3' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: '#454745' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#0e0f0c' }}>{qs.title}</p>
                  <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: '#868685' }}>
                    {qs.prompt}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent tasks — keeps the tasks list reachable from the same screen */}
        {recentTasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
                Recent tasks
              </p>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: '#454745' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#0e0f0c')}
                onMouseLeave={e => (e.currentTarget.style.color = '#454745')}
              >
                View all
                <ChevronRight size={13} />
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e6e8e3' }}>
              {recentTasks.map((task, i) => {
                const meta = recentStatusMeta[task.status as TaskStatus] ?? recentStatusMeta[TaskStatus.CANCELLED];
                const StatusIcon = meta.icon;
                return (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-150"
                    style={{
                      background: '#ffffff',
                      borderTop: i === 0 ? 'none' : '1px solid #eef0ec',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7f8f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <StatusIcon size={14} style={{ color: meta.color }} className="flex-shrink-0" />
                    <span className="text-sm truncate flex-1" style={{ color: '#0e0f0c' }}>
                      {task.title}
                    </span>
                    <span className="text-[11px] flex-shrink-0" style={{ color: '#a3a5a1' }}>
                      {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Composer — pinned to the bottom of the page, ChatGPT/Claude style ── */}
      <div className="sticky bottom-0 pt-3 pb-2" style={{ background: 'linear-gradient(180deg, rgba(232,235,230,0) 0%, #e8ebe6 28%)' }}>
        <div className="max-w-3xl mx-auto w-full">

          {mutation.isError && (
            <div
              className="flex items-center gap-3 p-3 mb-3 rounded-xl text-sm"
              style={{ background: '#f3f4f1', border: '1px solid #dcdfd9', color: '#454745' }}
            >
              <AlertTriangle size={15} className="flex-shrink-0" style={{ color: '#6b6d69' }} />
              <span>Failed to create the task. Please try again.</span>
            </div>
          )}

          <div
            className="rounded-[22px] transition-colors duration-150"
            style={{
              background: '#ffffff',
              border: `1.5px solid ${description.trim().length >= 3 ? '#b9bcb5' : '#dde1d9'}`,
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(14,15,12,0.05)',
            }}
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              onInput={autoResize}
              onKeyDown={handleKeyDown}
              placeholder="Message MAP — describe the task you need done…"
              className="w-full resize-none overflow-y-auto bg-transparent outline-none"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#0e0f0c',
                maxHeight: MAX_TEXTAREA_HEIGHT,
              }}
            />

            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid #eef0ec' }}>
              <div className="flex items-center gap-1.5">
                {PRIORITY_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const isActive = priority === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      title={`${opt.label} priority`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors duration-150"
                      style={{
                        background: isActive ? '#e6e8e3' : 'transparent',
                        color: isActive ? '#0e0f0c' : '#a3a5a1',
                        border: `1px solid ${isActive ? '#c8ccc3' : 'transparent'}`,
                      }}
                    >
                      <Icon size={12} />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                aria-label="Create task"
                className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-150"
                style={{
                  background: canSubmit ? '#1a1b18' : '#e6e8e3',
                  color: canSubmit ? '#ffffff' : '#a3a5a1',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {mutation.isPending
                  ? <Loader2 size={15} className="animate-spin" />
                  : <ArrowUp size={16} />
                }
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm flex items-center gap-2 px-1 mt-2" style={{ color: '#6b6d69' }}>
              <AlertTriangle size={13} />
              {error}
            </p>
          )}

          <p className="text-center text-[11px] mt-2" style={{ color: '#a3a5a1' }}>
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
