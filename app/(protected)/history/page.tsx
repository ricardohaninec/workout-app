import { requireSession } from "@/lib/auth-server";
import { query } from "@/lib/db";
import type { SessionHistoryItem } from "@/app/api/sessions/route";
import SessionHistoryList from "@/components/session-history-list";

export default async function HistoryPage() {
  const session = await requireSession();

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

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Workout History</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {sessions.length} completed session{sessions.length !== 1 ? "s" : ""}
        </p>
      </div>
      <SessionHistoryList initialSessions={sessions} />
    </main>
  );
}
