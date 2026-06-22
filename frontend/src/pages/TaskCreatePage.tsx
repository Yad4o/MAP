import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import { ArrowLeft, Save, Loader2, AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 8, label: 'High', icon: ArrowUp, activeClass: 'bg-red-500/15 border-red-500/40 text-red-300' },
  { value: 5, label: 'Medium', icon: Minus, activeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300' },
  { value: 2, label: 'Low', icon: ArrowDown, activeClass: 'bg-slate-500/15 border-slate-500/40 text-slate-300' },
] as const;

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskCreate>({
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.PENDING,
      priority: 5,
    },
  });

  const selectedPriority = watch('priority');

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/tasks');
    },
  });

  const onSubmit = (data: TaskCreate) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/tasks"
          className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-200"
          aria-label="Back to tasks"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create Task
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Add a new task to your automation pipeline.
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="glass-card overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Mutation error banner */}
          {mutation.isError && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>Failed to create the task. Please try again.</span>
            </div>
          )}

          {/* Title field */}
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-300"
            >
              What do you need done? <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title', { 
                required: 'Title is required',
                minLength: { value: 1, message: 'Title is too short' }
              })}
              placeholder="e.g. Summarize last week's support tickets"
              className={`form-input ${
                errors.title
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10'
                  : ''
              }`}
            />
            {errors.title && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-300"
            >
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description', { 
                required: 'Description is required',
                minLength: { value: 1, message: 'Description is too short' }
              })}
              placeholder="Detailed explanation of the task…"
              className={`form-input resize-y ${
                errors.description
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10'
                  : ''
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Priority field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = selectedPriority === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setValue('priority', opt.value)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? opt.activeClass
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {/* status stays PENDING for every new task; priority drives queue ordering */}
            <input type="hidden" {...register('status')} />
            <input type="hidden" {...register('priority')} />
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 font-medium rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary inline-flex items-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
