import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Workout, WorkoutItemSet } from "@/lib/types";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId, itemId } = await params;
  const workout = get<Workout>("SELECT * FROM workout WHERE id = ? AND user_id = ?", [workoutId, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const item = get<{ id: string }>("SELECT id FROM workout_item WHERE id = ? AND workout_id = ?", [itemId, workoutId]);
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  if (typeof body.position === "number") {
    run("UPDATE workout_item SET position = ?, updated_at = datetime('now') WHERE id = ?", [body.position, itemId]);
  }

  if (Array.isArray(body.sets)) {
    run("DELETE FROM workout_item_set WHERE workout_item_id = ?", [itemId]);
    (body.sets as { reps: number; weight: number }[]).forEach((s, i) => {
      run(
        "INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), itemId, Number(s.reps) || 1, Number(s.weight) || 0, i]
      );
    });
    run("UPDATE workout_item SET updated_at = datetime('now') WHERE id = ?", [itemId]);
  }

  type ItemRow = { id: string; position: number; updated_at: string };
  const updated = get<ItemRow>("SELECT id, position, updated_at FROM workout_item WHERE id = ?", [itemId])!;

  return Response.json({
    ...updated,
    sets: query<WorkoutItemSet>(
      "SELECT * FROM workout_item_set WHERE workout_item_id = ? ORDER BY position ASC",
      [itemId]
    ),
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId, itemId } = await params;
  const workout = get<Workout>("SELECT * FROM workout WHERE id = ? AND user_id = ?", [workoutId, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const item = get<{ id: string }>("SELECT id FROM workout_item WHERE id = ? AND workout_id = ?", [itemId, workoutId]);
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  // workout_item_set cascades on workout_item delete
  run("DELETE FROM workout_item WHERE id = ?", [itemId]);

  return Response.json({ message: "Workout item removed successfully." });
}
