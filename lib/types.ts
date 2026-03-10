export type Workout = {
  id: string;
  user_id: string;
  title: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseSet = {
  id: string;
  exercise_id: string;
  sets: number;
  weight: number;
  position: number;
};

export type Exercise = {
  id: string;
  user_id: string;
  title: string;
  setGroups: ExerciseSet[];
  created_at: string;
  updated_at: string;
};

export type PendingExercise =
  | { type: "new"; tempId: string; title: string; setGroups: { sets: number; weight: number }[] }
  | { type: "existing"; tempId: string; exerciseId: string; title: string; setGroups: ExerciseSet[] };
