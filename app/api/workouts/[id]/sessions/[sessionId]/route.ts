import { auth } from "@/lib/auth";
import { get, query, run, pool } from "@/lib/db";
import type { Workout, WorkoutInProgress, WorkoutInProgressSet } from "@/lib/types";

type Params = { params: Promise<{ id: string; sessionId: string }> };

async function getSessionForUser(workoutId: string, sessionId: string, userId: string) {
  return get<WorkoutInProgress>(
    "SELECT * FROM workout_in_progress WHERE id = $1 AND workout_id = $2 AND user_id = $3",
    [sessionId, workoutId, userId]
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sessionId } = await params;
  const workout = await get<Workout>(
    "SELECT id FROM workout WHERE id = $1 AND user_id = $2",
    [id, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const wip = await getSessionForUser(id, sessionId, session.user.id);
  if (!wip) return Response.json({ error: "Session not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const fields: string[] = ["updated_at = NOW()"];
    const vals: unknown[] = [];
    let idx = 1;

    if (typeof body.isActive === "boolean") {
      fields.push(`is_active = $${idx++}`);
      vals.push(body.isActive);
    }
    if (body.completedAt !== undefined) {
      fields.push(`completed_at = $${idx++}`);
      vals.push(body.completedAt);
    }
    if (body.durationSeconds !== undefined) {
      fields.push(`duration_seconds = $${idx++}`);
      vals.push(body.durationSeconds);
    }

    if (fields.length > 1) {
      vals.push(sessionId);
      await client.query(
        `UPDATE workout_in_progress SET ${fields.join(", ")} WHERE id = $${idx}`,
        vals
      );
    }

    if (Array.isArray(body.sets)) {
      // Save session progress sets
      await client.query(
        "DELETE FROM workout_in_progress_set WHERE workout_in_progress_id = $1",
        [sessionId]
      );
      for (const s of body.sets) {
        await client.query(
          "INSERT INTO workout_in_progress_set (id, workout_in_progress_id, workout_item_id, reps, weight, position) VALUES ($1, $2, $3, $4, $5, $6)",
          [crypto.randomUUID(), sessionId, s.workoutItemId, s.reps ?? 1, s.weight ?? 0, s.position ?? 0]
        );
      }

      // Also write back to workout_item_set so the template reflects the latest values
      const byItem = new Map<string, { reps: number; weight: number; position: number }[]>();
      for (const s of body.sets) {
        if (!byItem.has(s.workoutItemId)) byItem.set(s.workoutItemId, []);
        byItem.get(s.workoutItemId)!.push({ reps: s.reps ?? 1, weight: s.weight ?? 0, position: s.position ?? 0 });
      }
      for (const [itemId, sets] of byItem) {
        await client.query("DELETE FROM workout_item_set WHERE workout_item_id = $1", [itemId]);
        for (const s of sets) {
          await client.query(
            "INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position) VALUES ($1, $2, $3, $4, $5)",
            [crypto.randomUUID(), itemId, s.reps, s.weight, s.position]
          );
        }
        await client.query("UPDATE workout_item SET updated_at = NOW() WHERE id = $1", [itemId]);
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const updated = await get<WorkoutInProgress>(
    "SELECT * FROM workout_in_progress WHERE id = $1",
    [sessionId]
  );
  const sets = await query<WorkoutInProgressSet>(
    "SELECT * FROM workout_in_progress_set WHERE workout_in_progress_id = $1 ORDER BY position ASC",
    [sessionId]
  );

  return Response.json({ ...updated, sets });
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sessionId } = await params;
  const workout = await get<Workout>(
    "SELECT id FROM workout WHERE id = $1 AND user_id = $2",
    [id, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const wip = await getSessionForUser(id, sessionId, session.user.id);
  if (!wip) return Response.json({ error: "Session not found" }, { status: 404 });

  await run("DELETE FROM workout_in_progress WHERE id = $1", [sessionId]);
  return Response.json({ message: "Session deleted successfully." });
}
