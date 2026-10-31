import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutEditor from "@/components/workout-editor";
import type { WorkoutItem } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/add-workout-item-modal", () => ({ default: () => null }));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

const item = (id: string, title: string): WorkoutItem => ({
  id,
  workout_id: "w1",
  exercise_id: `e-${id}`,
  position: 0,
  note: null,
  exercise: { id: `e-${id}`, title, image_url: null },
  sets: [],
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
});

const base = {
  workoutId: "w1",
  initialTitle: "Push",
  initialImageUrl: null,
  initialIsPublic: false,
  initialSlug: null,
};

describe("WorkoutEditor", () => {
  it("renders initial saved items", () => {
    render(<WorkoutEditor {...base} savedItems={[item("1", "Bench Press")]} />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("re-syncs items when savedItems prop changes", () => {
    const { rerender } = render(<WorkoutEditor {...base} savedItems={[item("1", "Bench Press")]} />);
    rerender(<WorkoutEditor {...base} savedItems={[item("2", "Squat")]} />);
    expect(screen.getByText("Squat")).toBeInTheDocument();
    expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
  });

  it("shows full public link using window origin", () => {
    render(<WorkoutEditor {...base} initialIsPublic initialSlug="abc" savedItems={[]} />);
    expect(screen.getByText(`${window.location.origin}/p/abc`)).toBeInTheDocument();
  });
});
