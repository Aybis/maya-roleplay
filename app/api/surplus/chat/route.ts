export const runtime = "edge";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = process.env.SURPLUS_API_KEY;
  const model = process.env.SURPLUS_LLM_MODEL || "claude-opus-4.6";
  if (!apiKey) {
    return Response.json(
      { error: "This pipeline needs SURPLUS_API_KEY in the site environment." },
      { status: 503 },
    );
  }

  const { messages } = (await request.json()) as { messages?: ChatMessage[] };
  if (!messages?.length) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.surplusintelligence.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: unknown;
    };

    const reply = payload.choices?.[0]?.message?.content;
    if (!response.ok || !reply) {
      console.error("Surplus chat completion failed", response.status, payload);
      return Response.json(
        { error: "Maya's thinking is unavailable right now." },
        { status: 502 },
      );
    }

    return Response.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to reach Surplus chat completions", error);
    return Response.json(
      { error: "Maya's thinking is unavailable right now." },
      { status: 502 },
    );
  }
}
