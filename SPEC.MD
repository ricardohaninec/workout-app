# Technical Specification – Note Taking Web App

## 1. Overview

A web application where authenticated users can create, view, edit, delete, and publicly share workouts. Workouts are created with custom components and then stored as JSON in a SQLite database, and rendered in the browser.

### Core Features

- User authentication (sign up, login, logout) via better-auth
- Authenticated note management (CRUD)
- One Workout can have many exercises.
- One Exercise can be attached to many Workouts
- Public sharing of workouts via a public URL (toggle on/off)

### Tech

- Next.js (App Router) + Bun runtime
- TypeScript
- TailwindCSS 4
- SQLite via `better-sqlite3` with raw SQL
- shadcn/ui component library

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching
  - Client components for Workouts and exercises editor and interactive UI
  - Route Handlers (`app/api/.../route.ts`) for JSON APIs
- **Runtime:** Bun (for dev & production)
- **Database:** Single SQLite file (`data/app.db`) accessed via `better-sqlite3`
- **Auth:** better-auth integrated into Next.js (middleware + server helpers)

### 2.2 Application Layers

**Presentation layer**
- Next.js pages and components
- TailwindCSS 4 for styling
- shadcn/ui for UI primitives (Button, Input, Label, Tabs, Checkbox, Dialog, DropdownMenu)
- lucide-react for icons

**API layer**
- REST-like JSON endpoints for notes CRUD & sharing

**Data access layer**
- Raw SQL queries executed via `better-sqlite3`
- A small helper module for DB access (`lib/db.ts`)

## 3. Functional Requirements

### 3.1 Authentication

Users can:
- Register (email + password, minimum validation)
- Log in / log out

Authentication state is accessible on server (for SSR) and on client (for protected UI).

Unauthenticated users:
- Can access public shared note URLs (read-only)
- Cannot access dashboard or personal notes

### 3.2 Workouts and Exercises Management (Authenticated)

**Create a new Workout:**
- Default title: "Untitled Workout"

**View a list of own Workouts:**
- Show title, last updated at, shared status

**View a single Workout:**
- Load workout editor, so you can add more exercises to this workout

**Update workout:**
- Change title
- Adds new exercises
- Auto-update `updated_at`

**Delete workout:**
- Hard delete

**Create a new Exercise:**
- Default title: "Untitled Exercise"

**View a list of own Exercises:**
- Show title, last updated at, setsRep, weight

**View a single Exercise:**
- Load exercise editor, so you can edit a specific exercise

**Update Exercise:**
- Change title
- sets
- weight
- Auto-update `updated_at`

**Delete workout:**
- Hard delete


### 3.3 Workout Sharing

Users can toggle workout "public sharing":

**When enabled:**
- Workout gets a unique public slug (e.g. `abcdef1234`)
- Accessible via `/p/{slug}` for anonymous users

**When disabled:**
- Public URL returns 404 / "Note not found"

**Public page rendering:**
- Reads note from DB by `public_slug`
- Shows title and content in read-only mode
- No editing or owner information necessary

## 4. Non-Functional Requirements

**Performance**
- Workout list & workout view should load under ~300 ms for typical DB sizes

**Security**
- All workout operations are scoped to authenticated user's `user_id`
- Public workout are read-only; no leaked private data in API responses

**Reliability**
- Graceful handling of DB errors

**Maintainability**
- Type-safe APIs and DB types
- Modularized DB and auth helpers

**UX**
- Simple, minimal UI with keyboard-friendly editor

## 5. Data Model & Database Schema (SQLite)

### 5.1 Tables

#### better-auth Core Tables

better-auth manages its own tables for authentication. The following tables are required by better-auth:

**user**

```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each user (primary key) |
| name | TEXT | User's chosen display name |
| email | TEXT | User's email address for communication and login |
| emailVerified | INTEGER | Whether the user's email is verified (0 or 1) |
| image | TEXT | User's image URL (optional) |
| createdAt | TEXT | Timestamp of when the user account was created |
| updatedAt | TEXT | Timestamp of the last update to the user's information |

**session**

```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id)
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each session (primary key) |
| userId | TEXT | The ID of the user (foreign key) |
| token | TEXT | The unique session token |
| expiresAt | TEXT | The time when the session expires |
| ipAddress | TEXT | The IP address of the device (optional) |
| userAgent | TEXT | The user agent information of the device (optional) |
| createdAt | TEXT | Timestamp of when the session was created |
| updatedAt | TEXT | Timestamp of when the session was updated |

