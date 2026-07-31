import { getSessionUser } from "@/lib/auth/session";
import { resumeRuntimeSession, RuntimeConflictError } from "@/lib/runtime/service";

export const runtime = "edge";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { text?: string; idempotencyKey?: string } | null;
  const text = body?.text?.trim() ?? "";
  const idempotencyKey = body?.idempotencyKey?.trim() ?? "";
  if (!text || text.length > 1000) return Response.json({ error: "Message must be 1-1000 characters." }, { status: 400 });
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return Response.json({ error: "A valid idempotencyKey is required." }, { status: 400 });
  }

  try {
    return Response.json(await resumeRuntimeSession({ sessionId: id, user, text, idempotencyKey }));
  } catch (error) {
    if (error instanceof RuntimeConflictError) return Response.json({ error: error.message }, { status: 409 });
    const message = error instanceof Error ? error.message : "Unable to continue this conversation.";
    return Response.json({ error: message }, { status: message.includes("not found") ? 404 : 400 });
  }
}
