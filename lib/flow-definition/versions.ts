import { and, desc, eq, max } from "drizzle-orm";
import { getDb } from "@/db";
import { flowVersions, flows } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { ensurePersonalWorkspace, isWorkspaceMember } from "@/lib/workspaces/current";
import { serviceBookingDefinition } from "./service-booking.ts";
import type { FlowDefinition } from "./types.ts";
import { parseStoredFlowDefinition, validateFlowDefinition } from "./validate.ts";

const SERVICE_BOOKING_TAGLINE = "Deterministic, persisted service-booking MVP";

export async function publishFlowDefinition(args: {
  flowId: string;
  user: SessionUser;
  definition: unknown;
}): Promise<{ id: string; version: number; definition: FlowDefinition }> {
  const validation = validateFlowDefinition(args.definition);
  if (!validation.ok) throw new Error(validation.errors.join(" "));

  const db = await getDb();
  const [flow] = await db.select().from(flows).where(eq(flows.id, args.flowId)).limit(1);
  if (!flow?.workspaceId || !(await isWorkspaceMember(flow.workspaceId, args.user.id))) {
    throw new Error("Flow not found in your workspace.");
  }

  const [row] = await db
    .select({ value: max(flowVersions.version) })
    .from(flowVersions)
    .where(eq(flowVersions.flowId, args.flowId));
  const version = (row?.value ?? 0) + 1;
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(flowVersions).values({
    id,
    flowId: args.flowId,
    version,
    status: "published",
    schemaVersion: validation.definition.schemaVersion,
    definition: JSON.stringify(validation.definition),
    createdBy: args.user.id,
    createdAt: now,
    publishedAt: now,
  });
  return { id, version, definition: validation.definition };
}

export async function getPublishedFlowVersion(flowId: string): Promise<{
  id: string;
  flowId: string;
  version: number;
  definition: FlowDefinition;
} | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(flowVersions)
    .where(and(eq(flowVersions.flowId, flowId), eq(flowVersions.status, "published")))
    .orderBy(desc(flowVersions.version))
    .limit(1);
  if (!row) return null;
  const definition = parseStoredFlowDefinition(row.definition);
  return definition ? { id: row.id, flowId: row.flowId, version: row.version, definition } : null;
}

export async function ensureServiceBookingMvp(user: SessionUser): Promise<{
  flowId: string;
  flowVersionId: string;
  version: number;
}> {
  const workspace = await ensurePersonalWorkspace(user);
  const db = await getDb();
  let [flow] = await db
    .select()
    .from(flows)
    .where(
      and(
        eq(flows.workspaceId, workspace.id),
        eq(flows.createdBy, user.id),
        eq(flows.tagline, SERVICE_BOOKING_TAGLINE),
      ),
    )
    .limit(1);

  if (!flow) {
    const id = crypto.randomUUID();
    await db.insert(flows).values({
      id,
      workspaceId: workspace.id,
      createdBy: user.id,
      name: "Dealership Service Booking",
      tagline: SERVICE_BOOKING_TAGLINE,
      category: "business",
      persona: "A deterministic dealership service-booking assistant used by Maya's headless runtime.",
      kickoffCue: "",
      quickActions: "[]",
      knowledgeBase: "[]",
      steps: "[]",
      starterLine: "Create and trace a dealership service booking.",
      visibility: "public",
    });
    [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  }
  if (!flow) throw new Error("Unable to create the service-booking flow.");

  const published = await getPublishedFlowVersion(flow.id);
  if (published) return { flowId: flow.id, flowVersionId: published.id, version: published.version };

  const created = await publishFlowDefinition({
    flowId: flow.id,
    user,
    definition: serviceBookingDefinition(flow.id),
  });
  return { flowId: flow.id, flowVersionId: created.id, version: created.version };
}
