import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { TaskCreate, TaskStatus } from '../types/task';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, formState: { errors } } = useForm<TaskCreate>({
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.PENDING,
    }
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
      <div className="flex items-center space-x-4">
        <Link
          to="/tasks"
          className="p-2 text-gray-500 hover:text-gray-900 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Task</h1>
          <p className="text-gray-500 mt-1">Add a new task to your team's backlog.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {mutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              Failed to create the task. Please try again.
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title', { required: 'Title is required' })}
              placeholder="e.g. Update database schema"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                errors.title ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              placeholder="Detailed explanation of the task..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-y"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              {...register('status')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white appearance-none"
            >
              <option value={TaskStatus.PENDING}>Pending</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.DONE}>Done</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center transition-colors shadow-sm disabled:opacity-70"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} className="mr-2" />
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
