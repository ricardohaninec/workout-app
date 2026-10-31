import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditFoodModal from "@/components/edit-food-modal";
import type { MealFood } from "@/lib/types";

const mk = (over: Partial<MealFood>): MealFood => ({
  id: "f1",
  meal_id: "m1",
  food_id: null,
  food_name: "Rice",
  quantity_grams: 100,
  calories: 130,
  protein: 3,
  carbs: 28,
  fat: 1,
  is_manual: true,
  created_at: "2024-01-01",
  ...over,
});

function wrap(food: MealFood | null) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <EditFoodModal food={food} open onClose={vi.fn()} onUpdated={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("EditFoodModal", () => {
  it("renders nothing when food is null", () => {
    const { container } = render(wrap(null));
    expect(container).toBeEmptyDOMElement();
  });

  it("resets fields when a different food is passed", () => {
    const { rerender } = render(wrap(null));
    rerender(wrap(mk({})));
    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(100);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(5);

    rerender(wrap(mk({ id: "f2", food_name: "Egg", quantity_grams: 50, calories: 70 })));
    expect(screen.getByText("Edit Egg")).toBeInTheDocument();
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(50);
    expect(inputs[1]).toHaveValue(70);
  });

  it("hides macro fields for non-manual food", () => {
    render(wrap(mk({ is_manual: false })));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });
});
