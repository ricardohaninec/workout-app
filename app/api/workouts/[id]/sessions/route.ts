import { auth } from "@/lib/auth";
import { get, query, pool } from "@/lib/db";
import type { Workout, WorkoutInProgress, WorkoutInProgressSet } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await get<Workout>(
    "SELECT id FROM workout WHERE id = $1 AND user_id = $2",
    [id, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const sessions = await query<WorkoutInProgress>(
    "SELECT * FROM workout_in_progress WHERE workout_id = $1 AND user_id = $2 ORDER BY started_at DESC",
    [id, session.user.id]
  );

  const result = await Promise.all(
    sessions.map(async (s) => ({
      ...s,
      sets: await query<WorkoutInProgressSet>(
        "SELECT * FROM workout_in_progress_set WHERE workout_in_progress_id = $1 ORDER BY position ASC",
        [s.id]
      ),
    }))
  );

  return Response.json(result);
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await get<Workout>(
    "SELECT id FROM workout WHERE id = $1 AND user_id = $2",
    [id, session.user.id]
  );
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const newId = crypto.randomUUID();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE workout_in_progress SET is_active = FALSE, updated_at = NOW() WHERE workout_id = $1 AND is_active = TRUE",
      [id]
    );
    await client.query(
      "INSERT INTO workout_in_progress (id, workout_id, user_id, is_active) VALUES ($1, $2, $3, TRUE)",
      [newId, id, session.user.id]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const created = await get<WorkoutInProgress>(
    "SELECT * FROM workout_in_progress WHERE id = $1",
    [newId]
  );
  return Response.json(created, { status: 201 });
}
