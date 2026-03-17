export const exerciseKeys = {
  all: ["exercises"] as const,
};

export const foodKeys = {
  all: ["foods"] as const,
  list: (search: string) => ["foods", "list", search] as const,
};

export const workoutKeys = {
  all: ["workouts"] as const,
};

export const sessionKeys = {
  all: ["sessions"] as const,
  detail: (id: string) => ["sessions", "detail", id] as const,
};
