import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutItemCard from "@/components/workout-item-card";
import type { WorkoutItem } from "@/lib/types";

const item = {
  id: "i1", workout_id: "w1", exercise_id: "e1", position: 0, note: null,
  created_at: "", updated_at: "",
  exercise: { id: "e1", title: "Squat", image_url: null },
  sets: [
    // legacy row from DB still carrying is_drop_set = true
    { id: "s1", workout_item_id: "i1", reps: 8, weight: 100, position: 0, rest_seconds: 60, is_drop_set: true },
    { id: "s2", workout_item_id: "i1", reps: 6, weight: 80, position: 1, rest_seconds: 90 },
  ],
} as unknown as WorkoutItem;

describe("WorkoutItemCard", () => {
  it("renders sets without any drop set indicator, even for legacy rows", () => {
    const { container } = render(<WorkoutItemCard item={item} />);
    expect(screen.getByText(/8 reps/)).toBeTruthy();
    expect(screen.getByText(/6 reps/)).toBeTruthy();
    expect(container.textContent?.toLowerCase()).not.toMatch(/drop/);
  });
});
