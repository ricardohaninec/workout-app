# Technical Specification – Note Taking Web App

## 1. Overview

A web application where authenticated users can create, view, edit, delete, and publicly share workouts. Workouts are created with custom components and then stored as JSON in a SQLite database, and rendered in the browser.

### Core Features

- User authentication (sign up, login, logout) via better-auth
- Authenticated note management (CRUD)
- One Workout can have many Workout Items
- One Workout Item references exactly one Exercise and owns its own Sets
- Exercises are reusable templates (title only — no sets stored on the exercise itself)
- Public sharing of workouts via a public URL (toggle on/off)

### Tech

- Next.js (App Router) + Bun runtime
- TypeScript
- TailwindCSS 4
- SQLite via `bun:sqlite` (Bun's built-in SQLite) with raw SQL
- shadcn/ui component library

---

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching
  - Client components for Workouts and exercises editor and interactive UI
  - Route Handlers (`app/api/.../route.ts`) for JSON APIs
- **Runtime:** Bun (for dev & production)
- **Database:** Single SQLite file (`data/app.db`) accessed via `bun:sqlite`
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

- Raw SQL queries executed via `bun:sqlite`
- A small helper module for DB access (`lib/db.ts`)

---

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

- Load workout editor so you can add Workout Items (each linking an Exercise + its sets)

**Update Workout:**

- Change title
- Add / remove Workout Items
- Auto-update `updated_at`

**Delete Workout:**

- Hard delete — cascades to all associated Workout Items and their Sets
- The referenced Exercises are NOT deleted

**Create a new Exercise:**

- Default title: "Untitled Exercise"
- Exercises are simple templates — they hold no set data

**View a list of own Exercises:**

- Show title, last updated at

**View a single Exercise:**

- Load exercise editor to rename it

**Update Exercise:**

- Change title
- Auto-update `updated_at`

**Delete Exercise:**

- Hard delete of the exercise record only
- Workout Items that referenced this exercise are NOT automatically deleted (handle via FK constraint or application logic)

### 3.3 Workout Sharing

Users can toggle workout "public sharing":

**When enabled:**

- Workout gets a unique public slug (e.g. `abcdef1234`)
- Accessible via `/p/{slug}` for anonymous users

**When disabled:**

- Public URL returns 404 / "Note not found"

**Public page rendering:**

- Reads workout from DB by `public_slug`
- Shows title and all Workout Items (exercise name + sets) in read-only mode
- No editing or owner information necessary

---

## 4. Non-Functional Requirements

**Performance**

- Workout list & workout view should load under ~300 ms for typical DB sizes

**Security**

- All workout operations are scoped to authenticated user's `user_id`
- Public workouts are read-only; no leaked private data in API responses

**Reliability**

- Graceful handling of DB errors

**Maintainability**

- Type-safe APIs and DB types
- Modularized DB and auth helpers

**UX**

- Simple, minimal UI with keyboard-friendly editor

---

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

| Field         | Type    | Description                                            |
| ------------- | ------- | ------------------------------------------------------ |
| id            | TEXT    | Unique identifier for each user (primary key)          |
| name          | TEXT    | User's chosen display name                             |
| email         | TEXT    | User's email address for communication and login       |
| emailVerified | INTEGER | Whether the user's email is verified (0 or 1)          |
| image         | TEXT    | User's image URL (optional)                            |
| createdAt     | TEXT    | Timestamp of when the user account was created         |
| updatedAt     | TEXT    | Timestamp of the last update to the user's information |

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

| Field     | Type | Description                                         |
| --------- | ---- | --------------------------------------------------- |
| id        | TEXT | Unique identifier for each session (primary key)    |
| userId    | TEXT | The ID of the user (foreign key)                    |
| token     | TEXT | The unique session token                            |
| expiresAt | TEXT | The time when the session expires                   |
| ipAddress | TEXT | The IP address of the device (optional)             |
| userAgent | TEXT | The user agent information of the device (optional) |
| createdAt | TEXT | Timestamp of when the session was created           |
| updatedAt | TEXT | Timestamp of when the session was updated           |

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

| Field                 | Type | Description                                                                         |
| --------------------- | ---- | ----------------------------------------------------------------------------------- |
| id                    | TEXT | Unique identifier for each account (primary key)                                    |
| userId                | TEXT | The ID of the user (foreign key)                                                    |
| accountId             | TEXT | The ID of the account as provided by SSO or equal to userId for credential accounts |
| providerId            | TEXT | The ID of the provider (e.g., "credential", "google", "github")                     |
| accessToken           | TEXT | The access token returned by the provider (optional)                                |
| refreshToken          | TEXT | The refresh token returned by the provider (optional)                               |
| accessTokenExpiresAt  | TEXT | The time when the access token expires (optional)                                   |
| refreshTokenExpiresAt | TEXT | The time when the refresh token expires (optional)                                  |
| scope                 | TEXT | The scope of the account returned by the provider (optional)                        |
| idToken               | TEXT | The ID token returned from the provider (optional)                                  |
| password              | TEXT | The hashed password for email/password authentication (optional)                    |
| createdAt             | TEXT | Timestamp of when the account was created                                           |
| updatedAt             | TEXT | Timestamp of when the account was updated                                           |

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

| Field      | Type | Description                                            |
| ---------- | ---- | ------------------------------------------------------ |
| id         | TEXT | Unique identifier for each verification (primary key)  |
| identifier | TEXT | The identifier for the verification request            |
| value      | TEXT | The value to be verified                               |
| expiresAt  | TEXT | The time when the verification request expires         |
| createdAt  | TEXT | Timestamp of when the verification request was created |
| updatedAt  | TEXT | Timestamp of when the verification request was updated |

---

#### Workout, Workout Items, Exercises, and Sets

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
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE workout_item (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workout_id) REFERENCES workout(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercise(id)
);

CREATE TABLE workout_item_set (
  id TEXT PRIMARY KEY,
  workout_item_id TEXT NOT NULL,
  reps INTEGER NOT NULL DEFAULT 1,
  weight REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_item_id) REFERENCES workout_item(id) ON DELETE CASCADE
);
```

**workout**

| Field       | Type    | Description                                      |
| ----------- | ------- | ------------------------------------------------ |
| id          | TEXT    | Unique identifier for each workout (primary key) |
| user_id     | TEXT    | Owner of the workout (foreign key → user.id)     |
| title       | TEXT    | The name of the workout                          |
| is_public   | INTEGER | Whether the workout is publicly shared (0 or 1)  |
| public_slug | TEXT    | Unique slug for the public URL (optional)        |
| created_at  | TEXT    | Timestamp of when the workout was created        |
| updated_at  | TEXT    | Timestamp of when the workout was last updated   |

**exercise**

Exercises are reusable templates. They store identity, title, and an optional image URL — no set data.

| Field      | Type | Description                                       |
| ---------- | ---- | ------------------------------------------------- |
| id         | TEXT | Unique identifier for each exercise (primary key) |
| user_id    | TEXT | Owner of the exercise (foreign key → user.id)     |
| title      | TEXT | The name of the exercise                          |
| image_url  | TEXT | Optional path to an uploaded exercise image       |
| created_at | TEXT | Timestamp of when the exercise was created        |
| updated_at | TEXT | Timestamp of when the exercise was last updated   |

**workout_item**

A Workout Item is the join between a Workout and an Exercise. Each item represents one exercise slot within a specific workout and owns its own set data.

| Field       | Type    | Description                                                                |
| ----------- | ------- | -------------------------------------------------------------------------- |
| id          | TEXT    | Unique identifier (primary key)                                            |
| workout_id  | TEXT    | Reference to the parent workout (foreign key → workout.id, CASCADE DELETE) |
| exercise_id | TEXT    | Reference to the exercise template (foreign key → exercise.id)             |
| position    | INTEGER | Display order within the workout                                           |
| created_at  | TEXT    | Timestamp of when the item was created                                     |
| updated_at  | TEXT    | Timestamp of when the item was last updated                                |

**workout_item_set**

Sets belong to a Workout Item, not to the Exercise. This allows the same exercise to appear in different workouts with different sets each time.

| Field           | Type    | Description                                                                          |
| --------------- | ------- | ------------------------------------------------------------------------------------ |
| id              | TEXT    | Unique identifier (primary key)                                                      |
| workout_item_id | TEXT    | Reference to the parent workout item (foreign key → workout_item.id, CASCADE DELETE) |
| reps            | INTEGER | Number of reps for this set                                                          |
| weight          | REAL    | Weight for this set (kg)                                                             |
| position        | INTEGER | Display order within the workout item                                                |

> **Cascade behaviour:** Deleting a `workout` automatically deletes all its `workout_item` rows (via `ON DELETE CASCADE`), which in turn automatically deletes all `workout_item_set` rows. The `exercise` record is never deleted by this cascade.

### 5.2 Indexes

```sql
CREATE INDEX idx_workout_user_id ON workout(user_id);
CREATE INDEX idx_workout_title ON workout(title);
CREATE INDEX idx_workout_created_at ON workout(created_at);
CREATE UNIQUE INDEX idx_workout_public_slug ON workout(public_slug);

