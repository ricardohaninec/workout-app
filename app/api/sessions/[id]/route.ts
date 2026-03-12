import { auth } from "@/lib/auth";
import { get, query } from "@/lib/db";
import type { WorkoutInProgress } from "@/lib/types";
import { headers } from "next/headers";

type SessionDetailSet = {
  id: string;
  workout_item_id: string;
  exercise_title: string;
  reps: number;
  weight: number;
  position: number;
  rest_seconds: number;
  is_complete: boolean;
};

export type SessionDetail = WorkoutInProgress & {
  workout_title: string;
  sets: SessionDetailSet[];
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const wip = await get<WorkoutInProgress & { workout_title: string }>(
    `SELECT wip.*, w.title AS workout_title
     FROM workout_in_progress wip
     JOIN workout w ON w.id = wip.workout_id
     WHERE wip.id = $1 AND wip.user_id = $2`,
    [id, session.user.id]
  );
  if (!wip) return Response.json({ error: "Not found" }, { status: 404 });

  const sets = await query<SessionDetailSet>(
    `SELECT wips.id, wips.workout_item_id, e.title AS exercise_title,
            wips.reps, wips.weight, wips.position,
            COALESCE(wis.rest_seconds, 60) AS rest_seconds,
            wips.is_complete
     FROM workout_in_progress_set wips
     JOIN workout_item wi ON wi.id = wips.workout_item_id
     JOIN exercise e ON e.id = wi.exercise_id
     LEFT JOIN workout_item_set wis ON wis.workout_item_id = wips.workout_item_id
       AND wis.position = wips.position
     WHERE wips.workout_in_progress_id = $1
     ORDER BY e.title, wips.position`,
    [id]
  );

  return Response.json({ ...wip, sets });
}
