import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Workout, WorkoutItem, WorkoutItemSet } from "@/lib/types";
import { del } from "@vercel/blob";

type Params = { params: Promise<{ id: string }> };

async function buildWorkoutItems(workoutId: string): Promise<WorkoutItem[]> {
  type ItemRow = { id: string; workout_id: string; exercise_id: string; position: number; created_at: string; updated_at: string; exercise_title: string; exercise_image_url: string | null };
  const rows = await query<ItemRow>(
    `SELECT wi.id, wi.workout_id, wi.exercise_id, wi.position, wi.created_at, wi.updated_at,
            e.title AS exercise_title, e.image_url AS exercise_image_url
     FROM workout_item wi
     JOIN exercise e ON e.id = wi.exercise_id
     WHERE wi.workout_id = $1
     ORDER BY wi.position ASC`,
    [workoutId]
  );

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      workout_id: row.workout_id,
      exercise_id: row.exercise_id,
      position: row.position,
      created_at: row.created_at,
      updated_at: row.updated_at,
      exercise: { id: row.exercise_id, title: row.exercise_title, image_url: row.exercise_image_url },
      sets: await query<WorkoutItemSet>(
        "SELECT * FROM workout_item_set WHERE workout_item_id = $1 ORDER BY position ASC",
        [row.id]
      ),
    }))
  );
}

export async function GET(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await get<Workout>("SELECT * FROM workout WHERE id = $1 AND user_id = $2", [id, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ...workout, workoutItems: await buildWorkoutItems(id) });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await get<Workout>("SELECT * FROM workout WHERE id = $1 AND user_id = $2", [id, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  if (title) {
    await run("UPDATE workout SET title = $1, updated_at = NOW() WHERE id = $2", [title, id]);
  }

  if ("image_url" in body) {
    if (body.image_url == null && workout.image_url) {
      await del(workout.image_url).catch(() => {});
    }
    await run("UPDATE workout SET image_url = $1, updated_at = NOW() WHERE id = $2", [body.image_url ?? null, id]);
  }

  if (typeof body.is_public === "boolean") {
    const enable = body.is_public;
    const slug = enable ? (workout.public_slug ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16)) : workout.public_slug;
    await run(
      "UPDATE workout SET is_public = $1, public_slug = $2, updated_at = NOW() WHERE id = $3",
      [enable, slug, id]
    );
  }

  return Response.json(await get<Workout>("SELECT * FROM workout WHERE id = $1", [id]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workout = await get<Workout>("SELECT * FROM workout WHERE id = $1 AND user_id = $2", [id, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  if (workout.image_url) {
    await del(workout.image_url).catch(() => {});
  }
  // workout_item and workout_item_set cascade on workout delete
  await run("DELETE FROM workout WHERE id = $1", [id]);

  return Response.json({ message: "Workout deleted successfully." });
}