CREATE INDEX idx_exercise_user_id ON exercise(user_id);
CREATE INDEX idx_exercise_title ON exercise(title);

CREATE INDEX idx_workout_item_workout_id ON workout_item(workout_id);
CREATE INDEX idx_workout_item_exercise_id ON workout_item(exercise_id);

CREATE INDEX idx_workout_item_set_workout_item_id ON workout_item_set(workout_item_id);
```

### 5.3 DB Initialization Scripts

- `scripts/init-db.ts` — creates all tables and indexes from scratch
- `scripts/migrate-workout-items.ts` — migration that restructures the old `workout_exercise` junction + `exercise_set` tables into the new `workout_item` + `workout_item_set` tables

---

## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize `bun:sqlite` `Database` with DB file (`data/app.db`)
- Export helper functions:
  - `getDb()` – returns singleton DB connection
  - `query<T>(sql, params?): T[]`
  - `get<T>(sql, params?): T | undefined`
  - `run(sql, params?)`

---

## 7. API Design (Next.js Route Handlers)

### 7.1 Authentication Access

Implement a server helper from better-auth like `getCurrentUser()` or `getSession()`.

All `/api/workouts` and `/api/exercises` handlers (except public read) must:

- Check auth
- Return 401 if not authenticated

---

### 7.2 Exercises Endpoints

Exercises are reusable templates — they have no sets of their own.

---

#### GET /api/exercises

**Description:** List all exercises for the authenticated user.

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

---

#### POST /api/exercises

**Description:** Create a new exercise template.

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

---

#### POST /api/exercises/upload

**Description:** Upload an image for an exercise. Returns the public URL to store on the exercise record.

- Accepted types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max size: 5 MB
- Files saved to `public/uploads/exercises/` with a UUID filename

**Request:** `multipart/form-data` with a `file` field.

**Response 201:**

```json
{ "url": "/uploads/exercises/uuid.jpg" }
```

---

#### PATCH /api/exercises/:id

**Description:** Update an exercise title and/or image.

**Request Body:**

```json
{
  "title": "Incline Bench Press",
  "image_url": "/uploads/exercises/uuid.jpg"
}
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

