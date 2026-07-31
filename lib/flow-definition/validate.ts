import {
  FLOW_DEFINITION_SCHEMA_VERSION,
  nodeTransitions,
  type DefinitionValidationResult,
  type FlowDefinition,
  type FlowDefinitionNode,
} from "./types.ts";

const NODE_TYPES = new Set(["start", "message", "capture", "condition", "action", "end"]);
const FIELD_RE = /^[a-z][a-z0-9_]{0,59}$/;

function nonEmpty(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isNode(value: unknown, errors: string[], index: number): value is FlowDefinitionNode {
  if (typeof value !== "object" || value === null) {
    errors.push(`Node ${index + 1} must be an object.`);
    return false;
  }
  const node = value as Record<string, unknown>;
  if (!nonEmpty(node.id, 80)) errors.push(`Node ${index + 1} needs an id of at most 80 characters.`);
  if (typeof node.type !== "string" || !NODE_TYPES.has(node.type)) {
    errors.push(`Node ${String(node.id ?? index + 1)} has an unsupported type.`);
    return false;
  }

  const id = String(node.id ?? index + 1);
  switch (node.type) {
    case "start":
      if (!nonEmpty(node.next, 80)) errors.push(`Start node ${id} needs a next node.`);
      break;
    case "message":
      if (!nonEmpty(node.text, 1000)) errors.push(`Message node ${id} needs text.`);
      if (!nonEmpty(node.next, 80)) errors.push(`Message node ${id} needs a next node.`);
      break;
    case "capture":
      if (typeof node.field !== "string" || !FIELD_RE.test(node.field)) {
        errors.push(`Capture node ${id} needs a snake_case field name.`);
      }
      if (!nonEmpty(node.prompt, 500)) errors.push(`Capture node ${id} needs a prompt.`);
      if (typeof node.required !== "boolean") errors.push(`Capture node ${id} must declare required.`);
      if (!nonEmpty(node.next, 80)) errors.push(`Capture node ${id} needs a next node.`);
      break;
    case "condition":
      if (typeof node.field !== "string" || !FIELD_RE.test(node.field)) errors.push(`Condition node ${id} has an invalid field.`);
      if (node.operator !== "equals" && node.operator !== "contains") errors.push(`Condition node ${id} has an invalid operator.`);
      if (!nonEmpty(node.value, 300)) errors.push(`Condition node ${id} needs a comparison value.`);
      if (!nonEmpty(node.whenTrue, 80) || !nonEmpty(node.whenFalse, 80)) errors.push(`Condition node ${id} needs both branches.`);
      break;
    case "action":
      if (node.tool !== "record_service_booking") errors.push(`Action node ${id} calls an unapproved tool.`);
      if (!nonEmpty(node.next, 80)) errors.push(`Action node ${id} needs a next node.`);
      break;
    case "end":
      if (node.outcome !== "booking_created") errors.push(`End node ${id} has an unsupported outcome.`);
      if (node.message !== undefined && !nonEmpty(node.message, 1000)) errors.push(`End node ${id} has an invalid message.`);
      break;
  }
  return true;
}

export function validateFlowDefinition(value: unknown): DefinitionValidationResult {
  const errors: string[] = [];
  if (typeof value !== "object" || value === null) return { ok: false, errors: ["Definition must be an object."] };
  const raw = value as Record<string, unknown>;

  if (raw.schemaVersion !== FLOW_DEFINITION_SCHEMA_VERSION) errors.push("Unsupported flow schema version.");
  if (!nonEmpty(raw.id, 80)) errors.push("Definition id is required.");
  if (!nonEmpty(raw.name, 120)) errors.push("Definition name is required.");
  if (!nonEmpty(raw.entryNodeId, 80)) errors.push("entryNodeId is required.");
  if (!Array.isArray(raw.nodes) || raw.nodes.length === 0 || raw.nodes.length > 100) {
    errors.push("Definition must contain 1-100 nodes.");
  }

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const nodes = rawNodes.filter((node, index) => isNode(node, errors, index)) as FlowDefinitionNode[];
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) errors.push(`Duplicate node id: ${node.id}.`);
    ids.add(node.id);
  }
  if (typeof raw.entryNodeId === "string" && !ids.has(raw.entryNodeId)) errors.push("entryNodeId does not reference a node.");

  const captureFields = new Set(nodes.filter((node) => node.type === "capture").map((node) => node.field));
  for (const node of nodes) {
    for (const target of nodeTransitions(node)) {
      if (!ids.has(target)) errors.push(`Node ${node.id} points to missing node ${target}.`);
    }
    if (node.type === "condition" && !captureFields.has(node.field)) {
      errors.push(`Condition node ${node.id} references field ${node.field} before it is defined.`);
    }
  }

  if (typeof raw.entryNodeId === "string" && ids.has(raw.entryNodeId)) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    let reachedEnd = false;
    const visit = (id: string) => {
      if (visiting.has(id)) {
        errors.push(`Unsupported cycle detected at node ${id}.`);
        return;
      }
      if (visited.has(id)) return;
      const node = byId.get(id);
      if (!node) return;
      visiting.add(id);
      visited.add(id);
      if (node.type === "end") reachedEnd = true;
      for (const next of nodeTransitions(node)) visit(next);
      visiting.delete(id);
    };
    visit(raw.entryNodeId);
    for (const id of ids) if (!visited.has(id)) errors.push(`Node ${id} is unreachable.`);
    if (!reachedEnd) errors.push("The flow has no reachable end node.");
  }

  if (!Array.isArray(raw.variables)) errors.push("variables must be an array.");
  const variables = Array.isArray(raw.variables) ? raw.variables : [];
  for (const field of captureFields) {
    const variable = variables.find(
      (item) => typeof item === "object" && item !== null && (item as Record<string, unknown>).name === field,
    );
    if (!variable) errors.push(`Capture field ${field} is missing from variables.`);
  }

  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };
  return { ok: true, definition: value as FlowDefinition };
}

export function parseStoredFlowDefinition(raw: string): FlowDefinition | null {
  try {
    const result = validateFlowDefinition(JSON.parse(raw));
    return result.ok ? result.definition : null;
  } catch {
    return null;
  }
}
