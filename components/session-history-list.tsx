"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionHistoryItem } from "@/app/api/sessions/route";
import type { SessionDetail } from "@/app/api/sessions/[id]/route";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Modal from "@/components/modal";
import PlaceholderImage from "@/components/icons/placeholder-image";

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m}m ${s}s`
    : m > 0
      ? `${m}m ${s}s`
      : `${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionHistoryList({ initialSessions }: { initialSessions: SessionHistoryItem[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [pendingDelete, setPendingDelete] = useState<SessionHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function openDetail(s: SessionHistoryItem) {
    setLoadingDetail(true);
    setDetailSession(null);
    const res = await fetch(`/api/sessions/${s.id}`);
    if (res.ok) setDetailSession(await res.json());
    setLoadingDetail(false);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    await fetch(`/api/workouts/${pendingDelete.workout_id}/sessions/${pendingDelete.id}`, {
      method: "DELETE",
    });
    setSessions((prev) => prev.filter((s) => s.id !== pendingDelete.id));
    setPendingDelete(null);
    setDeleting(false);
    router.refresh();
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-16 text-center text-neutral-400">
        <p className="text-lg font-medium">No completed workouts yet.</p>
        <p className="mt-1 text-sm">Complete a session to see it here.</p>
        <Link href="/dashboard" className={cn(buttonVariants(), "mt-6")}>
          Go to My Workouts
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-neutral-50"
            onClick={() => openDetail(s)}
          >
            {/* Thumbnail */}
            {s.workout_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.workout_image_url}
                alt={s.workout_title}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <PlaceholderImage size={20} />
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.workout_title}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{formatDate(s.completed_at)}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-400">
                <span>{s.exercise_count} exercise{s.exercise_count !== 1 ? "s" : ""}</span>
                <span>{s.set_count} set{s.set_count !== 1 ? "s" : ""}</span>
                <span>{formatDuration(s.duration_seconds)}</span>
              </div>
            </div>

            {/* Actions */}
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); setPendingDelete(s); }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      {/* Session detail modal */}
      <Modal
        open={loadingDetail || !!detailSession}
        onClose={() => { setDetailSession(null); setLoadingDetail(false); }}
        title={detailSession?.workout_title ?? "Loading…"}
      >
        {loadingDetail && <p className="py-8 text-center text-sm text-neutral-400">Loading…</p>}
        {detailSession && <SessionDetailContent session={detailSession} />}
      </Modal>

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete Session"
      >
        <p className="text-sm text-neutral-600">
          Delete the{" "}
          <span className="font-medium">{pendingDelete?.workout_title}</span> session
          from {pendingDelete ? formatDate(pendingDelete.completed_at) : ""}? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function SessionDetailContent({ session }: { session: SessionDetail }) {
  // Group sets by exercise
  const grouped = session.sets.reduce<Record<string, { title: string; sets: typeof session.sets }>>((acc, set) => {
    if (!acc[set.workout_item_id]) acc[set.workout_item_id] = { title: set.exercise_title, sets: [] };
    acc[set.workout_item_id].sets.push(set);
    return acc;
  }, {});

  return (
    <div className="space-y-1">
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-neutral-500">
        <span>Started: {formatDate(session.started_at)}</span>
        <span>Duration: {formatDuration(session.duration_seconds)}</span>
      </div>

      {Object.values(grouped).length === 0 && (
        <p className="text-sm text-neutral-400">No sets recorded for this session.</p>
      )}

      {Object.values(grouped).map(({ title, sets }) => (
        <div key={title} className="rounded-lg border p-3">
          <p className="mb-2 font-medium">{title}</p>
          <div className="space-y-1">
            {sets.map((set, i) => (
              <div key={set.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-neutral-400">{i + 1}</span>
                <span>{set.reps} reps</span>
                <span className="text-neutral-400">×</span>
                <span>{set.weight} kg</span>
                {set.is_complete && (
                  <span className="ml-auto text-xs font-medium text-green-600">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
