import { getSessionUser } from "@/lib/auth/session";

export const runtime = "edge";

export async function GET() {
  const user = await getSessionUser();
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
