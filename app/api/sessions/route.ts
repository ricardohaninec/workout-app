import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { headers } from "next/headers";

export type SessionHistoryItem = {
  id: string;
  workout_id: string;
  workout_title: string;
  workout_image_url: string | null;
  started_at: string;
  completed_at: string;
  duration_seconds: number | null;
  exercise_count: number;
  set_count: number;
};

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await query<SessionHistoryItem>(
    `SELECT
      wip.id,
      wip.workout_id,
      w.title AS workout_title,
      w.image_url AS workout_image_url,
      wip.started_at,
      wip.completed_at,
      wip.duration_seconds,
      COUNT(DISTINCT wips.workout_item_id)::int AS exercise_count,
      COUNT(wips.id)::int AS set_count
    FROM workout_in_progress wip
    JOIN workout w ON w.id = wip.workout_id
    LEFT JOIN workout_in_progress_set wips ON wips.workout_in_progress_id = wip.id
    WHERE wip.user_id = $1
      AND wip.is_active = FALSE
      AND wip.completed_at IS NOT NULL
    GROUP BY wip.id, w.title, w.image_url
    ORDER BY wip.completed_at DESC`,
    [session.user.id]
  );

  return Response.json(sessions);
}
