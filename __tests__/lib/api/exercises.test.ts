import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchExercises,
  createExercise,
  updateExercise,
  deleteExercise,
} from "@/lib/api/exercises";

const ok = (data: unknown) =>
  ({ ok: true, json: () => Promise.resolve(data) }) as unknown as Response;

const fail = () => ({ ok: false }) as unknown as Response;

beforeEach(() => {
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("fetchExercises", () => {
  it("calls GET /api/exercises", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok([]));
    await fetchExercises();
    expect(global.fetch).toHaveBeenCalledWith("/api/exercises");
  });

  it("returns the exercises array", async () => {
    const exercises = [
      {
        id: "1",
        title: "Bench Press",
        user_id: "u1",
        image_url: null,
        created_at: "",
        updated_at: "",
      },
    ];
    vi.mocked(global.fetch).mockResolvedValue(ok(exercises));
    const result = await fetchExercises();
    expect(result).toEqual(exercises);
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(fetchExercises()).rejects.toThrow("Failed to fetch exercises");
  });
});

describe("createExercise", () => {
  it("calls POST /api/exercises with JSON body", async () => {
    const exercise = {
      id: "1",
      title: "Squat",
      user_id: "u1",
      image_url: null,
      created_at: "",
      updated_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue(ok(exercise));

    await createExercise({ title: "Squat", image_url: null });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/exercises",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Squat", image_url: null }),
      })
    );
  });

  it("returns the created exercise", async () => {
    const exercise = {
      id: "1",
      title: "Squat",
      user_id: "u1",
      image_url: null,
      created_at: "",
      updated_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue(ok(exercise));
    const result = await createExercise({ title: "Squat", image_url: null });
    expect(result).toEqual(exercise);
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(
      createExercise({ title: "Squat", image_url: null })
    ).rejects.toThrow("Failed to create exercise");
  });
});

describe("updateExercise", () => {
  it("calls PATCH /api/exercises/:id with JSON body", async () => {
    const exercise = {
      id: "1",
      title: "Updated",
      user_id: "u1",
      image_url: null,
      created_at: "",
      updated_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue(ok(exercise));

    await updateExercise({ id: "1", title: "Updated", image_url: null });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/exercises/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "Updated", image_url: null }),
      })
    );
  });

  it("returns the updated exercise", async () => {
    const exercise = {
      id: "1",
      title: "Updated",
      user_id: "u1",
      image_url: null,
      created_at: "",
      updated_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue(ok(exercise));
    const result = await updateExercise({
      id: "1",
      title: "Updated",
      image_url: null,
    });
    expect(result).toEqual(exercise);
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(
      updateExercise({ id: "1", title: "Updated", image_url: null })
    ).rejects.toThrow("Failed to update exercise");
  });
});

describe("deleteExercise", () => {
  it("calls DELETE /api/exercises/:id", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok(undefined));
    await deleteExercise("1");
    expect(global.fetch).toHaveBeenCalledWith("/api/exercises/1", {
      method: "DELETE",
    });
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(deleteExercise("1")).rejects.toThrow(
      "Failed to delete exercise"
    );
  });
});
