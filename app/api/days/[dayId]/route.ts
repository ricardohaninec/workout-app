import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Day } from "@/lib/types";

type Params = { params: Promise<{ dayId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;
  const day = await get<Day>("SELECT * FROM days WHERE id = $1 AND user_id = $2", [dayId, session.user.id]);
  if (!day) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  await run(
    "UPDATE days SET notes = $1, updated_at = NOW() WHERE id = $2",
    [body.notes ?? null, dayId]
  );

  return Response.json(await get<Day>("SELECT * FROM days WHERE id = $1", [dayId]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;
  const day = await get<Day>("SELECT id FROM days WHERE id = $1 AND user_id = $2", [dayId, session.user.id]);
  if (!day) return Response.json({ error: "Not found" }, { status: 404 });

  await run("DELETE FROM days WHERE id = $1", [dayId]);
  return Response.json({ deleted: true, id: dayId });
}
