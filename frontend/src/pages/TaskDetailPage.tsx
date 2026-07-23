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
  Timer,
  ArrowLeft,
  Terminal,
  Send,
  Inbox,
  Code2,
  Eye,
  EyeOff,
  Zap,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  BrainCircuit,
  FileText,
  Wrench,
} from 'lucide-react';
import AgentFlowChart from '../components/task/AgentFlowChart';
import TaskTimeline from '../components/task/TaskTimeline';
import TaskResultView from '../components/task/TaskResultView';

/* ── Wise semantic status helpers ──────────────────────────────────────── */
const getStatusStyle = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.COMPLETED:
      return { bg: '#123820', color: '#7ee787', dot: '#2ead4b', icon: CheckCircle2, spinning: false };
    case TaskStatus.FAILED:
      return { bg: '#3e1414', color: '#f85149', dot: '#d03238', icon: XCircle, spinning: false };
    case TaskStatus.CANCELLED:
      return { bg: '#1e232a', color: '#8b949e', dot: '#868685', icon: Ban, spinning: false };
    case TaskStatus.PROCESSING:
    case TaskStatus.RETRYING:
      return { bg: '#123820', color: '#7ee787', dot: '#2ead4b', icon: Cpu, spinning: true };
    default:
      return { bg: '#362a08', color: '#ffd11a', dot: '#ffd11a', icon: Clock, spinning: false };
  }
};

