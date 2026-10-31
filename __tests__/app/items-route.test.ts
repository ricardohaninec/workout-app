import { describe, it, expect, vi, beforeEach } from "vitest";

const run = vi.fn();
const get = vi.fn();
const query = vi.fn();
vi.mock("@/lib/db", () => ({ run: (...a: unknown[]) => run(...a), get: (...a: unknown[]) => get(...a), query: (...a: unknown[]) => query(...a) }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn().mockResolvedValue({ user: { id: "u1" } }) } } }));

import { POST } from "@/app/api/workouts/[id]/items/route";

beforeEach(() => {
  run.mockReset(); get.mockReset(); query.mockReset();
  get.mockImplementation(async (sql: string) => {
    if (sql.includes("FROM workout WHERE")) return { id: "w1" };
    if (sql.includes("FROM exercise")) return { id: "e1", title: "Squat", image_url: null };
    return { id: "item" };
  });
  query.mockResolvedValue([]);
});

describe("POST /api/workouts/[id]/items", () => {
  it("inserts sets with 6 columns/params and ignores is_drop_set", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "e1", sets: [{ reps: 5, weight: 50, rest_seconds: 45, is_drop_set: true }, { reps: 0, weight: 0 }] }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "w1" }) });
    expect(res.status).toBe(201);
    const setCalls = run.mock.calls.filter((c) => String(c[0]).includes("workout_item_set"));
    expect(setCalls).toHaveLength(2);
    const [sql, params] = setCalls[0];
    expect(sql).not.toMatch(/drop/i);
    expect(sql).toContain("($1, $2, $3, $4, $5, $6)");
    expect(params).toHaveLength(6);
    expect(params.slice(2)).toEqual([5, 50, 0, 45]);
    expect(setCalls[1][1].slice(2)).toEqual([1, 0, 1, 60]);
  });
});
