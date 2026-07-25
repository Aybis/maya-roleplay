export type MessageStep = { id: string; type: "message"; text: string };
export type CollectStep = { id: string; type: "collect"; field: string; question: string; required: boolean };
export type ConditionStep = {
  id: string;
  type: "condition";
  field: string;
  matchType: "equals" | "contains";
  matchValue: string;
  whenTrue: string | null; // step id
  whenFalse: string | null; // step id
};
export type WebhookStep = { id: string; type: "webhook"; url: string };
export type EndStep = { id: string; type: "end"; text: string };

export type FlowStep = MessageStep | CollectStep | ConditionStep | WebhookStep | EndStep;

const STEP_TYPES = ["message", "collect", "condition", "webhook", "end"] as const;

export function parseSteps(raw: string): FlowStep[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFlowStep).slice(0, 25);
  } catch {
    return [];
  }
}

function isFlowStep(value: unknown): value is FlowStep {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && (STEP_TYPES as readonly string[]).includes(v.type as string);
}

export function collectFieldsOf(steps: FlowStep[]): Array<{ key: string; question: string; required: boolean }> {
  return steps
    .filter((step): step is CollectStep => step.type === "collect")
    .map((step) => ({ key: step.field, question: step.question, required: step.required }));
}

export function webhookUrlsOf(steps: FlowStep[]): string[] {
  return steps.filter((step): step is WebhookStep => step.type === "webhook").map((step) => step.url);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";
}

// Sanitizes untrusted client input into a safe FlowStep[]. Unknown fields are
// dropped; every string is trimmed and length-capped.
export function sanitizeSteps(raw: unknown): FlowStep[] {
  if (!Array.isArray(raw)) return [];

  const ids = new Set<string>();
  const nextId = (preferred: unknown): string => {
    const base = typeof preferred === "string" && preferred.trim() ? preferred.trim().slice(0, 60) : crypto.randomUUID();
    let id = base;
    let n = 1;
    while (ids.has(id)) id = `${base}-${n++}`;
    ids.add(id);
    return id;
  };

  const sanitized: FlowStep[] = [];
  for (const item of raw.slice(0, 25)) {
    if (typeof item !== "object" || item === null) continue;
    const v = item as Record<string, unknown>;
    const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

    switch (v.type) {
      case "message": {
        const text = str(v.text, 500);
        if (!text) continue;
        sanitized.push({ id: nextId(v.id), type: "message", text });
        break;
      }
      case "collect": {
        const question = str(v.question, 300);
        if (!question) continue;
        sanitized.push({
          id: nextId(v.id),
          type: "collect",
          field: slugify(str(v.field, 60) || question),
          question,
          required: v.required !== false,
        });
        break;
      }
      case "condition": {
        const field = str(v.field, 60);
        const matchValue = str(v.matchValue, 200);
        if (!field || !matchValue) continue;
        sanitized.push({
          id: nextId(v.id),
          type: "condition",
          field: slugify(field),
          matchType: v.matchType === "contains" ? "contains" : "equals",
          matchValue,
          whenTrue: typeof v.whenTrue === "string" ? v.whenTrue : null,
          whenFalse: typeof v.whenFalse === "string" ? v.whenFalse : null,
        });
        break;
      }
      case "webhook": {
        const url = str(v.url, 500);
        if (!url) continue;
        sanitized.push({ id: nextId(v.id), type: "webhook", url });
        break;
      }
      case "end": {
        sanitized.push({ id: nextId(v.id), type: "end", text: str(v.text, 300) || "Take care!" });
        break;
      }
      default:
        continue;
    }
  }

  // Re-point whenTrue/whenFalse at the (possibly renumbered) sanitized ids;
  // drop references to ids that didn't survive sanitization.
  const validIds = new Set(sanitized.map((step) => step.id));
  for (const step of sanitized) {
    if (step.type !== "condition") continue;
    if (step.whenTrue && !validIds.has(step.whenTrue)) step.whenTrue = null;
    if (step.whenFalse && !validIds.has(step.whenFalse)) step.whenFalse = null;
  }

  return sanitized;
}
