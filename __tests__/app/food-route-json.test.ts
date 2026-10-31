import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const { FakeAPIError } = vi.hoisted(() => ({
  FakeAPIError: class extends Error {
    status: number;
    constructor(status: number) {
      super(`api error ${status}`);
      this.status = status;
    }
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    static APIError = FakeAPIError;
    messages = { create: (...a: unknown[]) => create(...a) };
  },
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn().mockResolvedValue({ user: { id: "u1" } }) } } }));
vi.mock("@/lib/db", () => ({ get: vi.fn().mockResolvedValue(undefined) }));

import { POST } from "@/app/api/ai/food/route";

const food = { name: "Egg", calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1, fat_per_100g: 11 };
const msg = (content: { type: string; text?: string }[], stop_reason = "end_turn") => ({ content, stop_reason });
const post = (body: unknown) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  create.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/ai/food text lookup JSON handling", () => {
  it("parses text after a thinking block", async () => {
    create.mockResolvedValue(msg([{ type: "thinking" }, { type: "text", text: JSON.stringify(food) }]));
    const res = await post({ query: "egg" });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Egg");
  });
  it("parses fenced and prose-wrapped JSON", async () => {
    create.mockResolvedValue(msg([{ type: "text", text: "Sure:\n```json\n" + JSON.stringify(food) + "\n```\nDone" }]));
    expect((await post({ query: "egg" })).status).toBe(200);
  });
  it("empty content returns 502 Invalid AI response", async () => {
    create.mockResolvedValue(msg([]));
    const res = await post({ query: "egg" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("Invalid AI response");
  });
  it("refusal returns 502", async () => {
    create.mockResolvedValue(msg([], "refusal"));
    expect((await post({ query: "egg" })).status).toBe(502);
  });
  it("non-JSON text returns 502", async () => {
    create.mockResolvedValue(msg([{ type: "text", text: "no json" }]));
    expect((await post({ query: "egg" })).status).toBe(502);
  });
});

describe("POST /api/ai/food photo pipeline JSON handling", () => {
  const t = (o: unknown) => msg([{ type: "thinking" }, { type: "text", text: JSON.stringify(o) }]);
  it("works when every response has a leading thinking block", async () => {
    create.mockImplementation(async (a: { system: string }) => {
      if (a.system.includes("Agent 1")) return t({ items: [{ name: "Rice", location_hint: "left" }] });
      if (a.system.includes("Agent 2"))
        return t({ preparation: "x", calories_per_100g: 1, protein_per_100g: 1, carbs_per_100g: 1, fat_per_100g: 1 });
      return t({ estimated_grams: 100, reference_used: "plate" });
    });
    const res = await post({ image: "AAAA" });
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(1);
  });
  it("empty detect response yields 502 and logs stop_reason", async () => {
    create.mockResolvedValue(msg([], "end_turn"));
    const res = await post({ image: "AAAA" });
    expect(res.status).toBe(502);
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).toContain("stop_reason=end_turn");
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain("Unexpected end of JSON");
  });
});
