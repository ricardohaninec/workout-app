import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Food } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const food = await get<Food>("SELECT * FROM foods WHERE id = $1 AND user_id = $2", [id, session.user.id]);
  if (!food) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  await run(
    `UPDATE foods SET
       name = COALESCE($1, name),
       calories_per_g = COALESCE($2, calories_per_g),
       protein_per_g = COALESCE($3, protein_per_g),
       carbs_per_g = COALESCE($4, carbs_per_g),
       fat_per_g = COALESCE($5, fat_per_g),
       unit = COALESCE($6, unit),
       updated_at = NOW()
     WHERE id = $7`,
    [
      body.name ?? null,
      body.caloriesPerG ?? null,
      body.proteinPerG ?? null,
      body.carbsPerG ?? null,
      body.fatPerG ?? null,
      body.unit ?? null,
      id,
    ]
  );

  return Response.json(await get<Food>("SELECT * FROM foods WHERE id = $1", [id]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const food = await get<Food>("SELECT id FROM foods WHERE id = $1 AND user_id = $2", [id, session.user.id]);
  if (!food) return Response.json({ error: "Not found" }, { status: 404 });

  await run("DELETE FROM foods WHERE id = $1", [id]);
  return Response.json({ deleted: true, id });
}
