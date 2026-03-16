import type { SessionDetail } from "@/app/api/sessions/[id]/route";

export async function fetchSessionDetail(id: string): Promise<SessionDetail> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export async function deleteSession({
  workoutId,
  sessionId,
}: {
  workoutId: string;
  sessionId: string;
}): Promise<void> {
  const res = await fetch(`/api/workouts/${workoutId}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
}
