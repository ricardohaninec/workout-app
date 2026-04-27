import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Workout } from "@/lib/types";
import ArchivedWorkoutList from "@/components/archived-workout-list";

export default async function ArchivedPage() {
  const session = await requireSession();

  const workouts = await query<Workout>(
    "SELECT * FROM workout WHERE user_id = $1 AND is_archived = TRUE ORDER BY updated_at DESC",
    [session.user.id]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <ArchivedWorkoutList workouts={workouts} />
    </main>
  );
}
