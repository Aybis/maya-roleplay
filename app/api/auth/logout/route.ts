import { destroySession } from "@/lib/auth/session";

export const runtime = "edge";

export async function POST() {
  await destroySession();
  return Response.json({ ok: true });
}
