import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Workout, WorkoutItem, WorkoutItemSet } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function buildWorkoutItems(workoutId: string): WorkoutItem[] {
  type ItemRow = { id: string; workout_id: string; exercise_id: string; position: number; created_at: string; updated_at: string; exercise_title: string };
  const rows = query<ItemRow>(
    `SELECT wi.id, wi.workout_id, wi.exercise_id, wi.position, wi.created_at, wi.updated_at,
            e.title AS exercise_title
     FROM workout_item wi
     JOIN exercise e ON e.id = wi.exercise_id
     WHERE wi.workout_id = ?
     ORDER BY wi.position ASC`,
    [workoutId]
  );

  return rows.map((row) => ({
    id: row.id,
    workout_id: row.workout_id,
    exercise_id: row.exercise_id,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
    exercise: { id: row.exercise_id, title: row.exercise_title },
    sets: query<WorkoutItemSet>(
      "SELECT * FROM workout_item_set WHERE workout_item_id = ? ORDER BY position ASC",
      [row.id]
    ),
  }));
}

export async function GET(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = get<Workout>("SELECT * FROM workout WHERE id = ? AND user_id = ?", [id, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ...workout, workoutItems: buildWorkoutItems(id) });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = get<Workout>("SELECT * FROM workout WHERE id = ? AND user_id = ?", [id, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  if (title) {
    run("UPDATE workout SET title = ?, updated_at = datetime('now') WHERE id = ?", [title, id]);
  }

  if ("image_url" in body) {
    run("UPDATE workout SET image_url = ?, updated_at = datetime('now') WHERE id = ?", [body.image_url ?? null, id]);
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
  const workout = get<Workout>("SELECT * FROM workout WHERE id = ? AND user_id = ?", [id, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  // workout_item and workout_item_set cascade on workout delete
  run("DELETE FROM workout WHERE id = ?", [id]);

  return Response.json({ message: "Workout deleted successfully." });
}