**account**

```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  idToken TEXT,
  password TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id)
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each account (primary key) |
| userId | TEXT | The ID of the user (foreign key) |
| accountId | TEXT | The ID of the account as provided by SSO or equal to userId for credential accounts |
| providerId | TEXT | The ID of the provider (e.g., "credential", "google", "github") |
| accessToken | TEXT | The access token returned by the provider (optional) |
| refreshToken | TEXT | The refresh token returned by the provider (optional) |
| accessTokenExpiresAt | TEXT | The time when the access token expires (optional) |
| refreshTokenExpiresAt | TEXT | The time when the refresh token expires (optional) |
| scope | TEXT | The scope of the account returned by the provider (optional) |
| idToken | TEXT | The ID token returned from the provider (optional) |
| password | TEXT | The hashed password for email/password authentication (optional) |
| createdAt | TEXT | Timestamp of when the account was created |
| updatedAt | TEXT | Timestamp of when the account was updated |

**verification**

```sql
CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each verification (primary key) |
| identifier | TEXT | The identifier for the verification request |
| value | TEXT | The value to be verified |
| expiresAt | TEXT | The time when the verification request expires |
| createdAt | TEXT | Timestamp of when the verification request was created |
| updatedAt | TEXT | Timestamp of when the verification request was updated |

#### Workout and exercises

```sql
CREATE TABLE workout (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  public_slug TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE exercise (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE exercise_set (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  weight REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exercise_id) REFERENCES exercise(id)
);

CREATE TABLE workout_exercise (
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  PRIMARY KEY (workout_id, exercise_id),
  FOREIGN KEY (workout_id) REFERENCES workout(id),
  FOREIGN KEY (exercise_id) REFERENCES exercise(id)
);
```

**workout**

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each workout (primary key) |
| user_id | TEXT | Owner of the workout (foreign key → user.id) |
| title | TEXT | The name of the workout |
| is_public | INTEGER | Whether the workout is publicly shared (0 or 1) |
| public_slug | TEXT | Unique slug for the public URL (optional) |
| created_at | TEXT | Timestamp of when the workout was created |
| updated_at | TEXT | Timestamp of when the workout was last updated |

**exercise**

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each exercise (primary key) |
| user_id | TEXT | Owner of the exercise (foreign key → user.id) |
| title | TEXT | The name of the exercise |
| created_at | TEXT | Timestamp of when the exercise was created |
| updated_at | TEXT | Timestamp of when the exercise was last updated |

**exercise_set** *(replaces simple sets/weights fields)*

Exercises support multiple set groups (e.g. warm-up sets + working sets), each stored as a row.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier (primary key) |
| exercise_id | TEXT | Reference to the exercise (foreign key → exercise.id) |
| sets | INTEGER | Number of reps/sets in this group |
| weight | REAL | Weight for this set group (kg) |
| position | INTEGER | Display order within the exercise |

**workout_exercise** *(junction table)*

| Field | Type | Description |
|-------|------|-------------|
| workout_id | TEXT | Reference to the workout (foreign key → workout.id) |
| exercise_id | TEXT | Reference to the exercise (foreign key → exercise.id) |


### 5.2 Indexes
```sql
CREATE INDEX idx_workout_user_id ON workout(user_id);
CREATE INDEX idx_workout_title ON workout(title);
CREATE INDEX idx_workout_created_at ON workout(created_at);
CREATE UNIQUE INDEX idx_workout_public_slug ON workout(public_slug);

CREATE INDEX idx_exercise_user_id ON exercise(user_id);
CREATE INDEX idx_exercise_title ON exercise(title);

CREATE INDEX idx_exercise_set_exercise_id ON exercise_set(exercise_id);

CREATE INDEX idx_workout_exercise_workout_id ON workout_exercise(workout_id);
CREATE INDEX idx_workout_exercise_exercise_id ON workout_exercise(exercise_id);
```

### 5.3 DB Initialization Scripts

- `scripts/init-db.ts` — creates all tables and indexes from scratch
- `scripts/migrate-exercise-sets.ts` — migration that moved exercise sets from inline columns to the `exercise_set` table

## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize `better-sqlite3` client with DB file (`data/app.db`)
- Export helper functions:
  - `getDb()` – returns singleton DB connection
  - `query<T>(sql, params?): T[]`
  - `get<T>(sql, params?): T | undefined`
  - `run(sql, params?)`

