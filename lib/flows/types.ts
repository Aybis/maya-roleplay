import { sanitizeSteps, type FlowStep } from "./steps";
import { isSafeWebhookUrl } from "./webhook-guard";

export type QuickAction = { label: string; prompt: string };
export type QAEntry = { question: string; answer: string };

export const FLOW_CATEGORIES = ["companion", "adventure", "business", "custom"] as const;
export type FlowCategory = (typeof FLOW_CATEGORIES)[number];

export function isFlowCategory(value: unknown): value is FlowCategory {
  return typeof value === "string" && (FLOW_CATEGORIES as readonly string[]).includes(value);
}

export function parseQuickActions(raw: string): QuickAction[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is QuickAction => typeof item?.label === "string" && typeof item?.prompt === "string")
      .slice(0, 3);
  } catch {
    return [];
  }
}

export function parseKnowledgeBase(raw: string): QAEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is QAEntry => typeof item?.question === "string" && typeof item?.answer === "string")
      .slice(0, 10);
  } catch {
    return [];
  }
}

export type CreateFlowInput = {
  name: string;
  tagline: string;
  category: FlowCategory;
  persona: string;
  kickoffCue: string;
  starterLine: string;
  quickActions: QuickAction[];
  knowledgeBase: QAEntry[];
  steps: FlowStep[];
  visibility: "public" | "private";
};

export function validateCreateFlowInput(body: unknown): { ok: true; value: CreateFlowInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 60) return { ok: false, error: "Name must be 1-60 characters." };

  const persona = typeof b.persona === "string" ? b.persona.trim() : "";
  if (!persona || persona.length < 20 || persona.length > 4000) {
    return { ok: false, error: "Describe the character in 20-4000 characters." };
  }

  const tagline = typeof b.tagline === "string" ? b.tagline.trim().slice(0, 140) : "";
  const kickoffCue = typeof b.kickoffCue === "string" ? b.kickoffCue.trim().slice(0, 500) : "";
  const starterLine = typeof b.starterLine === "string" ? b.starterLine.trim().slice(0, 300) : "";
  const category = isFlowCategory(b.category) ? b.category : "custom";
  const visibility = b.visibility === "private" ? "private" : "public";

  const quickActionsRaw = Array.isArray(b.quickActions) ? b.quickActions : [];
  const quickActions: QuickAction[] = quickActionsRaw
    .filter(
      (item): item is QuickAction =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).label === "string" &&
        typeof (item as Record<string, unknown>).prompt === "string",
    )
    .map((item) => ({ label: item.label.trim().slice(0, 40), prompt: item.prompt.trim().slice(0, 300) }))
    .filter((item) => item.label && item.prompt)
    .slice(0, 3);

  const knowledgeBaseRaw = Array.isArray(b.knowledgeBase) ? b.knowledgeBase : [];
  const knowledgeBase: QAEntry[] = knowledgeBaseRaw
    .filter(
      (item): item is QAEntry =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).question === "string" &&
        typeof (item as Record<string, unknown>).answer === "string",
    )
    .map((item) => ({ question: item.question.trim().slice(0, 200), answer: item.answer.trim().slice(0, 600) }))
    .filter((item) => item.question && item.answer)
    .slice(0, 10);

  const steps = sanitizeSteps(b.steps);
  const unsafeWebhook = steps.find((step) => step.type === "webhook" && !isSafeWebhookUrl(step.url));
  if (unsafeWebhook) {
    return { ok: false, error: "Webhook URLs must be public http(s) addresses, not internal/private hosts." };
  }

  return {
    ok: true,
    value: { name, tagline, category, persona, kickoffCue, starterLine, quickActions, knowledgeBase, steps, visibility },
  };
}
