export const runtime = "edge";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return Response.json(
      {
        error:
          "Maya's voice needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the site environment.",
      },
      { status: 503 },
    );
  }

  const { text } = (await request.json()) as { text?: string };
  if (!text?.trim()) {
    return Response.json({ error: "No text provided." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_v3",
          voice_settings: { stability: 0.3, similarity_boost: 0.85 },
        }),
      },
    );

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      console.error("ElevenLabs TTS failed", response.status, detail);
      return Response.json(
        { error: "Maya's voice is unavailable right now." },
        { status: 502 },
      );
    }

    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to reach ElevenLabs", error);
    return Response.json(
      { error: "Maya's voice is unavailable right now." },
      { status: 502 },
    );
  }
}
