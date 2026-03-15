import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Day } from "@/lib/types";
import DaysList from "@/components/days-list";

type DayRow = Omit<Day, "total_calories" | "meal_count"> & {
  total_calories: string;
  meal_count: string;
};

export default async function DaysPage() {
  const session = await requireSession();

  const rows = await query<DayRow>(
    `SELECT d.id, d.user_id, d.date, d.notes, d.created_at, d.updated_at,
            COUNT(DISTINCT m.id) AS meal_count,
            COALESCE(SUM(mf.calories), 0) AS total_calories
     FROM days d
     LEFT JOIN meals m ON m.day_id = d.id
     LEFT JOIN meal_foods mf ON mf.meal_id = m.id
     WHERE d.user_id = $1
     GROUP BY d.id
     ORDER BY d.date DESC`,
    [session.user.id]
  );

  const days: Day[] = rows.map((r) => ({
    ...r,
    total_calories: Number(r.total_calories),
    meal_count: Number(r.meal_count),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <DaysList days={days} />
    </main>
  );
}
