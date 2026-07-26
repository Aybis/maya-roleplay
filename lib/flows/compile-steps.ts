import type { FlowStep } from "./steps";

function labelOf(step: FlowStep, index: number): string {
  const base = `Step ${index + 1}`;
  switch (step.type) {
    case "message":
      return `${base} (say something)`;
    case "collect":
      return `${base} (ask for ${step.field})`;
    case "condition":
      return `${base} (check ${step.field})`;
    case "webhook":
      return `${base} (system action)`;
    case "end":
      return `${base} (wrap up)`;
  }
}

export function compileStepsToInstructions(steps: FlowStep[]): string {
  if (steps.length === 0) return "";

  const idToIndex = new Map(steps.map((step, index) => [step.id, index]));
  const labels = steps.map((step, index) => labelOf(step, index));
  const labelForId = (id: string | null): string => {
    if (!id) return "the end of the conversation";
    const index = idToIndex.get(id);
    return index === undefined ? "the end of the conversation" : labels[index];
  };

  const lines = steps.map((step, index) => {
    const label = labels[index];
    const nextLabel = index + 1 < steps.length ? labels[index + 1] : "the end of the conversation";

    switch (step.type) {
      case "message":
        return `${label}: Say something like: "${step.text}". Then move on to ${nextLabel}.`;
      case "collect":
        return `${label}: Ask the user for ${step.question} (remember this as "${step.field}"). ${
          step.required ? "Do not move on until you have it." : "If they skip it, that's fine, move on."
        } Then move on to ${nextLabel}.`;
      case "condition": {
        const trueLabel = labelForId(step.whenTrue);
        const falseLabel = labelForId(step.whenFalse ?? (index + 1 < steps.length ? steps[index + 1].id : null));
        return `${label}: Check the value collected for "${step.field}". If it ${
          step.matchType === "equals" ? "equals" : "contains"
        } "${step.matchValue}", continue with ${trueLabel}. Otherwise continue with ${falseLabel}.`;
      }
      case "webhook":
        return `${label}: No need to say anything special here — just continue naturally to ${nextLabel}.`;
      case "end":
        return `${label}: Wrap up warmly, along the lines of: "${step.text}". This ends the conversation.`;
    }
  });

  return `\n\n--- Conversation flow ---\nFollow this sequence with the user. Ask one thing at a time, naturally, not like reading a form. Don't announce step numbers out loud — they're for your reference only.\n\n${lines.join("\n")}`;
}
