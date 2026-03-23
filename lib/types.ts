export type Workout = {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  is_public: boolean;
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
  rest_seconds: number;
};

export type WorkoutItem = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  note: string | null;
  exercise: { id: string; title: string; image_url: string | null };
  sets: WorkoutItemSet[];
  created_at: string;
  updated_at: string;
};

export type WorkoutInProgress = {
  id: string;
  workout_id: string;
  user_id: string;
  is_active: boolean;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutInProgressSet = {
  id: string;
  workout_in_progress_id: string;
  workout_item_id: string;
  reps: number;
  weight: number;
  position: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type Day = {
  id: string;
  user_id: string;
  date: string;
  notes: string | null;
  total_calories: number;
  meal_count: number;
  created_at: string;
  updated_at: string;
};

export type Meal = {
  id: string;
  day_id: string;
  meal_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Food = {
  id: string;
  user_id: string;
  name: string;
  calories_per_g: number;
  protein_per_g: number;
  carbs_per_g: number;
  fat_per_g: number;
  unit: string;
  created_at: string;
  updated_at: string;
};

export type ProposedFood = {
  name: string;
  query: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

export type MealFood = {
  id: string;
  meal_id: string;
  food_id: string | null;
  food_name: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_manual: boolean;
  created_at: string;
};

export type ProposedExercise = {
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  note: string | null;
  image_url: string | null;
};

export type ProposedWorkout = {
  title: string;
  goal: string;
  exercises: ProposedExercise[];
};

export type PendingWorkoutItem = {
  tempId: string;
  exerciseTitle: string;
  exerciseImageUrl: string | null;
  sets: { reps: number; weight: number; rest_seconds: number }[];
  note: string | null;
} & (
  | { type: "new" }
  | { type: "existing"; exerciseId: string }
);
