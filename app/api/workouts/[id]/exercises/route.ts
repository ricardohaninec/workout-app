import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Workout } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId } = await params;
  const workout = get<Workout>(
    "SELECT * FROM workout WHERE id = ? AND user_id = ?",
    [workoutId, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const exerciseId = body.exerciseId as string | undefined;
  if (!exerciseId) return Response.json({ error: "exerciseId required" }, { status: 400 });

  const existing = get(
    "SELECT 1 FROM workout_exercise WHERE workout_id = ? AND exercise_id = ?",
    [workoutId, exerciseId]
  );
  if (existing) return Response.json({ message: "Already attached." });

  run(
    "INSERT INTO workout_exercise (workout_id, exercise_id) VALUES (?, ?)",
    [workoutId, exerciseId]
  );
  run(
    "UPDATE workout SET updated_at = datetime('now') WHERE id = ?",
    [workoutId]
  );

  return Response.json({ message: "Exercise added to workout successfully." }, { status: 201 });
}
