/**
 * Seed script — populates the DB with mock data for local development.
 * Usage: DATABASE_URL=postgresql://postgres:postgres@localhost:5433/workout bun scripts/seed.ts
 *
 * Creates:
 *  - 1 user (password: "password")
 *  - 12 exercises
 *  - 4 workouts with items + sets
 *  - 2 completed workout sessions with sets
 *  - 10 foods + 3 days of diet data (days, meals, meal_foods)
 */

import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

// --- IDs ---------------------------------------------------------------

const USER_ID = "seed-user-001";

const EXERCISE_IDS = {
  benchPress:       "ex-bench-press",
  inclineBench:     "ex-incline-bench",
  cableFly:         "ex-cable-fly",
  squat:            "ex-squat",
  legPress:         "ex-leg-press",
  romanianDl:       "ex-romanian-dl",
  pullUp:           "ex-pull-up",
  bentOverRow:      "ex-bent-over-row",
  latPulldown:      "ex-lat-pulldown",
  overheadPress:    "ex-overhead-press",
  lateralRaise:     "ex-lateral-raise",
  tricepPushdown:   "ex-tricep-pushdown",
};

const WORKOUT_IDS = {
  push:  "wk-push-day",
  pull:  "wk-pull-day",
  legs:  "wk-leg-day",
  upper: "wk-upper-body",
};

// --- Helpers -----------------------------------------------------------

function uuid() {
  return crypto.randomUUID();
}

// Hashed at seed time using better-auth's own scrypt implementation
const PASSWORD_HASH = await hashPassword("password");

