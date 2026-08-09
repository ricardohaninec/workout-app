import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { HandReference } from "@/lib/types";

const HandMeasureSchema = z.object({
  detected: z.boolean(),
  hand_length_cm: z.number().positive(),
});

const HAND_MEASURE_SYSTEM_PROMPT = `You measure a human hand against a ruler visible in a photo. Locate the ruler and use its printed cm markings as ground truth scale. Measure the visible hand from the wrist crease to the tip of the middle finger. Respond ONLY with JSON:
{ "detected": <true if both a ruler and a hand are clearly visible and measurable, else false>, "hand_length_cm": <number, best estimate; if not detected, your best guess or 0> }
JSON only, no markdown, no prose.`;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function extractJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const handReference = await get<HandReference>(
    "SELECT * FROM hand_references WHERE user_id = $1",
    [session.user.id]
  );
  return Response.json({ handReference: handReference ?? null });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const image = body.image as string | undefined;

  if (!image) return Response.json({ error: "image is required" }, { status: 400 });
  if (image.length * 0.75 > MAX_IMAGE_BYTES) {
    return Response.json({ error: "image is too large" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let parsed: z.infer<typeof HandMeasureSchema>;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: HAND_MEASURE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Measure the hand against the ruler in this photo." },
          ],
        },
      ],
    });
    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    parsed = HandMeasureSchema.parse(JSON.parse(extractJson(raw)));
  } catch {
    return Response.json({ error: "Couldn't analyze that photo" }, { status: 502 });
  }

  if (!parsed.detected) {
    return Response.json(
      { error: "Couldn't detect a hand and ruler in that photo. Make sure both are flat and fully visible." },
      { status: 422 }
    );
  }

  await run(
    `INSERT INTO hand_references (user_id, hand_length_cm)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET hand_length_cm = $2, updated_at = NOW()`,
    [session.user.id, parsed.hand_length_cm]
  );

  const handReference = await get<HandReference>(
    "SELECT * FROM hand_references WHERE user_id = $1",
    [session.user.id]
  );
  return Response.json({ handReference }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await run("DELETE FROM hand_references WHERE user_id = $1", [session.user.id]);
  return Response.json({ message: "Hand reference removed." });
}
