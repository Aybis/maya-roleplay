import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  contacts,
  conversationMessages,
  conversations,
  executions,
  flowVersions,
  flows,
  nodeExecutions,
  runtimeSessions,
  serviceBookings,
} from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { getPublishedFlowVersion } from "@/lib/flow-definition/versions";
import type { FlowDefinition } from "@/lib/flow-definition/types";
import { isWorkspaceMember } from "@/lib/workspaces/current";
import { recordServiceBooking } from "@/lib/tools/record-service-booking";
import { advanceRuntime, initialRuntimeState } from "./engine.ts";
import type { RuntimeAdvanceResult, RuntimeEffect, RuntimeState } from "./types.ts";

type SessionRow = typeof runtimeSessions.$inferSelect;

export type RuntimeSnapshot = {
  session: {
    id: string;
    conversationId: string;
    status: string;
    currentNodeId: string | null;
    variables: Record<string, string>;
    waitingFor: RuntimeState["waitingFor"];
    outcome: string | null;
    revision: number;
    flowVersion: number;
  };
  messages: Array<{ id: string; role: string; content: string; createdAt: number }>;
  traces: Array<{ id: string; nodeId: string; nodeType: string; status: string; createdAt: number }>;
  booking: null | {
    id: string;
    status: string;
    customerName: string;
    phone: string;
    vehicleModel: string;
    licensePlate: string;
    serviceNeeded: string;
    preferredDate: string;
    createdAt: number;
  };
};

export class RuntimeConflictError extends Error {}

