import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  RotateCcw, 
  Ban,
  ChevronDown,
  ChevronUp,
  Cpu,
  BarChart3,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskDetail } from '../hooks/usePollTaskStatus';
import { TaskStatus } from '../types/task';

/**
 * TaskDetailPage.tsx 
 * Note: Original placeholder was a simple div with "Implement in the corresponding phase."
 */
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading, error, refetch } = useTaskDetail(id);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (task?.status === TaskStatus.PROCESSING || task?.status === TaskStatus.PENDING) {
      const start = task.started_at ? new Date(task.started_at).getTime() : Date.now();
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else if (task?.completed_at && task.started_at) {
      setElapsed(Math.floor((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000));
    }
    return () => clearInterval(interval);
  }, [task?.status, task?.started_at, task?.completed_at]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple toast could be added here
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
        <p className="text-slate-400 animate-pulse">Loading task intelligence...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="glass-card p-12 text-center max-w-2xl mx-auto my-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">Task Not Found</h2>
        <p className="text-slate-400 mb-8">The task you are looking for might have been deleted or never existed.</p>
        <button onClick={() => navigate('/tasks')} className="btn-primary flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </button>
      </div>
    );
  }

  const isTerminal = [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED].includes(task.status);
  const isRunning = task.status === TaskStatus.PROCESSING || task.status === TaskStatus.PENDING;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/tasks')}
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> All Tasks
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              {task.title}
            </h1>
            <StatusBadge status={task.status} />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 pt-2">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(task.created_at).toLocaleString()}</span>
            {task.started_at && <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Started: {new Date(task.started_at).toLocaleTimeString()}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && (
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/10 hover:border-red-500/50 text-slate-300 hover:text-red-400 transition-all duration-300">
              <Ban className="w-4 h-4" /> Cancel Task
            </button>
          )}
          {task.status === TaskStatus.FAILED && (
            <button 
              onClick={() => refetch()}
              className="btn-primary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retry Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Section */}
          {isRunning && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 border-violet-500/30 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <motion.div 
                  className="h-full bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Processing Intelligence</h3>
                    <p className="text-sm text-slate-400">Our agents are currently analyzing data...</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-medium text-violet-400">
                    {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                  </div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Elapsed Time</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result Section */}
          {task.status === TaskStatus.COMPLETED && task.result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-5 h-5" /> Task Result
                </div>
                <button 
                  onClick={() => copyToClipboard(JSON.stringify(task.result, null, 2))}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
                  title="Copy JSON"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <pre className="text-sm font-mono text-slate-300 overflow-x-auto bg-black/20 p-4 rounded-xl border border-white/5 leading-relaxed">
                  {JSON.stringify(task.result, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}

          {/* Error Section */}
          {task.status === TaskStatus.FAILED && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card border-red-500/30 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-red-500/10 flex items-center gap-2 text-red-500 bg-red-500/5">
                <AlertCircle className="w-5 h-5" /> Execution Failure
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-slate-500 uppercase">Error Type</p>
                    <p className="font-mono text-sm text-slate-300">{(task.error as any)?.type || 'Unknown'}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-slate-500 uppercase">Retry Count</p>
                    <p className="font-mono text-sm text-slate-300">{task.retry_count}</p>
                  </div>
                </div>
                <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                  <p className="text-slate-300">{(task.error as any)?.message || 'An unexpected error occurred during task execution. Please check the logs for more details.'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Steps Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-slate-400" /> Agent Footprint
            </h3>
            <div className="space-y-3">
              {task.steps.map((step, idx) => (
                <div key={step.id} className="glass-card overflow-hidden transition-all duration-300 group hover:border-white/20">
                  <div 
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-slate-500">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-medium group-hover:text-violet-400 transition-colors">{step.agent_name}</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{step.step_type}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                        {step.latency_ms && <span className="bg-white/5 px-2 py-1 rounded">{step.latency_ms}ms</span>}
                        {step.confidence && <span className="bg-white/5 px-2 py-1 rounded text-violet-400">{(step.confidence * 100).toFixed(0)}% conf</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={step.status as any} size="sm" />
                        {expandedStep === step.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedStep === step.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/20 border-t border-white/5"
                      >
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-slate-500 mb-1">Model Used</p>
                              <p className="font-mono text-slate-300">{step.model_used || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Tokens In/Out</p>
                              <p className="font-mono text-slate-300">{step.tokens_in || 0} / {step.tokens_out || 0}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-500 mb-1">Timestamp</p>
                              <p className="font-mono text-slate-300">{new Date(step.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          {step.output_payload && (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500">Output Payload</p>
                              <pre className="text-[11px] font-mono text-slate-400 bg-black/40 p-3 rounded-lg overflow-x-auto border border-white/5">
                                {JSON.stringify(step.output_payload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          <div className="glass-card p-6 space-y-6">
            <h3 className="font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-400" /> Resource Usage
            </h3>
            <div className="space-y-4">
              <AnalyticsMetric label="Total Latency" value={`${elapsed}s`} />
              <AnalyticsMetric label="Agent Count" value={task.steps.length.toString()} />
              <AnalyticsMetric 
                label="Total Tokens" 
                value={(task.steps.reduce((acc, s) => acc + (s.tokens_in || 0) + (s.tokens_out || 0), 0)).toLocaleString()} 
              />
              <AnalyticsMetric 
                label="Avg Confidence" 
                value={`${(task.steps.reduce((acc, s) => acc + (s.confidence || 0), 0) / task.steps.length * 100).toFixed(1)}%`} 
              />
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold">Configuration</h3>
            <pre className="text-xs font-mono text-slate-400 bg-white/5 p-4 rounded-xl border border-white/5">
              {JSON.stringify(task.config, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, size = 'default' }: { status: TaskStatus, size?: 'sm' | 'default' }) {
  const configs = {
    [TaskStatus.PENDING]: { icon: Clock, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', text: 'Pending' },
    [TaskStatus.PROCESSING]: { icon: Loader2, color: 'bg-violet-500/10 text-violet-500 border-violet-500/20', text: 'Processing', animate: true },
    [TaskStatus.COMPLETED]: { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', text: 'Completed' },
    [TaskStatus.FAILED]: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20', text: 'Failed' },
    [TaskStatus.CANCELLED]: { icon: Ban, color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', text: 'Cancelled' },
    [TaskStatus.RETRYING]: { icon: RotateCcw, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', text: 'Retrying', animate: true },
  };

  const config = configs[status] || configs[TaskStatus.PENDING];
  const Icon = config.icon;

  return (
    <span className={`flex items-center gap-1.5 font-medium border rounded-full ${config.color} ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs uppercase tracking-wider'}`}>
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${config.animate ? 'animate-spin' : ''}`} />
      {config.text}
    </span>
  );
}

function AnalyticsMetric({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm border-white text-slate-200 font-mono">{value}</span>
    </div>
  );
}
