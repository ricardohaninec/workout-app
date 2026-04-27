import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkoutList from "@/components/workout-list";
import type { Workout } from "@/lib/types";

// Mock complex child components that have their own async dependencies
vi.mock("@/components/create-workout-button", () => ({
  default: () => <button>Create Workout</button>,
}));

vi.mock("@/components/start-workout-button", () => ({
  default: ({
    workoutId,
    hasActiveSession,
  }: {
    workoutId: string;
    hasActiveSession: boolean;
  }) => (
    <button data-testid={`start-${workoutId}`}>
      {hasActiveSession ? "Continue Session" : "Start Workout"}
    </button>
  ),
}));

vi.mock("@/components/icons/placeholder-image", () => ({
  default: () => <div data-testid="placeholder-image" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const makeWorkout = (overrides: Partial<Workout> = {}): Workout => ({
  id: "workout-1",
  user_id: "user-1",
  title: "Push Day",
  image_url: null,
  is_public: false,
  public_slug: null,
  is_archived: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

beforeEach(() => {
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("WorkoutList", () => {
  it('shows "No workouts yet" when the list is empty', () => {
    render(<WorkoutList workouts={[]} />);
    expect(
      screen.getByText(/no workouts yet/i)
    ).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<WorkoutList workouts={[]} />);
    expect(screen.getByRole("heading", { name: /my workouts/i })).toBeInTheDocument();
  });

  it("renders each workout title", () => {
    const workouts = [
      makeWorkout({ id: "w1", title: "Push Day" }),
      makeWorkout({ id: "w2", title: "Pull Day" }),
    ];
    render(<WorkoutList workouts={workouts} />);

    expect(screen.getByText("Push Day")).toBeInTheDocument();
    expect(screen.getByText("Pull Day")).toBeInTheDocument();
  });

  it('shows a "Public" badge for public workouts', () => {
    const workout = makeWorkout({ is_public: true });
    render(<WorkoutList workouts={[workout]} />);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("does not show Public badge for private workouts", () => {
    render(<WorkoutList workouts={[makeWorkout({ is_public: false })]} />);
    expect(screen.queryByText("Public")).not.toBeInTheDocument();
  });

  it("entering Select mode shows Cancel button", async () => {
    const user = userEvent.setup();
    render(<WorkoutList workouts={[makeWorkout()]} />);

    await user.click(screen.getByRole("button", { name: /^select$/i }));

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("Cancel button exits Select mode", async () => {
    const user = userEvent.setup();
    render(<WorkoutList workouts={[makeWorkout()]} />);

    await user.click(screen.getByRole("button", { name: /^select$/i }));
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    // Back to normal — Create Workout button visible again
    expect(screen.getByRole("button", { name: /create workout/i })).toBeInTheDocument();
  });

  it("Select all selects every workout", async () => {
    const user = userEvent.setup();
    const workouts = [
      makeWorkout({ id: "w1", title: "Push Day" }),
      makeWorkout({ id: "w2", title: "Pull Day" }),
    ];
    render(<WorkoutList workouts={workouts} />);

    await user.click(screen.getByRole("button", { name: /^select$/i }));
    await user.click(screen.getByRole("button", { name: /select all/i }));

    // All checkboxes should be checked
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => expect(cb).toBeChecked());
  });

  it("Deselect all deselects every workout after selecting all", async () => {
    const user = userEvent.setup();
    const workouts = [
      makeWorkout({ id: "w1", title: "Push Day" }),
      makeWorkout({ id: "w2", title: "Pull Day" }),
    ];
    render(<WorkoutList workouts={workouts} />);

    await user.click(screen.getByRole("button", { name: /^select$/i }));
    await user.click(screen.getByRole("button", { name: /select all/i }));
    await user.click(screen.getByRole("button", { name: /deselect all/i }));

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
  });

  it("shows Delete button after selecting a workout", async () => {
    const user = userEvent.setup();
    render(<WorkoutList workouts={[makeWorkout()]} />);

    await user.click(screen.getByRole("button", { name: /^select$/i }));

    // Select via checkbox
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(screen.getByRole("button", { name: /delete 1/i })).toBeInTheDocument();
  });

  it("opens confirmation modal when Delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<WorkoutList workouts={[makeWorkout()]} />);

    await user.click(screen.getByRole("button", { name: /^select$/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /delete 1/i }));

    expect(
      await screen.findByText(/are you sure you want to delete/i)
    ).toBeInTheDocument();
  });

  it("calls DELETE API and removes workout after confirming bulk delete", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
    } as unknown as Response);

    render(<WorkoutList workouts={[makeWorkout()]} />);

    await user.click(screen.getByRole("button", { name: /^select$/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /delete 1/i }));

    // Confirm inside the dialog
    const dialog = await screen.findByRole("dialog");
    const confirmBtn = within(dialog).getAllByRole("button").find(
      (b) => b.textContent?.includes("Delete")
    )!;
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/workouts/workout-1", {
        method: "DELETE",
      });
    });

    expect(screen.queryByText("Push Day")).not.toBeInTheDocument();
  });

  it("shows Continue Session button for active workouts", () => {
    const workout = makeWorkout({ id: "w1" });
    render(<WorkoutList workouts={[workout]} activeWorkoutIds={["w1"]} />);
    expect(screen.getByTestId("start-w1")).toHaveTextContent("Continue Session");
  });

  it("shows Start Workout button for inactive workouts", () => {
    const workout = makeWorkout({ id: "w1" });
    render(<WorkoutList workouts={[workout]} activeWorkoutIds={[]} />);
    expect(screen.getByTestId("start-w1")).toHaveTextContent("Start Workout");
  });
});
