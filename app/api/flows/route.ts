import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCreateFlowInput } from "@/lib/flows/types";
import { ensurePersonalWorkspace } from "@/lib/workspaces/current";

export const runtime = "edge";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to create a flow." }, { status: 401 });
  }

  const allowed = await checkRateLimit(user.id, "flow-create");
  if (!allowed) {
    return Response.json(
      { error: "You've reached today's limit for creating new flows. Try again tomorrow." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const result = validateCreateFlowInput(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const workspace = await ensurePersonalWorkspace(user);
  const db = await getDb();
  await db.insert(flows).values({
    id,
    createdBy: user.id,
    workspaceId: workspace.id,
    name: result.value.name,
    tagline: result.value.tagline,
    category: result.value.category,
    persona: result.value.persona,
    kickoffCue: result.value.kickoffCue,
    starterLine: result.value.starterLine,
    quickActions: JSON.stringify(result.value.quickActions),
    knowledgeBase: JSON.stringify(result.value.knowledgeBase),
    steps: JSON.stringify(result.value.steps),
    visibility: result.value.visibility,
  });

  return Response.json({ id }, { status: 201 });
}
