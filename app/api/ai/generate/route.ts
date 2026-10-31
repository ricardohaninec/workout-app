import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAUDE_MODEL } from "@/lib/ai-model";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import type { ProposedWorkout } from "@/lib/types";

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  rest_seconds: z.number().int().min(0),
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

  const existing = await query<{ title: string }>(
    "SELECT DISTINCT title FROM exercise WHERE user_id = $1 ORDER BY title ASC",
    [session.user.id]
  );
  const existingList = existing.map((e) => e.title);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1536,
      system: `You are an expert personal trainer building a structured workout for a real user. Respond ONLY with a valid JSON object:
{
  "title": "<short workout name, max 40 chars>",
  "exercises": [
    { "name": "<Title Case exercise name>", "sets": number, "reps": number, "rest_seconds": number, "note": string|null }
  ]
}

Exercise library — the user already has these exercises logged:
${existingList.length > 0 ? existingList.map((t) => `- ${t}`).join("\n") : "(empty — the user has no exercises yet)"}

Rules:
1. Reuse an exercise from the library above whenever it fits the goal — copy its name EXACTLY (same spelling, casing, spacing) so it can be matched. Only invent a new exercise name when nothing in the library reasonably covers the movement needed.
2. Build a well-programmed session, not a random exercise list:
   - Order compound/multi-joint movements before isolation/single-joint accessory work.
   - Cover complementary movement patterns for the stated goal (e.g. push+pull, or agonist+antagonist) — avoid picking multiple exercises that train the exact same movement redundantly.
   - Pick rep ranges that match the goal: ~3-6 reps for strength/power, ~8-12 for hypertrophy/general fitness, ~12-20+ for endurance/toning/core work.
   - Pick rest_seconds that match the goal: 90-180s for heavy strength work, 60-90s for hypertrophy, 30-45s for endurance/core/circuit work.
   - Use "note" only for a short, genuinely useful cue (form tip, tempo, alternative); otherwise null.
3. Return between 4 and 8 exercises.
JSON only, no markdown, no prose.`,
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