function parseJsonRecord(raw: string): Record<string, string> {
  try {
    const value = JSON.parse(raw);
    return typeof value === "object" && value !== null ? (value as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function parseWaitingFor(raw: string | null): RuntimeState["waitingFor"] {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RuntimeState["waitingFor"];
  } catch {
    return null;
  }
}

function runtimeStateOf(row: SessionRow): RuntimeState {
  return {
    currentNodeId: row.currentNodeId,
    status: row.status as RuntimeState["status"],
    variables: parseJsonRecord(row.variables),
    waitingFor: parseWaitingFor(row.waitingFor),
    outcome: row.outcome,
    error: null,
  };
}

async function persistEffects(executionId: string, conversationId: string, effects: RuntimeEffect[]): Promise<void> {
  const db = await getDb();
  const baseTime = Date.now();
  const messages = effects.filter((effect): effect is Extract<RuntimeEffect, { type: "message" }> => effect.type === "message");
  const traces = effects.filter((effect): effect is Extract<RuntimeEffect, { type: "trace" }> => effect.type === "trace");
  if (messages.length > 0) {
    await db.insert(conversationMessages).values(
      messages.map((message, index) => ({
        id: crypto.randomUUID(),
        conversationId,
        role: "assistant",
        content: message.text,
        createdAt: baseTime + index,
      })),
    );
  }
  if (traces.length > 0) {
    await db.insert(nodeExecutions).values(
      traces.map((trace, index) => ({
        id: crypto.randomUUID(),
        executionId,
        nodeId: trace.nodeId,
        nodeType: trace.nodeType,
        status: trace.status,
        input: trace.input ? JSON.stringify(trace.input) : null,
        output: trace.output ? JSON.stringify(trace.output) : null,
        error: trace.error ?? null,
        createdAt: baseTime + messages.length + index,
      })),
    );
  }
}

async function commitAdvance(args: {
  row: SessionRow;
  result: RuntimeAdvanceResult;
  definition: FlowDefinition;
  workspaceId: string;
  userMessage?: { text: string; idempotencyKey: string };
  actionDepth?: number;
}): Promise<SessionRow> {
  const db = await getDb();
  const now = Date.now();
  const nextRevision = args.row.revision + 1;
  const [updated] = await db
    .update(runtimeSessions)
    .set({
      status: args.result.state.status,
      currentNodeId: args.result.state.currentNodeId,
      variables: JSON.stringify(args.result.state.variables),
      waitingFor: args.result.state.waitingFor ? JSON.stringify(args.result.state.waitingFor) : null,
      outcome: args.result.state.outcome,
      revision: nextRevision,
      updatedAt: now,
    })
    .where(and(eq(runtimeSessions.id, args.row.id), eq(runtimeSessions.revision, args.row.revision)))
    .returning();
  if (!updated) throw new RuntimeConflictError("This conversation advanced in another request. Refresh and try again.");

  if (args.userMessage) {
    await db.insert(conversationMessages).values({
      id: crypto.randomUUID(),
      conversationId: args.row.conversationId,
      role: "user",
      content: args.userMessage.text,
      idempotencyKey: args.userMessage.idempotencyKey,
      createdAt: now - 1,
    });
  }
  await persistEffects(args.row.executionId, args.row.conversationId, args.result.effects);
  await db
    .update(conversations)
    .set({ status: args.result.state.status === "completed" ? "completed" : "active", updatedAt: now })
    .where(eq(conversations.id, args.row.conversationId));
  await db
    .update(executions)
    .set({
      status: args.result.state.status,
      outcome: args.result.state.outcome,
      error: args.result.state.error,
      completedAt: args.result.state.status === "completed" || args.result.state.status === "failed" ? now : null,
    })
    .where(eq(executions.id, args.row.executionId));

  const action = args.result.effects.find((effect): effect is Extract<RuntimeEffect, { type: "action" }> => effect.type === "action");
  if (!action) return updated;
  if ((args.actionDepth ?? 0) >= 5) throw new Error("Too many consecutive tool actions.");

  try {
    const output = await recordServiceBooking(
      {
        workspaceId: args.workspaceId,
        conversationId: args.row.conversationId,
        executionId: args.row.executionId,
        nodeId: action.nodeId,
      },
      action.input,
    );
    const continued = advanceRuntime(args.definition, args.result.state, {
      type: "action_result",
      ok: true,
      output,
    });
    return commitAdvance({
      row: updated,
      result: continued,
      definition: args.definition,
      workspaceId: args.workspaceId,
      actionDepth: (args.actionDepth ?? 0) + 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The approved booking action failed.";
    const failed = advanceRuntime(args.definition, args.result.state, { type: "action_result", ok: false, error: message });
    return commitAdvance({
      row: updated,
      result: failed,
      definition: args.definition,
      workspaceId: args.workspaceId,
      actionDepth: (args.actionDepth ?? 0) + 1,
    });
  }
}

export async function startRuntimeSession(flowId: string, user: SessionUser): Promise<RuntimeSnapshot> {
  const db = await getDb();
  const [flow] = await db.select().from(flows).where(eq(flows.id, flowId)).limit(1);
  if (!flow?.workspaceId) throw new Error("Flow not found.");
  const member = await isWorkspaceMember(flow.workspaceId, user.id);
  if (flow.visibility !== "public" && !member) throw new Error("Flow not found.");

  const version = await getPublishedFlowVersion(flowId);
  if (!version) throw new Error("This flow has no published version.");

  const now = Date.now();
  const contactId = crypto.randomUUID();
  const conversationId = crypto.randomUUID();
  const executionId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const initial = initialRuntimeState(version.definition);

  await db.insert(contacts).values({ id: contactId, workspaceId: flow.workspaceId, displayName: "Test customer", createdAt: now });
  await db.insert(conversations).values({
    id: conversationId,
    workspaceId: flow.workspaceId,
    flowId,
    contactId,
    createdBy: user.id,
    channel: "test",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(executions).values({
    id: executionId,
    conversationId,
    flowVersionId: version.id,
    status: "running",
    startedAt: now,
  });
  const [row] = await db
    .insert(runtimeSessions)
    .values({
      id: sessionId,
      conversationId,
      executionId,
      flowVersionId: version.id,
      status: initial.status,
      currentNodeId: initial.currentNodeId,
      variables: JSON.stringify(initial.variables),
      waitingFor: null,
      revision: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error("Unable to create runtime session.");

  const first = advanceRuntime(version.definition, initial);
  await commitAdvance({ row, result: first, definition: version.definition, workspaceId: flow.workspaceId });
  const snapshot = await getRuntimeSnapshot(sessionId, user);
  if (!snapshot) throw new Error("Unable to load runtime session.");
  return snapshot;
}

export async function resumeRuntimeSession(args: {
  sessionId: string;
  user: SessionUser;
  text: string;
  idempotencyKey: string;
}): Promise<RuntimeSnapshot> {
  const db = await getDb();
  const [owned] = await db
    .select({ row: runtimeSessions, workspaceId: conversations.workspaceId, createdBy: conversations.createdBy })
    .from(runtimeSessions)
    .innerJoin(conversations, eq(conversations.id, runtimeSessions.conversationId))
    .where(eq(runtimeSessions.id, args.sessionId))
    .limit(1);
  if (!owned || owned.createdBy !== args.user.id) throw new Error("Conversation not found.");

  const [duplicate] = await db
    .select({ id: conversationMessages.id })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, owned.row.conversationId),
        eq(conversationMessages.idempotencyKey, args.idempotencyKey),
      ),
    )
    .limit(1);
  if (!duplicate) {
    const [version] = await db.select().from(flowVersions).where(eq(flowVersions.id, owned.row.flowVersionId)).limit(1);
    if (!version) throw new Error("Published flow version not found.");
    const { parseStoredFlowDefinition } = await import("@/lib/flow-definition/validate");
    const definition = parseStoredFlowDefinition(version.definition);
    if (!definition) throw new Error("Published flow definition is invalid.");
    const result = advanceRuntime(definition, runtimeStateOf(owned.row), { type: "input", text: args.text });
    await commitAdvance({
      row: owned.row,
      result,
      definition,
      workspaceId: owned.workspaceId,
      userMessage: { text: args.text, idempotencyKey: args.idempotencyKey },
    });
  }

  const snapshot = await getRuntimeSnapshot(args.sessionId, args.user);
  if (!snapshot) throw new Error("Conversation not found.");
  return snapshot;
}

export async function getRuntimeSnapshot(sessionId: string, user: SessionUser): Promise<RuntimeSnapshot | null> {
  const db = await getDb();
  const [owned] = await db
    .select({ row: runtimeSessions, createdBy: conversations.createdBy, version: flowVersions.version })
    .from(runtimeSessions)
    .innerJoin(conversations, eq(conversations.id, runtimeSessions.conversationId))
    .innerJoin(flowVersions, eq(flowVersions.id, runtimeSessions.flowVersionId))
    .where(eq(runtimeSessions.id, sessionId))
    .limit(1);
  if (!owned || owned.createdBy !== user.id) return null;

  const [messages, traces, bookingRows] = await Promise.all([
    db
      .select({ id: conversationMessages.id, role: conversationMessages.role, content: conversationMessages.content, createdAt: conversationMessages.createdAt })
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, owned.row.conversationId))
      .orderBy(asc(conversationMessages.createdAt)),
    db
      .select({ id: nodeExecutions.id, nodeId: nodeExecutions.nodeId, nodeType: nodeExecutions.nodeType, status: nodeExecutions.status, createdAt: nodeExecutions.createdAt })
      .from(nodeExecutions)
      .where(eq(nodeExecutions.executionId, owned.row.executionId))
      .orderBy(asc(nodeExecutions.createdAt)),
    db.select().from(serviceBookings).where(eq(serviceBookings.conversationId, owned.row.conversationId)).limit(1),
  ]);

  const booking = bookingRows[0] ?? null;
  return {
    session: {
      id: owned.row.id,
      conversationId: owned.row.conversationId,
      status: owned.row.status,
      currentNodeId: owned.row.currentNodeId,
      variables: parseJsonRecord(owned.row.variables),
      waitingFor: parseWaitingFor(owned.row.waitingFor),
      outcome: owned.row.outcome,
      revision: owned.row.revision,
      flowVersion: owned.version,
    },
    messages,
    traces,
    booking: booking
      ? {
          id: booking.id,
          status: booking.status,
          customerName: booking.customerName,
          phone: booking.phone,
          vehicleModel: booking.vehicleModel,
          licensePlate: booking.licensePlate,
          serviceNeeded: booking.serviceNeeded,
          preferredDate: booking.preferredDate,
          createdAt: booking.createdAt,
        }
      : null,
  };
}
