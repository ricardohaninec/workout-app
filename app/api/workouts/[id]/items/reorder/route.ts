import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Workout } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workoutId } = await params;
  const workout = await get<Workout>("SELECT * FROM workout WHERE id = $1 AND user_id = $2", [workoutId, session.user.id]);
  if (!workout) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds : [];
  if (itemIds.length === 0) return Response.json({ error: "itemIds required" }, { status: 400 });

  await Promise.all(
    itemIds.map((itemId, position) =>
      run(
        "UPDATE workout_item SET position = $1, updated_at = NOW() WHERE id = $2 AND workout_id = $3",
        [position, itemId, workoutId]
      )
    )
  );

  return Response.json({ ok: true });
}