const getStepStyle = (status: StepStatus) => {
  switch (status) {
    case StepStatus.COMPLETED: return { bg: '#123820', color: '#7ee787', icon: CheckCircle2, spinning: false };
    case StepStatus.FAILED:    return { bg: '#3e1414', color: '#f85149', icon: XCircle,     spinning: false };
    default:                   return { bg: '#123820', color: '#7ee787', icon: Cpu,          spinning: true  };
  }
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: task, isLoading: isQueryLoading, error } = useTaskDetail(id);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [rawJsonSteps, setRawJsonSteps] = useState<Record<string, boolean>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else if (task?.started_at && task?.completed_at) {
      setElapsedTime(
        Math.floor((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000),
      );
    }
    return () => clearInterval(interval);
  }, [task?.status, task?.started_at, task?.completed_at, task?.created_at]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isQueryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#9fe870' }} />
          <p className="animate-pulse" style={{ color: '#848e9c' }}>Fetching task details…</p>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (error || !task) {
    return (
      <div className="wise-card-dark-surface p-12 text-center max-w-lg mx-auto mt-20" style={{ border: '1px solid rgba(208,50,56,0.3)' }}>
        <AlertCircle className="w-14 h-14 mx-auto mb-5" style={{ color: '#f85149' }} />
        <h2 className="text-xl mb-3" style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, color: '#eaecef' }}>
          Task Unavailable
        </h2>
        <p className="text-sm mb-8" style={{ color: '#848e9c' }}>
          We couldn't retrieve the details for this task. It may have been deleted.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-wise-primary w-full max-w-xs">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const sStyle = getStatusStyle(task.status);
  const StatusIcon = sStyle.icon;

  const toggleStep = (stepId: string) =>
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));

  const toggleRawJson = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    setRawJsonSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  /* ── LLM I/O helpers ────────────────────────────────────────────────── */
  type StepResult = {
    trace?: string[];
    output?: string;
    summary?: string;
    step_id?: string;
    description?: string;
    tokens_used?: { in?: number; out?: number };
    tool_inputs?: Array<{ tool: string; args: Record<string, unknown> }>;
    tool_calls_used?: string[];
    code_artifacts?: string[];
  };

  const getStepResult = (step: typeof task.steps[0]): StepResult | null => {
    const payload = step.output_payload as Record<string, unknown> | undefined;
    if (!payload) return null;
    return (payload.step_result as StepResult) ?? (payload.plan as StepResult) ?? null;
  };

  const getPromptText = (sr: StepResult): string => {
    if (sr.trace && sr.trace.length > 0 && sr.trace[0]) return sr.trace[0];
    return sr.description ?? '';
  };

  const getStepTokens = (st: typeof task.steps[0]) => {
    const sr = getStepResult(st);
    const inTokens = st.tokens_in || sr?.tokens_used?.in || 0;
    const outTokens = st.tokens_out || sr?.tokens_used?.out || 0;
    return { inTokens, outTokens };
  };

  const handleCopyFullDebugReport = () => {
    if (!task) return;
    const reportLines: string[] = [];
    reportLines.push(`==================================================`);
    reportLines.push(`MAP EXECUTION DEBUG REPORT - TASK #${task.id}`);
    reportLines.push(`==================================================`);
    reportLines.push(`Title: ${task.title}`);
    reportLines.push(`Status: ${task.status}`);
    reportLines.push(`Created: ${new Date(task.created_at).toLocaleString()}`);
    if (task.started_at) reportLines.push(`Started: ${new Date(task.started_at).toLocaleString()}`);
    if (task.completed_at) reportLines.push(`Completed: ${new Date(task.completed_at).toLocaleString()}`);
    if (task.description) reportLines.push(`Task Description: ${task.description}`);
    
    if (task.error) {
      reportLines.push(`\n--------------------------------------------------`);
      reportLines.push(`CRITICAL ERROR DETAILS`);
      reportLines.push(`--------------------------------------------------`);
      reportLines.push(`Type: ${task.error.type}`);
      reportLines.push(`Message: ${task.error.message}`);
      if (task.error.traceback) reportLines.push(`Traceback:\n${task.error.traceback}`);
    }
    
    if (task.steps && task.steps.length > 0) {
      reportLines.push(`\n==================================================`);
      reportLines.push(`EXECUTION STEPS & LLM TRACES (${task.steps.length} steps)`);
      reportLines.push(`==================================================`);
      
      task.steps.forEach((st, idx) => {
        const sr = getStepResult(st);
        const { inTokens, outTokens } = getStepTokens(st);
        reportLines.push(`\n--------------------------------------------------`);
        reportLines.push(`STEP ${idx + 1}: [${st.step_type}] ${st.agent_name} (Status: ${st.status})`);
        reportLines.push(`--------------------------------------------------`);
        if (st.model_used) reportLines.push(`Model Used: ${st.model_used}`);
        reportLines.push(`Token Usage: Input=${inTokens} | Output=${outTokens} | Total=${inTokens + outTokens}`);
        if (st.latency_ms) reportLines.push(`Latency: ${st.latency_ms}ms`);
        
        if (sr) {
          if (sr.step_id) reportLines.push(`Step ID: ${sr.step_id}`);
          if (sr.description) reportLines.push(`Goal/Description: ${sr.description}`);
          
          const promptText = getPromptText(sr);
          if (promptText) {
            reportLines.push(`\n>>> PROMPT SENT >>>`);
            reportLines.push(promptText);
          }
          if (sr.tool_inputs && sr.tool_inputs.length > 0) {
            reportLines.push(`\n>>> TOOL CALLS (${sr.tool_inputs.length}) >>>`);
            sr.tool_inputs.forEach((ti, tIdx) => {
              reportLines.push(`Tool #${tIdx + 1}: ${ti.tool}`);
              reportLines.push(`Args: ${JSON.stringify(ti.args, null, 2)}`);
            });
          }
          if (sr.output) {
            reportLines.push(`\n<<< LLM OUTPUT / RESPONSE <<<`);
            reportLines.push(sr.output);
          }
          if (sr.trace && sr.trace.length > 0) {
            reportLines.push(`\n<<< FULL TRACE MESSAGES (${sr.trace.length}) <<<`);
            sr.trace.forEach((tMsg, tmIdx) => {
              reportLines.push(`[Message ${tmIdx + 1}]:\n${tMsg}`);
            });
          }
        } else if (st.output_payload) {
          reportLines.push(`\n<<< RAW OUTPUT PAYLOAD <<<`);
          reportLines.push(JSON.stringify(st.output_payload, null, 2));
        }
      });
    }

    const textToCopy = reportLines.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  const isRunning =
    task.status === TaskStatus.PROCESSING || task.status === TaskStatus.RETRYING;

  return (
    <div className="max-w-[1280px] mx-auto space-y-5 pb-20 animate-wise-fade-up">

      {/* ── Back link ── */}
      <button
        onClick={() => navigate('/tasks')}
        className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
        style={{ color: '#848e9c' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#eaecef')}
        onMouseLeave={e => (e.currentTarget.style.color = '#848e9c')}
      >
        <ArrowLeft size={15} />
        All tasks
      </button>

      {/* ── SECTION 1: Header ── */}
      <section className="wise-card-dark-surface" style={{ padding: '28px 28px' }}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Status badge + date */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: sStyle.bg, color: sStyle.color }}
              >
                <StatusIcon
                  className={`w-3.5 h-3.5 ${sStyle.spinning ? 'animate-spin' : ''}`}
                />
                {task.status}
              </span>
              <span className="text-xs flex items-center gap-1.5" style={{ color: '#848e9c' }}>
                <Calendar className="w-3.5 h-3.5" />
                {new Date(task.created_at).toLocaleDateString()}
              </span>
              <code
                className="text-[11px] font-mono px-2 py-0.5 rounded-md"
                style={{ background: '#1e232a', color: '#eaecef' }}
              >
                #{task.id}
              </code>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: 'Manrope, sans-serif', fontWeight: 900,
                fontSize: '28px', lineHeight: '1.2',
                letterSpacing: '-0.3px', color: '#eaecef',
              }}
            >
              {task.title}
            </h1>
            <p className="text-sm max-w-2xl" style={{ color: '#848e9c' }}>
              {task.description}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {/* One-Click Copy Full Execution Report Button */}
            <button
              onClick={handleCopyFullDebugReport}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              style={{
                background: copiedFull ? '#123820' : '#1e232a',
                color: copiedFull ? '#7ee787' : '#eaecef',
                border: copiedFull ? '1px solid #7ee787' : '1px solid rgba(255,255,255,0.12)',
              }}
              title="Copy all prompts, step outputs, tool calls, errors, and traces to clipboard in one click"
            >
              {copiedFull ? <Check className="w-4 h-4 text-[#7ee787]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedFull ? 'Report Copied!' : 'Copy Debug Report'}</span>
            </button>

            {(task.status === TaskStatus.PENDING || task.status === TaskStatus.PROCESSING) && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="btn-wise-tertiary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: '14px', padding: '9px 18px', color: '#848e9c', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {cancelMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Ban className="w-4 h-4" />
                }
                Cancel
              </button>
            )}
            {task.status === TaskStatus.FAILED && (
              <button
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="btn-wise-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: '14px', padding: '10px 18px' }}
              >
                {retryMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCcw className="w-4 h-4" />
                }
                Retry
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Progress bar (running) */}
          {isRunning && (
            <section className="wise-card-dark-surface overflow-hidden relative" style={{ padding: '24px' }}>
              {/* Animated lime-green top bar */}
              <div
                className="absolute top-0 left-0 h-[3px] rounded-t-full"
                style={{
                  background: '#9fe870',
                  animation: 'loading-bar 2s infinite',
                  width: '30%',
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: '#123820' }}
                  >
                    <Cpu className="w-5 h-5 animate-pulse" style={{ color: '#7ee787' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: '#eaecef', fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>
                      Execution in Progress
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: '#848e9c' }}>
                      Agents are working on your request…
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="text-2xl font-mono font-bold"
                    style={{ color: '#7ee787', fontFamily: 'JetBrains Mono,monospace' }}
                  >
                    {formatTime(elapsedTime)}
                  </span>
                  <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: '#848e9c' }}>
                    Elapsed
                  </p>
                </div>
              </div>
              <div
                className="mt-4 h-1.5 rounded-full overflow-hidden"
                style={{ background: '#1e232a' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ background: '#9fe870', width: '65%', animation: 'pulse 2s infinite' }}
                />
              </div>
            </section>
          )}

          {/* Result (completed) */}
          {task.status === TaskStatus.COMPLETED && (
            <section className="wise-card-dark-surface overflow-hidden" style={{ padding: 0 }}>
              <div
                className="flex items-center gap-2 px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#123820' }}
                >
                  <FileJson className="w-4 h-4" style={{ color: '#7ee787' }} />
                </div>
                <h3 className="font-semibold text-sm" style={{ color: '#eaecef' }}>Task Result</h3>
              </div>
              <TaskResultView result={task.result} />
            </section>
          )}

          {/* Error (failed) */}
          {task.status === TaskStatus.FAILED && (
            <section
              className="wise-card-dark-surface"
              style={{ border: '1px solid rgba(248,81,73,0.3)', background: '#181214' }}
            >
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#3e1414' }}
                >
                  <AlertCircle className="w-6 h-6" style={{ color: '#f85149' }} />
                </div>
                <div>
                  <h3
                    className="text-lg font-bold"
                    style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, color: '#eaecef' }}
                  >
                    Execution Failed
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#848e9c' }}>
                    The task encountered a critical error during processing.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Error Type',   val: task.error?.type || 'SystemError', valColor: '#f85149' },
                  { label: 'Retry Count',  val: `${task.retry_count} / 3`,          valColor: '#eaecef' },
                ].map(m => (
                  <div
                    key={m.label}
                    className="p-3 rounded-xl"
                    style={{ background: '#1e232a' }}
                  >
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: '#848e9c' }}>{m.label}</p>
                    <p className="font-mono text-sm font-bold" style={{ color: m.valColor }}>{m.val}</p>
                  </div>
                ))}
              </div>
              <div
                className="p-4 rounded-xl"
                style={{ background: '#3e1414', border: '1px solid rgba(248,81,73,0.3)' }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#f85149' }}>
                  {task.error?.message || 'Unknown error occurred. Please check agent logs.'}
                </p>
              </div>
            </section>
          )}

          {/* Steps accordion */}
          <section className="wise-card-dark-surface overflow-hidden" style={{ padding: 0 }}>
            <div
              className="flex items-center gap-2 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#123820' }}
              >
                <Layers className="w-4 h-4" style={{ color: '#7ee787' }} />
              </div>
              <h3 className="font-semibold text-sm" style={{ color: '#eaecef' }}>Agent Execution Steps</h3>
              <span
                className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background: '#1e232a', color: '#848e9c' }}
              >
                {task.steps?.length || 0} steps
              </span>
            </div>

            <div>
              {!task.steps || task.steps.length === 0 ? (
                <div className="p-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" style={{ color: '#848e9c' }} />
                  <p className="text-sm" style={{ color: '#848e9c' }}>Waiting for agent reports…</p>
                </div>
              ) : (
                task.steps.map((step, idx) => {
                  const ss = getStepStyle(step.status);
                  const StepIcon = ss.icon;
                  const isExpanded = expandedSteps[step.id];

                  return (
                    <div
                      key={step.id}
                      style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
                    >
                      <div
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none transition-colors"
                        onClick={() => toggleStep(step.id)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1b2026')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: ss.bg }}
                        >
                          <StepIcon
                            className={`w-4 h-4 ${ss.spinning ? 'animate-spin' : ''}`}
                            style={{ color: ss.color }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold truncate" style={{ color: '#eaecef' }}>
                              {step.agent_name}
                            </h4>
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                              style={{ background: '#1e232a', color: '#848e9c' }}
                            >
                              {step.step_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-[11px] flex items-center gap-1" style={{ color: '#848e9c' }}>
                              <Timer className="w-3 h-3" />
                              {step.latency_ms ? `${step.latency_ms}ms` : '--'}
                            </span>
                            <span className="text-[11px] flex items-center gap-1" style={{ color: '#848e9c' }}>
                              <History className="w-3 h-3" />
                              Score: {step.confidence ? `${(step.confidence * 100).toFixed(0)}%` : '--'}
                            </span>
                          </div>
                        </div>

                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" style={{ color: '#848e9c' }} />
                          : <ChevronRight className="w-4 h-4" style={{ color: '#848e9c' }} />
                        }
                      </div>

                      {isExpanded && (() => {
                        const sr = getStepResult(step);
                        const showRaw = rawJsonSteps[step.id];
                        const { inTokens, outTokens } = getStepTokens(step);
                        return (
                          <div className="px-5 pb-5 pl-[60px] space-y-3">

                            {/* ── Header bar: model pill + raw toggle ── */}
                            <div className="flex items-center gap-2">
                              {step.model_used && (
                                <code
                                  className="text-[10px] font-mono px-2 py-0.5 rounded"
                                  style={{ background: '#123820', color: '#7ee787' }}
                                >
                                  {step.model_used}
                                </code>
                              )}
                              {(inTokens > 0 || outTokens > 0) && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"
                                  style={{ background: '#1e232a', color: '#848e9c' }}>
                                  <Zap className="w-2.5 h-2.5" />
                                  {inTokens}↑ {outTokens}↓
                                </span>
                              )}
                              <button
                                onClick={e => toggleRawJson(e, step.id)}
                                className="ml-auto flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                                style={{ background: '#1e232a', color: showRaw ? '#7ee787' : '#848e9c', border: '1px solid rgba(255,255,255,0.08)' }}
                              >
                                {showRaw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {showRaw ? 'Inspector' : 'Raw JSON'}
                              </button>
                            </div>

                            {showRaw || !sr ? (
                              /* ── Raw JSON fallback ── */
                              <div className="rounded-xl p-4" style={{ background: '#1b2026', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[10px] uppercase font-bold" style={{ color: '#848e9c' }}>Raw Payload</p>
                                  <button
                                    onClick={() => copyToClipboard(`raw-${step.id}`, JSON.stringify(step.output_payload, null, 2))}
                                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                                    style={{ background: '#1e232a', color: '#848e9c' }}
                                  >
                                    {copiedKey === `raw-${step.id}` ? <Check className="w-3 h-3 text-[#7ee787]" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedKey === `raw-${step.id}` ? 'Copied' : 'Copy Payload'}</span>
                                  </button>
                                </div>
                                <pre className="text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto" style={{ color: '#eaecef' }}>
                                  {JSON.stringify(step.output_payload, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              /* ── Structured LLM I/O Inspector ── */
                              <div className="space-y-3">

                                {/* Prompt sent */}
                                {getPromptText(sr) && (
                                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(159,232,112,0.2)' }}>
                                    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#0d1a0f' }}>
                                      <div className="flex items-center gap-2">
                                        <Send className="w-3 h-3" style={{ color: '#7ee787' }} />
                                        <span className="text-[10px] uppercase font-bold" style={{ color: '#7ee787' }}>Prompt Sent</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(`prompt-${step.id}`, getPromptText(sr))}
                                        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                                        style={{ background: 'rgba(126,231,135,0.15)', color: '#7ee787' }}
                                      >
                                        {copiedKey === `prompt-${step.id}` ? <Check className="w-3 h-3 text-[#7ee787]" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedKey === `prompt-${step.id}` ? 'Copied' : 'Copy Prompt'}</span>
                                      </button>
                                    </div>
                                    <pre className="text-xs font-mono whitespace-pre-wrap px-3 py-3 max-h-48 overflow-y-auto"
                                      style={{ background: '#0f1f12', color: '#c8e6c9' }}>
                                      {getPromptText(sr)}
                                    </pre>
                                  </div>
                                )}

                                {/* Tool calls */}
                                {sr.tool_inputs && sr.tool_inputs.length > 0 && (
                                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,200,60,0.2)' }}>
                                    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#1a1500' }}>
                                      <div className="flex items-center gap-2">
                                        <Code2 className="w-3 h-3" style={{ color: '#ffd11a' }} />
                                        <span className="text-[10px] uppercase font-bold" style={{ color: '#ffd11a' }}>Tool Calls ({sr.tool_inputs.length})</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(`tools-${step.id}`, JSON.stringify(sr.tool_inputs, null, 2))}
                                        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                                        style={{ background: 'rgba(255,209,26,0.15)', color: '#ffd11a' }}
                                      >
                                        {copiedKey === `tools-${step.id}` ? <Check className="w-3 h-3 text-[#ffd11a]" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedKey === `tools-${step.id}` ? 'Copied' : 'Copy Tools'}</span>
                                      </button>
                                    </div>
                                    <div className="divide-y" style={{ background: '#12100a', borderColor: 'rgba(255,200,60,0.1)' }}>
                                      {sr.tool_inputs.map((tc, ti) => (
                                        <div key={ti} className="px-3 py-3">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                                              style={{ background: '#2a1f00', color: '#ffd11a' }}>
                                              {tc.tool}
                                            </span>
                                            <span className="text-[10px]" style={{ color: '#848e9c' }}>Call #{ti + 1}</span>
                                          </div>
                                          <pre className="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto"
                                            style={{ color: '#e6d080' }}>
                                            {JSON.stringify(tc.args, null, 2)}
                                          </pre>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Raw output / LLM response */}
                                {sr.output && (
                                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(130,140,160,0.2)' }}>
                                    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#13151a' }}>
                                      <div className="flex items-center gap-2">
                                        <Inbox className="w-3 h-3" style={{ color: '#848e9c' }} />
                                        <span className="text-[10px] uppercase font-bold" style={{ color: '#848e9c' }}>Raw Output / Response</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(`output-${step.id}`, sr.output || '')}
                                        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.08)', color: '#eaecef' }}
                                      >
                                        {copiedKey === `output-${step.id}` ? <Check className="w-3 h-3 text-[#7ee787]" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedKey === `output-${step.id}` ? 'Copied' : 'Copy Output'}</span>
                                      </button>
                                    </div>
                                    <pre className="text-xs font-mono whitespace-pre-wrap px-3 py-3 max-h-60 overflow-y-auto"
                                      style={{ background: '#0e1014', color: '#b0b8c4' }}>
                                      {sr.output}
                                    </pre>
                                  </div>
                                )}

                                {/* Trace messages if multiple (tool round-trips) */}
                                {sr.trace && sr.trace.filter(Boolean).length > 2 && (
                                  <details className="group">
                                    <summary className="cursor-pointer flex items-center justify-between text-[10px] uppercase font-bold py-1 select-none"
                                      style={{ color: '#848e9c' }}>
                                      <span className="flex items-center gap-2">
                                        <Terminal className="w-3 h-3" />
                                        Full Trace ({sr.trace.filter(Boolean).length} messages)
                                      </span>
                                    </summary>
                                    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                                      {sr.trace.filter(Boolean).map((msg, mi) => (
                                        <div key={mi} className="px-3 py-2" style={{ background: mi % 2 === 0 ? '#0e1014' : '#111318', borderTop: mi > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[9px] font-bold uppercase block" style={{ color: mi === 0 ? '#7ee787' : '#848e9c' }}>
                                              {mi === 0 ? 'prompt' : `msg ${mi}`}
                                            </span>
                                            <button
                                              onClick={() => copyToClipboard(`trace-${step.id}-${mi}`, msg)}
                                              className="text-[9px] text-[#848e9c] hover:text-[#eaecef]"
                                            >
                                              {copiedKey === `trace-${step.id}-${mi}` ? 'Copied' : 'Copy'}
                                            </button>
                                          </div>
                                          <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto" style={{ color: '#b0b8c4' }}>{msg}</pre>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )}

                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">

          {/* Timeline card */}
          <section className="wise-card-dark-surface">
            <h3
              className="font-semibold text-sm mb-5 flex items-center gap-2"
              style={{ color: '#eaecef' }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: '#123820' }}
              >
                <History className="w-3.5 h-3.5" style={{ color: '#7ee787' }} />
              </div>
              Task Timeline
            </h3>

            <div className="space-y-5 relative" style={{ paddingLeft: '28px' }}>
              <div
                className="absolute left-[10px] top-2 bottom-2 w-[1px]"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              />

              {[
                {
                  label: 'Created',
                  time: task.created_at,
                  dotColor: '#848e9c',
                  dotBg: '#1e232a',
                  show: true,
                },
                {
                  label: 'Processing Started',
                  time: task.started_at,
                  dotColor: '#7ee787',
                  dotBg: '#123820',
                  show: !!task.started_at,
                },
                {
                  label: 'Execution Complete',
                  time: task.completed_at,
                  dotColor: '#7ee787',
                  dotBg: '#123820',
                  show: !!task.completed_at,
                },
              ].filter(e => e.show).map(e => (
                <div key={e.label} className="relative">
                  <div
                    className="absolute -left-[28px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10"
                    style={{ background: e.dotBg, borderColor: e.dotColor }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: e.dotColor }}
                    />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: '#eaecef' }}>{e.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#848e9c' }}>
                    {new Date(e.time!).toLocaleString()}
                  </p>
                </div>
              ))}

              {task.completed_at && (
                <div
                  className="p-3 rounded-xl text-xs font-semibold"
                  style={{ background: '#123820', color: '#7ee787' }}
                >
                  Total: {formatTime(
                    Math.floor(
                      (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000,
                    ),
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Config card */}
          <section className="wise-card-dark-surface">
            <h3 className="font-semibold text-sm mb-4" style={{ color: '#eaecef' }}>Configuration</h3>
            <div className="space-y-3">
              {[
                { label: 'Priority',     val: `${task.priority} / 10`         },
                { label: 'Retry Policy', val: 'Exponential'                   },
                { label: 'Task Type',    val: (task.task_type || 'General')   },
              ].map(row => (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="text-xs" style={{ color: '#848e9c' }}>{row.label}</span>
                  <span className="text-xs font-semibold capitalize" style={{ color: '#eaecef' }}>{row.val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sleek Redesigned LLM Call Summary card */}
          {task.steps && task.steps.length > 0 && (() => {
            const execSteps = task.steps;
            if (execSteps.length === 0) return null;
            
            let totalIn = 0;
            let totalOut = 0;
            execSteps.forEach(st => {
              const { inTokens, outTokens } = getStepTokens(st);
              totalIn += inTokens;
              totalOut += outTokens;
            });
            const grandTotal = totalIn + totalOut;
            const inPercent = grandTotal > 0 ? Math.round((totalIn / grandTotal) * 100) : 50;

            return (
              <section className="wise-card-dark-surface overflow-hidden relative" style={{ border: '1px solid rgba(255,209,26,0.2)' }}>
                {/* Glowing accent ambient background blur */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none opacity-20 blur-2xl"
                  style={{ background: '#ffd11a' }}
                />

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#eaecef' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-inner" style={{ background: 'rgba(255,209,26,0.12)', border: '1px solid rgba(255,209,26,0.3)' }}>
                      <BrainCircuit className="w-4 h-4 text-[#ffd11a]" />
                    </div>
                    <span>LLM Diagnostics & Token Usage</span>
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ background: '#1e232a', color: '#848e9c' }}>
                    {execSteps.length} calls
                  </span>
                </div>

                {/* Token Stat Cards */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-3 rounded-xl relative overflow-hidden" style={{ background: '#0e1f13', border: '1px solid rgba(126,231,135,0.2)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#7ee787' }}>Prompt / In</span>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(126,231,135,0.2)' }}>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#7ee787]" />
                      </div>
                    </div>
                    <p className="text-lg font-mono font-extrabold" style={{ color: '#eaecef' }}>{totalIn.toLocaleString()}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#848e9c' }}>Input tokens sent</p>
                  </div>

                  <div className="p-3 rounded-xl relative overflow-hidden" style={{ background: '#1c1705', border: '1px solid rgba(255,209,26,0.25)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#ffd11a' }}>Completion / Out</span>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,209,26,0.2)' }}>
                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#ffd11a]" />
                      </div>
                    </div>
                    <p className="text-lg font-mono font-extrabold" style={{ color: '#eaecef' }}>{totalOut.toLocaleString()}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#848e9c' }}>Output tokens generated</p>
                  </div>
                </div>

                {/* Total & Distribution Progress Bar */}
                <div className="p-3 rounded-xl mb-4 space-y-2" style={{ background: '#161a20', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#eaecef' }}>
                      <Sparkles className="w-3.5 h-3.5 text-[#ffd11a]" />
                      Total Volume
                    </span>
                    <span className="font-mono font-bold" style={{ color: '#7ee787' }}>{grandTotal.toLocaleString()} tokens</span>
                  </div>

                  {/* Ratio bar */}
                  {grandTotal > 0 && (
                    <div className="space-y-1">
                      <div className="h-2 rounded-full overflow-hidden flex" style={{ background: '#1e232a' }}>
                        <div className="h-full transition-all duration-500" style={{ width: `${inPercent}%`, background: '#7ee787' }} title={`Prompt: ${inPercent}%`} />
                        <div className="h-full transition-all duration-500" style={{ width: `${100 - inPercent}%`, background: '#ffd11a' }} title={`Generation: ${100 - inPercent}%`} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono" style={{ color: '#848e9c' }}>
                        <span>{inPercent}% In</span>
                        <span>{100 - inPercent}% Out</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Per-step breakdown */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#848e9c' }}>Per-Step Call Breakdown</p>
                  {execSteps.map((st, i) => {
                    const sr = getStepResult(st);
                    const { inTokens, outTokens } = getStepTokens(st);
                    const toolsUsed = sr?.tool_calls_used ?? [];
                    const stepLabel = st.step_type === StepType.PLAN ? 'Planner' :
                                     st.step_type === StepType.ANALYZE ? 'Analyzer' :
                                     `Step ${i + 1}`;
                    return (
                      <div key={st.id} className="rounded-xl p-3 transition-colors" style={{ background: '#1b2026', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: '#eaecef' }}>{stepLabel}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#252b33', color: '#848e9c' }}>
                              {st.agent_name}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-semibold flex items-center gap-1" style={{ color: '#7ee787' }}>
                            <Zap className="w-3 h-3 text-[#7ee787]" />
                            {inTokens}↑ {outTokens}↓
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] mt-1.5" style={{ color: '#848e9c' }}>
                          <span>Model: <code className="text-[10px] font-mono text-[#eaecef]">{st.model_used || 'default'}</code></span>
                          {st.latency_ms && <span>{st.latency_ms}ms</span>}
                        </div>

                        {toolsUsed.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-2" style={{ borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                            <span className="text-[9px] uppercase font-bold self-center" style={{ color: '#848e9c' }}>Tools:</span>
                            {toolsUsed.map(t => (
                              <span key={t} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                                style={{ background: 'rgba(255,209,26,0.12)', color: '#ffd11a', border: '1px solid rgba(255,209,26,0.2)' }}>
                                <Wrench className="w-2.5 h-2.5" />
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}
        </div>
      </div>

      {/* Agent flow */}
      <section className="space-y-3 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-sm" style={{ background: '#9fe870' }} />
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, color: '#eaecef' }}
          >
            Agent Workflow Trace
          </h2>
        </div>
        <AgentFlowChart steps={task.steps || []} />
      </section>

      {/* Execution timeline */}
      <section className="space-y-3 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-sm" style={{ background: '#9fe870' }} />
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 900, color: '#eaecef' }}
          >
            Execution Timeline
          </h2>
        </div>
        <TaskTimeline steps={task.steps || []} />
      </section>

      <style>{`
        @keyframes loading-bar {
          0%   { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
