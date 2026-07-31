import type { FlowDefinition } from "../flow-definition/types.ts";
import type { RuntimeAdvanceResult, RuntimeEffect, RuntimeEvent, RuntimeState } from "./types.ts";

const MAX_NODE_VISITS_PER_ADVANCE = 100;

export function initialRuntimeState(definition: FlowDefinition): RuntimeState {
  return {
    currentNodeId: definition.entryNodeId,
    status: "running",
    variables: {},
    waitingFor: null,
    outcome: null,
    error: null,
  };
}

function renderTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_, field: string) => variables[field] ?? "");
}

function fail(state: RuntimeState, effects: RuntimeEffect[], message: string): RuntimeAdvanceResult {
  return {
    state: { ...state, status: "failed", waitingFor: null, error: message },
    effects,
  };
}

export function advanceRuntime(
  definition: FlowDefinition,
  previous: RuntimeState,
  event?: RuntimeEvent,
): RuntimeAdvanceResult {
  let state: RuntimeState = {
    ...previous,
    variables: { ...previous.variables },
    waitingFor: previous.waitingFor ? { ...previous.waitingFor } : null,
  };
  const effects: RuntimeEffect[] = [];
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));

  if (state.status === "completed" || state.status === "failed") return { state, effects };

  if (state.status === "waiting_for_input") {
    if (!event || event.type !== "input" || state.waitingFor?.type !== "input") {
      return fail(state, effects, "This session is waiting for customer input.");
    }
    const node = nodes.get(state.waitingFor.nodeId);
    if (!node || node.type !== "capture") return fail(state, effects, "The waiting capture node no longer exists.");
    const text = event.text.trim();
    if (node.required && !text) {
      effects.push({ type: "message", text: node.prompt });
      return { state, effects };
    }
    state.variables[node.field] = text;
    effects.push({
      type: "trace",
      nodeId: node.id,
      nodeType: node.type,
      status: "completed",
      input: { text },
      output: { field: node.field, value: text },
    });
    state = { ...state, currentNodeId: node.next, status: "running", waitingFor: null };
  } else if (state.status === "waiting_for_action") {
    if (!event || event.type !== "action_result" || state.waitingFor?.type !== "action") {
      return fail(state, effects, "This session is waiting for an approved action result.");
    }
    const node = nodes.get(state.waitingFor.nodeId);
    if (!node || node.type !== "action") return fail(state, effects, "The waiting action node no longer exists.");
    if (!event.ok) {
      effects.push({ type: "trace", nodeId: node.id, nodeType: node.type, status: "failed", error: event.error });
      return fail(state, effects, event.error);
    }
    state.variables = { ...state.variables, ...event.output };
    effects.push({ type: "trace", nodeId: node.id, nodeType: node.type, status: "completed", output: event.output });
    state = { ...state, currentNodeId: node.next, status: "running", waitingFor: null };
  } else if (event) {
    return fail(state, effects, "The runtime received an event while it was not waiting.");
  }

  for (let visits = 0; visits < MAX_NODE_VISITS_PER_ADVANCE; visits += 1) {
    if (!state.currentNodeId) return fail(state, effects, "The runtime has no current node.");
    const node = nodes.get(state.currentNodeId);
    if (!node) return fail(state, effects, `Node ${state.currentNodeId} does not exist.`);

    switch (node.type) {
      case "start":
        effects.push({ type: "trace", nodeId: node.id, nodeType: node.type, status: "completed" });
        state = { ...state, currentNodeId: node.next };
        break;
      case "message": {
        const text = renderTemplate(node.text, state.variables);
        effects.push({ type: "message", text });
        effects.push({ type: "trace", nodeId: node.id, nodeType: node.type, status: "completed", output: { text } });
        state = { ...state, currentNodeId: node.next };
        break;
      }
      case "capture":
        effects.push({ type: "message", text: renderTemplate(node.prompt, state.variables) });
        effects.push({ type: "trace", nodeId: node.id, nodeType: node.type, status: "waiting", output: { field: node.field } });
        return {
          state: {
            ...state,
            status: "waiting_for_input",
            waitingFor: { type: "input", nodeId: node.id, field: node.field },
          },
          effects,
        };
      case "condition": {
        const actual = state.variables[node.field] ?? "";
        const left = actual.toLowerCase();
        const right = node.value.toLowerCase();
        const matched = node.operator === "equals" ? left === right : left.includes(right);
        effects.push({
          type: "trace",
          nodeId: node.id,
          nodeType: node.type,
          status: "completed",
          input: { field: node.field, value: actual },
          output: { branch: matched ? "true" : "false" },
        });
        state = { ...state, currentNodeId: matched ? node.whenTrue : node.whenFalse };
        break;
      }
      case "action":
        effects.push({ type: "action", nodeId: node.id, tool: node.tool, input: { ...state.variables } });
        effects.push({ type: "trace", nodeId: node.id, nodeType: node.type, status: "waiting" });
        return {
          state: {
            ...state,
            status: "waiting_for_action",
            waitingFor: { type: "action", nodeId: node.id, tool: node.tool },
          },
          effects,
        };
      case "end": {
        if (node.message) effects.push({ type: "message", text: renderTemplate(node.message, state.variables) });
        effects.push({ type: "trace", nodeId: node.id, nodeType: node.type, status: "completed", output: { outcome: node.outcome } });
        return {
          state: {
            ...state,
            currentNodeId: node.id,
            status: "completed",
            waitingFor: null,
            outcome: node.outcome,
          },
          effects,
        };
      }
    }
  }

  return fail(state, effects, `Runtime exceeded ${MAX_NODE_VISITS_PER_ADVANCE} node visits.`);
}
