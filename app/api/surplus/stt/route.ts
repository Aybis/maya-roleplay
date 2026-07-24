export const runtime = "edge";

export async function POST(request: Request) {
  const apiKey = process.env.SURPLUS_API_KEY;
  const model = process.env.SURPLUS_STT_MODEL || "venice-whisper-1";
  if (!apiKey) {
    return Response.json(
      { error: "This pipeline needs SURPLUS_API_KEY in the site environment." },
      { status: 503 },
    );
  }

  const incomingForm = await request.formData();
  const file = incomingForm.get("file");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "No audio file provided." }, { status: 400 });
  }

  try {
    const outgoingForm = new FormData();
    outgoingForm.append("file", file, "input.webm");
    outgoingForm.append("model", model);

    const response = await fetch("https://api.surplusintelligence.ai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outgoingForm,
    });

    const payload = (await response.json()) as { text?: string; error?: unknown };
    if (!response.ok || typeof payload.text !== "string") {
      console.error("Surplus transcription failed", response.status, payload);
      return Response.json(
        { error: "Maya couldn't hear that clearly." },
        { status: 502 },
      );
    }

    return Response.json({ text: payload.text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to reach Surplus transcription", error);
    return Response.json(
      { error: "Maya couldn't hear that clearly." },
      { status: 502 },
    );
  }
}
