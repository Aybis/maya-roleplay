'use client';

import { Fragment } from 'react';
import type { StepDraft } from './step-editor';

const TYPE_COLOR: Record<StepDraft['type'], string> = {
  message: 'diagram-message',
  collect: 'diagram-collect',
  condition: 'diagram-condition',
  webhook: 'diagram-webhook',
  end: 'diagram-end',
};

const TYPE_ICON: Record<StepDraft['type'], string> = {
  message: '💬',
  collect: '✎',
  condition: '⑂',
  webhook: '⚡',
  end: '⏹',
};

function chipLabel(step: StepDraft, index: number): string {
  switch (step.type) {
    case 'message':
      return `${index + 1}. Say`;
    case 'collect':
      return `${index + 1}. Ask: ${step.field || '…'}`;
    case 'condition':
      return `${index + 1}. If ${step.field || '…'}`;
    case 'webhook':
      return `${index + 1}. Webhook`;
    case 'end':
      return `${index + 1}. End`;
  }
}

export default function FlowDiagram({ steps }: { steps: StepDraft[] }) {
  if (steps.length === 0) return null;

  const indexOf = new Map(steps.map((s, i) => [s.key, i]));

  return (
    <div className="flow-diagram">
      <div className="flow-diagram-row">
        {steps.map((step, index) => (
          <Fragment key={step.key}>
            <div className="flow-diagram-node-wrap">
              <div className={`flow-diagram-node ${TYPE_COLOR[step.type]}`}>
                <span className="flow-diagram-icon">{TYPE_ICON[step.type]}</span>
                {chipLabel(step, index)}
              </div>
              {step.type === 'condition' && (
                <div className="flow-diagram-branches">
                  <span className="flow-diagram-branch true">
                    ✓ → {step.whenTrue && indexOf.has(step.whenTrue) ? `Step ${indexOf.get(step.whenTrue)! + 1}` : 'next'}
                  </span>
                  <span className="flow-diagram-branch false">
                    ✗ → {step.whenFalse && indexOf.has(step.whenFalse) ? `Step ${indexOf.get(step.whenFalse)! + 1}` : 'next'}
                  </span>
                </div>
              )}
            </div>
            {index < steps.length - 1 && step.type !== 'condition' && step.type !== 'end' && (
              <span className="flow-diagram-arrow">→</span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
