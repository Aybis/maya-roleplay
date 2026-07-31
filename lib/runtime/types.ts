export type RuntimeStatus = "running" | "waiting_for_input" | "waiting_for_action" | "completed" | "failed";

export type RuntimeState = {
  currentNodeId: string | null;
  status: RuntimeStatus;
  variables: Record<string, string>;
  waitingFor: null | { type: "input"; nodeId: string; field: string } | { type: "action"; nodeId: string; tool: string };
  outcome: string | null;
  error: string | null;
};

export type RuntimeEvent =
  | { type: "input"; text: string }
  | { type: "action_result"; ok: true; output: Record<string, string> }
  | { type: "action_result"; ok: false; error: string };

export type RuntimeTraceEffect = {
  type: "trace";
  nodeId: string;
  nodeType: string;
  status: "completed" | "waiting" | "failed";
  input?: Record<string, string>;
  output?: Record<string, string>;
  error?: string;
};

export type RuntimeEffect =
  | { type: "message"; text: string }
  | { type: "action"; nodeId: string; tool: "record_service_booking"; input: Record<string, string> }
  | RuntimeTraceEffect;

export type RuntimeAdvanceResult = { state: RuntimeState; effects: RuntimeEffect[] };
