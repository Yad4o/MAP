import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { Markdown } from './Markdown';
import { TaskMessage, MessageRole, TaskStatus } from '../../types/task';

const MAX_TEXTAREA_HEIGHT = 160;

interface TaskConversationProps {
  status: TaskStatus;
  messages: TaskMessage[];
  onSend: (content: string) => void;
  isSending: boolean;
}

/**
 * TaskConversation
 * ─────────────────
 * Turns a finished task into a thread. Renders the follow-up messages
 * (task_messages on the backend) as chat bubbles, and — only once the task
 * has actually finished a run (COMPLETED or FAILED) — a composer to send
 * another turn. Submitting re-queues the task; AgentRunner picks the
 * PENDING status back up and hydrates the pipeline with this whole thread
 * as context instead of starting cold.
 *
 * Renders nothing for a task that's still on its first run and has no
 * thread yet — there's nothing to continue.
 */
export default function TaskConversation({ status, messages, onSend, isSending }: TaskConversationProps) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canFollowUp = status === TaskStatus.COMPLETED || status === TaskStatus.FAILED;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (!canFollowUp && messages.length === 0) {
    return null;
  }

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending || !canFollowUp) return;
    onSend(trimmed);
    setDraft('');
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = 'auto';
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSubmit = canFollowUp && !isSending && draft.trim().length > 0;

  return (
    <section className="pt-2 space-y-4">
      <div className="flex items-center gap-2 px-1">
        <MessageSquare className="w-4 h-4" style={{ color: '#7ee787' }} />
        <h3
          className="text-sm font-bold"
          style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, color: '#eaecef' }}
        >
          Continue this task
        </h3>
      </div>

      {messages.length > 0 && (
        <div className="space-y-5">
          {messages.map(m =>
            m.role === MessageRole.USER ? (
              // The person's own follow-up — kept as a right-aligned pill so
              // it's easy to tell your prompt apart from the reply.
              <div key={m.id} className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3"
                  style={{ background: '#123820', color: '#eaecef' }}
                >
                  <p className="text-[15px] whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
                    {m.content}
                  </p>
                </div>
              </div>
            ) : (
              // The reply — blended directly on the page, same as the main
              // task result. No box/border, real markdown headers/bold/lists.
              <div key={m.id} className="pt-1 border-t border-white/[0.06] first:border-t-0 first:pt-0">
                <Markdown text={m.content} />
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {canFollowUp && (
        <div
          className="flex items-end gap-2 rounded-[24px] px-4 py-2.5 transition-colors duration-150"
          style={{
            background: '#1e232a',
            border: `1px solid ${draft.trim() ? 'rgba(126,231,135,0.4)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onInput={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up or refine the result…"
            disabled={isSending}
            className="flex-1 resize-none overflow-y-auto bg-transparent outline-none py-1.5 disabled:opacity-50"
            style={{ fontSize: '15px', lineHeight: '1.5', color: '#eaecef', maxHeight: MAX_TEXTAREA_HEIGHT }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            aria-label="Send follow-up"
            className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-150 mb-0.5"
            style={{
              background: canSubmit ? '#7ee787' : '#2a2f37',
              color: canSubmit ? '#0d0d0d' : '#848e9c',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </section>
  );
}

