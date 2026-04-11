import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskCreate>({
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.PENDING,
    },
  });

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
          className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/10 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all duration-200"
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
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title', { 
                required: 'Title is required',
                minLength: { value: 1, message: 'Title is too short' }
              })}
              placeholder="e.g. Update database schema"
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

          {/* Status field */}
          <div className="space-y-2">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-slate-300"
            >
              Status
            </label>
            <select
              id="status"
              {...register('status')}
              className="form-input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10"
            >
              <option value={TaskStatus.PENDING}>Pending</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.DONE}>Done</option>
            </select>
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
