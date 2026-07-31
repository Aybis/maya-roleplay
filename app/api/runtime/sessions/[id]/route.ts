import { getSessionUser } from "@/lib/auth/session";
import { getRuntimeSnapshot } from "@/lib/runtime/service";

export const runtime = "edge";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const snapshot = await getRuntimeSnapshot(id, user);
  return snapshot
    ? Response.json(snapshot, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ error: "Conversation not found." }, { status: 404 });
}
