import { auth } from "@/lib/auth";
import { get, query, run } from "@/lib/db";
import type { Day } from "@/lib/types";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  type DayRow = Day & { meal_count: string; total_calories: string };
  const rows = await query<DayRow>(
    `SELECT d.*,
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

  const days = rows.map((r) => ({
    ...r,
    mealCount: Number(r.meal_count),
    totalCalories: Number(r.total_calories),
  }));

  return Response.json({ days });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const date = body.date as string | undefined;
  if (!date) return Response.json({ error: "date is required" }, { status: 400 });

  const existing = await get<Day>(
    "SELECT id FROM days WHERE user_id = $1 AND date = $2",
    [session.user.id, date]
  );
  if (existing) return Response.json({ error: "A day entry already exists for this date" }, { status: 409 });

  await run(
    "INSERT INTO days (user_id, date, notes) VALUES ($1, $2, $3)",
    [session.user.id, date, body.notes ?? null]
  );

  const day = await get<Day>(
    "SELECT * FROM days WHERE user_id = $1 AND date = $2",
    [session.user.id, date]
  );
  return Response.json(day, { status: 201 });
}
