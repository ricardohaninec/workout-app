import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Exercise } from "@/lib/types";
import ExercisesManager from "@/components/exercises-manager";

export default async function ExercisesPage() {
  const session = await requireSession();

  const exercises = await query<Exercise>(
    "SELECT id, user_id, title, image_url, created_at, updated_at FROM exercise WHERE user_id = $1 ORDER BY title ASC",
    [session.user.id]
  );

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Exercises</h1>
      </div>
      <ExercisesManager initial={exercises} />
    </main>
  );
}
