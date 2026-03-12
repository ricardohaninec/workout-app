import { notFound, redirect } from "next/navigation";
import { get, query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Workout, WorkoutItem, WorkoutItemSet, WorkoutInProgress, WorkoutInProgressSet } from "@/lib/types";
import WorkoutInProgressView from "@/components/workout-in-progress-view";

type Props = { params: Promise<{ workoutId: string }> };

export default async function WorkoutInProgressPage({ params }: Props) {
  const { workoutId } = await params;
  const session = await requireSession();

  const workout = await get<Workout>(
    "SELECT id FROM workout WHERE id = $1 AND user_id = $2",
    [workoutId, session.user.id]
  );
  if (!workout) notFound();

  const activeSession = await get<WorkoutInProgress>(
    "SELECT * FROM workout_in_progress WHERE workout_id = $1 AND user_id = $2 AND is_active = TRUE",
    [workoutId, session.user.id]
  );
  if (!activeSession) redirect(`/workout/${workoutId}`);

  type ItemRow = {
    id: string; workout_id: string; exercise_id: string; position: number;
    note: string | null; created_at: string; updated_at: string;
    exercise_title: string; exercise_image_url: string | null;
  };
  const itemRows = await query<ItemRow>(
    `SELECT wi.id, wi.workout_id, wi.exercise_id, wi.position, wi.note, wi.created_at, wi.updated_at,
            e.title AS exercise_title, e.image_url AS exercise_image_url
     FROM workout_item wi
     JOIN exercise e ON e.id = wi.exercise_id
     WHERE wi.workout_id = $1
     ORDER BY wi.position ASC`,
    [workoutId]
  );

  const workoutItems: WorkoutItem[] = await Promise.all(
    itemRows.map(async (row) => ({
      id: row.id,
      workout_id: row.workout_id,
      exercise_id: row.exercise_id,
      position: row.position,
      note: row.note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      exercise: { id: row.exercise_id, title: row.exercise_title, image_url: row.exercise_image_url },
      sets: await query<WorkoutItemSet>(
        "SELECT * FROM workout_item_set WHERE workout_item_id = $1 ORDER BY position ASC",
        [row.id]
      ),
    }))
  );

  const wipSets = await query<WorkoutInProgressSet>(
    "SELECT * FROM workout_in_progress_set WHERE workout_in_progress_id = $1 ORDER BY position ASC",
    [activeSession.id]
  );

  return (
    <WorkoutInProgressView
      workoutId={workoutId}
      sessionId={activeSession.id}
      startedAt={activeSession.started_at}
      workoutItems={workoutItems}
      sets={wipSets}
    />
  );
}
