import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseSteps, webhookUrlsOf } from "@/lib/flows/steps";
import { isSafeWebhookUrl } from "@/lib/flows/webhook-guard";

export const runtime = "edge";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const allowed = await checkRateLimit(user.id, "flow-webhook");
  if (!allowed) {
    return Response.json({ error: "Webhook rate limit reached for today." }, { status: 429 });
  }

  const db = getDb();
  const [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  if (!flow) return Response.json({ error: "Flow not found." }, { status: 404 });
  if (flow.visibility === "private" && flow.createdBy !== user.id) {
    return Response.json({ error: "Flow not found." }, { status: 404 });
  }

  const urls = webhookUrlsOf(parseSteps(flow.steps)).filter(isSafeWebhookUrl);
  if (urls.length === 0) {
    return Response.json({ fired: 0 });
  }

  const body = (await request.json().catch(() => null)) as { fields?: Record<string, string> } | null;
  const fields = body?.fields ?? {};

  const payload = {
    flowId: flow.id,
    flowName: flow.name,
    fields,
    firedAt: new Date().toISOString(),
  };

  const results = await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ),
  );

  const fired = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  return Response.json({ fired, attempted: urls.length });
}
