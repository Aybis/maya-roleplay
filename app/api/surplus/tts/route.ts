export const runtime = "edge";

export async function POST(request: Request) {
  const apiKey = process.env.SURPLUS_API_KEY;
  const model = process.env.SURPLUS_TTS_MODEL || "tts-gemini-3-1-flash";
  const voice = process.env.SURPLUS_TTS_VOICE || "Leda";
  if (!apiKey) {
    return Response.json(
      { error: "This pipeline needs SURPLUS_API_KEY in the site environment." },
      { status: 503 },
    );
  }

  const { text } = (await request.json()) as { text?: string };
  if (!text?.trim()) {
    return Response.json({ error: "No text provided." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.surplusintelligence.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: text, voice }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      console.error("Surplus TTS failed", response.status, detail);
      return Response.json(
        { error: "Maya's voice is unavailable right now." },
        { status: 502 },
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Unable to reach Surplus TTS", error);
    return Response.json(
      { error: "Maya's voice is unavailable right now." },
      { status: 502 },
    );
  }
}
