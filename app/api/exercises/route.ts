import { auth } from "@/lib/auth";
import { query, run } from "@/lib/db";
import type { Exercise } from "@/lib/types";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const exercises = query<Exercise>(
    "SELECT * FROM exercise WHERE user_id = ? ORDER BY title ASC",
    [session.user.id]
  );
  return Response.json(exercises);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim() || "Untitled Exercise";
  const sets = Number(body.sets) || 0;
  const weights = Number(body.weights) || 0;
  const id = crypto.randomUUID();

  run(
    "INSERT INTO exercise (id, user_id, title, sets, weights) VALUES (?, ?, ?, ?, ?)",
    [id, session.user.id, title, sets, weights]
  );

  const exercise = query<Exercise>("SELECT * FROM exercise WHERE id = ?", [id])[0];
  return Response.json(exercise, { status: 201 });
}
