import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useTaskDetail } from '../hooks/usePollTaskStatus';
import { cancelTask, retryTask } from '../api/tasks';
import { TaskStatus, StepStatus, TaskDetailResponse, StepType } from '../types/task';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  RefreshCcw, 
  Ban, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  FileJson,
  Cpu,
  History,
  Timer
} from 'lucide-react';
import AgentFlowChart from '../components/task/AgentFlowChart';
import TaskTimeline from '../components/task/TaskTimeline';
import TaskResultView from '../components/task/TaskResultView';

/**
 * TaskDetailPage.tsx
 * 
 * NOTE: The following code was previously here:
 * export default function TaskDetailPage() {
 *   return (
 *     <div>
 *       <h1>TaskDetailPage</h1>
 *       <p>Implement in the corresponding phase.</p>
 *     </div>
 *   );
 * }
 */

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: task, isLoading: isQueryLoading, error } = useTaskDetail(id);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [elapsedTime, setElapsedTime] = useState(0);

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'status'] });
    },
    onError: (err) => {
      console.error('Failed to cancel task', err);
    }
  });

  const retryMutation = useMutation({
    mutationFn: () => retryTask(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'status'] });
    },
    onError: (err) => {
      console.error('Failed to retry task', err);
    }
  });

  // Logic for elapsed time counter
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (task && (task.status === TaskStatus.PROCESSING || task.status === TaskStatus.RETRYING)) {
      const start = task.started_at ? new Date(task.started_at).getTime() : new Date(task.created_at).getTime();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else if (task?.started_at && task?.completed_at) {
      setElapsedTime(Math.floor((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000));
    }
    return () => clearInterval(interval);
  }, [task?.status, task?.started_at, task?.completed_at, task?.created_at]);

  if (isQueryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
          <p className="text-slate-400 animate-pulse">Fetching task details...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="glass-card p-12 text-center max-w-lg mx-auto mt-20">
        <AlertCircle className="w-16 h-16 text-red-500/50 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-3 text-white">Task Unavailable</h2>
        <p className="text-slate-400 mb-8 text-lg">We couldn't retrieve the details for this task. It may have been deleted.</p>
        <button onClick={() => navigate('/tasks')} className="btn-primary w-full max-w-xs">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: CheckCircle2 };
      case TaskStatus.FAILED:
        return { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: XCircle };
      case TaskStatus.CANCELLED:
        return { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: Ban };
      case TaskStatus.PROCESSING:
      case TaskStatus.RETRYING:
        return { color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20', icon: Loader2 };
      default:
        return { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: Clock };
    }
  };

  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.icon;

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* SECTION 1: Header */}
      <section className="glass-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                <StatusIcon className={`w-3.5 h-3.5 ${task.status === TaskStatus.PROCESSING ? 'animate-spin' : ''}`} />
                {task.status}
              </span>
              <span className="text-slate-500 text-sm flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{task.title}</h1>
            <p className="text-slate-400 max-w-2xl">{task.description}</p>
          </div>

          <div className="flex items-center gap-3">
            {(task.status === TaskStatus.PENDING || task.status === TaskStatus.PROCESSING) && (
              <button 
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Cancel Task
              </button>
            )}
            {task.status === TaskStatus.FAILED && (
              <button 
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Retry Task
              </button>
            )}
            <div className="h-10 w-[1px] bg-white/10 mx-2 hidden md:block" />
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Task ID</span>
              <code className="text-violet-400 text-xs font-mono">{task.id}</code>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Progress & Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECTION 2: Progress (only visible when running) */}
          {(task.status === TaskStatus.PROCESSING || task.status === TaskStatus.RETRYING) && (
            <section className="glass-card p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 h-[2px] bg-violet-500 animate-[loading-bar_2s_infinite]" style={{ width: '30%' }} />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-violet-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Execution in Progress</h3>
                    <p className="text-xs text-slate-400">Agents are working on your request...</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono text-violet-400 font-bold">{formatTime(elapsedTime)}</span>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Elapsed Time</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 w-2/3 animate-[pulse_2s_infinite]" />
              </div>
            </section>
          )}

          {/* SECTION 3: Result (visible when COMPLETED) */}
          {task.status === TaskStatus.COMPLETED && (
            <section className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-green-400" />
                  <h3 className="font-bold text-sm">Task Result</h3>
                </div>
              </div>
              <TaskResultView result={task.result} />
            </section>
          )}

          {/* SECTION 4: Error (visible when FAILED) */}
          {task.status === TaskStatus.FAILED && (
            <section className="glass-card border-red-500/20 bg-red-500/5">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Execution Failed</h3>
                    <p className="text-slate-400 text-sm">The task encountered a critical error during processing.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Error Type</p>
                    <p className="text-red-400 font-mono text-sm">{task.error?.type || 'SystemError'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Retry Count</p>
                    <p className="text-amber-400 font-mono text-sm">{task.retry_count} / 3</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {task.error?.message || 'Unknown error occurred during step execution. Please check agent logs for more details.'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: Steps */}
          <section className="glass-card">
            <div className="flex items-center gap-2 p-5 border-b border-white/10">
              <Layers className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold">Agent Execution Steps</h3>
              <span className="ml-auto px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-slate-500 border border-white/10 uppercase tracking-tighter">
                {task.steps?.length || 0} Steps Total
              </span>
            </div>
            
            <div className="divide-y divide-white/5">
              {!task.steps || task.steps.length === 0 ? (
                <div className="p-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">Waiting for agent reports...</p>
                </div>
              ) : (
                task.steps.map((step) => {
                  const isExpanded = expandedSteps[step.id];
                  const stepStatusConfig = step.status === StepStatus.COMPLETED 
                    ? { icon: CheckCircle2, text: 'text-green-400', bg: 'bg-green-400/10' }
                    : step.status === StepStatus.FAILED 
                    ? { icon: XCircle, text: 'text-red-400', bg: 'bg-red-400/10' }
                    : { icon: Loader2, text: 'text-violet-400', bg: 'bg-violet-400/10' };
                  
                  return (
                    <div key={step.id} className="transition-all hover:bg-white/[0.02]">
                      <div 
                        className="p-4 flex items-center gap-4 cursor-pointer select-none"
                        onClick={() => toggleStep(step.id)}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stepStatusConfig.bg} ${stepStatusConfig.text}`}>
                          <stepStatusConfig.icon className={`w-4 h-4 ${step.status === StepStatus.RUNNING ? 'animate-spin' : ''}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white truncate">{step.agent_name}</h4>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-bold text-slate-500 border border-white/10">
                              {step.step_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {step.latency_ms ? `${step.latency_ms}ms` : '--'}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <History className="w-3 h-3" />
                              Score: {step.confidence ? (step.confidence * 100).toFixed(0) : '--'}%
                            </span>
                          </div>
                        </div>

                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pl-16">
                          <div className="p-4 rounded-xl bg-black/40 border border-white/5 overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] uppercase font-bold text-slate-600">Step Payload</p>
                              {step.model_used && (
                                <p className="text-[10px] font-mono text-violet-400/70">{step.model_used}</p>
                              )}
                            </div>
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                              {JSON.stringify(step.output_payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Sidebar Stats */}
        <div className="space-y-6">
          <section className="glass-card p-6">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" />
              Task Timeline
            </h3>
            
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Task Created</p>
                  <p className="text-[10px] text-slate-500">{new Date(task.created_at).toLocaleString()}</p>
                </div>
              </div>

              {task.started_at && (
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-violet-500/50 flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Processing Started</p>
                    <p className="text-[10px] text-slate-500">{new Date(task.started_at).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {task.completed_at && (
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-green-500/50 flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Execution Complete</p>
                    <p className="text-[10px] text-slate-500">{new Date(task.completed_at).toLocaleString()}</p>
                    <div className="mt-2 text-[10px] text-green-400/70 p-1.5 rounded bg-green-400/5 border border-green-400/10">
                      Total Duration: {formatTime(Math.floor((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="glass-card p-6">
            <h3 className="font-bold text-white mb-4">Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Priority</span>
                <span className="text-violet-400 font-bold">{task.priority} / 10</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Retry Policy</span>
                <span className="text-slate-300">Exponential</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Task Type</span>
                <span className="text-slate-300 capitalize">{task.task_type || 'General'}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Agent Trace */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
          <h2 className="text-xl font-bold text-white tracking-tight">Agent Workflow Trace</h2>
        </div>
        <AgentFlowChart steps={task.steps || []} />
      </section>

      {/* Timeline */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
          <h2 className="text-xl font-bold text-white tracking-tight">Execution Timeline</h2>
        </div>
        <TaskTimeline steps={task.steps || []} />
      </section>

      <style>{`
        @keyframes loading-bar {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
