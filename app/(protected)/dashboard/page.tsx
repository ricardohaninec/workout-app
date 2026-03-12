import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Workout } from "@/lib/types";
import WorkoutList from "@/components/workout-list";

export default async function DashboardPage() {
  const session = await requireSession();

  const workouts = await query<Workout>(
    "SELECT * FROM workout WHERE user_id = $1 ORDER BY updated_at DESC",
    [session.user.id]
  );

  const activeSessions = await query<{ workout_id: string }>(
    "SELECT workout_id FROM workout_in_progress WHERE user_id = $1 AND is_active = TRUE",
    [session.user.id]
  );
  const activeWorkoutIds = new Set(activeSessions.map((s) => s.workout_id));

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="mb-4 text-2xl font-bold">My Workouts</h1>
      <WorkoutList workouts={workouts} activeWorkoutIds={[...activeWorkoutIds]} />
    </main>
  );
}
