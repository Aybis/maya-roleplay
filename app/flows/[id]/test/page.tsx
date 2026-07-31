import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { isWorkspaceMember } from "@/lib/workspaces/current";
import RuntimeTestConsole from "./runtime-test-console";

export default async function FlowTestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;
  if (!user) redirect(`/signin?return_to=${encodeURIComponent(`/flows/${id}/test`)}`);

  const db = await getDb();
  const [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  if (!flow?.workspaceId) notFound();
  const member = await isWorkspaceMember(flow.workspaceId, user.id);
  if (flow.visibility !== "public" && !member) notFound();

  return <RuntimeTestConsole flowId={flow.id} flowName={flow.name} userEmail={user.email} />;
}
