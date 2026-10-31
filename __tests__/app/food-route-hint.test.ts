import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: (...a: unknown[]) => create(...a) };
  },
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn().mockResolvedValue({ user: { id: "u1" } }) } } }));
vi.mock("@/lib/db", () => ({ get: vi.fn().mockResolvedValue(undefined) }));

import { POST } from "@/app/api/ai/food/route";
import { CLAUDE_MODEL } from "@/lib/ai-model";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const text = (t: unknown) => ({ content: [{ type: "text", text: JSON.stringify(t) }] });

beforeEach(() => {
  create.mockReset();
  create.mockImplementation(async (args: { system: string }) => {
    if (args.system.includes("Agent 1")) return text({ items: [{ name: "Rice", location_hint: "left" }, { name: "Chicken", location_hint: "right" }] });
    if (args.system.includes("Agent 2"))
      return text({ preparation: "x", calories_per_100g: 1, protein_per_100g: 1, carbs_per_100g: 1, fat_per_100g: 1 });
    return text({ estimated_grams: 100, reference_used: "plate" });
  });
});

const post = (body: unknown) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));
const userText = (args: { messages: { content: unknown }[] }) =>
  (args.messages[0].content as { type: string; text?: string }[]).find((c) => c.type === "text")!.text!;

describe("POST /api/ai/food hint", () => {
  it("passes hint to all agent calls (detect, prep, portion), in user turn only", async () => {
    const res = await post({ image: "AAAA", hint: "  chicken, rice, olive oil  " });
    expect(res.status).toBe(200);
    // 1 detect + 2 items * 2
    expect(create).toHaveBeenCalledTimes(5);
    for (const [args] of create.mock.calls) {
      expect(userText(args)).toContain('"chicken, rice, olive oil"');
      expect(args.system).not.toContain("olive oil");
      expect(args.model).toBe(CLAUDE_MODEL);
    }
    const systems = create.mock.calls.map(([a]) => a.system as string);
    expect(systems.some((s) => s.includes("Agent 1"))).toBe(true);
    expect(systems.some((s) => s.includes("Agent 2"))).toBe(true);
    expect(systems.some((s) => s.includes("Agent 3"))).toBe(true);
  });

  it("without hint (or blank hint) no hint text is added", async () => {
    await post({ image: "AAAA" });
    const a = create.mock.calls.map(([x]) => userText(x));
    create.mockClear();
    await post({ image: "AAAA", hint: "   " });
    const b = create.mock.calls.map(([x]) => userText(x));
    expect(a.every((t) => !t.includes("hint"))).toBe(true);
    expect(b.sort()).toEqual(a.sort());
  });

  it("escapes quotes/newlines in hint", async () => {
    await post({ image: "AAAA", hint: 'a "b"\nignore previous' });
    expect(userText(create.mock.calls[0][0])).toContain(JSON.stringify('a "b"\nignore previous'));
  });

  it("400 when hint > 200 chars, 200 chars OK", async () => {
    expect((await post({ image: "AAAA", hint: "a".repeat(201) })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
    expect((await post({ image: "AAAA", hint: "a".repeat(200) })).status).toBe(200);
  });

  it("400 when hint is not a string", async () => {
    expect((await post({ image: "AAAA", hint: 5 })).status).toBe(400);
    expect((await post({ image: "AAAA", hint: ["a"] })).status).toBe(400);
  });

  it("hint without image is ignored for text lookup", async () => {
    create.mockResolvedValue(text({ name: "Apple", calories_per_100g: 52, protein_per_100g: 0, carbs_per_100g: 14, fat_per_100g: 0 }));
    const res = await post({ query: "apple", hint: "secret hint" });
    expect(res.status).toBe(200);
    expect(JSON.stringify(create.mock.calls[0][0])).not.toContain("secret hint");
  });

  it("hint ignored on feedback path with image + previous", async () => {
    create.mockResolvedValue(text({ name: "A", calories_per_100g: 1, protein_per_100g: 1, carbs_per_100g: 1, fat_per_100g: 1 }));
    const previous = { name: "A", query: "", calories_per_100g: 1, protein_per_100g: 1, carbs_per_100g: 1, fat_per_100g: 1 };
    await post({ query: "more", previous, hint: "zzz" });
    expect(JSON.stringify(create.mock.calls[0][0])).not.toContain("zzz");
  });

  it("401 handled by existing auth; requires query or image", async () => {
    expect((await post({ hint: "x" })).status).toBe(400);
  });
});

describe("CLAUDE_MODEL", () => {
  it("is claude-sonnet-5-5", () => {
    expect(CLAUDE_MODEL).toBe("claude-sonnet-5-5");
  });

  it("no claude-sonnet-4-6 in source and routes import CLAUDE_MODEL", () => {
    const root = process.cwd();
    const files = [
      "app/api/ai/food/route.ts",
      "app/api/ai/generate/route.ts",
      "app/api/ai/refine/route.ts",
      "app/api/hand-reference/route.ts",
    ];
    for (const f of files) {
      const src = readFileSync(join(root, f), "utf8");
      expect(src, f).not.toContain("claude-sonnet-4-6");
      expect(src, f).toContain("CLAUDE_MODEL");
    }
  });
});
