import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import FlowWorkspace from "./flow-workspace";

export default async function NewFlowPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/flows/new");
  }

  const db = await getDb();
  const [row] = await db
    .select({ defaultFlowVisibility: users.defaultFlowVisibility })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return <FlowWorkspace defaultVisibility={row?.defaultFlowVisibility === "private" ? "private" : "public"} />;
}
