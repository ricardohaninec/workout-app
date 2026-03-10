import { notFound } from "next/navigation";
import { get, query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Exercise, ExerciseSet, Workout } from "@/lib/types";
import WorkoutEditor from "@/components/WorkoutEditor";

type Props = { params: Promise<{ id: string }> };
type ExerciseRow = Omit<Exercise, "setGroups">;

export default async function WorkoutPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();

  const workout = get<Workout>(
    "SELECT * FROM workout WHERE id = ? AND user_id = ?",
    [id, session.user.id]
  );
  if (!workout) notFound();

  const rows = query<ExerciseRow>(
    `SELECT e.id, e.user_id, e.title, e.created_at, e.updated_at FROM exercise e
     JOIN workout_exercise we ON we.exercise_id = e.id
     WHERE we.workout_id = ?`,
    [id]
  );

  const exercises: Exercise[] = rows.map((ex) => ({
    ...ex,
    setGroups: query<ExerciseSet>(
      "SELECT * FROM exercise_set WHERE exercise_id = ? ORDER BY position ASC",
      [ex.id]
    ),
  }));

  return (
    <WorkoutEditor
      workoutId={id}
      initialTitle={workout.title}
      initialIsPublic={workout.is_public === 1}
      initialSlug={workout.public_slug}
      savedExercises={exercises}
    />
  );
}
