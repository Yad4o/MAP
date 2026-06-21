import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Gauge,
  Sparkles,
  Code2,
  Clipboard,
} from 'lucide-react';
import { FormattedOutput } from './CodeBlock';

/**
 * TaskResultView.tsx
 *
 * Renders the AgentController pipeline result (status, plan, step_results,
 * validation, summary) as readable UI instead of a raw JSON dump.
 *
 * Shape produced by agents/controller/agent_controller.py::run_pipeline():
 * {
 *   status: "COMPLETED" | "FAILED",
 *   plan: { task_type, steps: [...], estimated_total_duration_s, notes },
 *   step_results: [ { step_id?, description?, status?, output?, error?,
 *                      tool_calls_used?, latency_ms?, tokens_used?, trace? } ],
 *   validation: { passed, confidence, step_scores, failed_steps, critique, summary },
 *   summary: string,
 *   steps_completed: number
 * }
 *
 * Anything not matching this shape falls back to a raw JSON viewer so no
 * data is ever hidden — it's just not the default presentation.
 */

interface PlanStep {
  step_id?: string;
  description?: string;
  assigned_agent?: string;
  tool_names?: string[];
  dependency_step_ids?: string[];
  estimated_duration_s?: number;
}

interface Plan {
  task_type?: string;
  steps?: PlanStep[];
  estimated_total_duration_s?: number;
  notes?: string;
}

interface StepResult {
  step_id?: string;
  description?: string;
  status?: string;
  output?: string;
  summary?: string;
  code_artifacts?: string[];
  error?: string;
  agent?: string;
  tool_calls_used?: string[];
  latency_ms?: number;
  tokens_used?: { in?: number; out?: number };
  trace?: string[];
}

interface Validation {
  passed?: boolean;
  confidence?: number;
  step_scores?: Record<string, number>;
  failed_steps?: string[];
  critique?: string;
  summary?: string;
}

interface TaskResult {
  status?: string;
  plan?: Plan;
  step_results?: StepResult[];
  validation?: Validation;
  summary?: string;
  steps_completed?: number;
  [key: string]: unknown;
}

interface TaskResultViewProps {
  result: TaskResult | null | undefined;
}

function isRecognizedShape(result: unknown): result is TaskResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  return 'plan' in r || 'step_results' in r || 'validation' in r;
}

