import { auth } from "@/lib/auth";
import { query, run } from "@/lib/db";
import type { Workout } from "@/lib/types";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const workouts = await query<Workout>(
    "SELECT * FROM workout WHERE user_id = $1 AND is_archived = FALSE ORDER BY updated_at DESC",
    [session.user.id]
  );
  return Response.json(workouts);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim() || "Untitled Workout";
  const id = crypto.randomUUID();

  await run(
    "INSERT INTO workout (id, user_id, title) VALUES ($1, $2, $3)",
    [id, session.user.id, title]
  );

  const workout = (await query<Workout>("SELECT * FROM workout WHERE id = $1", [id]))[0];
  return Response.json(workout, { status: 201 });
}
