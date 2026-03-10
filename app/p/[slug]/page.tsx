import { notFound } from "next/navigation";
import { get, query } from "@/lib/db";
import type { Workout, WorkoutItem, WorkoutItemSet } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicWorkoutPage({ params }: Props) {
  const { slug } = await params;

  const workout = get<Workout & { user_name: string }>(
    `SELECT w.*, u.name AS user_name
     FROM workout w
     JOIN user u ON u.id = w.user_id
     WHERE w.public_slug = ? AND w.is_public = 1`,
    [slug]
  );
  if (!workout) notFound();

  type ItemRow = { id: string; workout_id: string; exercise_id: string; position: number; created_at: string; updated_at: string; exercise_title: string };
  const rows = query<ItemRow>(
    `SELECT wi.id, wi.workout_id, wi.exercise_id, wi.position, wi.created_at, wi.updated_at,
            e.title AS exercise_title
     FROM workout_item wi
     JOIN exercise e ON e.id = wi.exercise_id
     WHERE wi.workout_id = ?
     ORDER BY wi.position ASC`,
    [workout.id]
  );

  const workoutItems: WorkoutItem[] = rows.map((row) => ({
    id: row.id,
    workout_id: row.workout_id,
    exercise_id: row.exercise_id,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
    exercise: { id: row.exercise_id, title: row.exercise_title },
    sets: query<WorkoutItemSet>(
      "SELECT * FROM workout_item_set WHERE workout_item_id = ? ORDER BY position ASC",
      [row.id]
    ),
  }));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="mb-1 text-xs text-neutral-400">Public workout</p>
      <h1 className="mb-1 text-2xl font-bold">{workout.title}</h1>
      <p className="mb-6 text-sm text-neutral-500">by {workout.user_name}</p>
      <section>
        <h2 className="mb-3 font-semibold">Exercises</h2>
        {workoutItems.length === 0 ? (
          <p className="text-neutral-500">No exercises.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {workoutItems.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <p className="mb-2 font-medium">{item.exercise.title}</p>
                <ul className="flex flex-col gap-1">
                  {item.sets.map((s, i) => (
                    <li key={s.id} className="text-sm text-neutral-500">
                      <span className="font-medium text-neutral-700">Set {i + 1}:</span>{" "}
                      {s.reps} reps × {s.weight} kg
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
