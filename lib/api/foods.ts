import type { Food, MealFood } from "@/lib/types";

export async function fetchFoods(search?: string): Promise<Food[]> {
  const url = search ? `/api/foods?search=${encodeURIComponent(search)}` : "/api/foods";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch foods");
  const data = await res.json();
  return data.foods ?? [];
}

export async function createFood(data: {
  name: string;
  caloriesPerG: number;
  proteinPerG: number;
  carbsPerG: number;
  fatPerG: number;
  unit: string;
}): Promise<Food> {
  const res = await fetch("/api/foods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create food");
  return res.json();
}

export async function updateFood({
  id,
  ...data
}: {
  id: string;
  name: string;
  caloriesPerG: number;
  proteinPerG: number;
  carbsPerG: number;
  fatPerG: number;
  unit: string;
}): Promise<Food> {
  const res = await fetch(`/api/foods/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update food");
  return res.json();
}

export async function deleteFood(id: string): Promise<void> {
  const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete food");
}

export async function addFoodToMeal(
  mealId: string,
  data:
    | { foodId: string; quantityGrams: number }
    | {
        foodName: string;
        quantityGrams: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }
): Promise<MealFood> {
  const res = await fetch(`/api/meals/${mealId}/foods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add food to meal");
  return res.json();
}
