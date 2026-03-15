import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Day, Meal, MealFood } from "@/lib/types";

type Params = { params: Promise<{ dayId: string }> };

function sumMacros(foods: MealFood[]) {
  return foods.reduce(
    (acc, f) => ({
      calories: acc.calories + Number(f.calories),
      protein: acc.protein + Number(f.protein),
      carbs: acc.carbs + Number(f.carbs),
      fat: acc.fat + Number(f.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export async function GET(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;
  const day = await get<Day>("SELECT id FROM days WHERE id = $1 AND user_id = $2", [dayId, session.user.id]);
  if (!day) return Response.json({ error: "Not found" }, { status: 404 });

  const meals = await query<Meal>(
    "SELECT * FROM meals WHERE day_id = $1 ORDER BY created_at ASC",
    [dayId]
  );

  const mealsWithFoods = await Promise.all(
    meals.map(async (meal) => {
      const foods = await query<MealFood>(
        "SELECT * FROM meal_foods WHERE meal_id = $1 ORDER BY created_at ASC",
        [meal.id]
      );
      return { ...meal, foods, totals: sumMacros(foods) };
    })
  );

  const allFoods = mealsWithFoods.flatMap((m) => m.foods);
  const dayTotals = sumMacros(allFoods);

  return Response.json({ meals: mealsWithFoods, dayTotals });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;
  const day = await get<Day>("SELECT id FROM days WHERE id = $1 AND user_id = $2", [dayId, session.user.id]);
  if (!day) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (!body.mealType) return Response.json({ error: "mealType is required" }, { status: 400 });

  await run(
    "INSERT INTO meals (day_id, meal_type, notes) VALUES ($1, $2, $3)",
    [dayId, body.mealType, body.notes ?? null]
  );

  const meal = await get<Meal>(
    "SELECT * FROM meals WHERE day_id = $1 ORDER BY created_at DESC LIMIT 1",
    [dayId]
  );
  return Response.json(meal, { status: 201 });
}
