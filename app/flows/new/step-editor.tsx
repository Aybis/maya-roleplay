'use client';

type StepDraft =
  | { key: string; type: 'message'; text: string }
  | { key: string; type: 'collect'; field: string; question: string; required: boolean }
  | {
      key: string;
      type: 'condition';
      field: string;
      matchType: 'equals' | 'contains';
      matchValue: string;
      whenTrue: string | null;
      whenFalse: string | null;
    }
  | { key: string; type: 'webhook'; url: string }
  | { key: string; type: 'end'; text: string };

export type { StepDraft };

const MAX_STEPS = 25;
const TYPE_LABELS: Record<StepDraft['type'], string> = {
  message: 'Say something',
  collect: 'Ask & collect info',
  condition: 'Branch (if/else)',
  webhook: 'Trigger webhook',
  end: 'End conversation',
};

function makeKey() {
  return `s${Math.random().toString(36).slice(2, 9)}`;
}

function defaultForType(type: StepDraft['type'], key: string): StepDraft {
  switch (type) {
    case 'message':
      return { key, type: 'message', text: '' };
    case 'collect':
      return { key, type: 'collect', field: '', question: '', required: true };
    case 'condition':
      return { key, type: 'condition', field: '', matchType: 'equals', matchValue: '', whenTrue: null, whenFalse: null };
    case 'webhook':
      return { key, type: 'webhook', url: '' };
    case 'end':
      return { key, type: 'end', text: 'Thanks, talk soon!' };
  }
}

function summarize(step: StepDraft, index: number): string {
  const n = `${index + 1}.`;
  switch (step.type) {
    case 'message':
      return `${n} Say: ${step.text || '(empty)'}`;
    case 'collect':
      return `${n} Ask for ${step.field || '(unnamed field)'}`;
    case 'condition':
      return `${n} Check ${step.field || '(field)'}`;
    case 'webhook':
      return `${n} Webhook`;
    case 'end':
      return `${n} End`;
  }
}

export default function StepEditor({
  steps,
  onChange,
}: {
  steps: StepDraft[];
  onChange: (next: StepDraft[]) => void;
}) {
  const collectFields = steps.filter((s): s is Extract<StepDraft, { type: 'collect' }> => s.type === 'collect');

  const update = (index: number, patch: Partial<StepDraft>) => {
    onChange(steps.map((s, i) => (i === index ? ({ ...s, ...patch } as StepDraft) : s)));
  };

  const changeType = (index: number, type: StepDraft['type']) => {
    onChange(steps.map((s, i) => (i === index ? defaultForType(type, s.key) : s)));
  };

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    onChange([...steps, defaultForType('message', makeKey())]);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const targetOptions = (excludeKey: string) => [
    { value: '', label: '→ continue to next step' },
    ...steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.key !== excludeKey)
      .map(({ s, i }) => ({ value: s.key, label: summarize(s, i) })),
  ];

  return (
    <div className="step-editor">
      {steps.length === 0 && (
        <p className="field-hint">
          No steps yet — the character will just chat freely from the persona above. Add steps to guide it
          through a specific sequence (collect info, branch, trigger a webhook).
        </p>
      )}

      {steps.map((step, index) => (
        <div className="step-card" key={step.key}>
          <div className="step-card-head">
            <span className="step-number">{index + 1}</span>
            <select
              className="auth-input step-type-select"
              value={step.type}
              onChange={(event) => changeType(index, event.target.value as StepDraft['type'])}
            >
              {(Object.keys(TYPE_LABELS) as StepDraft['type'][]).map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <div className="step-card-actions">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label="Move down">
                ↓
              </button>
              <button type="button" className="qa-remove" onClick={() => removeStep(index)} aria-label="Remove step">
                ×
              </button>
            </div>
          </div>

          {step.type === 'message' && (
            <textarea
              className="auth-input"
              rows={2}
              maxLength={500}
              placeholder="What should they say here?"
              value={step.text}
              onChange={(event) => update(index, { text: event.target.value })}
            />
          )}

          {step.type === 'collect' && (
            <div className="step-fields">
              <input
                className="auth-input"
                placeholder="Question to ask, e.g. What's your name?"
                maxLength={300}
                value={step.question}
                onChange={(event) => update(index, { question: event.target.value })}
              />
              <input
                className="auth-input"
                placeholder="Field key, e.g. customer_name"
                maxLength={60}
                value={step.field}
                onChange={(event) => update(index, { field: event.target.value })}
              />
              <label className="step-checkbox">
                <input
                  type="checkbox"
                  checked={step.required}
                  onChange={(event) => update(index, { required: event.target.checked })}
                />
                Required before continuing
              </label>
            </div>
          )}

          {step.type === 'condition' && (
            <div className="step-fields">
              <select
                className="auth-input"
                value={step.field}
                onChange={(event) => update(index, { field: event.target.value })}
              >
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
                  onChange={(event) => update(index, { matchType: event.target.value as 'equals' | 'contains' })}
                >
                  <option value="equals">equals</option>
                  <option value="contains">contains</option>
                </select>
                <input
                  className="auth-input"
                  placeholder="value to compare"
                  maxLength={200}
                  value={step.matchValue}
                  onChange={(event) => update(index, { matchValue: event.target.value })}
                />
              </div>
              <label className="auth-label">If true, go to</label>
              <select
                className="auth-input"
                value={step.whenTrue ?? ''}
                onChange={(event) => update(index, { whenTrue: event.target.value || null })}
              >
                {targetOptions(step.key).map((opt) => (
                  <option key={opt.value || 'next'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <label className="auth-label">If false, go to</label>
              <select
                className="auth-input"
                value={step.whenFalse ?? ''}
                onChange={(event) => update(index, { whenFalse: event.target.value || null })}
              >
                {targetOptions(step.key).map((opt) => (
                  <option key={opt.value || 'next'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {step.type === 'webhook' && (
            <input
              className="auth-input"
              placeholder="https://your-automation.example.com/webhook"
              maxLength={500}
              value={step.url}
              onChange={(event) => update(index, { url: event.target.value })}
            />
          )}

          {step.type === 'end' && (
            <textarea
              className="auth-input"
              rows={2}
              maxLength={300}
              placeholder="Closing line"
              value={step.text}
              onChange={(event) => update(index, { text: event.target.value })}
            />
          )}
        </div>
      ))}

      {steps.length < MAX_STEPS && (
        <button type="button" className="qa-add" onClick={addStep}>
          + Add step
        </button>
      )}
    </div>
  );
}
