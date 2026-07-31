import { getSessionUser } from "@/lib/auth/session";
import { startRuntimeSession } from "@/lib/runtime/service";

export const runtime = "edge";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { flowId?: string } | null;
  if (!body?.flowId) return Response.json({ error: "flowId is required." }, { status: 400 });
  try {
    return Response.json(await startRuntimeSession(body.flowId, user), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start this flow.";
    const status = message.includes("not found") ? 404 : message.includes("published") ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
