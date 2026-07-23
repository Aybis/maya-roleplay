import { GoogleGenAI, Modality } from "@google/genai";

export const runtime = "edge";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Voice chat needs a Gemini API key. Add GEMINI_API_KEY to the site environment." },
      { status: 503 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        expireTime: new Date(now + 30 * 60_000).toISOString(),
        liveConnectConstraints: {
          model: "gemini-3.1-flash-live-preview",
          config: { responseModalities: [Modality.AUDIO] },
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    const useElevenLabs = process.env.ELEVENLABS_ENABLED === "true";
    return Response.json(
      { token: token.name, useElevenLabs },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to create Gemini token", error);
    return Response.json({ error: "The voice gateway is unavailable right now." }, { status: 502 });
  }
}
