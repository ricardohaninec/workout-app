import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Exercise } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exercise = get<Exercise>("SELECT * FROM exercise WHERE id = ? AND user_id = ?", [id, session.user.id]);
  if (!exercise) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  if (title) {
    run("UPDATE exercise SET title = ?, updated_at = datetime('now') WHERE id = ?", [title, id]);
  }

  if ("image_url" in body) {
    run("UPDATE exercise SET image_url = ?, updated_at = datetime('now') WHERE id = ?", [body.image_url ?? null, id]);
  }

  return Response.json(get<Exercise>("SELECT id, user_id, title, image_url, created_at, updated_at FROM exercise WHERE id = ?", [id]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exercise = get<Exercise>("SELECT * FROM exercise WHERE id = ? AND user_id = ?", [id, session.user.id]);
  if (!exercise) return Response.json({ error: "Not found" }, { status: 404 });

  run("DELETE FROM exercise WHERE id = ?", [id]);

  return Response.json({ message: "Exercise deleted successfully." });
}
