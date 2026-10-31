import { describe, expect, it } from "vitest";
import { extractJson, getText, requireText } from "@/lib/ai-json";

const msg = (content: { type: string; text?: string }[], stop_reason = "end_turn") => ({ content, stop_reason });

describe("ai-json", () => {
  it("reads text after a thinking block", () => {
    const m = msg([{ type: "thinking" }, { type: "text", text: '{"a":1}' }]);
    expect(JSON.parse(extractJson(requireText(m)))).toEqual({ a: 1 });
  });
  it("strips fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("slices prose-wrapped JSON", () => {
    expect(extractJson('Here: {"a":1} done')).toBe('{"a":1}');
  });
  it("errors on empty content with stop_reason", () => {
    expect(() => requireText(msg([], "end_turn"))).toThrow(/stop_reason=end_turn/);
    expect(getText(msg([]))).toBe("");
  });
  it("errors on refusal", () => {
    expect(() => requireText(msg([], "refusal"))).toThrow(/refusal/);
  });
});
