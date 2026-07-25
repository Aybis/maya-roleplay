import { GoogleGenAI, Type } from "@google/genai";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    complete: { type: Type.BOOLEAN },
    flowType: { type: Type.STRING },
    name: { type: Type.STRING },
    phone: { type: Type.STRING },
    vehicleModel: { type: Type.STRING },
    licensePlate: { type: Type.STRING },
    serviceNeeded: { type: Type.STRING },
    preferredDate: { type: Type.STRING },
    location: { type: Type.STRING },
  },
  required: ["complete"],
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ complete: false }, { status: 401 });
  }

  const allowed = await checkRateLimit(user.id, "dealership-extract");
  if (!allowed) {
    return Response.json({ complete: false }, { status: 200 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ complete: false }, { status: 200 });
  }

  const { transcriptText } = (await request.json()) as { transcriptText?: string };
  if (!transcriptText?.trim()) {
    return Response.json({ complete: false }, { status: 200 });
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
                "Extract structured booking data from this Toyota dealership conversation transcript, if a booking is actually complete.\n\n" +
                'Set "complete" to true only if the customer has given enough details for one of: a service booking (name, phone, vehicle model, license plate, service needed, preferred date), a test drive (name, phone, model, preferred date, location), or promo interest (name, phone, model). Set "complete" to false if the conversation is still in progress or missing key fields.\n\n' +
                'Set "flowType" to "service", "testDrive", or "promo" accordingly, and fill in whichever fields are known from the transcript. Omit fields that were never mentioned.\n\n' +
                `Transcript:\n${transcriptText}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: EXTRACT_SCHEMA,
        temperature: 0,
      },
    });

    const text = response.text;
    if (!text) return Response.json({ complete: false });

    const parsed = JSON.parse(text);
    return Response.json(parsed, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dealership extraction failed", error);
    return Response.json({ complete: false }, { status: 200 });
  }
}
