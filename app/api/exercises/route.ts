import { auth } from "@/lib/auth";
import { query, run } from "@/lib/db";
import type { Exercise, ExerciseSet } from "@/lib/types";

type ExerciseRow = Omit<Exercise, "setGroups">;

function withSetGroups(exercises: ExerciseRow[]): Exercise[] {
  return exercises.map((ex) => {
    const setGroups = query<ExerciseSet>(
      "SELECT * FROM exercise_set WHERE exercise_id = ? ORDER BY position ASC",
      [ex.id]
    );
    return { ...ex, setGroups };
  });
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = query<ExerciseRow>(
    "SELECT id, user_id, title, created_at, updated_at FROM exercise WHERE user_id = ? ORDER BY title ASC",
    [session.user.id]
  );
  return Response.json(withSetGroups(rows));
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim() || "Untitled Exercise";
  const setGroups: { sets: number; weight: number }[] = Array.isArray(body.setGroups)
    ? body.setGroups
    : [];

  const id = crypto.randomUUID();
  run(
    "INSERT INTO exercise (id, user_id, title, sets, weights) VALUES (?, ?, ?, 0, 0)",
    [id, session.user.id, title]
  );

  setGroups.forEach((sg, i) => {
    run(
      "INSERT INTO exercise_set (id, exercise_id, sets, weight, position) VALUES (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), id, Number(sg.sets) || 1, Number(sg.weight) || 0, i]
    );
  });

  const row = query<ExerciseRow>(
    "SELECT id, user_id, title, created_at, updated_at FROM exercise WHERE id = ?",
    [id]
  )[0];
  return Response.json(withSetGroups([row])[0], { status: 201 });
}
