import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL?.includes("localhost") ||
    process.env.DATABASE_URL?.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
    UNIQUE (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL,
    meal_type VARCHAR(100) NOT NULL,
    meal_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories_per_g DECIMAL(8,4) NOT NULL,
    protein_per_g DECIMAL(8,4) NOT NULL,
    carbs_per_g DECIMAL(8,4) NOT NULL,
    fat_per_g DECIMAL(8,4) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'g',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meal_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL,
    food_id UUID,
    food_name VARCHAR(255) NOT NULL,
    quantity_grams DECIMAL(8,2) NOT NULL,
    calories DECIMAL(8,2) NOT NULL,
    protein DECIMAL(8,2) NOT NULL,
    carbs DECIMAL(8,2) NOT NULL,
    fat DECIMAL(8,2) NOT NULL,
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id)
  );

  CREATE INDEX IF NOT EXISTS idx_days_user_id ON days(user_id);
  CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
  CREATE INDEX IF NOT EXISTS idx_meals_day_id ON meals(day_id);
  CREATE INDEX IF NOT EXISTS idx_foods_user_id ON foods(user_id);
  CREATE INDEX IF NOT EXISTS idx_meal_foods_meal_id ON meal_foods(meal_id);
  CREATE INDEX IF NOT EXISTS idx_meal_foods_food_id ON meal_foods(food_id);
`);

console.log("Migration complete: diet tables (days, meals, foods, meal_foods) created.");
await pool.end();
