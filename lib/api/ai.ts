import type { ProposedWorkout, ProposedFood } from "@/lib/types";

export async function generateWorkout(goal: string, signal?: AbortSignal): Promise<ProposedWorkout> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal }),
    signal,
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

export async function refineWorkout(
  proposal: ProposedWorkout,
  feedback: string,
  signal?: AbortSignal
): Promise<ProposedWorkout> {
  const res = await fetch("/api/ai/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposal, feedback }),
    signal,
  });
  if (!res.ok) throw new Error("Failed to refine workout");
  return res.json();
}

export async function lookupFood(query: string, previous?: ProposedFood, signal?: AbortSignal): Promise<ProposedFood> {
  const res = await fetch("/api/ai/food", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, previous }),
    signal,
  });
  if (!res.ok) throw new Error("Failed to look up food");
  return res.json();
}

export async function saveFood(
  food: ProposedFood,
  unit: "g" | "unit" | "ml",
  gramsPerUnit?: number
): Promise<{ foodId: string }> {
  let caloriesPerG = food.calories_per_100g / 100;
  let proteinPerG = food.protein_per_100g / 100;
  let carbsPerG = food.carbs_per_100g / 100;
  let fatPerG = food.fat_per_100g / 100;

  if (unit === "unit" && gramsPerUnit) {
    caloriesPerG = caloriesPerG * gramsPerUnit;
    proteinPerG = proteinPerG * gramsPerUnit;
    carbsPerG = carbsPerG * gramsPerUnit;
    fatPerG = fatPerG * gramsPerUnit;
  }

  const res = await fetch("/api/foods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: food.name, caloriesPerG, proteinPerG, carbsPerG, fatPerG, unit }),
  });
  if (!res.ok) throw new Error("Failed to save food");
  const data = await res.json();
  return { foodId: data.id };
}
