import { auth } from "@/lib/auth";
import { get, run } from "@/lib/db";
import type { Food, Meal, MealFood } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: mealId } = await params;
  const meal = await get<Meal>(
    `SELECT m.* FROM meals m
     JOIN days d ON d.id = m.day_id
     WHERE m.id = $1 AND d.user_id = $2`,
    [mealId, session.user.id]
  );
  if (!meal) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  if (body.foodId) {
    // Library food: look up and compute macros
    const food = await get<Food>(
      "SELECT * FROM foods WHERE id = $1 AND user_id = $2",
      [body.foodId, session.user.id]
    );
    if (!food) return Response.json({ error: "Food not found" }, { status: 404 });

    const qty: number = body.quantityGrams;
    if (!qty || qty <= 0) return Response.json({ error: "quantityGrams is required" }, { status: 400 });

    await run(
      `INSERT INTO meal_foods (meal_id, food_id, food_name, quantity_grams, calories, protein, carbs, fat, is_manual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)`,
      [
        mealId,
        food.id,
        food.name,
        qty,
        qty * Number(food.calories_per_g),
        qty * Number(food.protein_per_g),
        qty * Number(food.carbs_per_g),
        qty * Number(food.fat_per_g),
      ]
    );
  } else {
    // Manual entry
    const { foodName, quantityGrams, calories, protein, carbs, fat } = body;
    if (!foodName || quantityGrams == null || calories == null || protein == null || carbs == null || fat == null) {
      return Response.json({ error: "foodName, quantityGrams, calories, protein, carbs, fat are required" }, { status: 400 });
    }

    await run(
      `INSERT INTO meal_foods (meal_id, food_id, food_name, quantity_grams, calories, protein, carbs, fat, is_manual)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, TRUE)`,
      [mealId, foodName, quantityGrams, calories, protein, carbs, fat]
    );
  }

  const mealFood = await get<MealFood>(
    "SELECT * FROM meal_foods WHERE meal_id = $1 ORDER BY created_at DESC LIMIT 1",
    [mealId]
  );
  return Response.json(mealFood, { status: 201 });
}
