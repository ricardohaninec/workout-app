import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Exercise, ExerciseSet } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };
type ExerciseRow = Omit<Exercise, "setGroups">;

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exercise = get<ExerciseRow>(
    "SELECT * FROM exercise WHERE id = ? AND user_id = ?",
    [id, session.user.id]
  );
  if (!exercise) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  if (title) {
    run("UPDATE exercise SET title = ?, updated_at = datetime('now') WHERE id = ?", [title, id]);
  }

  if (Array.isArray(body.setGroups)) {
    run("DELETE FROM exercise_set WHERE exercise_id = ?", [id]);
    (body.setGroups as { sets: number; weight: number }[]).forEach((sg, i) => {
      run(
        "INSERT INTO exercise_set (id, exercise_id, sets, weight, position) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), id, Number(sg.sets) || 1, Number(sg.weight) || 0, i]
      );
    });
  }

  const updated = get<ExerciseRow>(
    "SELECT id, user_id, title, created_at, updated_at FROM exercise WHERE id = ?",
    [id]
  )!;
  return Response.json({
    ...updated,
    setGroups: query<ExerciseSet>(
      "SELECT * FROM exercise_set WHERE exercise_id = ? ORDER BY position ASC",
      [id]
    ),
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exercise = get<ExerciseRow>(
    "SELECT * FROM exercise WHERE id = ? AND user_id = ?",
    [id, session.user.id]
  );
  if (!exercise) return Response.json({ error: "Not found" }, { status: 404 });

  run("DELETE FROM exercise_set WHERE exercise_id = ?", [id]);
  run("DELETE FROM workout_exercise WHERE exercise_id = ?", [id]);
  run("DELETE FROM exercise WHERE id = ?", [id]);

  return Response.json({ message: "Exercise deleted." });
}
