import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { flows, workspaceMembers, workspaces } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";

export type CurrentWorkspace = {
  id: string;
  name: string;
  role: string;
};

function personalWorkspaceId(userId: string): string {
  return `personal_${userId}`;
}

export async function ensurePersonalWorkspace(user: SessionUser): Promise<CurrentWorkspace> {
  const db = await getDb();
  const id = personalWorkspaceId(user.id);
  const now = Date.now();
  const name = `${user.email.split("@")[0] || "My"}'s workspace`;

  await db
    .insert(workspaces)
    .values({ id, name, createdBy: user.id, createdAt: now })
    .onConflictDoNothing({ target: workspaces.id });
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: id, userId: user.id, role: "owner", createdAt: now })
    .onConflictDoNothing({ target: [workspaceMembers.workspaceId, workspaceMembers.userId] });

  // Existing roleplay flows predate workspaces. Claim only this user's unscoped
  // records so the migration is safe and tenant ownership remains explicit.
  await db
    .update(flows)
    .set({ workspaceId: id })
    .where(and(eq(flows.createdBy, user.id), isNull(flows.workspaceId)));

  return { id, name, role: "owner" };
}

export async function isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const [membership] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return Boolean(membership);
}
