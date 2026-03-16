import type { Exercise } from "@/lib/types";

export async function fetchExercises(): Promise<Exercise[]> {
  const res = await fetch("/api/exercises");
  if (!res.ok) throw new Error("Failed to fetch exercises");
  return res.json();
}

export async function createExercise(data: {
  title: string;
  image_url: string | null;
}): Promise<Exercise> {
  const res = await fetch("/api/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create exercise");
  return res.json();
}

export async function updateExercise({
  id,
  ...data
}: {
  id: string;
  title: string;
  image_url: string | null;
}): Promise<Exercise> {
  const res = await fetch(`/api/exercises/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update exercise");
  return res.json();
}

export async function deleteExercise(id: string): Promise<void> {
  const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete exercise");
}
