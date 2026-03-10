import { auth } from "@/lib/auth";
import { query, run } from "@/lib/db";
import type { Workout } from "@/lib/types";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const workouts = query<Workout>(
    "SELECT * FROM workout WHERE user_id = ? ORDER BY updated_at DESC",
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

  run(
    "INSERT INTO workout (id, user_id, title) VALUES (?, ?, ?)",
    [id, session.user.id, title]
  );

  const workout = query<Workout>("SELECT * FROM workout WHERE id = ?", [id])[0];
  return Response.json(workout, { status: 201 });
}
