import { eq } from "drizzle-orm";
import { GoogleGenAI, Type } from "@google/genai";
import { getDb } from "@/db";
import { flows } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { collectFieldsOf, parseSteps } from "@/lib/flows/steps";

export const runtime = "edge";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const db = await getDb();
  const [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  if (!flow) return Response.json({ error: "Flow not found." }, { status: 404 });
  if (flow.visibility === "private" && flow.createdBy !== user.id) {
    return Response.json({ error: "Flow not found." }, { status: 404 });
  }

  const fields = collectFieldsOf(parseSteps(flow.steps));
  if (fields.length === 0) {
    return Response.json({ complete: true, fields: {} });
  }

  const allowed = await checkRateLimit(user.id, "flow-extract");
  if (!allowed) {
    return Response.json({ complete: false, fields: {} }, { status: 200 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ complete: false, fields: {} });
  }

  const body = (await request.json().catch(() => null)) as { transcriptText?: string } | null;
  const transcriptText = body?.transcriptText?.trim();
  if (!transcriptText) {
    return Response.json({ complete: false, fields: {} });
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      complete: { type: Type.BOOLEAN },
      fields: {
        type: Type.OBJECT,
        properties: Object.fromEntries(fields.map((f) => [f.key, { type: Type.STRING }])),
      },
    },
    required: ["complete", "fields"],
  };

  const fieldList = fields.map((f) => `- "${f.key}": ${f.question}${f.required ? " (required)" : " (optional)"}`).join("\n");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `Extract these fields from a voice conversation transcript, if mentioned:\n${fieldList}\n\n` +
                'Set "complete" to true only if every field marked (required) has a value. Omit fields never mentioned. Do not guess.\n\n' +
                `Transcript:\n${transcriptText}`,
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0 },
    });

    const text = response.text;
    if (!text) return Response.json({ complete: false, fields: {} });

    const parsed = JSON.parse(text) as { complete?: boolean; fields?: Record<string, string> };
    return Response.json(
      { complete: Boolean(parsed.complete), fields: parsed.fields ?? {} },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Flow extraction failed", error);
    return Response.json({ complete: false, fields: {} });
  }
}
