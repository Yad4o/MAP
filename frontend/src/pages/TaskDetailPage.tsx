/**
 * TaskDetailPage.tsx — Aetheric Intelligence Design
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useTaskDetail } from '../hooks/usePollTaskStatus';
import { cancelTask, retryTask } from '../api/tasks';
import { TaskStatus, StepStatus, TaskDetailResponse, StepType } from '../types/task';
import {
  CheckCircle2, XCircle, Clock, RefreshCcw, Ban,
  ChevronDown, ChevronRight, Clipboard, AlertCircle,
  Loader2, Calendar, Layers, FileJson, Cpu, History, Timer,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentFlowChart from '../components/task/AgentFlowChart';
import TaskTimeline from '../components/task/TaskTimeline';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getStatusCfg(status: TaskStatus) {
  switch (status) {
    case TaskStatus.COMPLETED:  return { badge: 'badge-completed', icon: CheckCircle2, spin: false, label: 'Completed' };
    case TaskStatus.FAILED:     return { badge: 'badge-failed',    icon: XCircle,      spin: false, label: 'Failed' };
    case TaskStatus.CANCELLED:  return { badge: 'badge-cancelled', icon: Ban,          spin: false, label: 'Cancelled' };
    case TaskStatus.PROCESSING: return { badge: 'badge-processing',icon: Loader2,      spin: true,  label: 'Processing' };
    case TaskStatus.RETRYING:   return { badge: 'badge-retrying',  icon: RefreshCcw,   spin: true,  label: 'Retrying' };
    default:                    return { badge: 'badge-pending',   icon: Clock,        spin: false, label: 'Pending' };
  }
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: task, isLoading, error } = useTaskDetail(id);
  const [copied, setCopied] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'status'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryTask(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id, 'status'] });
    },
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (task && (task.status === TaskStatus.PROCESSING || task.status === TaskStatus.RETRYING)) {
      const start = task.started_at ? new Date(task.started_at).getTime() : new Date(task.created_at).getTime();
      interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    } else if (task?.started_at && task?.completed_at) {
      setElapsed(Math.floor((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000));
    }
    return () => clearInterval(interval);
  }, [task?.status, task?.started_at, task?.completed_at, task?.created_at]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <p className="text-sm animate-pulse" style={{ color: 'var(--on-surface-variant)' }}>
            Fetching task details…
          </p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="glass-card p-12 text-center max-w-lg mx-auto mt-20">
        <AlertCircle size={48} className="mx-auto mb-5" style={{ color: 'var(--error)', opacity: 0.6 }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--on-surface)' }}>Task Unavailable</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--on-surface-variant)' }}>
          We couldn't retrieve this task. It may have been deleted.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const statusCfg = getStatusCfg(task.status);
  const StatusIcon = statusCfg.icon;
  const isRunning = task.status === TaskStatus.PROCESSING || task.status === TaskStatus.RETRYING;

  const toggleStep = (stepId: string) =>
    setExpandedSteps((p) => ({ ...p, [stepId]: !p[stepId] }));

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(task.result, null, 2))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(console.error);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-20">
      {/* ── Header ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-6 md:p-7"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={() => navigate('/tasks')}
                className="btn-ghost p-1.5 !px-1.5 mr-1" aria-label="Back">
                <ArrowLeft size={15} />
              </button>
              <span className={`badge ${statusCfg.badge}`}>
                <StatusIcon size={11} className={statusCfg.spin ? 'animate-spin' : ''} />
                {statusCfg.label}
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--outline)' }}>
                <Calendar size={12} />
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
              {task.title}
            </h1>
            {task.description && (
              <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--on-surface-variant)' }}>
                {task.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {(task.status === TaskStatus.PENDING || task.status === TaskStatus.PROCESSING) && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="btn-ghost"
              >
                {cancelMutation.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Ban size={14} />}
                Cancel
              </button>
            )}
            {task.status === TaskStatus.FAILED && (
              <button
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="btn-primary"
              >
                {retryMutation.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RefreshCcw size={14} />}
                Retry
              </button>
            )}
            <div className="text-right" style={{ borderLeft: '1px solid rgba(72,71,77,0.2)', paddingLeft: '1rem' }}>
              <p className="label-xs mb-0.5">Task ID</p>
              <code className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{task.id}</code>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Body: 2-column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Live Execution */}
          {isRunning && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-5 overflow-hidden relative"
            >
              {/* animated top bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-2xl">
                <div className="h-full w-1/3" style={{
                  background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
                  animation: 'loading-bar 1.8s ease-in-out infinite',
                  position: 'absolute',
                }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(132,85,239,0.15)' }}>
                    <Cpu size={18} style={{ color: 'var(--primary)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--on-surface)' }}>Execution in Progress</p>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Agents are working on your request…</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-bold" style={{ color: 'var(--primary)' }}>
                    {formatTime(elapsed)}
                  </span>
                  <p className="label-xs mt-0.5">elapsed</p>
                </div>
              </div>
            </motion.section>
          )}

          {/* Result (COMPLETED) */}
          {task.status === TaskStatus.COMPLETED && task.result && (
            <section className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4"
                style={{ borderBottom: '1px solid rgba(72,71,77,0.18)' }}>
                <div className="flex items-center gap-2">
                  <FileJson size={15} style={{ color: '#10b981' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Task Result</span>
                </div>
                <button onClick={copyToClipboard}
                  className="btn-ghost py-1.5 px-3 text-xs">
                  {copied ? <CheckCircle2 size={13} style={{ color: '#10b981' }} /> : <Clipboard size={13} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <div className="code-block rounded-none max-h-96 overflow-auto p-5 m-0">
                <pre>{JSON.stringify(task.result, null, 2)}</pre>
              </div>
            </section>
          )}

          {/* Error (FAILED) */}
          {task.status === TaskStatus.FAILED && (
            <section className="glass-card p-6" style={{ background: 'rgba(255,110,132,0.04)', boxShadow: '0 0 0 1px rgba(255,110,132,0.15), 0 8px 32px -8px rgba(43,0,110,0.15)' }}>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,110,132,0.15)' }}>
                  <AlertCircle size={20} style={{ color: 'var(--error)' }} />
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--on-surface)' }}>Execution Failed</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                    The task encountered a critical error during processing.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl p-3" style={{ background: 'var(--surface-high)' }}>
                  <p className="label-xs mb-1">Error Type</p>
                  <p className="text-sm font-mono" style={{ color: 'var(--error)' }}>
                    {task.error?.type ?? 'SystemError'}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--surface-high)' }}>
                  <p className="label-xs mb-1">Retry Count</p>
                  <p className="text-sm font-mono" style={{ color: '#f59e0b' }}>
                    {task.retry_count} / 3
                  </p>
                </div>
              </div>
              <div className="rounded-xl p-4"
                style={{ background: 'rgba(255,110,132,0.08)', border: '1px solid rgba(255,110,132,0.2)' }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#ffc8d0' }}>
                  {task.error?.message ?? 'Unknown error occurred during step execution. Please check agent logs for more details.'}
                </p>
              </div>
            </section>
          )}

          {/* Steps */}
          <section className="glass-card overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(72,71,77,0.18)' }}>
              <Layers size={15} style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Agent Execution Steps</span>
              <span className="ml-auto rounded-md px-2 py-0.5 text-xs font-bold"
                style={{ background: 'var(--surface-highest)', color: 'var(--outline)' }}>
                {task.steps?.length ?? 0} Steps
              </span>
            </div>

            {!task.steps || task.steps.length === 0 ? (
              <div className="py-20 text-center">
                <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: 'var(--outline)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--outline)' }}>Waiting for agent reports…</p>
              </div>
            ) : (
              <div>
                {task.steps.map((step, idx) => {
                  const isExpanded = expandedSteps[step.id];
                  const stepCfg = step.status === StepStatus.COMPLETED
                    ? { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
                    : step.status === StepStatus.FAILED
                    ? { icon: XCircle, color: 'var(--error)', bg: 'rgba(255,110,132,0.1)' }
                    : { icon: Loader2, color: 'var(--primary)', bg: 'rgba(132,85,239,0.1)' };
                  const StepIcon = stepCfg.icon;

                  return (
                    <div key={step.id}
                      style={idx > 0 ? { borderTop: '1px solid rgba(72,71,77,0.1)' } : {}}>
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer select-none transition-colors duration-150"
                        onClick={() => toggleStep(step.id)}
                        style={{}}
                        onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--surface-high)'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: stepCfg.bg }}>
                          <StepIcon size={15} style={{ color: stepCfg.color }}
                            className={step.status === StepStatus.RUNNING ? 'animate-spin' : ''} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
                              {step.agent_name}
                            </span>
                            <span className="rounded px-1.5 py-0.5 text-xs font-semibold"
                              style={{ background: 'var(--surface-highest)', color: 'var(--on-surface-variant)' }}>
                              {step.step_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--outline)' }}>
                              <Timer size={11} />
                              {step.latency_ms ? `${step.latency_ms}ms` : '--'}
                            </span>
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--outline)' }}>
                              <History size={11} />
                              {step.confidence ? `${(step.confidence * 100).toFixed(0)}% confidence` : '--'}
                            </span>
                          </div>
                        </div>

                        {isExpanded
                          ? <ChevronDown size={15} style={{ color: 'var(--outline)', flexShrink: 0 }} />
                          : <ChevronRight size={15} style={{ color: 'var(--outline)', flexShrink: 0 }} />
                        }
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            style={{ overflow: 'hidden', paddingLeft: '3.5rem', paddingRight: '1rem', paddingBottom: '1rem' }}
                          >
                            <div className="rounded-xl overflow-hidden"
                              style={{ background: 'var(--surface-lowest)', border: '1px solid rgba(72,71,77,0.2)' }}>
                              <div className="flex items-center justify-between px-4 py-2.5"
                                style={{ borderBottom: '1px solid rgba(72,71,77,0.15)' }}>
                                <p className="label-xs">Step Payload</p>
                                {step.model_used && (
                                  <p className="text-xs font-mono" style={{ color: 'var(--primary)', opacity: 0.7 }}>
                                    {step.model_used}
                                  </p>
                                )}
                              </div>
                              <pre className="p-4 text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap"
                                style={{ color: '#c9d1d9' }}>
                                {JSON.stringify(step.output_payload, null, 2)}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-5">
          {/* Timeline */}
          <section className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
              <History size={14} style={{ color: 'var(--primary)' }} />
              Timeline
            </h3>

            <div className="space-y-5 relative">
              {/* vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: 'rgba(72,71,77,0.25)' }} />

              {[
                { label: 'Task Created', date: task.created_at, color: 'var(--outline-variant)' },
                ...(task.started_at ? [{ label: 'Processing Started', date: task.started_at, color: 'var(--primary-dim)' }] : []),
                ...(task.completed_at ? [{ label: 'Execution Complete', date: task.completed_at, color: '#10b981' }] : []),
              ].map((ev, i) => (
                <div key={i} className="relative pl-8">
                  <div className="absolute left-0 top-1 rounded-full flex items-center justify-center z-10"
                    style={{
                      width: 22, height: 22,
                      background: 'var(--surface-container)',
                      border: `2px solid ${ev.color}`,
                    }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: ev.color }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>{ev.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--outline)' }}>
                    {new Date(ev.date).toLocaleString()}
                  </p>
                  {i === 2 && task.started_at && task.completed_at && (
                    <p className="text-xs mt-1.5 px-2 py-1 rounded-lg font-medium"
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                      Duration: {formatTime(Math.floor((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Config */}
          <section className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>Configuration</h3>
            <div className="space-y-3">
              {[
                { key: 'Priority', value: `${task.priority} / 10`, color: 'var(--primary)' },
                { key: 'Retry Policy', value: 'Exponential', color: 'var(--on-surface-variant)' },
                { key: 'Task Type', value: task.task_type ?? 'General', color: 'var(--on-surface-variant)' },
              ].map(({ key, value, color }) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--outline)' }}>{key}</span>
                  <span className="font-semibold capitalize" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Agent Trace & Execution Timeline ── */}
      {[
        { title: 'Agent Workflow Trace', Component: AgentFlowChart },
        { title: 'Execution Timeline', Component: TaskTimeline },
      ].map(({ title, Component }) => (
        <section key={title} className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-1 h-5 rounded-full" style={{ background: 'var(--primary-dim)' }} />
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
              {title}
            </h2>
          </div>
          <Component steps={task.steps} />
        </section>
      ))}
    </div>
  );
}
