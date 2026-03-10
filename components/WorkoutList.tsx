import Link from "next/link";
import type { Workout } from "@/lib/types";

export default function WorkoutList({ workouts }: { workouts: Workout[] }) {
  if (workouts.length === 0) {
    return <p className="text-neutral-500">No workouts yet. Create your first one!</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {workouts.map((w) => (
        <li key={w.id}>
          <Link
            href={`/workout/${w.id}`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-neutral-50 transition-colors"
          >
            <span className="font-medium">{w.title}</span>
            <span className="text-xs text-neutral-400">
              {new Date(w.updated_at).toLocaleDateString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
