import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import FlowWorkspace from "./flow-workspace";

export default async function NewFlowPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/flows/new");
  }

  return <FlowWorkspace />;
}