// --- Seed --------------------------------------------------------------

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ── User ────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, TRUE, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [USER_ID, "Dev User", "dev@example.com"]);

    // better-auth account row (credential provider)
    await client.query(`
      INSERT INTO account (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'credential', $4, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [uuid(), USER_ID, USER_ID, PASSWORD_HASH]);

    // ── Exercises ───────────────────────────────────────────────────────
    const exercises = [
      [EXERCISE_IDS.benchPress,     "Bench Press"],
      [EXERCISE_IDS.inclineBench,   "Incline Bench Press"],
      [EXERCISE_IDS.cableFly,       "Cable Fly"],
      [EXERCISE_IDS.squat,          "Squat"],
      [EXERCISE_IDS.legPress,       "Leg Press"],
      [EXERCISE_IDS.romanianDl,     "Romanian Deadlift"],
      [EXERCISE_IDS.pullUp,         "Pull-Up"],
      [EXERCISE_IDS.bentOverRow,    "Bent-Over Row"],
      [EXERCISE_IDS.latPulldown,    "Lat Pulldown"],
      [EXERCISE_IDS.overheadPress,  "Overhead Press"],
      [EXERCISE_IDS.lateralRaise,   "Lateral Raise"],
      [EXERCISE_IDS.tricepPushdown, "Tricep Pushdown"],
    ];

    for (const [id, title] of exercises) {
      await client.query(`
        INSERT INTO exercise (id, user_id, title, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [id, USER_ID, title]);
    }

    // ── Workouts ────────────────────────────────────────────────────────
    const workouts = [
      [WORKOUT_IDS.push,  "Push Day",   false, null],
      [WORKOUT_IDS.pull,  "Pull Day",   false, null],
      [WORKOUT_IDS.legs,  "Leg Day",    true,  "leg-day-public-slug"],
      [WORKOUT_IDS.upper, "Upper Body", false, null],
    ];

    for (const [id, title, isPublic, slug] of workouts) {
      await client.query(`
        INSERT INTO workout (id, user_id, title, is_public, public_slug, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [id, USER_ID, title, isPublic, slug]);
    }

    // ── Workout Items + Sets ─────────────────────────────────────────────
    // Helper: insert a workout_item and its sets
    async function addItem(
      workoutId: string,
      exerciseId: string,
      position: number,
      sets: Array<{ reps: number; weight: number }>,
      note?: string,
    ) {
      const itemId = uuid();
      await client.query(`
        INSERT INTO workout_item (id, workout_id, exercise_id, position, note, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [itemId, workoutId, exerciseId, position, note ?? null]);

      for (let i = 0; i < sets.length; i++) {
        await client.query(`
          INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position)
          VALUES ($1, $2, $3, $4, $5)
        `, [uuid(), itemId, sets[i].reps, sets[i].weight, i]);
      }

      return itemId;
    }

    // Push Day
    const pushItems: Record<string, string> = {};
    pushItems.bench    = await addItem(WORKOUT_IDS.push, EXERCISE_IDS.benchPress,     0, [{ reps: 10, weight: 80 }, { reps: 8, weight: 85 }, { reps: 6, weight: 90 }]);
    pushItems.incline  = await addItem(WORKOUT_IDS.push, EXERCISE_IDS.inclineBench,   1, [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }, { reps: 8, weight: 65 }]);
    pushItems.fly      = await addItem(WORKOUT_IDS.push, EXERCISE_IDS.cableFly,       2, [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }]);
    pushItems.ohp      = await addItem(WORKOUT_IDS.push, EXERCISE_IDS.overheadPress,  3, [{ reps: 10, weight: 50 }, { reps: 8, weight: 55 }, { reps: 6, weight: 60 }]);
    pushItems.lateral  = await addItem(WORKOUT_IDS.push, EXERCISE_IDS.lateralRaise,   4, [{ reps: 15, weight: 10 }, { reps: 15, weight: 10 }, { reps: 12, weight: 12 }]);
    pushItems.tricep   = await addItem(WORKOUT_IDS.push, EXERCISE_IDS.tricepPushdown, 5, [{ reps: 12, weight: 30 }, { reps: 12, weight: 30 }], "Keep elbows tucked");

    // Pull Day
    const pullItems: Record<string, string> = {};
    pullItems.pullup   = await addItem(WORKOUT_IDS.pull, EXERCISE_IDS.pullUp,       0, [{ reps: 8, weight: 0 }, { reps: 7, weight: 0 }, { reps: 6, weight: 0 }]);
    pullItems.row      = await addItem(WORKOUT_IDS.pull, EXERCISE_IDS.bentOverRow,  1, [{ reps: 10, weight: 70 }, { reps: 8, weight: 75 }, { reps: 8, weight: 75 }]);
    pullItems.lat      = await addItem(WORKOUT_IDS.pull, EXERCISE_IDS.latPulldown,  2, [{ reps: 12, weight: 55 }, { reps: 10, weight: 60 }, { reps: 10, weight: 60 }]);

    // Leg Day
    const legItems: Record<string, string> = {};
    legItems.squat     = await addItem(WORKOUT_IDS.legs, EXERCISE_IDS.squat,      0, [{ reps: 8, weight: 100 }, { reps: 8, weight: 105 }, { reps: 6, weight: 110 }], "Warm up with 2 sets at 60kg");
    legItems.legPress  = await addItem(WORKOUT_IDS.legs, EXERCISE_IDS.legPress,   1, [{ reps: 12, weight: 150 }, { reps: 12, weight: 160 }, { reps: 10, weight: 170 }]);
    legItems.rdl       = await addItem(WORKOUT_IDS.legs, EXERCISE_IDS.romanianDl, 2, [{ reps: 10, weight: 80 }, { reps: 10, weight: 80 }, { reps: 8, weight: 85 }]);

    // Upper Body
    await addItem(WORKOUT_IDS.upper, EXERCISE_IDS.benchPress,    0, [{ reps: 10, weight: 75 }, { reps: 8, weight: 80 }]);
    await addItem(WORKOUT_IDS.upper, EXERCISE_IDS.bentOverRow,   1, [{ reps: 10, weight: 65 }, { reps: 8, weight: 70 }]);
    await addItem(WORKOUT_IDS.upper, EXERCISE_IDS.overheadPress, 2, [{ reps: 10, weight: 45 }, { reps: 8, weight: 50 }]);
    await addItem(WORKOUT_IDS.upper, EXERCISE_IDS.latPulldown,   3, [{ reps: 12, weight: 50 }, { reps: 10, weight: 55 }]);

    // ── Completed Sessions ───────────────────────────────────────────────
    async function addCompletedSession(
      workoutId: string,
      items: Record<string, string>,
      startedHoursAgo: number,
      durationSeconds: number,
      setsData: Array<{ itemKey: string; reps: number; weight: number; position: number }>,
    ) {
      const sessionId = uuid();
      const startedAt = new Date(Date.now() - startedHoursAgo * 3600 * 1000);
      const completedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

      await client.query(`
        INSERT INTO workout_in_progress
          (id, workout_id, user_id, is_active, started_at, completed_at, duration_seconds, created_at, updated_at)
        VALUES ($1, $2, $3, FALSE, $4, $5, $6, NOW(), NOW())
      `, [sessionId, workoutId, USER_ID, startedAt.toISOString(), completedAt.toISOString(), durationSeconds]);

      for (const s of setsData) {
        await client.query(`
          INSERT INTO workout_in_progress_set
            (id, workout_in_progress_id, workout_item_id, reps, weight, position, is_complete, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
        `, [uuid(), sessionId, items[s.itemKey], s.reps, s.weight, s.position]);
      }
    }

    // Push Day — session 3 days ago
    await addCompletedSession(WORKOUT_IDS.push, pushItems, 72, 3480, [
      { itemKey: "bench",   reps: 10, weight: 80,  position: 0 },
      { itemKey: "bench",   reps: 8,  weight: 85,  position: 1 },
      { itemKey: "bench",   reps: 6,  weight: 90,  position: 2 },
      { itemKey: "incline", reps: 10, weight: 60,  position: 0 },
      { itemKey: "incline", reps: 9,  weight: 60,  position: 1 },
      { itemKey: "ohp",     reps: 10, weight: 50,  position: 0 },
      { itemKey: "ohp",     reps: 8,  weight: 52.5, position: 1 },
      { itemKey: "tricep",  reps: 12, weight: 30,  position: 0 },
      { itemKey: "tricep",  reps: 11, weight: 30,  position: 1 },
    ]);

    // Leg Day — session 1 day ago
    await addCompletedSession(WORKOUT_IDS.legs, legItems, 24, 4200, [
      { itemKey: "squat",    reps: 8,  weight: 100, position: 0 },
      { itemKey: "squat",    reps: 8,  weight: 105, position: 1 },
      { itemKey: "squat",    reps: 6,  weight: 110, position: 2 },
      { itemKey: "legPress", reps: 12, weight: 150, position: 0 },
      { itemKey: "legPress", reps: 12, weight: 160, position: 1 },
      { itemKey: "rdl",      reps: 10, weight: 80,  position: 0 },
      { itemKey: "rdl",      reps: 10, weight: 80,  position: 1 },
    ]);

    // ── Foods ────────────────────────────────────────────────────────────
    // [name, calories_per_g, protein_per_g, carbs_per_g, fat_per_g, unit]
    const foods = [
      ["Chicken Breast",  1.65, 0.310, 0.000, 0.036, "g"],
      ["White Rice",      1.30, 0.027, 0.280, 0.003, "g"],
      ["Whole Eggs",      1.43, 0.126, 0.008, 0.099, "g"],
      ["Oats",            3.89, 0.170, 0.660, 0.070, "g"],
      ["Banana",          0.89, 0.011, 0.230, 0.003, "g"],
      ["Whey Protein",    4.00, 0.750, 0.070, 0.035, "g"],
      ["Greek Yogurt",    0.59, 0.100, 0.036, 0.000, "g"],
      ["Broccoli",        0.34, 0.028, 0.066, 0.004, "g"],
      ["Sweet Potato",    0.86, 0.016, 0.200, 0.001, "g"],
      ["Almonds",         5.79, 0.210, 0.220, 0.490, "g"],
    ];

    const foodIds: Record<string, string> = {};
    const foodNames = ["chickenBreast","whiteRice","eggs","oats","banana","wheyProtein","greekYogurt","broccoli","sweetPotato","almonds"];

    for (let i = 0; i < foods.length; i++) {
      const id = uuid();
      foodIds[foodNames[i]] = id;
      const [name, cal, prot, carbs, fat, unit] = foods[i];
      await client.query(`
        INSERT INTO foods (id, user_id, name, calories_per_g, protein_per_g, carbs_per_g, fat_per_g, unit, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [id, USER_ID, name, cal, prot, carbs, fat, unit]);
    }

    // ── Days + Meals + Meal Foods ────────────────────────────────────────
    // Helper: compute macros for a food entry
    function macros(foodKey: string, grams: number) {
      const idx = foodNames.indexOf(foodKey);
      const row = foods[idx];
      const [cal, prot, carbs, fat] = [row[1], row[2], row[3], row[4]] as number[];
      return {
        calories: +(cal  * grams).toFixed(2),
        protein:  +(prot * grams).toFixed(2),
        carbs:    +(carbs * grams).toFixed(2),
        fat:      +(fat  * grams).toFixed(2),
      };
    }

    async function addMealFood(mealId: string, foodKey: string, grams: number) {
      const m = macros(foodKey, grams);
      await client.query(`
        INSERT INTO meal_foods (id, meal_id, food_id, food_name, quantity_grams, calories, protein, carbs, fat, is_manual, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW())
      `, [uuid(), mealId, foodIds[foodKey], foods[foodNames.indexOf(foodKey)][0], grams, m.calories, m.protein, m.carbs, m.fat]);
    }

    async function addDay(date: string, note: string | null = null) {
      const dayId = uuid();
      await client.query(`
        INSERT INTO days (id, user_id, date, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [dayId, USER_ID, date, note]);
      return dayId;
    }

    async function addMeal(dayId: string, mealType: string, mealTime: string) {
      const mealId = uuid();
      await client.query(`
        INSERT INTO meals (id, day_id, meal_type, meal_time, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [mealId, dayId, mealType, mealTime]);
      return mealId;
    }

    // Day 1 — 2026-03-18
    const day1 = await addDay("2026-03-18");
    const d1Breakfast = await addMeal(day1, "Breakfast", "08:00");
    await addMealFood(d1Breakfast, "oats",       80);
    await addMealFood(d1Breakfast, "eggs",       150); // ~3 eggs
    await addMealFood(d1Breakfast, "banana",     120);

    const d1Lunch = await addMeal(day1, "Lunch", "12:30");
    await addMealFood(d1Lunch, "chickenBreast", 200);
    await addMealFood(d1Lunch, "whiteRice",     200);
    await addMealFood(d1Lunch, "broccoli",      150);

    const d1PreWorkout = await addMeal(day1, "Pre-Workout", "16:00");
    await addMealFood(d1PreWorkout, "wheyProtein", 35);
    await addMealFood(d1PreWorkout, "banana",      100);

    const d1Dinner = await addMeal(day1, "Dinner", "19:30");
    await addMealFood(d1Dinner, "chickenBreast", 180);
    await addMealFood(d1Dinner, "sweetPotato",  200);
    await addMealFood(d1Dinner, "broccoli",     120);

    // Day 2 — 2026-03-19
    const day2 = await addDay("2026-03-19", "Rest day — felt sore from leg day");
    const d2Breakfast = await addMeal(day2, "Breakfast", "08:30");
    await addMealFood(d2Breakfast, "greekYogurt", 200);
    await addMealFood(d2Breakfast, "oats",        60);
    await addMealFood(d2Breakfast, "almonds",     30);

    const d2Lunch = await addMeal(day2, "Lunch", "13:00");
    await addMealFood(d2Lunch, "chickenBreast", 220);
    await addMealFood(d2Lunch, "whiteRice",     180);
    await addMealFood(d2Lunch, "broccoli",      100);

    const d2Dinner = await addMeal(day2, "Dinner", "19:00");
    await addMealFood(d2Dinner, "eggs",         200);
    await addMealFood(d2Dinner, "sweetPotato",  250);
    await addMealFood(d2Dinner, "broccoli",     150);

    // Day 3 — 2026-03-20 (today)
    const day3 = await addDay("2026-03-20", "Push day today");
    const d3Breakfast = await addMeal(day3, "Breakfast", "07:45");
    await addMealFood(d3Breakfast, "oats",        100);
    await addMealFood(d3Breakfast, "eggs",        150);
    await addMealFood(d3Breakfast, "banana",      120);

    const d3PreWorkout = await addMeal(day3, "Pre-Workout", "15:30");
    await addMealFood(d3PreWorkout, "wheyProtein", 35);
    await addMealFood(d3PreWorkout, "banana",      100);
    await addMealFood(d3PreWorkout, "almonds",     25);

    await client.query("COMMIT");

    console.log("✓ Seed complete!");
    console.log("  Login: dev@example.com / password");
    console.log(`  ${exercises.length} exercises, ${workouts.length} workouts, 2 completed sessions`);
    console.log(`  ${foods.length} foods, 3 days of diet data`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed — rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