---

#### DELETE /api/exercises/:id

**Description:** Delete an exercise template. Workout Items referencing this exercise are NOT automatically deleted.

**Response 200:**

```json
{
  "message": "Exercise deleted successfully."
}
```

---

### 7.3 Workouts Endpoints

---

#### GET /api/workouts

**Description:** List all workouts for the authenticated user.

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

**Description:** Get a single workout with all its Workout Items, each including the linked exercise and its sets.

**Response 200:**

```json
{
  "id": "workout-id",
  "title": "Push Day",
  "workoutItems": [
    {
      "id": "item-id",
      "position": 0,
      "exercise": {
        "id": "exercise-id",
        "title": "Bench Press"
      },
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

**Description:** Delete a workout. Cascades to all associated Workout Items and their Sets. The referenced Exercises are NOT deleted.

**Response 200:**

```json
{
  "message": "Workout deleted successfully."
}
```

---

### 7.4 Workout Items Endpoints

Workout Items are managed under the workout they belong to.

---

#### POST /api/workouts/:id/items

**Description:** Add a new Workout Item to a workout — links an exercise and creates its sets.

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
  "exercise": {
    "id": "exercise-id",
    "title": "Bench Press"
  },
  "sets": [
    { "id": "set-id", "reps": 10, "weight": 80.0, "position": 0 },
    { "id": "set-id-2", "reps": 8, "weight": 85.0, "position": 1 }
  ]
}
```

---

#### PATCH /api/workouts/:id/items/:itemId

**Description:** Update a Workout Item's position and/or sets. Sets are replaced wholesale.

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

---

#### DELETE /api/workouts/:id/items/:itemId

**Description:** Remove a Workout Item (and all its Sets) from a workout. The referenced Exercise is NOT deleted.

**Response 200:**

```json
{
  "message": "Workout item removed successfully."
}
```

---

### 7.5 Public Workout Endpoint

#### GET /api/public-workouts/:slug

**Description:** Read-only access to a public workout. Returns the same shape as `GET /api/workouts/:id`.

- Returns 404 if slug not found or `is_public = 0`

_(Or skip this API endpoint and resolve directly in the `/p/[slug]` route using server components.)_

---

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
  - Add Workout Item via modal (pick an Exercise, configure sets)
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

