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
- TailwindCSS
- SQLite via Bun's SQLite client with raw SQL

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching
  - Client components for Workouts and exercises editor and interactive UI
  - Route Handlers (`app/api/.../route.ts`) for JSON APIs
- **Runtime:** Bun (for dev & production)
- **Database:** Single SQLite file (e.g., `data/app.db`) accessed via Bun's SQLite client
- **Auth:** better-auth integrated into Next.js (middleware + server helpers)

### 2.2 Application Layers

**Presentation layer**
- Next.js pages and components
- TailwindCSS for styling
- TipTap editor component

**API layer**
- REST-like JSON endpoints for notes CRUD & sharing

**Data access layer**
- Raw SQL queries executed via Bun's SQLite client
- A small helper module for DB access

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
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE exercise (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 0,
  weights REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE workout_exercise (
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  PRIMARY KEY (workout_id, exercise_id),
  FOREIGN KEY (workout_id) REFERENCES workout(id),
  FOREIGN KEY (exercise_id) REFERENCES exercise(id)
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each workout (primary key) |
| title | TEXT | The name of the workout |
| created_at | TEXT | Timestamp of when the workout was created |
| updated_at | TEXT | Timestamp of when the workout was last updated |

**exercise**

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each exercise (primary key) |
| title | TEXT | The name of the exercise |
| sets | INTEGER | Number of sets for the exercise |
| weights | REAL | Weight used for the exercise (in kg/lbs) |
| created_at | TEXT | Timestamp of when the exercise was created |
| updated_at | TEXT | Timestamp of when the exercise was last updated |

**workout_exercise** *(junction table)*

| Field | Type | Description |
|-------|------|-------------|
| workout_id | TEXT | Reference to the workout (foreign key → workout.id) |
| exercise_id | TEXT | Reference to the exercise (foreign key → exercise.id) |


### 5.2 Indexes
```sql
CREATE INDEX idx_workout_title ON workout(title);
CREATE INDEX idx_workout_created_at ON workout(created_at);

CREATE INDEX idx_exercise_title ON exercise(title);

CREATE INDEX idx_workout_exercise_workout_id ON workout_exercise(workout_id);
CREATE INDEX idx_workout_exercise_exercise_id ON workout_exercise(exercise_id);
```

## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize Bun SQLite client with DB file (`app.db`)
- Export helper functions such as:
  - `getDb()` – returns singleton DB connection
  - Utility wrappers for:
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
      "sets": 4,
      "weights": 80.0
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
    "sets": 4,
    "weights": 80.0,
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
]
```

---

#### POST /api/exercises

**Description:** Create a new exercise.

**Request Body:**
```json
{
  "title": "Bench Press",
  "sets": 4,
  "weights": 80.0
}
```

**Response 201:**
```json
{
  "id": "exercise-id",
  "title": "Bench Press",
  "sets": 4,
  "weights": 80.0,
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

---

#### PATCH /api/exercises/:id

**Description:** Update an exercise.

**Request Body:**
```json
{
  "title": "Bench Press",
  "sets": 5,
  "weights": 85.0
}
```

**Response 200:**
```json
{
  "id": "exercise-id",
  "title": "Bench Press",
  "sets": 5,
  "weights": 85.0,
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
### Components
**components/WorkoutList.tsx**
- Props: `workouts: { id, title, createdAt, updatedAt }[]`
- Renders list of workouts with links to `/workouts/[id]`
- Shows workout title and last updated date

**components/WorkoutCard.tsx**
- Props: `workout: { id, title, exercises: [], createdAt, updatedAt }`
- Displays workout title and a summary of attached exercises
- Contains edit and delete action buttons

**components/CreateWorkoutForm.tsx**
- Controlled form with a `title` input field
- On submit calls `POST /api/workouts`
- Clears form and refreshes workout list on success

**components/EditWorkoutForm.tsx**
- Props: `workout: { id, title }`
- Pre-fills form with existing workout data
- On submit calls `PATCH /api/workouts/:id`

**components/DeleteWorkoutButton.tsx**
- Props: `workoutId: string`
- Shows confirmation dialog before calling `DELETE /api/workouts/:id`
- Redirects to `/workouts` on success

**components/ExerciseList.tsx**
- Props: `exercises: { id, title, sets, weights }[]`
- Renders a list or table of exercises with sets and weights
- Each row has edit and delete action buttons

**components/ExerciseCard.tsx**
- Props: `exercise: { id, title, sets, weights }`
- Displays exercise title, sets, and weights
- Contains edit and delete action buttons

**components/CreateExerciseForm.tsx**
- Controlled form with `title`, `sets`, and `weights` input fields
- On submit calls `POST /api/exercises`
- Clears form and refreshes exercise list on success

**components/EditExerciseForm.tsx**
- Props: `exercise: { id, title, sets, weights }`
- Pre-fills form with existing exercise data
- On submit calls `PATCH /api/exercises/:id`

**components/DeleteExerciseButton.tsx**
- Props: `exerciseId: string`
- Shows confirmation dialog before calling `DELETE /api/exercises/:id`
- Removes exercise from list on success

**components/AttachExerciseModal.tsx**
- Props: `workoutId: string`
- Lists available exercises to select from
- On confirm calls `POST /api/workouts/:id/exercises`
- Refreshes workout exercise list on success

**components/DetachExerciseButton.tsx**
- Props: `workoutId: string, exerciseId: string`
- Shows confirmation dialog before calling `DELETE /api/workouts/:id/exercises/:exerciseId`
- Removes exercise from workout view on success

### 9.2 Toolbar

Buttons:
- Bold, Italic
- H1, H2, H3, paragraph
- Bullet list
- Inline code
- Code block
- Horizontal rule

Each button calls the relevant TipTap chain: `editor.chain().focus().toggleBold().run()` etc.

## 10. Styling (TailwindCSS)

- Configure Tailwind in `tailwind.config.ts`
- Use a minimal design:
  - Neutral background, card-like note container
  - Utility classes on components
- Consider a prose style for read-only content (using `@tailwindcss/typography`)

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

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS
3. Integrate better-auth and session handling
4. Implement SQLite DB initialization and migrations (e.g. via a `scripts/init-db.ts` or manual `.sql`)
5. Build DB helpers and note repository
6. Implement `/api/notes` and sharing APIs
7. Build dashboard and note editor pages
8. Integrate TipTap editor and toolbar
9. Implement public note pages `/p/[slug]`
10. Add polish (loading states, toast messages, error handling)
