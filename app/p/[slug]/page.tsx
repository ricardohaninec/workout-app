import { notFound } from "next/navigation";
import { get, query } from "@/lib/db";
import type { Exercise, ExerciseSet, Workout } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };
type ExerciseRow = Omit<Exercise, "setGroups">;

export default async function PublicWorkoutPage({ params }: Props) {
  const { slug } = await params;

  const workout = get<Workout>(
    "SELECT * FROM workout WHERE public_slug = ? AND is_public = 1",
    [slug]
  );
  if (!workout) notFound();

  const rows = query<ExerciseRow>(
    `SELECT e.id, e.user_id, e.title, e.created_at, e.updated_at FROM exercise e
     JOIN workout_exercise we ON we.exercise_id = e.id
     WHERE we.workout_id = ?`,
    [workout.id]
  );

  const exercises: Exercise[] = rows.map((ex) => ({
    ...ex,
    setGroups: query<ExerciseSet>(
      "SELECT * FROM exercise_set WHERE exercise_id = ? ORDER BY position ASC",
      [ex.id]
    ),
  }));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="mb-4 text-xs text-neutral-400">Public workout</p>
      <h1 className="mb-6 text-2xl font-bold">{workout.title}</h1>
      <section>
        <h2 className="mb-3 font-semibold">Exercises</h2>
        {exercises.length === 0 ? (
          <p className="text-neutral-500">No exercises.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {exercises.map((ex) => (
              <li key={ex.id} className="rounded-lg border p-4">
                <p className="mb-2 font-medium">{ex.title}</p>
                <ul className="flex flex-col gap-1">
                  {ex.setGroups.map((sg) => (
                    <li key={sg.id} className="text-sm text-neutral-500">
                      <span className="font-medium text-neutral-700">{sg.sets}×</span>{" "}
                      {sg.weight} kg
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
