import type { ProposedWorkout } from "@/lib/types";

export async function generateWorkout(goal: string): Promise<ProposedWorkout> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal }),
  });
  if (!res.ok) throw new Error("Failed to generate workout");
  return res.json();
}

export async function commitWorkout(
  proposal: ProposedWorkout
): Promise<{ workoutId: string }> {
  const res = await fetch("/api/ai/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposal }),
  });
  if (!res.ok) throw new Error("Failed to create workout");
  return res.json();
}
