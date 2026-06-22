import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import { ArrowLeft, ArrowUp, Loader2, AlertTriangle, ChevronUp, Minus, ChevronDown } from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 8, label: 'High', icon: ChevronUp, activeClass: 'bg-red-500/15 border-red-500/40 text-red-300' },
  { value: 5, label: 'Medium', icon: Minus, activeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300' },
  { value: 2, label: 'Low', icon: ChevronDown, activeClass: 'bg-slate-500/15 border-slate-500/40 text-slate-300' },
] as const;

const MAX_TEXTAREA_HEIGHT = 240; // px, matches max-h-60

/** Derives a short task title from the free-text instruction the user typed,
 *  so there's no separate "Title" field to fill in — same idea as a chat
 *  composer where what you type *is* the task. */
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

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Back link */}
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to tasks
        </Link>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-white">What do you need done?</h1>
          <p className="text-slate-400 text-sm">
            Describe the task in plain language — MAP will plan, execute, and validate it.
          </p>
        </div>

        {/* Mutation error banner */}
        {mutation.isError && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>Failed to create the task. Please try again.</span>
          </div>
        )}

        {/* Composer */}
        <div className="glass-card rounded-2xl p-3 focus-within:border-indigo-500/40 transition-colors duration-200">
          <textarea
            ref={textareaRef}
            rows={1}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (error) setError(null);
            }}
            onInput={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Summarize last week's support tickets and flag anything urgent"
            className="w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed text-white placeholder:text-slate-500 outline-none px-2 py-2"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />

          <div className="flex items-center justify-between mt-1 px-1">
            {/* Priority pills */}
            <div className="flex items-center gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = priority === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? opt.activeClass
                        : 'bg-white/[0.02] border-white/10 text-slate-500 hover:bg-white/5 hover:text-slate-300'
                    }`}
                  >
                    <Icon size={12} />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending || description.trim().length < 3}
              aria-label="Create task"
              className="w-9 h-9 flex-shrink-0 rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/10 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors duration-200"
            >
              {mutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUp size={18} />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1.5 px-1">
            <AlertTriangle size={14} />
            {error}
          </p>
        )}

        <p className="text-center text-xs text-slate-500">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Enter</kbd> to create ·{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Shift+Enter</kbd> for a new line
        </p>
      </div>
    </div>
  );
}