> All component files use kebab-case naming (e.g. `workout-list.tsx`, not `WorkoutList.tsx`).

**components/workout-list.tsx**

- Props: `workouts: Workout[]`
- Renders list of workouts with links to `/workout/[id]`
- Shows title and last updated date

**components/create-workout-button.tsx**

- Client button that calls `POST /api/workouts` and navigates to the new workout editor

**components/workout-editor.tsx**

- Props: `workoutId`, `initialTitle`, `initialIsPublic`, `initialSlug`, `savedItems`
- Inline-editable title, Save button (shown when dirty)
- Share toggle — enables public URL and shows a copy-link banner
- Delete button with confirmation modal (via `components/modal.tsx`)
- List of Workout Items showing exercise name + sets
- Uses `add-workout-item-modal` to add new items

**components/add-workout-item-modal.tsx**

- Props: `onAdd: (item: PendingWorkoutItem) => void`
- Two-tab modal ("New exercise" / "Existing exercise") built with shadcn Tabs
- New tab: exercise title + dynamic set rows (reps × weight)
- Existing tab: searchable list of user's exercises, then configure sets
- Calls `onAdd` with a `PendingWorkoutItem` object; actual API calls happen on save in `workout-editor`

**components/attach-exercise-modal.tsx**

- Modal for attaching an existing exercise to a workout item

**components/exercises-manager.tsx**

- Props: `initial: Exercise[]`
- Full CRUD for the exercises library (on `/dashboard` exercises tab)
- Create/edit supports optional image upload (via `POST /api/exercises/upload`)
- Displays exercise thumbnail when `image_url` is set
- Delete (single and bulk) via inline modals
- Bulk select mode with checkboxes (shadcn Checkbox)
- Uses `components/modal.tsx` and shadcn Input/Label/Button

**components/profile-dropdown.tsx**

- Props: `name`, `email`
- Avatar button (initials) with shadcn DropdownMenu
- Shows user name/email and Log out action

**components/modal.tsx**

- Generic modal wrapper used by workout-editor, add-workout-item-modal, exercises-manager
- Props: `open`, `onClose`, `title`, `children`

**components/workout-title-editor.tsx**

- Inline-editable title input for the workout editor

### 8.4 shadcn/ui Components (`components/ui/`)

Installed via shadcn CLI and customized as needed:

- `button.tsx` — Button with variants (default, outline, ghost, destructive) and sizes
- `input.tsx` — Styled text/number input
- `label.tsx` — Form label
- `tabs.tsx` — Tabs, TabsList, TabsTrigger, TabsContent
- `checkbox.tsx` — Checkbox with checked state
- `dialog.tsx` — Dialog primitives (available but Modal.tsx is used instead)
- `dropdown-menu.tsx` — DropdownMenu and related sub-components

---

## 10. Styling (TailwindCSS 4 + shadcn/ui)

- TailwindCSS 4 via PostCSS (`@tailwindcss/postcss`)
- shadcn/ui provides design tokens (CSS variables) for colors, radius, etc.
- `tw-animate-css` for animation utilities
- `tailwind-merge` + `clsx` + `class-variance-authority` used by shadcn components for conditional class merging
- Minimal design: neutral backgrounds, card-style bordered containers, no heavy color usage

---

## 11. Security Considerations

**Auth enforcement**

- All `/dashboard` and `/workout/[id]` routes check auth on server
- API routes verify user and attach `userId` from session

**Authorization**

- Every workout and exercise query in the auth context filters by `user_id`

**Public workouts**

- Slug should be sufficiently random to prevent guessing (e.g. 16+ chars)

**XSS**

- Primary data is structured JSON, not raw HTML
- No arbitrary `dangerouslySetInnerHTML` with unsanitized data

**Rate limiting (optional enhancement)**

- Apply per-IP or per-user rate limiting to API routes if exposed publicly

---

## 12. Development Workflow

```bash
bun dev             # Start dev server at http://localhost:8080
bun run build       # Production build
bun run lint        # ESLint
bun run db:init     # Initialize DB (scripts/init-db.ts)
bun run db:migrate  # Run migrations (scripts/migrate-workout-items.ts)
```

### Setup Order

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS 4
3. Install and configure shadcn/ui
4. Integrate better-auth and session handling
5. Implement SQLite DB initialization via `scripts/init-db.ts`
6. Build DB helpers (`lib/db.ts`) and type definitions (`lib/types.ts`)
7. Implement workout, workout item, and exercise API routes
8. Build dashboard, workout editor, and exercises library pages
9. Implement public workout pages `/p/[slug]`
10. Add polish (loading states, confirmation modals, error handling)
