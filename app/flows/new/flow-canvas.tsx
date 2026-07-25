'use client';

import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
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
    <div className={`flow-node${selected ? ' flow-node-selected' : ''}`} style={{ borderLeftColor: TYPE_COLOR[step.type] }}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-head">
        <span className="flow-node-icon">{TYPE_ICON[step.type]}</span>
        <span className="flow-node-index">{index + 1}</span>
        <span className="flow-node-type">{TYPE_LABELS[step.type]}</span>
      </div>
      <div className="flow-node-preview">{previewOf(step)}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { flowStep: FlowStepNode };

export default function FlowCanvas({
  steps,
  onChange,
  selectedKey,
  onSelectKey,
}: {
  steps: StepDraft[];
  onChange: (next: StepDraft[]) => void;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
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
            style: { stroke: '#2f8a52', strokeWidth: 2 },
            labelStyle: { fill: '#2f8a52', fontWeight: 700, fontSize: 11 },
          });
        }
        if (falseTarget) {
          list.push({
            id: `${step.key}-f`,
            source: step.key,
            target: falseTarget,
            label: '✗ false',
            animated: true,
            style: { stroke: '#b23a3a', strokeWidth: 2 },
            labelStyle: { fill: '#b23a3a', fontWeight: 700, fontSize: 11 },
          });
        }
      } else if (step.type !== 'end' && index + 1 < steps.length) {
        list.push({
          id: `${step.key}-n`,
          source: step.key,
          target: steps[index + 1].key,
          animated: true,
          style: { stroke: '#9a7fc0', strokeWidth: 2 },
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
        <Background gap={18} size={1} color="#e5d3bd" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
