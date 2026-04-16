/**
 * TaskCreatePage.tsx — Aetheric Intelligence Design
 */

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<TaskCreate>({
    defaultValues: { title: '', description: '', status: TaskStatus.PENDING },
  });

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/tasks');
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/tasks"
          aria-label="Back to tasks"
          className="btn-ghost p-2.5 !px-2.5"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Create Task
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
            Add a new task to your automation pipeline
          </p>
        </div>
      </div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card overflow-hidden"
      >
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-8 space-y-6">
          {/* Error banner */}
          {mutation.isError && (
            <div className="flex items-center gap-3 p-4 rounded-xl text-sm"
              style={{ background: 'rgba(255,110,132,0.08)', border: '1px solid rgba(255,110,132,0.2)', color: 'var(--error)' }}>
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>Failed to create the task. Please try again.</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="label-xs block">
              Title <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 1, message: 'Title is too short' },
              })}
              placeholder="e.g. Analyze customer sentiment"
              className="form-input"
              style={errors.title ? { boxShadow: 'inset 0 0 0 1px rgba(255,110,132,0.5)' } : {}}
            />
            {errors.title && (
              <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--error)' }}>
                <AlertTriangle size={12} />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="label-xs block">
              Description <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 1, message: 'Description is too short' },
              })}
              placeholder="Detailed explanation of what this task should accomplish…"
              className="form-input form-textarea"
              style={errors.description ? { boxShadow: 'inset 0 0 0 1px rgba(255,110,132,0.5)' } : {}}
            />
            {errors.description && (
              <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--error)' }}>
                <AlertTriangle size={12} />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label htmlFor="status" className="label-xs block">Initial Status</label>
            <select id="status" {...register('status')} className="form-input form-select">
              <option value={TaskStatus.PENDING}>Pending</option>
              <option value={TaskStatus.PROCESSING}>Processing</option>
              <option value={TaskStatus.COMPLETED}>Completed</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end items-center gap-3 pt-4"
            style={{ borderTop: '1px solid rgba(72,71,77,0.18)' }}>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-task-btn"
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                <><Save size={15} /> Save Task</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
