# Technical Specification – Note Taking / Workout Web App
> Version 3.3 — Updated March 2026

---

## 1. Overview

A web application where authenticated users can create, view, edit, delete, and publicly share workouts, and log their daily food intake. Workouts are created with custom components and stored as JSON in a SQLite database, and rendered in the browser.

### 1.1 Core Features

- User authentication (sign up, login, logout) via better-auth
- Authenticated note management (CRUD)
- One Workout can have many Workout Items
- One Workout Item references exactly one Exercise and owns its own Sets
- Exercises are reusable templates (title only — no sets stored on the exercise itself)
- Public sharing of workouts via a public URL (toggle on/off)
- Workout sessions tracked via WorkoutInProgress — multiple sessions per workout, one active at a time
- Daily diet logging: track meals and food intake by day with nutritional summaries (calories, protein, carbs, fat)

### 1.2 Tech Stack

- Next.js (App Router) + Bun runtime
- TypeScript
- TailwindCSS 4
- PostgreSQL via `pg` (node-postgres) with raw SQL
- shadcn/ui component library
- TanStack Query v5 for client-side data fetching, caching, and mutation management

---

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching
  - Client components for Workouts, exercises editor, and interactive UI
  - Route Handlers (`app/api/.../route.ts`) for JSON APIs
- **Runtime:** Bun (for dev & production)
- **Database:** PostgreSQL accessed via `pg` (node-postgres), connection via `DATABASE_URL` env var
- **Auth:** better-auth integrated into Next.js (middleware + server helpers)

### 2.2 Application Layers

**Presentation layer**
- Next.js pages and components
- TailwindCSS 4 for styling
- shadcn/ui for UI primitives (Button, Input, Label, Tabs, Checkbox, Dialog, DropdownMenu)
- lucide-react for icons
- TanStack Query v5 (`@tanstack/react-query`) for client-side caching, useQuery, and useMutation

**API layer**
- REST-like JSON endpoints for workouts, exercises, and workout session CRUD

**Data access layer**
- Raw SQL queries executed via `pg` Pool
- A small helper module for DB access (`lib/db.ts`)

---

## 3. Functional Requirements

### 3.1 Authentication

Users can register (email + password, minimum validation) and log in / log out. Authentication state is accessible on server (for SSR) and on client (for protected UI).

**Unauthenticated users:**
- Can access public shared workout URLs (read-only)
- Cannot access dashboard, personal workouts, or workout sessions

### 3.2 Workouts and Exercises Management (Authenticated)

See full CRUD details in Section 7 (API Design). Key behaviors:
- Create workout with default title `"Untitled Workout"`
- Hard delete cascades to Workout Items and Sets; Exercises are never deleted
- Exercises are reusable templates — no set data stored on the exercise itself

### 3.3 Workout Sharing

- Toggle public sharing on/off per workout
- When enabled: workout gets a unique public slug, accessible via `/p/{slug}`
- When disabled: public URL returns 404
- Public page is read-only — no editing or owner info visible

### 3.4 WorkoutInProgress (Authenticated)

A WorkoutInProgress represents a live or completed session of performing a specific workout.

- A workout can have multiple WorkoutInProgress records (full session history)
- Only one WorkoutInProgress can be active (`is_active = 1`) per workout at any time
- Starting a new session auto-deactivates the previous active session for that workout
- Each session tracks: `started_at`, `completed_at`, `duration_seconds`, and `is_active`
- Each session stores per-set performance via `workout_in_progress_set` records
- Sessions are scoped to the authenticated user — no cross-user access
- The `/workout-in-progress/[workoutId]` page shows all workout items for the workout and allows updating them within the active session

### 3.5 Daily Diet (Authenticated)

Users can log their food intake with a hierarchical structure: one day → many meals → many food items.

- Log multiple meals per day (Breakfast, Lunch, Dinner, Snacks, etc.)
- Add foods by selecting from a reusable Food library or via manual (ephemeral) entry
- Manual food entries are stored only on that meal log — they are NOT saved to the Food library
- View per-meal and daily total nutritional summaries (Calories, Protein, Carbs, Fat)
- A user may only have one day record per calendar date (unique constraint on `user_id + date`)

---

## 4. Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Performance | Workout list & view load under ~300ms for typical DB sizes |
| Security | All operations scoped to authenticated `user_id`; public workouts are read-only |
| Reliability | Graceful handling of DB errors |
| Maintainability | Type-safe APIs and DB types; modularized DB and auth helpers |
| UX | Simple, minimal UI with keyboard-friendly editor |

