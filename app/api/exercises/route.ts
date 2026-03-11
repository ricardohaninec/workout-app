import { auth } from "@/lib/auth";
import { query, run } from "@/lib/db";
import type { Exercise } from "@/lib/types";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = query<Exercise>(
    "SELECT id, user_id, title, image_url, created_at, updated_at FROM exercise WHERE user_id = ? ORDER BY title ASC",
    [session.user.id]
  );
  return Response.json(rows);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim() || "Untitled Exercise";
  const image_url = (body.image_url as string | undefined) ?? null;

  const id = crypto.randomUUID();
  run("INSERT INTO exercise (id, user_id, title, image_url) VALUES (?, ?, ?, ?)", [id, session.user.id, title, image_url]);

  const row = query<Exercise>(
    "SELECT id, user_id, title, image_url, created_at, updated_at FROM exercise WHERE id = ?",
    [id]
  )[0];
  return Response.json(row, { status: 201 });
}
