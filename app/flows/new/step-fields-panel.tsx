'use client';

import { TYPE_LABELS, summarize, type StepDraft } from './step-types';

export default function StepFieldsPanel({
  step,
  steps,
  onUpdate,
  onChangeType,
  onRemove,
}: {
  step: StepDraft;
  steps: StepDraft[];
  onUpdate: (patch: Partial<StepDraft>) => void;
  onChangeType: (type: StepDraft['type']) => void;
  onRemove: () => void;
}) {
  const collectFields = steps.filter((s): s is Extract<StepDraft, { type: 'collect' }> => s.type === 'collect');
  const index = steps.findIndex((s) => s.key === step.key);

  const targetOptions = [
    { value: '', label: '→ continue to next step' },
    ...steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.key !== step.key)
      .map(({ s, i }) => ({ value: s.key, label: summarize(s, i) })),
  ];

  return (
    <div className="node-panel-body">
      <div className="node-panel-status">
        <span className="node-panel-status-dot" />
        <span className="node-panel-status-text">{TYPE_LABELS[step.type]} · Step {index + 1}</span>
      </div>

      <label className="auth-label">Step {index + 1} type</label>
      <select
        className="auth-input"
        value={step.type}
        onChange={(event) => onChangeType(event.target.value as StepDraft['type'])}
      >
        {(Object.keys(TYPE_LABELS) as StepDraft['type'][]).map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      {step.type === 'message' && (
        <>
          <label className="auth-label">What should they say?</label>
          <textarea
            className="auth-input"
            rows={4}
            maxLength={500}
            placeholder="What should they say here?"
            value={step.text}
            onChange={(event) => onUpdate({ text: event.target.value })}
          />
        </>
      )}

      {step.type === 'collect' && (
        <div className="step-fields">
          <label className="auth-label">Question to ask</label>
          <input
            className="auth-input"
            placeholder="e.g. What's your name?"
            maxLength={300}
            value={step.question}
            onChange={(event) => onUpdate({ question: event.target.value })}
          />
          <label className="auth-label">Field key</label>
          <input
            className="auth-input"
            placeholder="e.g. customer_name"
            maxLength={60}
            value={step.field}
            onChange={(event) => onUpdate({ field: event.target.value })}
          />
          <label className="step-checkbox">
            <input
              type="checkbox"
              checked={step.required}
              onChange={(event) => onUpdate({ required: event.target.checked })}
            />
            Required before continuing
          </label>
        </div>
      )}

      {step.type === 'condition' && (
        <div className="step-fields">
          <label className="auth-label">Check field</label>
          <select className="auth-input" value={step.field} onChange={(event) => onUpdate({ field: event.target.value })}>
            <option value="">Choose a collected field…</option>
            {collectFields.map((f) => (
              <option key={f.key} value={f.field}>
                {f.field || '(unnamed)'}
              </option>
            ))}
          </select>
          <div className="quick-action-row">
            <select
              className="auth-input"
              value={step.matchType}
              onChange={(event) => onUpdate({ matchType: event.target.value as 'equals' | 'contains' })}
            >
              <option value="equals">equals</option>
              <option value="contains">contains</option>
            </select>
            <input
              className="auth-input"
              placeholder="value to compare"
              maxLength={200}
              value={step.matchValue}
              onChange={(event) => onUpdate({ matchValue: event.target.value })}
            />
          </div>
          <label className="auth-label">✓ If true, go to</label>
          <select
            className="auth-input"
            value={step.whenTrue ?? ''}
            onChange={(event) => onUpdate({ whenTrue: event.target.value || null })}
          >
            {targetOptions.map((opt) => (
              <option key={opt.value || 'next'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="auth-label">✗ If false, go to</label>
          <select
            className="auth-input"
            value={step.whenFalse ?? ''}
            onChange={(event) => onUpdate({ whenFalse: event.target.value || null })}
          >
            {targetOptions.map((opt) => (
              <option key={opt.value || 'next'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {step.type === 'webhook' && (
        <>
          <label className="auth-label">Webhook URL</label>
          <input
            className="auth-input"
            placeholder="https://your-automation.example.com/webhook"
            maxLength={500}
            value={step.url}
            onChange={(event) => onUpdate({ url: event.target.value })}
          />
        </>
      )}

      {step.type === 'end' && (
        <>
          <label className="auth-label">Closing line</label>
          <textarea
            className="auth-input"
            rows={3}
            maxLength={300}
            placeholder="Closing line"
            value={step.text}
            onChange={(event) => onUpdate({ text: event.target.value })}
          />
        </>
      )}

      <button type="button" className="node-panel-remove" onClick={onRemove}>
        Remove step
      </button>
    </div>
  );
}
