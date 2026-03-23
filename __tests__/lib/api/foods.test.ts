import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchFoods,
  createFood,
  updateFood,
  deleteFood,
  addFoodToMeal,
} from "@/lib/api/foods";

const ok = (data: unknown) =>
  ({ ok: true, json: () => Promise.resolve(data) }) as unknown as Response;

const fail = () => ({ ok: false }) as unknown as Response;

const baseFood = {
  id: "f1",
  user_id: "u1",
  name: "Chicken",
  calories_per_g: 1.65,
  protein_per_g: 0.31,
  carbs_per_g: 0,
  fat_per_g: 0.036,
  unit: "g",
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("fetchFoods", () => {
  it("calls GET /api/foods without search", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok({ foods: [] }));
    await fetchFoods();
    expect(global.fetch).toHaveBeenCalledWith("/api/foods");
  });

  it("includes search param in URL when provided", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok({ foods: [] }));
    await fetchFoods("chicken");
    expect(global.fetch).toHaveBeenCalledWith("/api/foods?search=chicken");
  });

  it("URL-encodes special characters in search", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok({ foods: [] }));
    await fetchFoods("peanut butter");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/foods?search=peanut%20butter"
    );
  });

  it("returns the foods array from data.foods", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok({ foods: [baseFood] }));
    const result = await fetchFoods();
    expect(result).toEqual([baseFood]);
  });

  it("returns empty array when data.foods is undefined", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok({}));
    const result = await fetchFoods();
    expect(result).toEqual([]);
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(fetchFoods()).rejects.toThrow("Failed to fetch foods");
  });
});

describe("createFood", () => {
  const foodInput = {
    name: "Chicken",
    caloriesPerG: 1.65,
    proteinPerG: 0.31,
    carbsPerG: 0,
    fatPerG: 0.036,
    unit: "g",
  };

  it("calls POST /api/foods with JSON body", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok(baseFood));
    await createFood(foodInput);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/foods",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(foodInput),
      })
    );
  });

  it("returns the created food", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok(baseFood));
    const result = await createFood(foodInput);
    expect(result).toEqual(baseFood);
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(createFood(foodInput)).rejects.toThrow("Failed to create food");
  });
});

describe("updateFood", () => {
  const updateInput = {
    id: "f1",
    name: "Updated Chicken",
    caloriesPerG: 1.65,
    proteinPerG: 0.31,
    carbsPerG: 0,
    fatPerG: 0.036,
    unit: "g",
  };

  it("calls PATCH /api/foods/:id with JSON body (id excluded from body)", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok(baseFood));
    await updateFood(updateInput);

    const { id, ...bodyWithoutId } = updateInput;
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/foods/${id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(bodyWithoutId),
      })
    );
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(updateFood(updateInput)).rejects.toThrow("Failed to update food");
  });
});

describe("deleteFood", () => {
  it("calls DELETE /api/foods/:id", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok(undefined));
    await deleteFood("f1");
    expect(global.fetch).toHaveBeenCalledWith("/api/foods/f1", {
      method: "DELETE",
    });
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(deleteFood("f1")).rejects.toThrow("Failed to delete food");
  });
});

describe("addFoodToMeal (library food)", () => {
  it("calls POST /api/meals/:mealId/foods with foodId", async () => {
    const mealFood = {
      id: "mf1",
      meal_id: "m1",
      food_id: "f1",
      food_name: "Chicken",
      quantity_grams: 150,
      calories: 247.5,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      is_manual: false,
      created_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue(ok(mealFood));

    const result = await addFoodToMeal("m1", {
      foodId: "f1",
      quantityGrams: 150,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/meals/m1/foods",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ foodId: "f1", quantityGrams: 150 }),
      })
    );
    expect(result).toEqual(mealFood);
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(
      addFoodToMeal("m1", { foodId: "f1", quantityGrams: 150 })
    ).rejects.toThrow("Failed to add food to meal");
  });
});

describe("addFoodToMeal (manual entry)", () => {
  it("calls POST /api/meals/:mealId/foods with manual food data", async () => {
    const manualFood = {
      foodName: "Custom Salad",
      quantityGrams: 200,
      calories: 120,
      protein: 5,
      carbs: 15,
      fat: 4,
    };
    const mealFood = {
      id: "mf2",
      meal_id: "m1",
      food_id: null,
      food_name: "Custom Salad",
      quantity_grams: 200,
      calories: 120,
      protein: 5,
      carbs: 15,
      fat: 4,
      is_manual: true,
      created_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue(ok(mealFood));

    const result = await addFoodToMeal("m1", manualFood);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/meals/m1/foods",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(manualFood),
      })
    );
    expect(result).toEqual(mealFood);
  });
});
