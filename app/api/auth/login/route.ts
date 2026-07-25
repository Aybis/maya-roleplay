import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, plan: users.plan, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const genericError = { error: "Incorrect email or password." };
  if (!user) {
    return Response.json(genericError, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return Response.json(genericError, { status: 401 });
  }

  await createSession(user.id);

  return Response.json({ user: { id: user.id, email: user.email, plan: user.plan } });
}
