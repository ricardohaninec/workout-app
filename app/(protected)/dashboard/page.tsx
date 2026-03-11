import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Workout } from "@/lib/types";
import WorkoutList from "@/components/workout-list";
import CreateWorkoutButton from "@/components/create-workout-button";

export default async function DashboardPage() {
  const session = await requireSession();

  const workouts = await query<Workout>(
    "SELECT * FROM workout WHERE user_id = $1 ORDER BY updated_at DESC",
    [session.user.id]
  );

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Workouts</h1>
        <CreateWorkoutButton />
      </div>
      <WorkoutList workouts={workouts} />
    </main>
  );
}
