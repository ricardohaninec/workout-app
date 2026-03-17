import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth } from "@/lib/auth";
import type { ProposedWorkout } from "@/lib/types";

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  rest_seconds: z.number().int().positive(),
  note: z.string().nullable().optional(),
});

const ResponseSchema = z.object({
  title: z.string().max(40),
  exercises: z.array(ExerciseSchema).min(4).max(8),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const goal = (body.goal as string | undefined)?.trim();
  if (!goal) return Response.json({ error: "goal is required" }, { status: 400 });
  if (goal.length > 500) return Response.json({ error: "goal must be 500 characters or fewer" }, { status: 400 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are an expert personal trainer. Given a fitness goal, respond ONLY with a valid JSON object:
{
  "title": "<short workout name, max 40 chars>",
  "exercises": [
    { "name": "<Title Case exercise name>", "sets": number, "reps": number, "rest_seconds": number, "note": string|null }
  ]
}
Return 4–8 exercises. JSON only, no markdown, no prose.`,
      messages: [{ role: "user", content: goal }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Anthropic API error";
    return Response.json({ error: msg }, { status: 502 });
  }

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: z.infer<typeof ResponseSchema>;
  try {
    parsed = ResponseSchema.parse(JSON.parse(text));
  } catch {
    return Response.json({ error: "Invalid AI response", raw }, { status: 502 });
  }

  const exercises = parsed.exercises.map((ex) => ({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    rest_seconds: ex.rest_seconds,
    note: ex.note ?? null,
    image_url: null,
  }));

  const proposal: ProposedWorkout = {
    title: parsed.title,
    goal,
    exercises,
  };

  return Response.json(proposal);
}
