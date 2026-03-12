# Technical Specification – Note Taking / Workout Web App
> Version 2.0 — Updated March 2026

---

## 1. Overview

A web application where authenticated users can create, view, edit, delete, and publicly share workouts. Workouts are created with custom components and stored as JSON in a SQLite database, and rendered in the browser.

### 1.1 Core Features

- User authentication (sign up, login, logout) via better-auth
- Authenticated note management (CRUD)
- One Workout can have many Workout Items
- One Workout Item references exactly one Exercise and owns its own Sets
- Exercises are reusable templates (title only — no sets stored on the exercise itself)
- Public sharing of workouts via a public URL (toggle on/off)
- Workout sessions tracked via WorkoutInProgress — multiple sessions per workout, one active at a time

### 1.2 Tech Stack

- Next.js (App Router) + Bun runtime
- TypeScript
- TailwindCSS 4
- PostgreSQL via `pg` (node-postgres) with raw SQL
- shadcn/ui component library

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
```

### 5.3 DB Initialization Scripts

- `scripts/init-db.ts` — creates all tables and indexes from scratch (PostgreSQL, includes all tables)
- `scripts/migrate-workout-in-progress.ts` — migration adding `workout_in_progress` and `workout_in_progress_set` tables
- `scripts/migrate-add-item-note.ts` — migration adding `note TEXT` column to `workout_item`
- `scripts/migrate-add-set-complete.ts` — migration adding `is_complete BOOLEAN` column to `workout_in_progress_set`

---

## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize a `pg` `Pool` using `DATABASE_URL` env var (with SSL for non-local connections)
- Export helper functions: `query<T>()`, `get<T>()`, `run()`

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

## 8. Frontend – Pages & Components

### 8.1 Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with marketing / login / sign up CTA |
| `/dashboard` | Auth | List of user workouts and exercises manager |
| `/workout/[id]` | Auth | Workout editor: title, items, share toggle, delete |
| `/p/[slug]` | Public | Read-only public workout page |
| `/workout-in-progress/[workoutId]` | Auth | Active session page: view items, log sets, complete session **(NEW)** |

### 8.2 Layout & Navigation

- Global layout: `app/layout.tsx`
- Header with app name, login/logout/account & theme toggle
- `app/(auth)/login`, `app/(auth)/register`

### 8.3 Components

> All component files use kebab-case naming (e.g. `workout-list.tsx`, not `WorkoutList.tsx`).

**components/workout-list.tsx**
Props: `workouts: Workout[]`. Renders list of workouts with links to `/workout/[id]`. Shows title and last updated date.

**components/create-workout-button.tsx**
Client button that calls `POST /api/workouts` and navigates to the new workout editor.

**components/workout-editor.tsx**
Props: `workoutId`, `initialTitle`, `initialIsPublic`, `initialSlug`, `savedItems`. Inline-editable title, save button, share toggle, delete button with confirmation, and list of Workout Items. Includes a **Start Session** button that triggers `POST /api/workouts/:id/sessions` and navigates to `/workout-in-progress/[workoutId]`.

**components/add-workout-item-modal.tsx**
Two-tab modal (New exercise / Existing exercise) built with shadcn Tabs. Calls `onAdd` with a `PendingWorkoutItem`; actual API calls happen on save in `workout-editor`.

**components/exercises-manager.tsx**
Full CRUD for the exercises library. Supports image upload, bulk select/delete, and inline edit via modal.

**components/workout-in-progress-view.tsx**
Props: `workoutId`, `sessionId`, `workoutItems: WorkoutItem[]`, `sets: WorkoutInProgressSet[]`.
- Renders each Workout Item (exercise name + target sets from template)
- Allows the user to edit actual reps/weight for each set in the active session
- Changes call `PATCH /api/workouts/:id/sessions/:sessionId` to persist set updates
- Provides a **Complete Session** button that sets `isActive: false`, `completedAt`, and `durationSeconds`
- Shows a session timer (elapsed time since `startedAt`)

**components/start-session-button.tsx**
Client button shown on the `/workout/[id]` page. Calls `POST /api/workouts/:id/sessions` and navigates to `/workout-in-progress/[workoutId]`.

**components/profile-dropdown.tsx**
Props: `name`, `email`. Avatar button (initials) with shadcn DropdownMenu. Shows user name/email and Log out action.

**components/modal.tsx**
Generic modal wrapper. Props: `open`, `onClose`, `title`, `children`.

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
| 1.0 | 2025-01-01 | Initial specification |
| 2.0 | March 2026 | Added WorkoutInProgress feature: new DB tables (`workout_in_progress`, `workout_in_progress_set`), new API endpoints (§7.6), new route `/workout-in-progress/[workoutId]`, new components (`workout-in-progress-view`, `start-session-button`), updated security and indexes sections |
| 2.1 | March 2026 | Migrated DB from SQLite (`bun:sqlite`) to PostgreSQL (`pg`); added `image_url` to `workout` table; added `note TEXT` to `workout_item`; added `is_complete BOOLEAN` to `workout_in_progress_set`; updated all SQL to use PostgreSQL types (`BOOLEAN`, `TIMESTAMPTZ`) |
