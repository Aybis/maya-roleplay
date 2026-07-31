export const FLOW_DEFINITION_SCHEMA_VERSION = 1 as const;

export type StartNode = { id: string; type: "start"; next: string };
export type MessageNode = { id: string; type: "message"; text: string; next: string };
export type CaptureNode = {
  id: string;
  type: "capture";
  field: string;
  prompt: string;
  required: boolean;
  next: string;
};
export type ConditionNode = {
  id: string;
  type: "condition";
  field: string;
  operator: "equals" | "contains";
  value: string;
  whenTrue: string;
  whenFalse: string;
};
export type ActionNode = {
  id: string;
  type: "action";
  tool: "record_service_booking";
  next: string;
};
export type EndNode = { id: string; type: "end"; outcome: "booking_created"; message?: string };

export type FlowDefinitionNode =
  | StartNode
  | MessageNode
  | CaptureNode
  | ConditionNode
  | ActionNode
  | EndNode;

export type FlowDefinition = {
  schemaVersion: typeof FLOW_DEFINITION_SCHEMA_VERSION;
  id: string;
  name: string;
  entryNodeId: string;
  nodes: FlowDefinitionNode[];
  variables: Array<{ name: string; required: boolean }>;
  metadata: Record<string, string>;
};

export type DefinitionValidationResult =
  | { ok: true; definition: FlowDefinition }
  | { ok: false; errors: string[] };

export function nodeTransitions(node: FlowDefinitionNode): string[] {
  switch (node.type) {
    case "start":
    case "message":
    case "capture":
    case "action":
      return [node.next];
    case "condition":
      return [node.whenTrue, node.whenFalse];
    case "end":
      return [];
  }
}
