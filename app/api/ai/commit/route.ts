import { z } from "zod";
import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";

const ProposedExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  rest_seconds: z.number().int().positive(),
  note: z.string().nullable(),
  image_url: z.string().nullable(),
});

const ProposedWorkoutSchema = z.object({
  title: z.string(),
  goal: z.string(),
  exercises: z.array(ProposedExerciseSchema).min(1),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  let proposal: z.infer<typeof ProposedWorkoutSchema>;
  try {
    proposal = ProposedWorkoutSchema.parse(body.proposal);
  } catch {
    return Response.json({ error: "Invalid proposal" }, { status: 400 });
  }

  const workoutId = crypto.randomUUID();
  await run("INSERT INTO workout (id, user_id, title) VALUES ($1, $2, $3)", [
    workoutId,
    session.user.id,
    proposal.title,
  ]);

  for (let i = 0; i < proposal.exercises.length; i++) {
    const ex = proposal.exercises[i];

    // Fuzzy match existing exercise
    const existing = await get<{ id: string }>(
      "SELECT id FROM exercise WHERE user_id = $1 AND LOWER(title) ILIKE $2 LIMIT 1",
      [session.user.id, `%${ex.name.toLowerCase()}%`]
    );

    let exerciseId: string;
    if (existing) {
      exerciseId = existing.id;
    } else {
      exerciseId = crypto.randomUUID();
      await run(
        "INSERT INTO exercise (id, user_id, title, image_url) VALUES ($1, $2, $3, $4)",
        [exerciseId, session.user.id, ex.name, ex.image_url]
      );
    }

    const itemId = crypto.randomUUID();
    await run(
      "INSERT INTO workout_item (id, workout_id, exercise_id, position, note) VALUES ($1, $2, $3, $4, $5)",
      [itemId, workoutId, exerciseId, i, ex.note]
    );

    for (let s = 0; s < ex.sets; s++) {
      await run(
        "INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position, rest_seconds) VALUES ($1, $2, $3, $4, $5, $6)",
        [crypto.randomUUID(), itemId, ex.reps, 0, s, ex.rest_seconds]
      );
    }
  }

  await run("UPDATE workout SET updated_at = NOW() WHERE id = $1", [workoutId]);

  return Response.json({ workoutId });
}
