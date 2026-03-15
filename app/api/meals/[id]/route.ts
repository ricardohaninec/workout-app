import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Meal } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

async function getMealForUser(mealId: string, userId: string) {
  return get<Meal>(
    `SELECT m.* FROM meals m
     JOIN days d ON d.id = m.day_id
     WHERE m.id = $1 AND d.user_id = $2`,
    [mealId, userId]
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const meal = await getMealForUser(id, session.user.id);
  if (!meal) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  await run(
    `UPDATE meals SET
       meal_type = COALESCE($1, meal_type),
       notes = $2,
       updated_at = NOW()
     WHERE id = $3`,
    [body.mealType ?? null, body.notes ?? null, id]
  );

  return Response.json(await get<Meal>("SELECT * FROM meals WHERE id = $1", [id]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const meal = await getMealForUser(id, session.user.id);
  if (!meal) return Response.json({ error: "Not found" }, { status: 404 });

  await run("DELETE FROM meals WHERE id = $1", [id]);
  return Response.json({ deleted: true, id });
}