## 7. API Design (Next.js Route Handlers)

Base path under `/api/notes`.

### 7.1 Authentication Access

Implement a server helper from better-auth like `getCurrentUser()` or `getSession()`.

All `/api/notes` handlers (except public read) must:
- Check auth
- Return 401 if not authenticated

### 7.2 Endpoints

### API Endpoints

---

#### GET /api/workouts

**Description:** List all workouts.

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

---

#### GET /api/workouts/:id

**Description:** Get a single workout with its exercises.

**Response 200:**
```json
{
  "id": "workout-id",
  "title": "Push Day",
  "exercises": [
    {
      "id": "exercise-id",
      "title": "Bench Press",
      "setGroups": [
        { "id": "set-id", "sets": 4, "weight": 80.0, "position": 0 }
      ]
    }
  ],
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

---

#### POST /api/workouts

**Description:** Create a new workout.

**Request Body:**
```json
{
  "title": "Push Day"
}
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

---

#### PATCH /api/workouts/:id

**Description:** Update a workout title.

**Request Body:**
```json
{
  "title": "Push Day (Updated)"
}
```

**Response 200:**
```json
{
  "id": "workout-id",
  "title": "Push Day (Updated)",
  "updatedAt": "2025-01-01T13:00:00Z"
}
```

---

#### DELETE /api/workouts/:id

**Description:** Delete a workout and its exercise associations.

**Response 200:**
```json
{
  "message": "Workout deleted successfully."
}
```

---

#### GET /api/exercises

**Description:** List all exercises.

**Response 200:**
```json
[
  {
    "id": "exercise-id",
    "title": "Bench Press",
    "setGroups": [
      { "id": "set-id", "sets": 4, "weight": 80.0, "position": 0 }
    ],
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
]
```

---

#### POST /api/exercises

**Description:** Create a new exercise with one or more set groups.

**Request Body:**
```json
{
  "title": "Bench Press",
  "setGroups": [
    { "sets": 4, "weight": 80.0 }
  ]
}
```

