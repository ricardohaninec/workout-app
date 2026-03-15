import { notFound } from "next/navigation";
import { query, get } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Day, Meal, MealFood } from "@/lib/types";
import DayDetail from "@/components/day-detail";

type Totals = { calories: number; protein: number; carbs: number; fat: number };

function sumMacros(foods: MealFood[]): Totals {
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

export default async function DayDetailPage({ params }: { params: Promise<{ dayId: string }> }) {
  const session = await requireSession();
  const { dayId } = await params;

  const day = await get<Day>(
    "SELECT * FROM days WHERE id = $1 AND user_id = $2",
    [dayId, session.user.id]
  );
  if (!day) notFound();

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
      const coerced = foods.map((f) => ({
        ...f,
        quantity_grams: Number(f.quantity_grams),
        calories: Number(f.calories),
        protein: Number(f.protein),
        carbs: Number(f.carbs),
        fat: Number(f.fat),
      }));
      return { ...meal, foods: coerced, totals: sumMacros(coerced) };
    })
  );

  const dayTotals = sumMacros(mealsWithFoods.flatMap((m) => m.foods));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <DayDetail day={day} initialMeals={mealsWithFoods} initialDayTotals={dayTotals} />
    </main>
  );
}
