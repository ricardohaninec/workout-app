import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Workout, WorkoutItem, WorkoutItemSet } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId } = await params;
  const workout = await get<Workout>("SELECT * FROM workout WHERE id = $1 AND user_id = $2", [workoutId, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const exerciseId = body.exerciseId as string | undefined;
  if (!exerciseId) return Response.json({ error: "exerciseId required" }, { status: 400 });

  const exercise = await get<{ id: string; title: string; image_url: string | null }>("SELECT id, title, image_url FROM exercise WHERE id = $1", [exerciseId]);
  if (!exercise) return Response.json({ error: "Exercise not found" }, { status: 404 });

  const position = typeof body.position === "number" ? body.position : 0;
  const sets: { reps: number; weight: number }[] = Array.isArray(body.sets) ? body.sets : [];

  const itemId = crypto.randomUUID();
  await run(
    "INSERT INTO workout_item (id, workout_id, exercise_id, position) VALUES ($1, $2, $3, $4)",
    [itemId, workoutId, exerciseId, position]
  );

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    await run(
      "INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position) VALUES ($1, $2, $3, $4, $5)",
      [crypto.randomUUID(), itemId, Number(s.reps) || 1, Number(s.weight) || 0, i]
    );
  }

  await run("UPDATE workout SET updated_at = NOW() WHERE id = $1", [workoutId]);

  type ItemRow = { id: string; workout_id: string; exercise_id: string; position: number; created_at: string; updated_at: string };
  const item = (await get<ItemRow>("SELECT * FROM workout_item WHERE id = $1", [itemId]))!;

  return Response.json(
    {
      ...item,
      exercise,
      sets: await query<WorkoutItemSet>("SELECT * FROM workout_item_set WHERE workout_item_id = $1 ORDER BY position ASC", [itemId]),
    } satisfies WorkoutItem,
    { status: 201 }
  );
}
