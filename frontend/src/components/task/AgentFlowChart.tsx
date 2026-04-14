import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  ConnectionLineType,
  BaseEdge,
  getBezierPath,
  EdgeProps,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TaskStepResponse, StepType, StepStatus } from '../../types/task';
import { LucideIcon, Cpu, Brain, Search, Database, CheckCircle2, XCircle, Loader2, X, FileJson } from 'lucide-react';

interface AgentFlowChartProps {
  steps: TaskStepResponse[];
}

const AGENT_COLORS: Record<string, string> = {
  [StepType.PLAN]: '#3b82f6',     // Blue
  [StepType.EXECUTE]: '#22c55e',  // Green
  [StepType.ANALYZE]: '#f97316',  // Orange
  [StepType.MEMORY]: '#a855f7',   // Purple
  [StepType.ROOT]: '#64748b',     // Slate
  [StepType.FALLBACK]: '#ef4444', // Red
};

const AGENT_ICONS: Record<string, LucideIcon> = {
  [StepType.PLAN]: Brain,
  [StepType.EXECUTE]: Cpu,
  [StepType.ANALYZE]: Search,
  [StepType.MEMORY]: Database,
};

// Custom edge for animation
function AnimatedEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd }: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: 'rgba(255,255,255,0.1)' }} />
      <circle r="3" fill="#8b5cf6">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}

const edgeTypes = {
  animated: AnimatedEdge,
};

export default function AgentFlowChart({ steps }: AgentFlowChartProps) {
  const [selectedStep, setSelectedStep] = useState<TaskStepResponse | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    steps.forEach((step, index) => {
      const color = AGENT_COLORS[step.step_type] || '#64748b';
      const Icon = AGENT_ICONS[step.step_type] || Cpu;
      const statusIcon = step.status === StepStatus.COMPLETED ? (
        <CheckCircle2 className="w-3 h-3 text-green-400" />
      ) : step.status === StepStatus.FAILED ? (
        <XCircle className="w-3 h-3 text-red-500" />
      ) : (
        <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
      );

      nodes.push({
        id: step.id,
        data: { label: step.agent_name },
        position: { x: index * 250, y: 100 },
        style: {
          background: 'rgba(255, 255, 255, 0.03)',
          color: '#fff',
          border: `1px solid ${color}40`,
          borderRadius: '12px',
          width: 200,
          padding: '12px',
          backdropFilter: 'blur(8px)',
        },
        type: 'default',
        // Embedding custom render logic in style is not ideal for React Flow, 
        // but for a simple sequential chart it works. To be more "premium", 
        // we'd use Custom Nodes, but let's stick to requested functionality.
      });

      if (index > 0) {
        edges.push({
          id: `e-${steps[index - 1].id}-${step.id}`,
          source: steps[index - 1].id,
          target: step.id,
          type: 'animated',
          animated: true,
        });
      }
    });

    return { nodes, edges };
  }, [steps]);

  const onNodeClick = (_: any, node: Node) => {
    const step = steps.find(s => s.id === node.id);
    if (step) setSelectedStep(step);
  };

  return (
    <div className="glass-card overflow-hidden h-[500px] relative border-violet-500/10">
      <div className="flex items-center gap-2 p-4 border-b border-white/5 bg-white/5">
        <Brain className="w-4 h-4 text-violet-400" />
        <h3 className="font-bold text-sm">Agent Activity Trace</h3>
      </div>
      
      <div className="h-full w-full bg-[#020617]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          edgeTypes={edgeTypes}
          fitView
          className="bg-transparent"
        >
          <Background color="#1e293b" gap={20} />
          <Controls className="bg-slate-900 border-white/10 fill-white" />
          <Panel position="top-right" className="bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/10 text-[10px] text-slate-400">
            Click nodes to inspect payloads
          </Panel>
        </ReactFlow>
      </div>

      {/* Side Panel for Payload */}
      {selectedStep && (
        <div className="absolute top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <FileJson className="w-4 h-4 text-violet-400" />
              Agent Details
            </div>
            <button 
              onClick={() => setSelectedStep(null)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100%-60px)] custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold">{selectedStep.agent_name}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">{selectedStep.step_type}</p>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedStep.status === StepStatus.COMPLETED ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {selectedStep.status}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-[8px] uppercase text-slate-500 font-bold mb-1">Latency</p>
                  <p className="text-xs text-slate-300 font-mono">{selectedStep.latency_ms || 0}ms</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-[8px] uppercase text-slate-500 font-bold mb-1">Model</p>
                  <p className="text-xs text-slate-300 font-mono truncate" title={selectedStep.model_used}>{selectedStep.model_used || '---'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-500">Input Payload</p>
              <div className="bg-black/50 rounded-xl p-3 border border-white/5 max-h-48 overflow-auto">
                <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(selectedStep.input_payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-500">Output Payload</p>
              <div className="bg-black/50 rounded-xl p-3 border border-white/5 max-h-48 overflow-auto">
                <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(selectedStep.output_payload || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
