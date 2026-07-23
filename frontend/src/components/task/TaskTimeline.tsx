import React from 'react';
import { TaskStepResponse, StepStatus } from '../../types/task';
import { Timer, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface TaskTimelineProps {
  steps: TaskStepResponse[];
}

export default function TaskTimeline({ steps }: TaskTimelineProps) {
  const getDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className="wise-card-dark-surface p-6 border-hairline-on-dark">
      <div className="flex items-center gap-2 mb-8">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg text-on-dark">Execution Timeline</h3>
      </div>

      <div className="flex flex-wrap gap-4 relative">
        {/* Progress Line - visible only on large screens when flexed horizontally */}
        <div className="hidden md:block absolute top-[18px] left-0 right-0 h-[1px] bg-hairline-on-dark -z-10" />

        {steps.map((step, index) => {
          const statusColor = step.status === StepStatus.COMPLETED 
            ? 'bg-trading-up text-on-dark' 
            : step.status === StepStatus.FAILED 
            ? 'bg-trading-down text-on-dark' 
            : 'bg-info text-on-dark';

          const StatusIcon = step.status === StepStatus.COMPLETED 
            ? CheckCircle2 
            : step.status === StepStatus.FAILED 
            ? XCircle 
            : Loader2;

          return (
            <div key={step.id} className="flex-1 min-w-[200px] group">
              <div className="flex flex-col items-center md:items-start">
                {/* Status Dot */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-4 border-canvas-dark relative z-10 transition-transform group-hover:scale-110 ${statusColor}`}>
                  <StatusIcon className={`w-4 h-4 ${step.status === StepStatus.RUNNING ? 'animate-spin' : ''}`} />
                </div>

                <div className="mt-4 space-y-2 text-center md:text-left w-full">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-dark uppercase tracking-wider truncate" title={step.agent_name}>
                      {step.agent_name}
                    </span>
                    <span className="text-[10px] text-muted-strong font-mono tracking-tighter">
                      {step.step_type}
                    </span>
                  </div>

                  <div className="p-3 rounded-md bg-canvas-dark border border-hairline-on-dark space-y-1.5 transition-colors group-hover:bg-surface-elevated-dark/50">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-muted-strong uppercase font-bold">Start</span>
                      <span className="text-[10px] text-on-dark font-mono">
                        {new Date(step.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {step.completed_at && (
                      <div className="flex items-center justify-between gap-4 border-t border-hairline-on-dark pt-1.5">
                        <span className="text-[10px] text-muted-strong uppercase font-bold flex items-center gap-1">
                          <Timer className="w-2.5 h-2.5" />
                          Duration
                        </span>
                        <span className="text-[10px] text-primary font-bold font-mono">
                          {getDuration(step.created_at, step.completed_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {steps.length === 0 && (
          <div className="w-full text-center py-10">
            <p className="text-muted text-sm animate-pulse">Waiting for step timing data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
