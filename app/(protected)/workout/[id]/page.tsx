import { notFound } from "next/navigation";
import { get, query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Exercise, Workout } from "@/lib/types";
import AttachExerciseModal from "@/components/AttachExerciseModal";

type Props = { params: Promise<{ id: string }> };

export default async function WorkoutPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();

  const workout = get<Workout>(
    "SELECT * FROM workout WHERE id = ? AND user_id = ?",
    [id, session.user.id]
  );
  if (!workout) notFound();

  const exercises = query<Exercise>(
    `SELECT e.* FROM exercise e
     JOIN workout_exercise we ON we.exercise_id = e.id
     WHERE we.workout_id = ?`,
    [id]
  );

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{workout.title}</h1>
        <div className="flex gap-2">
          <button className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-100">
            Share
          </button>
          <button className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Exercises</h2>
          <AttachExerciseModal workoutId={id} />
        </div>

        {exercises.length === 0 ? (
          <p className="text-neutral-500">No exercises yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exercises.map((ex) => (
              <li
                key={ex.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <span className="font-medium">{ex.title}</span>
                <span className="text-sm text-neutral-400">
                  {ex.sets} sets · {ex.weights} kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
