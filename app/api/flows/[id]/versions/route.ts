import { getSessionUser } from "@/lib/auth/session";
import { publishFlowDefinition } from "@/lib/flow-definition/versions";

export const runtime = "edge";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { definition?: unknown } | null;
  if (!body?.definition) return Response.json({ error: "A flow definition is required." }, { status: 400 });

  try {
    const version = await publishFlowDefinition({ flowId: id, user, definition: body.definition });
    return Response.json({ id: version.id, version: version.version, status: "published" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish this flow.";
    const status = message.includes("not found") ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
