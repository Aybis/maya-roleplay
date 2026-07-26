export type StepDraft =
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

export const MAX_STEPS = 25;

export const TYPE_LABELS: Record<StepDraft['type'], string> = {
  message: 'Say something',
  collect: 'Ask & collect info',
  condition: 'Branch (if/else)',
  webhook: 'Trigger webhook',
  end: 'End conversation',
};

export const TYPE_ICON: Record<StepDraft['type'], string> = {
  message: '💬',
  collect: '✎',
  condition: '⑂',
  webhook: '⚡',
  end: '⏹',
};

export const TYPE_COLOR: Record<StepDraft['type'], string> = {
  message: '#1f1b17',
  collect: '#1f1b17',
  condition: '#1f1b17',
  webhook: '#1f1b17',
  end: '#1f1b17',
};

export function makeKey() {
  return `s${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultForType(type: StepDraft['type'], key: string): StepDraft {
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

export function summarize(step: StepDraft, index: number): string {
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

export function previewOf(step: StepDraft): string {
  switch (step.type) {
    case 'message':
      return step.text || 'Say something…';
    case 'collect':
      return step.question || 'Ask for info…';
    case 'condition':
      return step.field ? `If ${step.field} ${step.matchType} "${step.matchValue}"` : 'Set a condition…';
    case 'webhook':
      return step.url || 'Webhook URL…';
    case 'end':
      return step.text || 'Closing line…';
  }
}
