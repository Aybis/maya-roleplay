import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { parseKnowledgeBase, parseQuickActions } from "@/lib/flows/types";
import { parseSteps, collectFieldsOf } from "@/lib/flows/steps";
import { compileStepsToInstructions } from "@/lib/flows/compile-steps";
import FlowApp from "./flow-app";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/signin?return_to=${encodeURIComponent(`/flow/${id}`)}`);
  }

  const db = getDb();
  const [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  if (!flow) notFound();
  if (flow.visibility === "private" && flow.createdBy !== user.id) notFound();

  const steps = parseSteps(flow.steps);

  return (
    <FlowApp
      flowId={flow.id}
      name={flow.name}
      tagline={flow.tagline}
      persona={flow.persona}
      kickoffCue={flow.kickoffCue}
      starterLine={flow.starterLine}
      quickActions={parseQuickActions(flow.quickActions)}
      knowledgeBase={parseKnowledgeBase(flow.knowledgeBase)}
      stepsInstruction={compileStepsToInstructions(steps)}
      hasSteps={collectFieldsOf(steps).length > 0}
      userEmail={user.email}
    />
  );
}