---

## 5. Data Model & Database Schema (SQLite)

### 5.1 Tables

#### better-auth Core Tables

better-auth manages its own tables. The following are required:

**user**

```sql
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Field | Type | Description |
|---|---|---|
| id | TEXT | Unique identifier (primary key) |
| name | TEXT | User's display name |
| email | TEXT | User's email address |
| emailVerified | BOOLEAN | Whether email is verified |
| image | TEXT | User's image URL (optional) |
| createdAt | TIMESTAMPTZ | Account creation timestamp |
| updatedAt | TIMESTAMPTZ | Last update timestamp |

**session**

```sql
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "user"(id)
);
```

**account**

```sql
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  "idToken" TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "user"(id)
);
```

**verification**

```sql
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### Workout, Workout Items, Exercises, and Sets

```sql
CREATE TABLE IF NOT EXISTS workout (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  public_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS exercise (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS workout_item (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workout_id) REFERENCES workout(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercise(id)
);

CREATE TABLE IF NOT EXISTS workout_item_set (
  id TEXT PRIMARY KEY,
  workout_item_id TEXT NOT NULL,
  reps INTEGER NOT NULL DEFAULT 1,
  weight REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  rest_seconds INTEGER NOT NULL DEFAULT 60,
  FOREIGN KEY (workout_item_id) REFERENCES workout_item(id) ON DELETE CASCADE
);
```

---

#### WorkoutInProgress and WorkoutInProgressSet (NEW)

These two tables track live and historical workout sessions.

```sql
CREATE TABLE IF NOT EXISTS workout_in_progress (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workout_id) REFERENCES workout(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS workout_in_progress_set (
  id TEXT PRIMARY KEY,
  workout_in_progress_id TEXT NOT NULL,
  workout_item_id TEXT NOT NULL,
  reps INTEGER NOT NULL DEFAULT 1,
  weight REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workout_in_progress_id)
    REFERENCES workout_in_progress(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_item_id) REFERENCES workout_item(id)
);
```

**workout_in_progress**

| Field | Type | Description |
|---|---|---|
| id | TEXT | Unique identifier (primary key) |
| workout_id | TEXT | The workout being performed (FK → workout.id, CASCADE DELETE) |
| user_id | TEXT | Owner of the session (FK → user.id) |
| is_active | BOOLEAN | Whether this session is currently active |
| started_at | TIMESTAMPTZ | Timestamp when the session was started |
| completed_at | TIMESTAMPTZ | Timestamp when the session was completed (NULL if still active) |
| duration_seconds | INTEGER | Total session duration in seconds (NULL until complete) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

**workout_in_progress_set**

| Field | Type | Description |
|---|---|---|
| id | TEXT | Unique identifier (primary key) |
| workout_in_progress_id | TEXT | Parent session (FK → workout_in_progress.id, CASCADE DELETE) |
| workout_item_id | TEXT | The workout item this set belongs to (FK → workout_item.id) |
| reps | INTEGER | Actual reps performed in this set |
| weight | REAL | Actual weight used in this set (kg) |
| position | INTEGER | Display order within the workout item |
| is_complete | BOOLEAN | Whether the user has marked this set as done (default FALSE) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

> **Cascade behaviour:** Deleting a `workout` automatically deletes all `workout_in_progress` rows (via `ON DELETE CASCADE`), which in turn deletes all `workout_in_progress_set` rows. Deleting a `workout_item` does NOT automatically delete associated `workout_in_progress_set` rows — application logic should handle orphaned sets.

---

---

#### Daily Diet Tables

Four tables implement the diet feature. Relationships: `users (1) → (*) days → (*) meals → (*) meal_foods ← (*) foods`

```sql
CREATE TABLE IF NOT EXISTS days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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
  user_id UUID NOT NULL,
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
```

> **Denormalized storage:** When `food_id` is present, macros are calculated at insert time as `quantity_grams * value_per_g` and stored on `meal_foods`. This protects historical accuracy if a food in the library is later edited. When `food_id` is NULL (`is_manual = TRUE`), the user-supplied macro values are stored directly.

---

### 5.2 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_workout_user_id ON workout(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_title ON workout(title);
CREATE INDEX IF NOT EXISTS idx_workout_created_at ON workout(created_at);