export default function TaskResultView({ result }: TaskResultViewProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>(() => {
    if (!result || typeof result !== 'object') return {};
    const r = result as TaskResult;
    const initial: Record<number, boolean> = {};
    (r.step_results ?? []).forEach((step, idx) => {
      const hasCode = !!step.output && /```/.test(step.output);
      if (hasCode || step.error) initial[idx] = true;
    });
    return initial;
  });
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        No result data available for this task.
      </div>
    );
  }

  const copyJson = () => {
    navigator.clipboard
      .writeText(JSON.stringify(result, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err: unknown) => console.error('Clipboard write failed:', err));
  };

  // Unknown shape — fall back to a labeled raw viewer rather than guessing.
  if (!isRecognizedShape(result)) {
    return (
      <div className="p-4 bg-black/30 font-mono text-xs overflow-x-auto max-h-[500px]">
        <pre className="text-slate-300">{JSON.stringify(result, null, 2)}</pre>
      </div>
    );
  }

  const { plan, step_results = [], validation, summary, steps_completed } = result;
  const confidencePct = validation?.confidence != null ? Math.round(validation.confidence * 100) : null;

  const toggleStep = (idx: number) =>
    setExpandedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const getStepStatus = (step: StepResult) => {
    if (step.error) return 'failed';
    if (step.status === 'failed') return 'failed';
    if (step.status === 'completed' || step.output) return 'completed';
    return step.status || 'unknown';
  };

  return (
    <div className="divide-y divide-white/5">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ListChecks className="w-3.5 h-3.5" />
          {steps_completed ?? step_results.length} step{(steps_completed ?? step_results.length) === 1 ? '' : 's'} completed
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawJson((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white/5 hover:bg-white/10 text-slate-400"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showRawJson ? 'Hide raw JSON' : 'View raw JSON'}
          </button>
          <button
            onClick={copyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white/5 hover:bg-white/10 text-slate-400"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Clipboard className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      </div>

      {showRawJson && (
        <div className="p-4 bg-black/30 font-mono text-xs overflow-x-auto max-h-[400px]">
          <pre className="text-slate-300">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Summary</p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation */}
      {validation && (
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                validation.passed ? 'bg-green-500/10' : 'bg-amber-500/10'
              }`}
            >
              {validation.passed ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Validation</p>
              <p className="text-sm font-semibold text-white">
                {validation.passed ? 'Passed' : 'Needs attention'}
              </p>
            </div>
            {confidencePct != null && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Gauge className="w-3.5 h-3.5" />
                {confidencePct}% confidence
              </div>
            )}
          </div>

          {validation.critique && (
            <p className="text-sm text-slate-400 leading-relaxed pl-11">{validation.critique}</p>
          )}

          {validation.failed_steps && validation.failed_steps.length > 0 && (
            <div className="pl-11 mt-2 flex flex-wrap gap-1.5">
              {validation.failed_steps.map((id) => (
                <span
                  key={id}
                  className="px-2 py-0.5 rounded-md bg-red-400/10 text-red-400 text-[10px] font-mono border border-red-400/20"
                >
                  {id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plan overview */}
      {plan?.notes && (
        <div className="p-5">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Plan Notes</p>
          <p className="text-sm text-slate-400 leading-relaxed">{plan.notes}</p>
        </div>
      )}

      {/* Step results */}
      {step_results.length > 0 && (
        <div>
          <div className="p-5 pb-2">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step Results</p>
          </div>
          <div className="divide-y divide-white/5">
            {step_results.map((step, idx) => {
              const status = getStepStatus(step);
              const isExpanded = expandedSteps[idx];
              const planStep = plan?.steps?.[idx];

              return (
                <div key={step.step_id ?? idx}>
                  <div
                    className="px-5 py-3 flex items-center gap-3 cursor-pointer select-none hover:bg-white/[0.02]"
                    onClick={() => toggleStep(idx)}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    ) : status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        {step.description || planStep?.description || step.step_id || `Step ${idx + 1}`}
                      </p>
                      {step.tool_calls_used && step.tool_calls_used.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.tool_calls_used.map((tool) => (
                            <span
                              key={tool}
                              className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-500 border border-white/10"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {step.latency_ms != null && (
                      <span className="text-[10px] text-slate-500 shrink-0">{step.latency_ms}ms</span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 pl-12 space-y-3">
                      {step.error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-[10px] uppercase font-bold text-red-400/80 mb-1">Error</p>
                          <p className="text-xs text-red-200 font-mono whitespace-pre-wrap">{step.error}</p>
                        </div>
                      )}
                      {step.output && (
                        <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Output</p>
                          <FormattedOutput text={step.output} />
                        </div>
                      )}
                      {step.summary && step.summary !== step.output && (
                        <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Agent Summary</p>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{step.summary}</p>
                        </div>
                      )}
                      {step.trace && step.trace.length > 0 && (
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Trace</p>
                          <div className="space-y-1">
                            {step.trace
                              .filter((line) => line.trim().length > 0)
                              .map((line, i) => (
                                <p key={i} className="text-[11px] text-slate-500 font-mono">
                                  {line}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}
                      {step.tokens_used && (
                        <div className="flex gap-4 text-[10px] text-slate-500">
                          {step.tokens_used.in != null && <span>Tokens in: {step.tokens_used.in}</span>}
                          {step.tokens_used.out != null && <span>Tokens out: {step.tokens_used.out}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
