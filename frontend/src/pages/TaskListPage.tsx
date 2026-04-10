import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, deleteTask } from '../api/tasks';
import { Task, TaskStatus } from '../types/task';
import { Plus, Trash2, Loader2, AlertCircle, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TaskStatus.DONE]: 'bg-green-100 text-green-800',
};

export default function TaskListPage() {
  const queryClient = useQueryClient();
  
  const { data: tasks, isLoading, isError } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex bg-white h-64 rounded-xl border border-gray-200 items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center justify-center text-red-600">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="font-medium">Failed to load tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Manage your team's tasks and priorities here.</p>
        </div>
        <Link
          to="/tasks/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center transition-colors shadow-sm"
        >
          <Plus size={20} className="mr-1.5" />
          Create Task
        </Link>
      </div>

      {!tasks || tasks.length === 0 ? (
        <div className="bg-white border text-center border-gray-200 rounded-xl p-16">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No tasks yet</h3>
          <p className="text-gray-500 mt-1 mb-6">Create the first task to get started.</p>
          <Link
            to="/tasks/new"
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline inline-flex items-center"
          >
            Create Task
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: Task) => (
            <div
              key={task.id}
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all hover:border-gray-300"
            >
              <div className="flex justify-between items-start mb-3">
                <span
                  className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${
                    statusColors[task.status as TaskStatus] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {task.status.replace('_', ' ')}
                </span>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this task?')) {
                      setDeletingId(task.id);
                      deleteMutation.mutate(task.id);
                    }
                  }}
                  disabled={deletingId === task.id}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Delete task"
                >
                  {deletingId === task.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 truncate" title={task.title}>{task.title}</h3>
              {task.description && (
                <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed mb-4">
                  {task.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
