import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import { ArrowLeft, Send, Loader2, AlertTriangle, ChevronUp, Minus, ChevronDown, Sparkles } from 'lucide-react';

const PRIORITY_OPTIONS = [
  {
    value: 8, label: 'High', icon: ChevronUp,
    activeBg: '#fde8e9', activeColor: '#a7000d', activeBorder: '#d03238',
  },
  {
    value: 5, label: 'Medium', icon: Minus,
    activeBg: '#fff5c2', activeColor: '#4a3b1c', activeBorder: '#ffd11a',
  },
  {
    value: 2, label: 'Low', icon: ChevronDown,
    activeBg: '#e8ebe6', activeColor: '#454745', activeBorder: '#868685',
  },
] as const;

const MAX_TEXTAREA_HEIGHT = 240;

function deriveTitle(text: string): string {
  const firstLine = text.trim().split('\n')[0].replace(/\s+/g, ' ').trim();
  if (firstLine.length <= 80) return firstLine || 'Untitled task';
  return firstLine.slice(0, 77).trimEnd() + '…';
}

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

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

  const canSubmit = !mutation.isPending && description.trim().length >= 3;

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 animate-wise-fade-up">
      <div className="w-full max-w-2xl space-y-6">

        {/* Back link */}
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: '#454745' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0e0f0c')}
          onMouseLeave={e => (e.currentTarget.style.color = '#454745')}
        >
          <ArrowLeft size={15} />
          Back to tasks
        </Link>

        {/* Heading */}
        <div className="text-center space-y-2">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#e2f6d5' }}
          >
            <Sparkles className="w-7 h-7" style={{ color: '#2ead4b' }} />
          </div>
          <h1
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 900,
              fontSize: '36px',
              lineHeight: '1.1',
              letterSpacing: '-0.5px',
              color: '#0e0f0c',
            }}
          >
            What do you need done?
          </h1>
          <p className="text-sm" style={{ color: '#454745' }}>
            Describe the task in plain language — MAP will plan, execute, and validate it.
          </p>
        </div>

        {/* Mutation error */}
        {mutation.isError && (
          <div
            className="flex items-center gap-3 p-4 rounded-2xl text-sm"
            style={{ background: '#fde8e9', border: '1px solid #d03238', color: '#a7000d' }}
          >
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>Failed to create the task. Please try again.</span>
          </div>
        )}

        {/* Composer card */}
        <div
          className="rounded-[24px] transition-shadow duration-200"
          style={{
            background: '#ffffff',
            border: `1.5px solid ${description.trim().length >= 3 ? '#9fe870' : '#0e0f0c'}`,
            padding: '16px',
            boxShadow: '0 2px 8px rgba(14,15,12,0.06)',
          }}
        >
          <textarea
            ref={textareaRef}
            rows={3}
            value={description}
            onChange={e => {
              setDescription(e.target.value);
              if (error) setError(null);
            }}
            onInput={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Summarize last week's support tickets and flag anything urgent"
            className="w-full resize-none overflow-y-auto bg-transparent outline-none"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#0e0f0c',
              maxHeight: MAX_TEXTAREA_HEIGHT,
            }}
          />

          {/* Bottom bar: priority + send */}
          <div
            className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: '1px solid #e8ebe6' }}
          >
            {/* Priority pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold mr-1" style={{ color: '#868685' }}>Priority:</span>
              {PRIORITY_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isActive = priority === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                    style={{
                      background: isActive ? opt.activeBg : '#e8ebe6',
                      color: isActive ? opt.activeColor : '#454745',
                      border: `1px solid ${isActive ? opt.activeBorder : 'transparent'}`,
                    }}
                  >
                    <Icon size={11} />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label="Create task"
              className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-150"
              style={{
                background: canSubmit ? '#9fe870' : '#e8ebe6',
                color: canSubmit ? '#0e0f0c' : '#868685',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {mutation.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
        </div>

        {/* Validation error */}
        {error && (
          <p
            className="text-sm flex items-center gap-2 px-1"
            style={{ color: '#d03238' }}
          >
            <AlertTriangle size={14} />
            {error}
          </p>
        )}

        {/* Keyboard hint */}
        <p className="text-center text-xs" style={{ color: '#868685' }}>
          Press{' '}
          <kbd
            className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
            style={{ background: '#e8ebe6', color: '#0e0f0c', border: '1px solid rgba(14,15,12,0.15)' }}
          >
            Enter
          </kbd>{' '}
          to create ·{' '}
          <kbd
            className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
            style={{ background: '#e8ebe6', color: '#0e0f0c', border: '1px solid rgba(14,15,12,0.15)' }}
          >
            Shift+Enter
          </kbd>{' '}
          for a new line
        </p>
      </div>
    </div>
  );
}
