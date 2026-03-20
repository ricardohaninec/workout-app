import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false && "bar", undefined, null)).toBe("foo");
  });

  it("includes truthy conditional classes", () => {
    expect(cn("foo", true && "bar")).toBe("foo bar");
  });

  it("resolves conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles array of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles nested arrays", () => {
    expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
  });

  it("handles objects", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("merges responsive variants without conflict", () => {
    const result = cn("sm:p-2", "md:p-4");
    expect(result).toBe("sm:p-2 md:p-4");
  });
});
