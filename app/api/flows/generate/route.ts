import { GoogleGenAI, Type } from "@google/genai";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCreateFlowInput } from "@/lib/flows/types";

export const runtime = "edge";

const STEP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["message", "collect", "condition", "webhook", "end"] },
    text: { type: Type.STRING },
    field: { type: Type.STRING },
    question: { type: Type.STRING },
    required: { type: Type.BOOLEAN },
    matchType: { type: Type.STRING, enum: ["equals", "contains"] },
    matchValue: { type: Type.STRING },
    whenTrue: { type: Type.STRING },
    whenFalse: { type: Type.STRING },
    url: { type: Type.STRING },
  },
  required: ["id", "type"],
};

const FLOW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    tagline: { type: Type.STRING },
    category: { type: Type.STRING, enum: ["companion", "adventure", "business", "custom"] },
    persona: { type: Type.STRING },
    starterLine: { type: Type.STRING },
    kickoffCue: { type: Type.STRING },
    quickActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { label: { type: Type.STRING }, prompt: { type: Type.STRING } },
        required: ["label", "prompt"],
      },
    },
    steps: { type: Type.ARRAY, items: STEP_SCHEMA },
  },
  required: ["name", "tagline", "category", "persona", "starterLine", "steps"],
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to generate a flow." }, { status: 401 });
  }

  const allowed = await checkRateLimit(user.id, "flow-generate");
  if (!allowed) {
    return Response.json({ error: "You've reached today's generation limit. Try again tomorrow." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Flow generation needs a Gemini API key configured on the server." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { scenario?: string } | null;
  const scenario = body?.scenario?.trim();
  if (!scenario || scenario.length < 10) {
    return Response.json({ error: "Describe the scenario in a bit more detail." }, { status: 400 });
  }

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
                "Design a voice-chat character flow for a roleplay/assistant app from this scenario. Output must match the schema.\n\n" +
                "Guidance:\n" +
                "- persona: 2-4 sentences describing who the character is, their tone, and how they talk. Do not include safety caveats, they're added automatically elsewhere.\n" +
                "- steps: only add steps if the scenario implies a specific sequence (e.g. collecting booking info, taking an order). If it's just a freeform chat companion, return an empty steps array.\n" +
                "- Step types: \"message\" (say something), \"collect\" (ask for one piece of info, store it under a short snake_case \"field\" key), \"condition\" (branch on a previously collected field's value; whenTrue/whenFalse reference another step's \"id\"), \"webhook\" (silently notify an external system — only add this if the scenario explicitly mentions notifying, saving, sending, or integrating with something external), \"end\" (closing line).\n" +
                '- For webhook steps, set url to the literal placeholder "https://replace-with-your-webhook-url.example.com" — never invent a real domain.\n' +
                "- Give every step a short unique id (e.g. \"step1\", \"ask_name\").\n" +
                "- quickActions: 0-3 short conversation-starter buttons, only if genuinely useful.\n\n" +
                `Scenario:\n${scenario}`,
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json", responseSchema: FLOW_SCHEMA, temperature: 0.6 },
    });

    const text = response.text;
    if (!text) return Response.json({ error: "Generation failed. Try rephrasing the scenario." }, { status: 502 });

    const raw = JSON.parse(text) as Record<string, unknown>;
    const result = validateCreateFlowInput({ ...raw, visibility: "public" });
    if (!result.ok) {
      return Response.json({ error: `Generated flow needs adjustment: ${result.error}` }, { status: 502 });
    }

    return Response.json({ flow: result.value }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Flow generation failed", error);
    return Response.json({ error: "Generation failed. Try again." }, { status: 502 });
  }
}
