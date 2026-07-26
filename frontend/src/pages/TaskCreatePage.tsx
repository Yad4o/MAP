import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import {
  ArrowUp, Loader2, AlertTriangle,
  Flame, Gauge, Feather,
  FileText, Mail, Search, BarChart3,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

/* ── Near-black palette — matches the ChatGPT-style reference ──────────────── */
const C = {
  page: '#0d0d0d',
  pill: '#2a2a2a',
  pillBorder: '#3a3a3a',
  pillBorderActive: '#525252',
  rowHover: 'rgba(255,255,255,0.05)',
  divider: '#232323',
  textPrimary: '#ececec',
  textSecondary: '#9b9b9b',
  textMuted: '#6e6e6e',
  dotPending: '#9b9b9b',
  dotRunning: '#ececec',
  dotFailed: '#6e6e6e',
};

/* ── Priority options ────────────────────────────────────────────────────── */
const PRIORITY_OPTIONS = [
  { value: 8, label: 'High', icon: Flame },
  { value: 5, label: 'Medium', icon: Gauge },
  { value: 2, label: 'Low', icon: Feather },
] as const;

/* ── Quick-start prompts — plain icon + text rows, no card boxes ───────────── */
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

const MAX_TEXTAREA_HEIGHT = 200;

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

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(`/tasks/${task.id}`);
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    /* Full-bleed near-black canvas — cancels the AppShell's padding so the
       page reads as one continuous dark surface, ChatGPT-style. */
    <div
      className="-m-5 lg:-m-8 px-5 lg:px-8 flex flex-col"
      style={{ background: C.page, minHeight: 'calc(100vh - 56px)' }}
    >
      <div className="flex flex-col flex-1 max-w-2xl w-full mx-auto">

        {/* ── Content: greeting, plain suggestion list, recent tasks ── */}
        <div className="flex-1 pt-10 pb-8">

          <h1
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800,
              fontSize: '24px',
              lineHeight: '1.2',
              letterSpacing: '-0.3px',
              color: C.textPrimary,
            }}
          >
            {greeting()}{user?.username ? `, ${user.username}` : ''}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: C.textSecondary }}>
            Describe what you need done — MAP will plan, execute, and validate it.
          </p>

          {/* Suggestions — plain icon + text rows, no boxes */}
          <div className="mt-8">
            {QUICK_STARTS.map(qs => {
              const Icon = qs.icon;
              return (
                <button
                  key={qs.title}
                  type="button"
                  onClick={() => applyQuickStart(qs.prompt)}
                  className="w-full flex items-center gap-4 py-3 px-2 -mx-2 rounded-xl text-left transition-colors duration-150"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={20} strokeWidth={1.75} style={{ color: C.textPrimary }} className="flex-shrink-0" />
                  <span className="text-[15px]" style={{ color: C.textPrimary }}>{qs.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Composer — floating pill, pinned to the bottom ── */}
        <div
          className="sticky bottom-0 pt-3 pb-3"
          style={{ background: `linear-gradient(180deg, rgba(13,13,13,0) 0%, ${C.page} 30%)` }}
        >
          {mutation.isError && (
            <div
              className="flex items-center gap-3 p-3 mb-3 rounded-xl text-sm"
              style={{ background: C.pill, border: `1px solid ${C.pillBorder}`, color: C.textSecondary }}
            >
              <AlertTriangle size={15} className="flex-shrink-0" style={{ color: C.textPrimary }} />
              <span>Failed to create the task. Please try again.</span>
            </div>
          )}

          {/* Priority — small plain row above the pill */}
          <div className="flex items-center gap-1.5 mb-2 px-1">
            {PRIORITY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = priority === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  title={`${opt.label} priority`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-150"
                  style={{
                    background: isActive ? C.pill : 'transparent',
                    color: isActive ? C.textPrimary : C.textMuted,
                    border: `1px solid ${isActive ? C.pillBorder : 'transparent'}`,
                  }}
                >
                  <Icon size={12} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* The pill itself */}
          <div
            className="flex items-end gap-2 rounded-[28px] px-4 py-2.5 transition-colors duration-150"
            style={{
              background: C.pill,
              border: `1px solid ${description.trim().length >= 3 ? C.pillBorderActive : C.pillBorder}`,
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              onInput={autoResize}
              onKeyDown={handleKeyDown}
              placeholder="Message MAP — describe the task you need done…"
              className="flex-1 resize-none overflow-y-auto bg-transparent outline-none py-1.5"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '15px',
                lineHeight: '1.5',
                color: C.textPrimary,
                maxHeight: MAX_TEXTAREA_HEIGHT,
              }}
            />

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label="Create task"
              className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-150 mb-0.5"
              style={{
                background: canSubmit ? C.textPrimary : '#3a3a3a',
                color: canSubmit ? C.page : C.textMuted,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {mutation.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <ArrowUp size={15} />
              }
            </button>
          </div>

          {error && (
            <p className="text-sm flex items-center gap-2 px-2 mt-2" style={{ color: C.textSecondary }}>
              <AlertTriangle size={13} />
              {error}
            </p>
          )}

          <p className="text-center text-[11px] mt-2 pb-1" style={{ color: C.textMuted }}>
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
