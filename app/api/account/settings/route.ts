import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "edge";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { defaultFlowVisibility?: string } | null;
  const defaultFlowVisibility = body?.defaultFlowVisibility === "private" ? "private" : "public";

  const db = await getDb();
  await db.update(users).set({ defaultFlowVisibility }).where(eq(users.id, user.id));

  return Response.json({ ok: true });
}
