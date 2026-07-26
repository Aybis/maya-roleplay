'use client';

import { useEffect, useRef, useState } from 'react';
import { TYPE_ICON, TYPE_LABELS, type StepDraft } from './flows/new/step-types';

type DemoNode = {
  id: string;
  type: StepDraft['type'];
  label: string;
  x: number;
  y: number;
  delay: number;
  /** Seconds into the "running" phase this node lights up — undefined skips it (branch not taken). */
  runDelay?: number;
};

const NODE_W = 176;
const NODE_H = 58;
const STAGE_W = 600;
const STAGE_H = 380;
// Keep in sync with the 10s animation-duration on .landing-demo-stage.is-playing children in globals.css.

const NODES: DemoNode[] = [
  { id: 'ask', type: 'collect', label: 'What drink they want', x: 20, y: 16, delay: 2.2, runDelay: 5.8 },
  { id: 'branch', type: 'condition', label: 'If size equals "large"', x: 244, y: 16, delay: 3.2, runDelay: 6.2 },
  { id: 'webhook', type: 'webhook', label: 'Notify the till', x: 132, y: 168, delay: 4.2, runDelay: 6.6 },
  { id: 'say', type: 'message', label: 'Mention the pastry sample', x: 356, y: 168, delay: 4.2 },
  { id: 'end', type: 'end', label: "That's on its way!", x: 244, y: 306, delay: 5.2, runDelay: 7.0 },
];

const EDGES: { from: string; to: string; color: string; label?: string; delay: number; runDelay?: number }[] = [
  { from: 'ask', to: 'branch', color: '#3a352e', delay: 2.8, runDelay: 6.0 },
  { from: 'branch', to: 'webhook', color: '#1f1b17', label: '✓ true', delay: 3.8, runDelay: 6.4 },
  { from: 'branch', to: 'say', color: '#8a8177', label: '✗ false', delay: 3.8 },
  { from: 'webhook', to: 'end', color: '#3a352e', delay: 4.8, runDelay: 6.8 },
  { from: 'say', to: 'end', color: '#3a352e', delay: 4.8 },
];

function byId(id: string) {
  return NODES.find((n) => n.id === id)!;
}

function anchor(node: DemoNode, side: 'top' | 'bottom' | 'left' | 'right') {
  switch (side) {
    case 'top':
      return { x: node.x + NODE_W / 2, y: node.y };
    case 'bottom':
      return { x: node.x + NODE_W / 2, y: node.y + NODE_H };
    case 'left':
      return { x: node.x, y: node.y + NODE_H / 2 };
    case 'right':
      return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
  }
}