CREATE INDEX IF NOT EXISTS idx_exercise_user_id ON exercise(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_title ON exercise(title);

CREATE INDEX IF NOT EXISTS idx_workout_item_workout_id ON workout_item(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_item_exercise_id ON workout_item(exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_item_set_workout_item_id ON workout_item_set(workout_item_id);

CREATE INDEX IF NOT EXISTS idx_wip_workout_id ON workout_in_progress(workout_id);
CREATE INDEX IF NOT EXISTS idx_wip_user_id ON workout_in_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_wip_is_active ON workout_in_progress(is_active);
CREATE INDEX IF NOT EXISTS idx_wip_set_wip_id ON workout_in_progress_set(workout_in_progress_id);
CREATE INDEX IF NOT EXISTS idx_wip_set_item_id ON workout_in_progress_set(workout_item_id);

CREATE INDEX IF NOT EXISTS idx_days_user_id ON days(user_id);
CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
CREATE INDEX IF NOT EXISTS idx_meals_day_id ON meals(day_id);
CREATE INDEX IF NOT EXISTS idx_foods_user_id ON foods(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_foods_meal_id ON meal_foods(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_foods_food_id ON meal_foods(food_id);
```

### 5.3 DB Initialization Scripts

- `scripts/init-db.ts` — creates all tables and indexes from scratch (PostgreSQL, includes all tables)
- `scripts/migrate-workout-in-progress.ts` — migration adding `workout_in_progress` and `workout_in_progress_set` tables
- `scripts/migrate-add-item-note.ts` — migration adding `note TEXT` column to `workout_item`
- `scripts/migrate-add-set-complete.ts` — migration adding `is_complete BOOLEAN` column to `workout_in_progress_set`
- `scripts/migrate-add-rest-seconds.ts` — migration adding `rest_seconds INTEGER DEFAULT 60` column to `workout_item_set`
- `scripts/migrate-add-diet.ts` — migration adding `days`, `meals`, `foods`, and `meal_foods` tables

---

## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize a `pg` `Pool` using `DATABASE_URL` env var (with SSL for non-local connections)
- Export helper functions: `query<T>()`, `get<T>()`, `run()`

### 6.2 TanStack Query Setup

**Files:** `app/providers.tsx`, `lib/queryKeys.ts`, `lib/api/*.ts`

- `app/providers.tsx` — Client-side `QueryClientProvider` wrapping the entire app (included in `app/layout.tsx`). `QueryClient` is created via `useState` to avoid sharing state across requests. Default options: `staleTime: 5m`, `gcTime: 10m`. `ReactQueryDevtools` included (dev only).
- `lib/queryKeys.ts` — Centralized query key factory for all domains (`exerciseKeys`, `foodKeys`, `sessionKeys`). All `useQuery`/`invalidateQueries` calls reference keys from here.
- `lib/api/exercises.ts` — Typed fetch functions: `fetchExercises`, `createExercise`, `updateExercise`, `deleteExercise`
- `lib/api/foods.ts` — Typed fetch functions: `fetchFoods`, `createFood`, `updateFood`, `deleteFood`, `addFoodToMeal`
- `lib/api/sessions.ts` — Typed fetch functions: `fetchSessionDetail`, `deleteSession`

**Caching strategy:**
- `exercises-manager` and `foods-library` receive SSR data as `initialData` (with `initialDataUpdatedAt: () => Date.now()`), so the cache is pre-populated and treated as fresh for `staleTime` duration. Mutations call `invalidateQueries` to refetch after any CRUD.
- `add-workout-item-modal` — exercises list fetched with `useQuery` (enabled only when the "Existing exercise" tab is active). Cached across tab switches.
- `add-food-to-meal-modal` — food search uses `useQuery` keyed by debounced search term. Repeated searches of the same term are served from cache.
- `session-history-list` — session detail uses `useQuery` (enabled when a session is selected). Re-clicking a session shows cached data instantly.

---

## 7. API Design (Next.js Route Handlers)

### 7.1 Authentication Access

All `/api/workouts`, `/api/exercises`, and `/api/workouts/:id/sessions` handlers must check auth and return `401` if not authenticated. The `/api/public-workouts/:slug` endpoint is exempt.

---

### 7.2 Exercises Endpoints

#### GET /api/exercises

List all exercises for the authenticated user.

**Response 200:**
```json
[
  {
    "id": "exercise-id",
    "title": "Bench Press",
    "image_url": "/uploads/exercises/uuid.jpg",
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
]
```

#### POST /api/exercises

Create a new exercise template.

**Request Body:**
```json
{
  "title": "Bench Press",
  "image_url": "/uploads/exercises/uuid.jpg"
}
```

**Response 201:**
```json
{
  "id": "exercise-id",
  "title": "Bench Press",
  "image_url": "/uploads/exercises/uuid.jpg",
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

#### POST /api/exercises/upload

Upload an image for an exercise. Accepted types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Max 5MB. Files saved to `public/uploads/exercises/` with UUID filename.

**Request:** `multipart/form-data` with a `file` field.

**Response 201:**
```json
{ "url": "/uploads/exercises/uuid.jpg" }
```

#### PATCH /api/exercises/:id

Update exercise title and/or image.

**Request Body:**
```json
{ "title": "Incline Bench Press", "image_url": "/uploads/exercises/uuid.jpg" }
```

**Response 200:**
```json
{
  "id": "exercise-id",
  "title": "Incline Bench Press",
  "image_url": "/uploads/exercises/uuid.jpg",
  "updatedAt": "2025-01-01T13:00:00Z"
}
```

#### DELETE /api/exercises/:id

Delete an exercise template. Workout Items referencing this exercise are NOT automatically deleted.

**Response 200:**
```json
{ "message": "Exercise deleted successfully." }
```

---

### 7.3 Workouts Endpoints

#### GET /api/workouts

List all workouts for the authenticated user.

**Response 200:**
```json
[
  {
    "id": "workout-id",
    "title": "Push Day",
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
]
```

#### GET /api/workouts/:id

Get a single workout with all Workout Items, each including the linked exercise and its template sets.

**Response 200:**
```json
{
  "id": "workout-id",
  "title": "Push Day",
  "workoutItems": [
    {
      "id": "item-id",
      "position": 0,
      "exercise": { "id": "exercise-id", "title": "Bench Press" },
      "sets": [
        { "id": "set-id", "reps": 10, "weight": 80.0, "position": 0 },
        { "id": "set-id-2", "reps": 8, "weight": 85.0, "position": 1 }
      ]
    }
  ],
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

#### POST /api/workouts

Create a new workout.

**Request Body:**
```json
{ "title": "Push Day" }
```

**Response 201:**
```json
{
  "id": "workout-id",
  "title": "Push Day",
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

#### PATCH /api/workouts/:id

Update a workout title.

**Request Body:**
```json
{ "title": "Push Day (Updated)" }
```

**Response 200:**
```json
{
  "id": "workout-id",
  "title": "Push Day (Updated)",
  "updatedAt": "2025-01-01T13:00:00Z"
}
```

#### DELETE /api/workouts/:id

Delete a workout. Cascades to all Workout Items, Sets, and WorkoutInProgress sessions. Exercises are NOT deleted.

**Response 200:**
```json
{ "message": "Workout deleted successfully." }
```

---

### 7.4 Workout Items Endpoints

#### POST /api/workouts/:id/items

Add a new Workout Item to a workout — links an exercise and creates its template sets.

**Request Body:**
```json
{
  "exerciseId": "exercise-id",
  "position": 0,
  "sets": [
    { "reps": 10, "weight": 80.0 },
    { "reps": 8, "weight": 85.0 }
  ]
}
```

**Response 201:**
```json
{
  "id": "item-id",
  "position": 0,
  "exercise": { "id": "exercise-id", "title": "Bench Press" },
  "sets": [
    { "id": "set-id", "reps": 10, "weight": 80.0, "position": 0 },
    { "id": "set-id-2", "reps": 8, "weight": 85.0, "position": 1 }
  ]
}
```

#### PATCH /api/workouts/:id/items/:itemId

Update a Workout Item's position and/or sets. Sets are replaced wholesale.

**Request Body:**
```json
{
  "position": 1,
  "sets": [{ "reps": 12, "weight": 75.0 }]
}
```

**Response 200:**
```json
{
  "id": "item-id",
  "position": 1,
  "sets": [{ "id": "set-id", "reps": 12, "weight": 75.0, "position": 0 }],
  "updatedAt": "2025-01-01T13:00:00Z"
}
```

#### DELETE /api/workouts/:id/items/:itemId

Remove a Workout Item (and all its Sets) from a workout. The referenced Exercise is NOT deleted.

**Response 200:**
```json
{ "message": "Workout item removed successfully." }
```

---

### 7.5 Public Workout Endpoint

#### GET /api/public-workouts/:slug

Read-only access to a public workout. Returns same shape as `GET /api/workouts/:id`. Returns 404 if slug not found or `is_public = 0`.

---

### 7.6 WorkoutInProgress Endpoints (NEW)

All endpoints require authentication. Sessions are scoped to the authenticated user. The workout referenced must belong to the authenticated user.

#### GET /api/workouts/:id/sessions

List all WorkoutInProgress sessions for a given workout, ordered by `started_at` descending (most recent first).

**Response 200:**
```json
[
  {
    "id": "session-id",
    "workoutId": "workout-id",
    "isActive": true,
    "startedAt": "2026-03-10T09:00:00Z",
    "completedAt": null,
    "durationSeconds": null,
    "sets": [
      {
        "id": "wip-set-id",
        "workoutItemId": "item-id",
        "reps": 10,
        "weight": 80.0,
        "position": 0
      }
    ],
    "createdAt": "2026-03-10T09:00:00Z",
    "updatedAt": "2026-03-10T09:00:00Z"
  }
]
```

#### GET /api/workouts/:id/sessions/active

Get the currently active WorkoutInProgress session for a workout, including its sets and the full workout items with exercise details. Returns 404 if no active session exists.

**Response 200:**
```json
{
  "id": "session-id",
  "workoutId": "workout-id",
  "isActive": true,
  "startedAt": "2026-03-10T09:00:00Z",
  "completedAt": null,
  "durationSeconds": null,
  "workoutItems": [
    {
      "id": "item-id",
      "position": 0,
      "exercise": { "id": "exercise-id", "title": "Bench Press" },
      "sets": [
        { "id": "wip-set-id", "reps": 10, "weight": 80.0, "position": 0 }
      ]
    }
  ],
  "createdAt": "2026-03-10T09:00:00Z",
  "updatedAt": "2026-03-10T09:00:00Z"
}
```

#### POST /api/workouts/:id/sessions

Start a new WorkoutInProgress session. If an active session already exists for this workout, it is automatically deactivated (`is_active = 0`) before the new session is created — done atomically in a single SQLite transaction.

**Request Body:** *(empty)*
```json
{}
```

**Response 201:**
```json
{
  "id": "session-id",
  "workoutId": "workout-id",
  "isActive": true,
  "startedAt": "2026-03-10T09:00:00Z",
  "completedAt": null,
  "durationSeconds": null,
  "createdAt": "2026-03-10T09:00:00Z",
  "updatedAt": "2026-03-10T09:00:00Z"
}
```

#### PATCH /api/workouts/:id/sessions/:sessionId

Update an active session. Supports completing the session and/or replacing its sets wholesale. All fields are optional.

**Request Body:**
```json
{
  "isActive": false,
  "completedAt": "2026-03-10T10:05:00Z",
  "durationSeconds": 3900,
  "sets": [
    { "workoutItemId": "item-id", "reps": 10, "weight": 82.5, "position": 0 },
    { "workoutItemId": "item-id", "reps": 8,  "weight": 85.0, "position": 1 }
  ]
}
```

**Response 200:**
```json
{
  "id": "session-id",
  "workoutId": "workout-id",
  "isActive": false,
  "startedAt": "2026-03-10T09:00:00Z",
  "completedAt": "2026-03-10T10:05:00Z",
  "durationSeconds": 3900,
  "sets": [
    { "id": "wip-set-id", "workoutItemId": "item-id", "reps": 10, "weight": 82.5, "position": 0 }
  ],
  "updatedAt": "2026-03-10T10:05:00Z"
}
```

> Sets are replaced wholesale: all existing `workout_in_progress_set` rows for the session are deleted and re-inserted in a single transaction.

#### DELETE /api/workouts/:id/sessions/:sessionId

Delete a WorkoutInProgress session and all its sets (cascades to `workout_in_progress_set`).

**Response 200:**
```json
{ "message": "Session deleted successfully." }
```

---

### 7.7 Daily Diet Endpoints

All endpoints require authentication and are scoped to the authenticated user.

#### Days

##### GET /api/days

Returns all days for the user, sorted by date descending. Each day includes `totalCalories` and `mealCount` aggregated from its meals.

**Response 200:**
```json
{
  "days": [
    { "id": "uuid", "date": "2025-03-15", "notes": "Cheat day", "totalCalories": 2450, "mealCount": 3, "createdAt": "..." }
  ]
}
```

##### POST /api/days

Creates a new day. Returns `409` if a day already exists for that date.

**Request Body:** `{ "date": "2025-03-15", "notes": "Optional" }`

##### PATCH /api/days/:id

Updates the `notes` field of a day.

##### DELETE /api/days/:id

Deletes a day and cascades to all its meals and `meal_foods` records.

---

#### Meals

##### GET /api/days/:dayId/meals

Returns all meals for a day, each including their food items and per-meal nutritional totals. Also returns `dayTotals`.

**Response 200:**
```json
{
  "meals": [
    {
      "id": "meal-uuid", "dayId": "day-uuid", "mealType": "Breakfast", "mealTime": "08:30", "notes": null,
      "foods": [{ "id": "mf-uuid", "foodName": "Oatmeal", "quantityGrams": 80, "calories": 312, "protein": 10.5, "carbs": 54.4, "fat": 5.6, "isManual": false }],
      "totals": { "calories": 312, "protein": 10.5, "carbs": 54.4, "fat": 5.6 }
    }
  ],
  "dayTotals": { "calories": 2100, "protein": 142, "carbs": 230, "fat": 65 }
}
```

##### POST /api/days/:dayId/meals

Creates a new meal under a day. Required: `mealType`. Optional: `mealTime`, `notes`.

##### PATCH /api/meals/:id

Updates meal metadata: `mealType`, `mealTime`, or `notes`.

##### DELETE /api/meals/:id

Deletes a meal and all its `meal_foods` records.

---

#### Meal Foods

##### POST /api/meals/:mealId/foods

Adds a food to a meal. Two modes:

- **Library food:** pass `foodId` + `quantityGrams`. Server looks up the food, computes macros (`quantity_grams * value_per_g`), and stores them denormalized.
- **Manual entry:** omit `foodId`, pass `foodName`, `quantityGrams`, `calories`, `protein`, `carbs`, `fat`. Sets `is_manual = TRUE`; food is NOT saved to the `foods` table.

##### PATCH /api/meal-foods/:id

Updates a food entry. If linked to a `food_id`, only `quantityGrams` is editable — macros are recalculated server-side. Manual entries allow editing all fields.

##### DELETE /api/meal-foods/:id

Removes a food item from a meal.

---

#### Foods (Library)

##### GET /api/foods

Returns all foods in the user's library. Supports optional `?search=` query param.

##### POST /api/foods

Creates a new food. Required fields: `name`, `caloriesPerG`, `proteinPerG`, `carbsPerG`, `fatPerG`. Optional: `unit` (defaults to `g`).

##### PATCH /api/foods/:id

Updates an existing food's details.

##### DELETE /api/foods/:id

Removes a food from the library. Does NOT affect historical `meal_foods` records (values are stored denormalized).

---

## 8. Frontend – Pages & Components

### 8.1 Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with marketing / login / sign up CTA |
| `/dashboard` | Auth | List of user workouts and exercises manager |
| `/workout/[id]` | Auth | Workout editor: title, items, share toggle, delete |
| `/p/[slug]` | Public | Read-only public workout page |
| `/workout-in-progress/[workoutId]` | Auth | Active session page: view items, log sets, complete session |
| `/history` | Auth | Completed session history with per-session detail modal |
| `/days` | Auth | Lists all logged diet days; create a new day entry |
| `/days/[dayId]` | Auth | Day detail: meals, food items, per-meal and daily nutritional summaries |
| `/foods` | Auth | Food library: searchable list with create, edit, delete |

### 8.2 Layout & Navigation

- Global layout: `app/layout.tsx`
- Header with app name and profile avatar; nav links collapsed behind an animated slide-in drawer (hamburger) on all screen sizes
- `app/(auth)/login`, `app/(auth)/register`

### 8.3 Components

> All component files use kebab-case naming (e.g. `workout-list.tsx`, not `WorkoutList.tsx`).

**components/workout-list.tsx**
Props: `workouts: Workout[]`. Renders list of workouts with links to `/workout/[id]`. Shows title and last updated date.

**components/create-workout-button.tsx**
Client button that calls `POST /api/workouts` and navigates to the new workout editor.

**components/workout-editor.tsx**
Props: `workoutId`, `initialTitle`, `initialIsPublic`, `initialSlug`, `savedItems`. Inline-editable title, save button, share toggle, delete button with confirmation, and list of Workout Items. Each set in the edit modal includes a `rest_seconds` input (default 60, step 5).

**components/add-workout-item-modal.tsx**
Two-tab modal (New exercise / Existing exercise) built with shadcn Tabs. Calls `onAdd` with a `PendingWorkoutItem`; actual API calls happen on save in `workout-editor`.

**components/exercises-manager.tsx**
Full CRUD for the exercises library. Supports image upload, bulk select/delete, and inline edit via modal.

**components/workout-in-progress-view.tsx**
Props: `workoutId`, `sessionId`, `workoutItems: WorkoutItem[]`, `sets: WorkoutInProgressSet[]`.
- Renders each Workout Item (exercise name + target sets from template)
- Allows the user to edit actual reps/weight for each set in the active session
- Each set row shows rest time (read-only, sourced from `workout_item_set.rest_seconds`)
- Marking a set as **Done** starts a rest countdown timer; only one timer active at a time (last one wins)
- Rest timer persists across page refreshes via `sessionStorage` (stores end timestamp)
- Timer shows as a floating fixed footer pill; "Skip" dismisses it early
- When the timer reaches zero, a **"Get ready for your next set!"** modal appears and a short alarm sound plays (three-beep pattern synthesized via the Web Audio API — no external files required)
- Changes auto-save via debounced `PATCH /api/workouts/:id/sessions/:sessionId`
- **Complete Session** button is disabled while auto-save is in progress
- Provides a **Complete Session** button that sets `isActive: false`, `completedAt`, and `durationSeconds`
- Shows a session elapsed timer (since `startedAt`)

**components/start-session-button.tsx**
Client button shown on the `/workout/[id]` page. Calls `POST /api/workouts/:id/sessions` and navigates to `/workout-in-progress/[workoutId]`.

**components/profile-dropdown.tsx**
Props: `name`, `email`. Avatar button (initials) with shadcn DropdownMenu. Shows user name/email and Log out action.

**components/modal.tsx**
Generic modal wrapper. Props: `open`, `onClose`, `title`, `children`. Capped at `90vh` with scrollable content area so tall modals don't overflow the viewport.

**components/session-history-list.tsx**
Renders the list of completed sessions on `/history`. Clicking a session row opens a detail modal fetched from `GET /api/sessions/:id`, showing exercises, sets (reps × weight · rest), and completion status per set.

**components/start-workout-button.tsx**
On click, fetches the workout's exercises and shows a confirmation modal listing all exercises and their sets before starting. Calls `POST /api/workouts/:id/sessions` on confirm and navigates to `/workout-in-progress/[workoutId]`.

**components/days-list.tsx**
Props: `days: Day[]`. Renders logged days sorted by date descending. Each row shows date, meal count, and total calories. Includes a create-day form (date picker + optional note). Clicking a row navigates to `/days/[dayId]`.

**components/day-detail.tsx**
Props: `dayId`. Shows date and optional day note at the top. Lists each meal as a card with its `mealType`, `mealTime`, food items, and per-meal nutritional totals. Includes a daily total summary at the bottom. Allows adding a new meal and expanding/editing meals inline.

**components/meal-card.tsx**
Props: `meal: Meal`. Displays meal type, time, food item list (name, quantity, macros), and totals. Includes controls to add/remove food items and delete the meal.

**components/add-food-to-meal-modal.tsx**
Two-tab modal (Library / Manual Entry). Library tab: searchable food list, enter `quantityGrams` and confirm. Manual tab: collect `foodName`, `quantityGrams`, `calories`, `protein`, `carbs`, `fat`. Calls `POST /api/meals/:mealId/foods` on confirm.

**components/foods-library.tsx**
Props: none (fetches from `/api/foods`). Searchable table of user foods. Supports create, inline edit, and delete. Deleting a food does not affect historical meal logs.

### 8.4 shadcn/ui Components (`components/ui/`)

- `button.tsx` — variants: default, outline, ghost, destructive
- `input.tsx` — styled text/number input
- `label.tsx` — form label
- `tabs.tsx` — Tabs, TabsList, TabsTrigger, TabsContent
- `checkbox.tsx` — checkbox with checked state
- `dialog.tsx` — Dialog primitives
- `dropdown-menu.tsx` — DropdownMenu and sub-components

---

## 9. Styling (TailwindCSS 4 + shadcn/ui)

- TailwindCSS 4 via PostCSS (`@tailwindcss/postcss`)
- shadcn/ui provides design tokens (CSS variables) for colors, radius, etc.
- `tw-animate-css` for animation utilities
- `tailwind-merge` + `clsx` + `class-variance-authority` used by shadcn components
- Minimal design: neutral backgrounds, card-style bordered containers

---

## 10. Security Considerations

| Area | Requirement |
|---|---|
| Auth enforcement | All `/dashboard`, `/workout/[id]`, and `/workout-in-progress/[workoutId]` routes check auth on server |
| Authorization | Every workout, exercise, and session query filters by `user_id` |
| Session ownership | `PATCH` and `DELETE` on sessions verify the session's workout belongs to the authenticated user |
| Public workouts | Slug is 16+ random chars; public pages are read-only with no leaked private data |
| XSS | Primary data is structured JSON; no `dangerouslySetInnerHTML` with unsanitized data |
| Rate limiting | Optional per-IP or per-user rate limiting on API routes |

---

## 11. Development Workflow

```bash
bun dev                          # Start dev server at http://localhost:3000
bun run build                    # Production build
bun run lint                     # ESLint
bun run db:init                  # Initialize DB (scripts/init-db.ts)
bun run db:migrate-wip           # Add workout_in_progress tables
bun run db:migrate-item-note     # Add note column to workout_item
bun run db:migrate-set-complete  # Add is_complete column to workout_in_progress_set
```

### 11.1 Setup Order

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS 4
3. Install and configure shadcn/ui
4. Integrate better-auth and session handling
5. Implement SQLite DB initialization via `scripts/init-db.ts` (includes new WIP tables)
6. Build DB helpers (`lib/db.ts`) and type definitions (`lib/types.ts`)
7. Implement workout, exercise, workout item, and session API routes
8. Build dashboard, workout editor, and exercises library pages
9. Build `/workout-in-progress/[workoutId]` page and associated components
10. Implement public workout pages `/p/[slug]`
11. Add polish: loading states, confirmation modals, session timer, error handling

---

## 12. Changelog

| Version | Date | Changes |
|---|---|---|
| 3.3 | March 2026 | Added unit test suite: Vitest + jsdom + @testing-library/react (React 19 compatible). Config: `vitest.config.mts` (jsdom env, globals, path alias via vite-tsconfig-paths), `vitest.setup.ts` (jest-dom matchers, matchMedia/ResizeObserver mocks, RTL cleanup). 93 tests across 8 files covering lib utilities (`cn`, query keys), API modules (exercises, foods, sessions), and components (Modal, WorkoutList, WorkoutInProgressView). Run with `bun run test` / `bun run test:watch`. |
| 3.2 | March 2026 | Bug fix: `addSet` in `workout-in-progress-view` now computes position inside the `setSets` functional updater (reads `prev` state) to prevent duplicate set positions from rapid clicks, which previously caused sets to be saved with duplicate positions and appear doubled on refresh. Feature: rest timer end plays a three-beep alarm (880 Hz × 2 + 1100 Hz) synthesized via the Web Audio API — no external file required. |
| 3.1 | March 2026 | Added TanStack Query v5: `QueryClientProvider` in `app/providers.tsx`; query key factory in `lib/queryKeys.ts`; typed API modules in `lib/api/`; converted `add-workout-item-modal`, `add-food-to-meal-modal`, `exercises-manager`, `foods-library`, and `session-history-list` to use `useQuery`/`useMutation`; `initialData` + `initialDataUpdatedAt` pattern for SSR-populated components; cache invalidation via `invalidateQueries` on all mutations |
| 1.0 | 2025-01-01 | Initial specification |
| 2.0 | March 2026 | Added WorkoutInProgress feature: new DB tables (`workout_in_progress`, `workout_in_progress_set`), new API endpoints (§7.6), new route `/workout-in-progress/[workoutId]`, new components (`workout-in-progress-view`, `start-session-button`), updated security and indexes sections |
| 2.1 | March 2026 | Migrated DB from SQLite (`bun:sqlite`) to PostgreSQL (`pg`); added `image_url` to `workout` table; added `note TEXT` to `workout_item`; added `is_complete BOOLEAN` to `workout_in_progress_set`; updated all SQL to use PostgreSQL types (`BOOLEAN`, `TIMESTAMPTZ`) |
| 2.2 | March 2026 | Added `rest_seconds INTEGER DEFAULT 60` to `workout_item_set`; rest time read-only in session view, sourced from template; rest countdown timer on set completion with `sessionStorage` persistence and floating footer UI; "Get ready" modal on timer end; start-workout confirmation modal; session history detail modal; animated side-nav drawer replacing inline header nav; scrollable modals (max 90vh); Complete Session disabled while saving |
| 3.0 | March 2026 | Added Daily Diet feature: new DB tables (`days`, `meals`, `foods`, `meal_foods`), new API endpoints (§7.7), new routes (`/days`, `/days/[dayId]`, `/foods`), new components (`days-list`, `day-detail`, `meal-card`, `add-food-to-meal-modal`, `foods-library`); supports library and manual food entries with denormalized macro storage |
