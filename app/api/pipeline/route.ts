export const runtime = "edge";

export async function GET() {
  const pipeline = process.env.VOICE_PIPELINE === "surplus" ? "surplus" : "google-live";
  const useElevenLabs = process.env.ELEVENLABS_ENABLED === "true";
  return Response.json(
    { pipeline, useElevenLabs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
