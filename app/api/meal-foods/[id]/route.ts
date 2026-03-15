import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Food, MealFood } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

async function getMealFoodForUser(mealFoodId: string, userId: string) {
  return get<MealFood>(
    `SELECT mf.* FROM meal_foods mf
     JOIN meals m ON m.id = mf.meal_id
     JOIN days d ON d.id = m.day_id
     WHERE mf.id = $1 AND d.user_id = $2`,
    [mealFoodId, userId]
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mealFood = await getMealFoodForUser(id, session.user.id);
  if (!mealFood) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  if (!mealFood.is_manual && body.quantityGrams != null) {
    // Library food: recalculate macros from the original food record
    const food = await get<Food>("SELECT * FROM foods WHERE id = $1", [mealFood.food_id]);
    if (!food) return Response.json({ error: "Linked food not found" }, { status: 404 });

    const qty: number = body.quantityGrams;
    await run(
      `UPDATE meal_foods SET
         quantity_grams = $1, calories = $2, protein = $3, carbs = $4, fat = $5
       WHERE id = $6`,
      [
        qty,
        qty * Number(food.calories_per_g),
        qty * Number(food.protein_per_g),
        qty * Number(food.carbs_per_g),
        qty * Number(food.fat_per_g),
        id,
      ]
    );
  } else if (mealFood.is_manual) {
    // Manual entry: allow updating any field
    const { quantityGrams, calories, protein, carbs, fat } = body;
    await run(
      `UPDATE meal_foods SET
         quantity_grams = COALESCE($1, quantity_grams),
         calories = COALESCE($2, calories),
         protein = COALESCE($3, protein),
         carbs = COALESCE($4, carbs),
         fat = COALESCE($5, fat)
       WHERE id = $6`,
      [quantityGrams ?? null, calories ?? null, protein ?? null, carbs ?? null, fat ?? null, id]
    );
  }

  return Response.json(await get<MealFood>("SELECT * FROM meal_foods WHERE id = $1", [id]));
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mealFood = await getMealFoodForUser(id, session.user.id);
  if (!mealFood) return Response.json({ error: "Not found" }, { status: 404 });

  await run("DELETE FROM meal_foods WHERE id = $1", [id]);
  return Response.json({ deleted: true, id });
}
