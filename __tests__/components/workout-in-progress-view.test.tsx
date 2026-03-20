import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkoutInProgressView from "@/components/workout-in-progress-view";
import type { WorkoutItem, WorkoutInProgressSet } from "@/lib/types";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/icons/placeholder-image", () => ({
  default: () => <div data-testid="placeholder-image" />,
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const workoutItems: WorkoutItem[] = [
  {
    id: "item-1",
    workout_id: "workout-1",
    exercise_id: "ex-1",
    position: 0,
    note: null,
    exercise: { id: "ex-1", title: "Bench Press", image_url: null },
    sets: [
      {
        id: "s1",
        workout_item_id: "item-1",
        reps: 10,
        weight: 80,
        position: 0,
        rest_seconds: 60,
      },
      {
        id: "s2",
        workout_item_id: "item-1",
        reps: 8,
        weight: 85,
        position: 1,
        rest_seconds: 90,
      },
    ],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const wipSets: WorkoutInProgressSet[] = [
  {
    id: "wip-1",
    workout_in_progress_id: "sess-1",
    workout_item_id: "item-1",
    reps: 10,
    weight: 80,
    position: 0,
    is_complete: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "wip-2",
    workout_in_progress_id: "sess-1",
    workout_item_id: "item-1",
    reps: 8,
    weight: 85,
    position: 1,
    is_complete: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const defaultProps = {
  workoutId: "workout-1",
  sessionId: "sess-1",
  startedAt: new Date().toISOString(),
  workoutItems,
  sets: wipSets,
};

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ sets: [] }),
  } as unknown as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
  mockPush.mockReset();
});

// ── Helper ─────────────────────────────────────────────────────────────────

function setup(props = defaultProps) {
  const user = userEvent.setup({ delay: null });
  const utils = render(<WorkoutInProgressView {...props} />);
  return { user, ...utils };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("WorkoutInProgressView — rendering", () => {
  it("shows the Session in Progress heading", () => {
    setup();
    expect(screen.getByText("Session in Progress")).toBeInTheDocument();
  });

  it("renders the exercise name", () => {
    setup();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("renders set values from wipSets when provided", () => {
    setup();
    // 2 sets: reps 10/8, weights 80/85
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("80")).toBeInTheDocument();
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();
    expect(screen.getByDisplayValue("85")).toBeInTheDocument();
  });

  it("falls back to template sets when wipSets is empty", () => {
    setup({ ...defaultProps, sets: [] });
    // Template has same values (reps 10/8, weights 80/85)
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("80")).toBeInTheDocument();
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();
    expect(screen.getByDisplayValue("85")).toBeInTheDocument();
  });

  it("renders the correct number of set inputs (2 per set)", () => {
    setup();
    // 2 sets × 2 inputs (reps + weight) = 4 spinbuttons
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
  });

  it("shows rest time for each set", () => {
    setup();
    expect(screen.getByText("60s")).toBeInTheDocument();
    expect(screen.getByText("90s")).toBeInTheDocument();
  });

  it("shows Complete Session button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /complete session/i })
    ).toBeInTheDocument();
  });

  it("shows Cancel Session button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /cancel session/i })
    ).toBeInTheDocument();
  });
});

describe("WorkoutInProgressView — adding sets", () => {
  it("adds a new set row when + Add set is clicked", async () => {
    const { user } = setup();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: /add set/i }));

    expect(screen.getAllByRole("spinbutton")).toHaveLength(6);
  });

  it("new set copies reps and weight from the last set", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /add set/i }));

    // The third set should copy reps=8 and weight=85 from the last set
    expect(screen.getAllByDisplayValue("8")).toHaveLength(2);
    expect(screen.getAllByDisplayValue("85")).toHaveLength(2);
  });

  it("clicking Add set twice creates unique positions (no duplicates)", async () => {
    const { user } = setup({ ...defaultProps, sets: [] });

    // Start with 2 template sets
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: /add set/i }));
    await user.click(screen.getByRole("button", { name: /add set/i }));

    // 4 sets total → 8 spinbuttons (no key collision / swallowed rows)
    expect(screen.getAllByRole("spinbutton")).toHaveLength(8);
  });
});

describe("WorkoutInProgressView — removing sets", () => {
  it("shows remove (✕) button when there are multiple sets", () => {
    setup();
    // With 2 sets, each shows a ✕ button
    expect(screen.getAllByText("✕")).toHaveLength(2);
  });

  it("does not show remove button when there is only one set", () => {
    const singleSet: WorkoutInProgressSet[] = [wipSets[0]];
    setup({ ...defaultProps, sets: singleSet });
    expect(screen.queryByText("✕")).not.toBeInTheDocument();
  });

  it("clicking ✕ opens the Remove Set confirmation modal", async () => {
    const { user } = setup();
    await user.click(screen.getAllByText("✕")[0]);
    expect(await screen.findByText("Remove Set")).toBeInTheDocument();
  });

  it("confirming remove reduces set count by one", async () => {
    const { user } = setup();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);

    await user.click(screen.getAllByText("✕")[0]);
    await user.click(await screen.findByRole("button", { name: /^remove$/i }));

    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });
});

describe("WorkoutInProgressView — completing a set", () => {
  it("checking a set checkbox changes its label to Mark set incomplete", async () => {
    const { user } = setup();

    const checkboxes = screen.getAllByRole("checkbox", {
      name: /mark set complete/i,
    });
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(
        screen.getAllByRole("checkbox", { name: /mark set incomplete/i })
      ).toHaveLength(1);
    });
  });
});

describe("WorkoutInProgressView — completing the session", () => {
  it("calls PATCH with isActive:false when Complete Session is clicked", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /complete session/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/workouts/workout-1/sessions/sess-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"isActive":false'),
        })
      );
    });
  });

  it("includes the current sets in the complete-session payload", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /complete session/i }));

    await waitFor(() => {
      const call = vi.mocked(global.fetch).mock.calls.find(
        ([, opts]) =>
          typeof opts === "object" &&
          opts !== null &&
          "body" in opts &&
          typeof opts.body === "string" &&
          opts.body.includes('"isActive":false')
      );
      expect(call).toBeDefined();
      const body = JSON.parse(call![1]!.body as string);
      expect(body.sets).toBeDefined();
      expect(Array.isArray(body.sets)).toBe(true);
    });
  });

  it("navigates to /dashboard after completing the session", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /complete session/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});

describe("WorkoutInProgressView — cancel session", () => {
  it("clicking Cancel Session opens the confirmation modal", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /cancel session/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("cancelling the modal does not delete the session", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /cancel session/i }));
    await user.click(await screen.findByRole("button", { name: /keep going/i }));

    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("confirming cancel calls DELETE and redirects", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /cancel session/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(
      screen.getAllByRole("button", { name: /cancel session/i }).find(
        (b) => b.closest("[role=dialog]") !== null
      )!
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/workouts/workout-1/sessions/sess-1",
        { method: "DELETE" }
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/workout/workout-1");
    });

    // suppress unused variable warning
    void dialog;
  });

  it("auto-saves debounced changes when sets are modified", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = setup();

    const repsInput = screen.getByDisplayValue("10");
    await user.clear(repsInput);
    await user.type(repsInput, "12");

    // Advance past the 800ms debounce
    vi.advanceTimersByTime(900);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/workouts/workout-1/sessions/sess-1",
        expect.objectContaining({ method: "PATCH" })
      );
    });

    vi.useRealTimers();
  });
});
