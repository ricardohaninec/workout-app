export type Workout = {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutItemSet = {
  id: string;
  workout_item_id: string;
  reps: number;
  weight: number;
  position: number;
};

export type WorkoutItem = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  exercise: { id: string; title: string; image_url: string | null };
  sets: WorkoutItemSet[];
  created_at: string;
  updated_at: string;
};

export type PendingWorkoutItem = {
  tempId: string;
  exerciseTitle: string;
  exerciseImageUrl: string | null;
  sets: { reps: number; weight: number }[];
} & (
  | { type: "new" }
  | { type: "existing"; exerciseId: string }
);
