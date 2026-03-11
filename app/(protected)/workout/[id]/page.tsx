import { notFound } from "next/navigation";
import { get, query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Workout, WorkoutItem, WorkoutItemSet } from "@/lib/types";
import WorkoutEditor from "@/components/workout-editor";

type Props = { params: Promise<{ id: string }> };

export default async function WorkoutPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();

  const workout = await get<Workout>(
    "SELECT * FROM workout WHERE id = $1 AND user_id = $2",
    [id, session.user.id]
  );
  if (!workout) notFound();

  type ItemRow = { id: string; workout_id: string; exercise_id: string; position: number; created_at: string; updated_at: string; exercise_title: string; exercise_image_url: string | null };
  const rows = await query<ItemRow>(
    `SELECT wi.id, wi.workout_id, wi.exercise_id, wi.position, wi.created_at, wi.updated_at,
            e.title AS exercise_title, e.image_url AS exercise_image_url
     FROM workout_item wi
     JOIN exercise e ON e.id = wi.exercise_id
     WHERE wi.workout_id = $1
     ORDER BY wi.position ASC`,
    [id]
  );

  const savedItems: WorkoutItem[] = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      workout_id: row.workout_id,
      exercise_id: row.exercise_id,
      position: row.position,
      created_at: row.created_at,
      updated_at: row.updated_at,
      exercise: { id: row.exercise_id, title: row.exercise_title, image_url: row.exercise_image_url },
      sets: await query<WorkoutItemSet>(
        "SELECT * FROM workout_item_set WHERE workout_item_id = $1 ORDER BY position ASC",
        [row.id]
      ),
    }))
  );

  return (
    <WorkoutEditor
      workoutId={id}
      initialTitle={workout.title}
      initialImageUrl={workout.image_url}
      initialIsPublic={workout.is_public === true}
      initialSlug={workout.public_slug}
      savedItems={savedItems}
    />
  );
}