function edgePath(from: DemoNode, to: DemoNode) {
  const sameRow = from.y === to.y;
  const a = anchor(from, sameRow ? 'right' : 'bottom');
  const b = anchor(to, sameRow ? 'left' : 'top');
  const midY = (a.y + b.y) / 2;
  return sameRow
    ? `M ${a.x} ${a.y} C ${a.x + 30} ${a.y}, ${b.x - 30} ${b.y}, ${b.x} ${b.y}`
    : `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
}

const END_NODE = byId('end');
const CURSOR_START = { x: 240, y: 220 };
const CURSOR_BUTTON = { x: 415, y: 262 };

const USE_STEPS = [
  {
    title: 'Describe the scenario',
    description: '"A coffee cart bot that takes an order, then notifies the till." Virgil drafts the name, persona, and every step.',
  },
  {
    title: 'Click a node to edit it',
    description: 'Tweak the question, the branch condition, or the webhook URL right there on the canvas — no code.',
  },
  {
    title: 'Create the flow',
    description: "It's live immediately — ready to talk, branch on what it hears, and trigger your own automation.",
  },
];

export default function LandingFlowDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlaying(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={stageRef} className={`landing-demo-stage${playing ? ' is-playing' : ''}`}>
        {/* Scene 1: describe the idea and hit generate */}
        <div className="landing-demo-promptcard">
          <div className="landing-demo-promptcard-head">
            <span>✳</span> Describe the scenario, I&apos;ll draft the flow
          </div>
          <div className="landing-demo-promptcard-input">
            <span className="landing-demo-typewriter">
              A coffee cart bot that takes an order, then notifies the till.
            </span>
          </div>
          <button type="button" className="landing-demo-promptcard-btn" tabIndex={-1}>
            Generate flow
            <span className="landing-demo-click-ripple" />
          </button>
        </div>

        <div
          className="landing-demo-cursor"
          aria-hidden="true"
          style={
            {
              '--cursor-start-x': `${CURSOR_START.x}px`,
              '--cursor-start-y': `${CURSOR_START.y}px`,
              '--cursor-btn-x': `${CURSOR_BUTTON.x}px`,
              '--cursor-btn-y': `${CURSOR_BUTTON.y}px`,
            } as React.CSSProperties
          }
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M2 1.5 19 9.5 11 11.5 8.5 19 2 1.5Z" fill="#1f1b17" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Scene 2: zoom into the canvas, watch the flow build, then run it */}
        <div className="landing-demo-flowscene">
          <svg
            className="landing-demo-canvas"
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            role="img"
            aria-label="Example flow: ask for a drink, ask for a size, branch on whether it's large, then notify the till or mention a pastry sample, and close the conversation."
          >
            {EDGES.map((edge) => {
              const from = byId(edge.from);
              const to = byId(edge.to);
              const path = edgePath(from, to);
              return (
                <g
                  key={`${edge.from}-${edge.to}`}
                  className="landing-demo-edge"
                  style={{ '--demo-delay': `${edge.delay}s` } as React.CSSProperties}
                >
                  <path d={path} fill="none" stroke={edge.color} strokeWidth={1.5} strokeDasharray="1 5" strokeLinecap="round" />
                  {edge.label && (
                    <foreignObject
                      x={(anchor(from, 'bottom').x + anchor(to, 'top').x) / 2 - 30}
                      y={(anchor(from, 'bottom').y + anchor(to, 'top').y) / 2 - 10}
                      width={60}
                      height={20}
                    >
                      <span className="landing-demo-edge-label" style={{ color: edge.color, borderColor: `${edge.color}33` }}>
                        {edge.label}
                      </span>
                    </foreignObject>
                  )}
                  {edge.runDelay != null && (
                    <path
                      className="landing-demo-run-line"
                      d={path}
                      fill="none"
                      stroke="#1f1b17"
                      strokeWidth={2.25}
                      strokeLinecap="round"
                      style={{ '--demo-run-delay': `${edge.runDelay}s` } as React.CSSProperties}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {NODES.map((node) => (
            <div
              key={node.id}
              className="flow-node landing-demo-node"
              style={
                {
                  left: node.x,
                  top: node.y,
                  width: NODE_W,
                  '--node-color': '#1f1b17',
                  '--demo-delay': `${node.delay}s`,
                } as React.CSSProperties
              }
            >
              <div className="flow-node-top">
                <span className="flow-node-icon-chip">{TYPE_ICON[node.type]}</span>
                <div className="flow-node-titles">
                  <span className="flow-node-type">{TYPE_LABELS[node.type]}</span>
                </div>
                <span className="flow-node-status-dot" />
              </div>
              <div className="flow-node-preview" style={{ paddingLeft: 0 }}>
                {node.label}
              </div>
              {node.runDelay != null && (
                <span
                  className="landing-demo-run-ring"
                  style={{ '--demo-run-delay': `${node.runDelay}s` } as React.CSSProperties}
                />
              )}
            </div>
          ))}

          <span
            className="landing-demo-live-badge"
            style={{ left: END_NODE.x + NODE_W - 6, top: END_NODE.y - 12 } as React.CSSProperties}
          >
            ● Live
          </span>
        </div>
      </div>

      <div className="landing-steps landing-demo-steps">
        {USE_STEPS.map((step, index) => (
          <div className="landing-step" key={step.title}>
            <span className="landing-step-num">{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
