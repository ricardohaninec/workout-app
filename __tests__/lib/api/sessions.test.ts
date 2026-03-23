import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSessionDetail, deleteSession } from "@/lib/api/sessions";

const ok = (data: unknown) =>
  ({ ok: true, json: () => Promise.resolve(data) }) as unknown as Response;

const fail = () => ({ ok: false }) as unknown as Response;

beforeEach(() => {
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("fetchSessionDetail", () => {
  it("calls GET /api/sessions/:id", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok({ id: "s1" }));
    await fetchSessionDetail("s1");
    expect(global.fetch).toHaveBeenCalledWith("/api/sessions/s1");
  });

  it("returns the session detail", async () => {
    const session = { id: "s1", workout_id: "w1", sets: [] };
    vi.mocked(global.fetch).mockResolvedValue(ok(session));
    const result = await fetchSessionDetail("s1");
    expect(result).toEqual(session);
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(fetchSessionDetail("s1")).rejects.toThrow(
      "Failed to fetch session"
    );
  });
});

describe("deleteSession", () => {
  it("calls DELETE on the correct URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue(ok(undefined));
    await deleteSession({ workoutId: "w1", sessionId: "s1" });
    expect(global.fetch).toHaveBeenCalledWith("/api/workouts/w1/sessions/s1", {
      method: "DELETE",
    });
  });

  it("throws when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue(fail());
    await expect(
      deleteSession({ workoutId: "w1", sessionId: "s1" })
    ).rejects.toThrow("Failed to delete session");
  });
});
