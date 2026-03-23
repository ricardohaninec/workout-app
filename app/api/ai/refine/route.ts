import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth } from "@/lib/auth";
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
  exercises: z.array(ExerciseSchema).min(1).max(12),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const feedback = (body.feedback as string | undefined)?.trim();
  const proposal = body.proposal as ProposedWorkout | undefined;

  if (!feedback) return Response.json({ error: "feedback is required" }, { status: 400 });
  if (!proposal) return Response.json({ error: "proposal is required" }, { status: 400 });

  const currentExercises = proposal.exercises
    .map((ex, i) => `${i + 1}. ${ex.name} — ${ex.sets} sets × ${ex.reps} reps, ${ex.rest_seconds}s rest${ex.note ? ` (${ex.note})` : ""}`)
    .join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are an expert personal trainer. The user has a workout they want to modify.

Current workout: "${proposal.title}" (goal: ${proposal.goal})
Exercises:
${currentExercises}

Apply the user's requested change and return the updated workout as a valid JSON object:
{
  "title": "<short workout name, max 40 chars>",
  "exercises": [
    { "name": "<Title Case exercise name>", "sets": number, "reps": number, "rest_seconds": number, "note": string|null }
  ]
}
Keep exercises not mentioned in the feedback unchanged. JSON only, no markdown, no prose.`,
      messages: [{ role: "user", content: feedback }],
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

  const updated: ProposedWorkout = {
    title: parsed.title,
    goal: proposal.goal,
    exercises: parsed.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds,
      note: ex.note ?? null,
      image_url: null,
    })),
  };

  return Response.json(updated);
}
