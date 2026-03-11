import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Exercise } from "@/lib/types";
import { del } from "@vercel/blob";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exercise = await get<Exercise>("SELECT * FROM exercise WHERE id = $1 AND user_id = $2", [id, session.user.id]);
  if (!exercise) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  if (title) {
    await run("UPDATE exercise SET title = $1, updated_at = NOW() WHERE id = $2", [title, id]);
  }

  if ("image_url" in body) {
    if (body.image_url == null && exercise.image_url) {
      await del(exercise.image_url).catch(() => {});
    }
    await run("UPDATE exercise SET image_url = $1, updated_at = NOW() WHERE id = $2", [body.image_url ?? null, id]);
  }

  return Response.json(await get<Exercise>("SELECT id, user_id, title, image_url, created_at, updated_at FROM exercise WHERE id = $1", [id]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const exercise = await get<Exercise>("SELECT * FROM exercise WHERE id = $1 AND user_id = $2", [id, session.user.id]);
  if (!exercise) return Response.json({ error: "Not found" }, { status: 404 });

  if (exercise.image_url) {
    await del(exercise.image_url).catch(() => {});
  }
  await run("DELETE FROM exercise WHERE id = $1", [id]);

  return Response.json({ message: "Exercise deleted successfully." });
}