**Response 201:**
```json
{
  "id": "exercise-id",
  "title": "Bench Press",
  "setGroups": [
    { "id": "set-id", "sets": 4, "weight": 80.0, "position": 0 }
  ],
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

---

#### PATCH /api/exercises/:id

**Description:** Update an exercise title and/or set groups. Set groups are replaced wholesale.

**Request Body:**
```json
{
  "title": "Bench Press",
  "setGroups": [
    { "sets": 5, "weight": 85.0 }
  ]
}
```

**Response 200:**
```json
{
  "id": "exercise-id",
  "title": "Bench Press",
  "setGroups": [
    { "id": "set-id", "sets": 5, "weight": 85.0, "position": 0 }
  ],
  "updatedAt": "2025-01-01T13:00:00Z"
}
```

---

#### DELETE /api/exercises/:id

**Description:** Delete an exercise.

**Response 200:**
```json
{
  "message": "Exercise deleted successfully."
}
```

---

#### POST /api/workouts/:id/exercises

**Description:** Attach an exercise to a workout.

**Request Body:**
```json
{
  "exerciseId": "exercise-id"
}
```

**Response 201:**
```json
{
  "message": "Exercise added to workout successfully."
}
```

---

#### DELETE /api/workouts/:id/exercises/:exerciseId

**Description:** Remove an exercise from a workout.

**Response 200:**
```json
{
  "message": "Exercise removed from workout successfully."
}
```


### 7.3 Public Workout Endpoint

#### GET /api/public-workouts/:slug

use the same response from GET /api/workouts/:id. 
**Description:** Read-only access to public workouts.


- 404 if slug not found or `is_public = 0`

(Or skip this API and just resolve directly in the `/p/[slug]` route using server components.)

## 8. Frontend – Pages & Components

### 8.1 Routes

Assuming Next.js App Router structure:

- `/` – Landing page
  - Marketing / "Log in / Sign up" CTA
- `/dashboard` – Authenticated area
  - List of user workouts
  - "Create workout" button
- `/workout/[id]` – Authenticated workout editor page
  - Title field
  - Add Exercise or Search Exercise from a Modal.
  - Share toggle
  - Delete button
- `/p/[slug]` – Public workout page
  - Read-only content
  - No nav to user-specific area if viewer is unauthenticated

### 8.2 Layout & Navigation

- Global layout: `app/layout.tsx`
  - Header with app name, login/logout/account & theme
- `app/(auth)/login`, `app/(auth)/register` (if better-auth doesn't provide their own UI)

### 8.3 Components

**components/WorkoutList.tsx**
- Props: `workouts: Workout[]`
- Renders list of workouts with links to `/workout/[id]`
- Shows title and last updated date

**components/CreateWorkoutButton.tsx**
- Client button that calls `POST /api/workouts` and navigates to the new workout editor

**components/WorkoutEditor.tsx**
- Props: `workoutId`, `initialTitle`, `initialIsPublic`, `initialSlug`, `savedExercises`
- Inline-editable title, Save button (shown when dirty)
- Share toggle — enables public URL and shows a copy-link banner
- Delete button with confirmation modal (via `components/Modal.tsx`)
- Exercise list showing saved exercises and pending (unsaved) exercises
- Uses `AttachExerciseModal` to add exercises

**components/AttachExerciseModal.tsx**
- Props: `onAdd: (exercise: PendingExercise) => void`
- Two-tab modal ("New exercise" / "Existing exercise") built with shadcn Tabs
- New tab: title + dynamic set groups (sets × weight)
- Existing tab: searchable list of user's exercises
- Calls `onAdd` with a `PendingExercise` object; actual API calls happen on save in `WorkoutEditor`

**components/ExercisesManager.tsx**
- Props: `initial: Exercise[]`
- Full CRUD for the exercises library (on `/dashboard` exercises tab)
- Create, edit, delete (single and bulk) via inline modals
- Bulk select mode with checkboxes (shadcn Checkbox)
- Uses `components/Modal.tsx` and shadcn Input/Label/Button

**components/ProfileDropdown.tsx**
- Props: `name`, `email`
- Avatar button (initials) with shadcn DropdownMenu
- Shows user name/email and Log out action

**components/Modal.tsx**
- Generic modal wrapper used by WorkoutEditor, AttachExerciseModal, ExercisesManager
- Props: `open`, `onClose`, `title`, `children`

### 8.4 shadcn/ui Components (`components/ui/`)

Installed via shadcn CLI and customized as needed:

- `button.tsx` — Button with variants (default, outline, ghost, destructive) and sizes
- `input.tsx` — Styled text/number input
- `label.tsx` — Form label
- `tabs.tsx` — Tabs, TabsList, TabsTrigger, TabsContent
- `checkbox.tsx` — Checkbox with checked state
- `dialog.tsx` — Dialog primitives (available but Modal.tsx is used instead)
- `dropdown-menu.tsx` — DropdownMenu and related sub-components

## 10. Styling (TailwindCSS 4 + shadcn/ui)

- TailwindCSS 4 via PostCSS (`@tailwindcss/postcss`)
- shadcn/ui provides design tokens (CSS variables) for colors, radius, etc.
- `tw-animate-css` for animation utilities
- `tailwind-merge` + `clsx` + `class-variance-authority` used by shadcn components for conditional class merging
- Minimal design: neutral backgrounds, card-style bordered containers, no heavy color usage

## 11. Security Considerations

**Auth enforcement**
- All `/dashboard` and `/notes/[id]` routes check auth on server
- API routes verify user and attach `userId` from session

**Authorization**
- Every note query in the auth context filters by `user_id`

**Public notes**
- Slug should be sufficiently random to prevent guessing (e.g. 16+ chars)

**XSS**
- Primary data is TipTap JSON, not raw HTML
- When rendering to HTML, only use TipTap's rendering (no arbitrary `dangerouslySetInnerHTML` with unsanitized data)

**Rate limiting (optional enhancement)**
- Apply per-IP or per-user rate limiting to API routes if exposed publicly

## 12. Development Workflow

```bash
bun dev          # Start dev server at http://localhost:8080
bun run build    # Production build
bun run lint     # ESLint
bun run db:init  # Initialize DB (scripts/init-db.ts)
bun run db:migrate  # Run migrations (scripts/migrate-exercise-sets.ts)
```

### Setup Order

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS 4
3. Install and configure shadcn/ui
4. Integrate better-auth and session handling
5. Implement SQLite DB initialization via `scripts/init-db.ts`
6. Build DB helpers (`lib/db.ts`) and type definitions (`lib/types.ts`)
7. Implement workout and exercise API routes
8. Build dashboard, workout editor, and exercises library pages
9. Implement public workout pages `/p/[slug]`
10. Add polish (loading states, confirmation modals, error handling)
