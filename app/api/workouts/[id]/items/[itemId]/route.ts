import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Workout, WorkoutItemSet } from "@/lib/types";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId, itemId } = await params;
  const workout = await get<Workout>("SELECT * FROM workout WHERE id = $1 AND user_id = $2", [workoutId, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const item = await get<{ id: string }>("SELECT id FROM workout_item WHERE id = $1 AND workout_id = $2", [itemId, workoutId]);
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  if (typeof body.position === "number") {
    await run("UPDATE workout_item SET position = $1, updated_at = NOW() WHERE id = $2", [body.position, itemId]);
  }

  if ("note" in body) {
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    await run("UPDATE workout_item SET note = $1, updated_at = NOW() WHERE id = $2", [note, itemId]);
  }

  if (Array.isArray(body.sets)) {
    await run("DELETE FROM workout_item_set WHERE workout_item_id = $1", [itemId]);
    for (let i = 0; i < (body.sets as { reps: number; weight: number }[]).length; i++) {
      const s = (body.sets as { reps: number; weight: number }[])[i];
      await run(
        "INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position) VALUES ($1, $2, $3, $4, $5)",
        [crypto.randomUUID(), itemId, Number(s.reps) || 1, Number(s.weight) || 0, i]
      );
    }
    await run("UPDATE workout_item SET updated_at = NOW() WHERE id = $1", [itemId]);
  }

  type ItemRow = { id: string; position: number; updated_at: string };
  const updated = (await get<ItemRow>("SELECT id, position, updated_at FROM workout_item WHERE id = $1", [itemId]))!;

  return Response.json({
    ...updated,
    sets: await query<WorkoutItemSet>(
      "SELECT * FROM workout_item_set WHERE workout_item_id = $1 ORDER BY position ASC",
      [itemId]
    ),
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId, itemId } = await params;
  const workout = await get<Workout>("SELECT * FROM workout WHERE id = $1 AND user_id = $2", [workoutId, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const item = await get<{ id: string }>("SELECT id FROM workout_item WHERE id = $1 AND workout_id = $2", [itemId, workoutId]);
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  // workout_item_set cascades on workout_item delete
  await run("DELETE FROM workout_item WHERE id = $1", [itemId]);

  return Response.json({ message: "Workout item removed successfully." });
}
