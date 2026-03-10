export type Workout = {
  id: string;
  user_id: string;
  title: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  title: string;
  sets: number;
  weights: number;
  created_at: string;
  updated_at: string;
};
