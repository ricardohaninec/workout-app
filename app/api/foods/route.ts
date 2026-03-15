import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Food } from "@/lib/types";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const foods = search
    ? await query<Food>(
        "SELECT * FROM foods WHERE user_id = $1 AND name ILIKE $2 ORDER BY name ASC",
        [session.user.id, `%${search}%`]
      )
    : await query<Food>(
        "SELECT * FROM foods WHERE user_id = $1 ORDER BY name ASC",
        [session.user.id]
      );

  return Response.json({ foods });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, caloriesPerG, proteinPerG, carbsPerG, fatPerG, unit } = body;

  if (!name || caloriesPerG == null || proteinPerG == null || carbsPerG == null || fatPerG == null) {
    return Response.json({ error: "name, caloriesPerG, proteinPerG, carbsPerG, fatPerG are required" }, { status: 400 });
  }

  await run(
    `INSERT INTO foods (user_id, name, calories_per_g, protein_per_g, carbs_per_g, fat_per_g, unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [session.user.id, name, caloriesPerG, proteinPerG, carbsPerG, fatPerG, unit ?? "g"]
  );

  const food = await get<Food>(
    "SELECT * FROM foods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [session.user.id]
  );
  return Response.json(food, { status: 201 });
}
