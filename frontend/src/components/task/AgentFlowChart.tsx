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
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TaskStepResponse, StepType, StepStatus } from '../../types/task';
import { LucideIcon, Cpu, Brain, Search, Database, CheckCircle2, XCircle, Loader2, X, FileJson, Clock } from 'lucide-react';

interface AgentFlowChartProps {
  steps: TaskStepResponse[];
}

const AGENT_COLORS: Record<string, string> = {
  [StepType.PLAN]: '#FCD535',     // Primary
  [StepType.EXECUTE]: '#0ECB81',  // Trading Up
  [StepType.ANALYZE]: '#2E80FE',  // Info
  [StepType.MEMORY]: '#848E9C',   // Muted
  [StepType.ROOT]: '#474D57',     // Muted Strong
  [StepType.FALLBACK]: '#F6465D', // Trading Down
};

const AGENT_ICONS: Record<string, LucideIcon> = {
  [StepType.PLAN]: Brain,
  [StepType.EXECUTE]: Cpu,
  [StepType.ANALYZE]: Search,
  [StepType.MEMORY]: Database,
};

// Custom Node Component to show status and latency
const AgentNode = ({ data }: { data: { step: TaskStepResponse } }) => {
  const { step } = data;
  const color = AGENT_COLORS[step.step_type] || '#474D57';
  const Icon = AGENT_ICONS[step.step_type] || Cpu;

  const getStatusDetails = (status: StepStatus) => {
    switch (status) {
      case StepStatus.COMPLETED:
        return { icon: CheckCircle2, color: 'text-trading-up', bg: 'bg-trading-up/10' };
      case StepStatus.FAILED:
        return { icon: XCircle, color: 'text-trading-down', bg: 'bg-trading-down/10' };
      case StepStatus.SKIPPED:
        return { icon: X, color: 'text-muted-strong', bg: 'bg-surface-elevated-dark' };
      case StepStatus.RUNNING:
        return { icon: Loader2, color: 'text-info', bg: 'bg-info/10', animate: true };
      default:
        return { icon: Clock, color: 'text-primary', bg: 'bg-primary/10' };
    }
  };

  const statusDetails = getStatusDetails(step.status);
  const StatusIcon = statusDetails.icon;

  return (
    <div className="relative group">
      {/* Port Handles */}
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      
      <div 
        className="w-[220px] bg-canvas-dark border border-hairline-on-dark rounded-md p-3 transition-colors duration-300 group-hover:border-primary group-hover:bg-surface-elevated-dark"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-sm bg-surface-elevated-dark border border-hairline-on-dark">
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm ${statusDetails.bg} border border-hairline-on-dark`}>
            <StatusIcon className={`w-3 h-3 ${statusDetails.color} ${statusDetails.animate ? 'animate-spin' : ''}`} />
            <span className={`text-[9px] font-bold ${statusDetails.color} uppercase tracking-tighter`}>
              {step.status}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-on-dark text-xs font-bold truncate">{step.agent_name}</h4>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-strong uppercase font-medium">{step.step_type}</span>
            <div className="flex items-center gap-1 text-muted">
              <Clock className="w-2.5 h-2.5" />
              <span className="text-[10px] font-mono">{step.latency_ms || 0}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: '#2b3139' }} />
      <circle r="3" fill="#FCD535">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}

const nodeTypes = {
  agentNode: AgentNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

export default function AgentFlowChart({ steps }: AgentFlowChartProps) {
  const [selectedStep, setSelectedStep] = useState<TaskStepResponse | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    steps.forEach((step, index) => {
      nodes.push({
        id: step.id,
        data: { step },
        position: { x: index * 280, y: 100 },
        type: 'agentNode',
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

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const step = steps.find(s => s.id === node.id);
    if (step) setSelectedStep(step);
  };

  return (
    <div className="surface-card overflow-hidden h-[500px] relative border border-hairline-on-dark rounded-md">
      <div className="flex items-center gap-2 p-4 border-b border-hairline-on-dark bg-canvas-dark">
        <Brain className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm text-on-dark">Agent Activity Trace</h3>
      </div>
      
      <div className="h-full w-full bg-canvas-dark">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="bg-transparent"
        >
          <Background color="#1e2329" gap={20} />
          <Controls className="bg-surface-elevated-dark border-hairline-on-dark fill-on-dark" />
          <Panel position="top-right" className="bg-surface-elevated-dark p-2 rounded-md border border-hairline-on-dark text-[10px] text-muted">
            Click nodes to inspect payloads
          </Panel>
        </ReactFlow>
      </div>


      {/* Side Panel for Payload */}
      {selectedStep && (
        <div className="absolute top-0 right-0 h-full w-80 bg-surface-elevated-dark border-l border-hairline-on-dark z-50 transform transition-transform animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 border-b border-hairline-on-dark">
            <div className="flex items-center gap-2 text-on-dark font-bold text-sm">
              <FileJson className="w-4 h-4 text-primary" />
              Agent Details
            </div>
            <button 
              onClick={() => setSelectedStep(null)}
              className="p-1 hover:bg-canvas-dark rounded-sm transition-colors"
            >
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>
          
          <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100%-60px)] custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-on-dark font-semibold">{selectedStep.agent_name}</h4>
                  <p className="text-[10px] text-muted-strong uppercase tracking-widest">{selectedStep.step_type}</p>
                </div>
                <div className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                  selectedStep.status === StepStatus.COMPLETED ? 'bg-trading-up/10 text-trading-up' : 'bg-trading-down/10 text-trading-down'
                }`}>
                  {selectedStep.status}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-sm bg-canvas-dark border border-hairline-on-dark">
                  <p className="text-[8px] uppercase text-muted font-bold mb-1">Latency</p>
                  <p className="text-xs text-on-dark font-mono">{selectedStep.latency_ms || 0}ms</p>
                </div>
                <div className="p-2 rounded-sm bg-canvas-dark border border-hairline-on-dark">
                  <p className="text-[8px] uppercase text-muted font-bold mb-1">Model</p>
                  <p className="text-xs text-on-dark font-mono truncate" title={selectedStep.model_used}>{selectedStep.model_used || '---'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-muted-strong">Input Payload</p>
              <div className="bg-canvas-dark rounded-md p-3 border border-hairline-on-dark max-h-48 overflow-auto">
                <pre className="text-[11px] text-muted whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectedStep.input_payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-muted-strong">Output Payload</p>
              <div className="bg-canvas-dark rounded-md p-3 border border-hairline-on-dark max-h-48 overflow-auto">
                <pre className="text-[11px] text-muted whitespace-pre-wrap font-mono">
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

