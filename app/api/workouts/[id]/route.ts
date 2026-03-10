import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Exercise, ExerciseSet, Workout } from "@/lib/types";

type ExerciseRow = Omit<Exercise, "setGroups">;

function withSetGroups(exercises: ExerciseRow[]): Exercise[] {
  return exercises.map((ex) => ({
    ...ex,
    setGroups: query<ExerciseSet>(
      "SELECT * FROM exercise_set WHERE exercise_id = ? ORDER BY position ASC",
      [ex.id]
    ),
  }));
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = get<Workout>(
    "SELECT * FROM workout WHERE id = ? AND user_id = ?",
    [id, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const rows = query<ExerciseRow>(
    `SELECT e.id, e.user_id, e.title, e.created_at, e.updated_at FROM exercise e
     JOIN workout_exercise we ON we.exercise_id = e.id
     WHERE we.workout_id = ?`,
    [id]
  );

  return Response.json({ ...workout, exercises: withSetGroups(rows) });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = get<Workout>(
    "SELECT * FROM workout WHERE id = ? AND user_id = ?",
    [id, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  if (title) {
    run("UPDATE workout SET title = ?, updated_at = datetime('now') WHERE id = ?", [title, id]);
  }

  if (typeof body.is_public === "boolean") {
    const enable = body.is_public;
    const slug = enable ? (workout.public_slug ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16)) : workout.public_slug;
    run(
      "UPDATE workout SET is_public = ?, public_slug = ?, updated_at = datetime('now') WHERE id = ?",
      [enable ? 1 : 0, slug, id]
    );
  }

  return Response.json(get<Workout>("SELECT * FROM workout WHERE id = ?", [id]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = get<Workout>(
    "SELECT * FROM workout WHERE id = ? AND user_id = ?",
    [id, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  run("DELETE FROM workout_exercise WHERE workout_id = ?", [id]);
  run("DELETE FROM workout WHERE id = ?", [id]);

  return Response.json({ message: "Workout deleted successfully." });
}
