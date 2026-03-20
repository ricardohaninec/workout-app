import { describe, it, expect } from "vitest";
import {
  exerciseKeys,
  foodKeys,
  workoutKeys,
  sessionKeys,
} from "@/lib/queryKeys";

describe("exerciseKeys", () => {
  it("all returns the correct static key", () => {
    expect(exerciseKeys.all).toEqual(["exercises"]);
  });
});

describe("foodKeys", () => {
  it("all returns the correct static key", () => {
    expect(foodKeys.all).toEqual(["foods"]);
  });

  it("list returns key scoped by search term", () => {
    expect(foodKeys.list("chicken")).toEqual(["foods", "list", "chicken"]);
  });

  it("list with empty string returns key with empty search", () => {
    expect(foodKeys.list("")).toEqual(["foods", "list", ""]);
  });

  it("list keys are unique per search term", () => {
    expect(foodKeys.list("egg")).not.toEqual(foodKeys.list("chicken"));
  });
});

describe("workoutKeys", () => {
  it("all returns the correct static key", () => {
    expect(workoutKeys.all).toEqual(["workouts"]);
  });
});

describe("sessionKeys", () => {
  it("all returns the correct static key", () => {
    expect(sessionKeys.all).toEqual(["sessions"]);
  });

  it("detail returns key scoped by session id", () => {
    expect(sessionKeys.detail("abc-123")).toEqual([
      "sessions",
      "detail",
      "abc-123",
    ]);
  });

  it("detail keys are unique per id", () => {
    expect(sessionKeys.detail("id-1")).not.toEqual(sessionKeys.detail("id-2"));
  });
});
