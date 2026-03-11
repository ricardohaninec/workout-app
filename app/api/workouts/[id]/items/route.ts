import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Workout, WorkoutItem, WorkoutItemSet } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId } = await params;
  const workout = get<Workout>("SELECT * FROM workout WHERE id = ? AND user_id = ?", [workoutId, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const exerciseId = body.exerciseId as string | undefined;
  if (!exerciseId) return Response.json({ error: "exerciseId required" }, { status: 400 });

  const exercise = get<{ id: string; title: string; image_url: string | null }>("SELECT id, title, image_url FROM exercise WHERE id = ?", [exerciseId]);
  if (!exercise) return Response.json({ error: "Exercise not found" }, { status: 404 });

  const position = typeof body.position === "number" ? body.position : 0;
  const sets: { reps: number; weight: number }[] = Array.isArray(body.sets) ? body.sets : [];

  const itemId = crypto.randomUUID();
  run(
    "INSERT INTO workout_item (id, workout_id, exercise_id, position) VALUES (?, ?, ?, ?)",
    [itemId, workoutId, exerciseId, position]
  );

  sets.forEach((s, i) => {
    run(
      "INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position) VALUES (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), itemId, Number(s.reps) || 1, Number(s.weight) || 0, i]
    );
  });

  run("UPDATE workout SET updated_at = datetime('now') WHERE id = ?", [workoutId]);

  type ItemRow = { id: string; workout_id: string; exercise_id: string; position: number; created_at: string; updated_at: string };
  const item = get<ItemRow>("SELECT * FROM workout_item WHERE id = ?", [itemId])!;

  return Response.json(
    {
      ...item,
      exercise,
      sets: query<WorkoutItemSet>("SELECT * FROM workout_item_set WHERE workout_item_id = ? ORDER BY position ASC", [itemId]),
    } satisfies WorkoutItem,
    { status: 201 }
  );
}
