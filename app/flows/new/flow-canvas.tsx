'use client';

import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  Panel,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useEffect } from 'react';
import { TYPE_COLOR, TYPE_ICON, TYPE_LABELS, previewOf, type StepDraft } from './step-types';

type NodeData = { step: StepDraft; index: number };

function FlowStepNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const { step, index } = data;
  return (
    <div
      className={`flow-node${selected ? ' flow-node-selected' : ''}`}
      style={{ '--node-color': TYPE_COLOR[step.type] } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="flow-node-handle" />
      <div className="flow-node-top">
        <span className="flow-node-icon-chip">{TYPE_ICON[step.type]}</span>
        <div className="flow-node-titles">
          <span className="flow-node-type">{TYPE_LABELS[step.type]}</span>
          <span className="flow-node-meta">Step {index + 1}</span>
        </div>
        <span className="flow-node-status-dot" />
      </div>
      <div className="flow-node-preview">{previewOf(step)}</div>
      <Handle type="source" position={Position.Bottom} className="flow-node-handle" />
    </div>
  );
}

const nodeTypes = { flowStep: FlowStepNode };

function IconMinus() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5 5 13a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconAdd() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CanvasToolbar({
  stepCount,
  hasSelection,
  onAddStep,
  onDeleteSelected,
}: {
  stepCount: number;
  hasSelection: boolean;
  onAddStep: () => void;
  onDeleteSelected: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPct = Math.round(zoom * 100);

  return (
    <Panel position="bottom-center">
      <div className="flow-toolbar">
        <button type="button" className="flow-toolbar-btn flow-toolbar-btn-primary" onClick={onAddStep}>
          <IconAdd /> Add
        </button>
        <span className="flow-toolbar-divider" />
        <button
          type="button"
          className="flow-toolbar-btn flow-toolbar-icon"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          aria-label="Delete selected step"
        >
          <IconTrash />
        </button>
        <span className="flow-toolbar-divider" />
        <span className="flow-toolbar-count">{stepCount}</span>
        <span className="flow-toolbar-divider" />
        <button type="button" className="flow-toolbar-btn flow-toolbar-icon" onClick={() => zoomOut()} aria-label="Zoom out">
          <IconMinus />
        </button>
        <span className="flow-toolbar-zoom">{zoomPct}%</span>
        <button type="button" className="flow-toolbar-btn flow-toolbar-icon" onClick={() => zoomIn()} aria-label="Zoom in">
          <IconPlus />
        </button>
        <button
          type="button"
          className="flow-toolbar-btn flow-toolbar-icon"
          onClick={() => fitView({ duration: 300 })}
          aria-label="Fit view"
        >
          <IconExpand />
        </button>
      </div>
    </Panel>
  );
}

export default function FlowCanvas({
  steps,
  onChange,
  selectedKey,
  onSelectKey,
  onAddStep,
  onDeleteSelected,
}: {
  steps: StepDraft[];
  onChange: (next: StepDraft[]) => void;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onAddStep: () => void;
  onDeleteSelected: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes((prev) => {
      const prevByKey = new Map(prev.map((n) => [n.id, n]));
      return steps.map((step, index) => {
        const existing = prevByKey.get(step.key);
        return {
          id: step.key,
          type: 'flowStep',
          position: existing?.position ?? { x: 20 + (index % 3) * 220, y: Math.floor(index / 3) * 150 + 10 },
          data: { step, index },
          selected: step.key === selectedKey,
        };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, selectedKey]);

  useEffect(() => {
    const dotted = { strokeDasharray: '1 5', strokeLinecap: 'round' as const };
    const labelCommon = { labelBgPadding: [6, 4] as [number, number], labelBgBorderRadius: 6 };
    const list: Edge[] = [];
    steps.forEach((step, index) => {
      if (step.type === 'condition') {
        const trueTarget = step.whenTrue ?? steps[index + 1]?.key;
        const falseTarget = step.whenFalse ?? steps[index + 1]?.key;
        if (trueTarget) {
          list.push({
            id: `${step.key}-t`,
            source: step.key,
            target: trueTarget,
            label: '✓ true',
            animated: true,
            style: { stroke: '#1f1b17', strokeWidth: 1.5, ...dotted },
            labelStyle: { fill: '#1f1b17', fontWeight: 700, fontSize: 10.5 },
            labelBgStyle: { fill: '#fff', stroke: '#e7e1d6', strokeWidth: 1 },
            ...labelCommon,
          });
        }
        if (falseTarget) {
          list.push({
            id: `${step.key}-f`,
            source: step.key,
            target: falseTarget,
            label: '✗ false',
            animated: true,
            style: { stroke: '#8a8177', strokeWidth: 1.5, ...dotted },
            labelStyle: { fill: '#8a8177', fontWeight: 700, fontSize: 10.5 },
            labelBgStyle: { fill: '#fff', stroke: '#e7e1d6', strokeWidth: 1 },
            ...labelCommon,
          });
        }
      } else if (step.type !== 'end' && index + 1 < steps.length) {
        list.push({
          id: `${step.key}-n`,
          source: step.key,
          target: steps[index + 1].key,
          animated: true,
          style: { stroke: '#3a352e', strokeWidth: 1.5, ...dotted },
        });
      }
    });
    setEdges(list);
  }, [steps, setEdges]);

  return (
    <div className="flow-canvas-area">
      {steps.length === 0 && (
        <div className="flow-canvas-empty">
          <p>No steps yet — pick a step type on the left to start building, or generate one from a description.</p>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelectKey(node.id)}
        onPaneClick={() => onSelectKey(null)}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1.2} color="#e2ddd2" />
        <CanvasToolbar
          stepCount={steps.length}
          hasSelection={!!selectedKey}
          onAddStep={onAddStep}
          onDeleteSelected={onDeleteSelected}
        />
      </ReactFlow>
    </div>
  );
}
