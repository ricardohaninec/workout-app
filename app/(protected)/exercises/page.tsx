import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Exercise, ExerciseSet } from "@/lib/types";
import ExercisesManager from "@/components/ExercisesManager";

type ExerciseRow = Omit<Exercise, "setGroups">;

export default async function ExercisesPage() {
  const session = await requireSession();

  const rows = query<ExerciseRow>(
    "SELECT id, user_id, title, created_at, updated_at FROM exercise WHERE user_id = ? ORDER BY title ASC",
    [session.user.id]
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Exercises</h1>
      </div>
      <ExercisesManager initial={exercises} />
    </main>
  );
}
