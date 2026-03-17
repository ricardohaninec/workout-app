# CHATAI.md — AI Workout Generator

## 1. Overview & User Flow

A floating Sparkles button appears in the bottom-right corner of every page. The user:

1. Clicks the button → panel expands
2. Types a fitness goal in natural language (e.g. "core training for lean abs")
3. Clicks **Generate** → server calls Claude + Pexels, returns a proposal
4. Reviews the structured workout (title, exercise cards with images, sets/reps/rest)
5. Clicks **Create Workout** → server writes to DB → redirects to `/workout/[id]`
6. Or clicks **Start Over** to discard and try a new goal

---

## 2. Architecture

```
app/layout.tsx
  └── <AiWorkoutFloatingChat />         (client component, fixed bottom-right)
        ├── POST /api/ai/generate       (server — Claude + Pexels, keys never leave server)
        └── POST /api/ai/commit         (server — DB writes, returns workoutId)
```

All API keys (`ANTHROPIC_API_KEY`, `PEXELS_API_KEY`) are only accessed via `process.env` inside server-side route handlers. They are **never** referenced in any `"use client"` file.

---

## 3. External Integrations

| Service | Usage | Where |
|---|---|---|
| Anthropic Claude (`claude-sonnet-4-6`) | Generate structured workout JSON from a goal string | `app/api/ai/generate/route.ts` |
| Pexels API | Fetch one square exercise image per exercise name | `lib/image-sourcing.ts` |

---

## 4. API Design

### `POST /api/ai/generate`

**Request:**
```json
{ "goal": "string" }
```

**Response:** `ProposedWorkout`
```json
{
  "title": "Core Strength Circuit",
  "goal": "core training for lean abs",
  "exercises": [
    { "name": "Plank", "sets": 3, "reps": 60, "rest_seconds": 30, "note": null, "image_url": "https://..." }
  ]
}
```

Auth required. Returns `401` if unauthenticated, `400` if `goal` missing, `502` if Claude returns unparseable JSON.

---

### `POST /api/ai/commit`

**Request:**
```json
{ "proposal": ProposedWorkout }
```

**Response:**
```json
{ "workoutId": "uuid" }
```

Auth required. Validates proposal with Zod, creates `workout`, `exercise` (or reuses existing), `workout_item`, and `workout_item_set` rows. Returns `401`/`400` on failure.

---

## 5. Component Design

### `components/ai-workout-floating-chat.tsx`

Client component mounted in the root layout. States:
- `input` — textarea + Generate button
- `loading` — spinner + "Finding best exercises…"
- `review` — `<AiWorkoutProposalModal>` inline (scrollable)
- `committing` — spinner + "Creating your workout…"

Uses two TanStack Query `useMutation`s:
- `generateMutation` → `generateWorkout(goal)` → sets `proposal` + `step = "review"`
- `commitMutation` → `commitWorkout(proposal)` → invalidates `workoutKeys.all`, pushes `/workout/[id]`

### `components/ai-workout-proposal-modal.tsx`

Props: `proposal`, `onConfirm`, `onReject`. Renders:
- Workout title (orange accent) + goal echo
- Scrollable list of exercise cards (thumbnail, name, sets × reps · rest, note)
- Footer: "Start Over" (ghost) + "Create Workout" (orange)

---

## 6. Data Types

```ts
type ProposedExercise = {
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  note: string | null;
  image_url: string | null;
};

type ProposedWorkout = {
  title: string;
  goal: string;
  exercises: ProposedExercise[];
};
```

Defined in `lib/types.ts`.

---

## 7. Exercise Matching Logic

In `POST /api/ai/commit`, before creating a new exercise:

```sql
SELECT id FROM exercise WHERE user_id = $1 AND LOWER(title) ILIKE $2 LIMIT 1
```

with `$2 = %{exercise name lowercased}%`.

- **Match found** → reuse existing `exercise.id` (never overwrite user's image)
- **No match** → `INSERT INTO exercise` with the Pexels image

This prevents duplicate exercises when the same goal is generated multiple times.

---

## 8. Image Sourcing

`lib/image-sourcing.ts` — server-only module:

```
GET https://api.pexels.com/v1/search?query={name}+exercise&per_page=1&orientation=square
Authorization: {PEXELS_API_KEY}
```

Returns `photos[0].src.medium` or `null` on any error/empty result. The UI shows `<PlaceholderImage />` (Dumbbell icon) when `image_url` is `null`.

---

## 9. Security

- `ANTHROPIC_API_KEY` and `PEXELS_API_KEY` are read exclusively via `process.env` in server-side handlers
- Both API routes check `auth.api.getSession({ headers: request.headers })` and return `401` if unauthenticated
- All incoming data is validated with Zod before use
- Client helpers in `lib/api/ai.ts` only call our own `/api/ai/*` endpoints — no external API keys in the browser

---

## 10. Environment Variables

Add to `.env.local` (server-side only, never commit):

```env
ANTHROPIC_API_KEY=   # Claude API key from console.anthropic.com
PEXELS_API_KEY=      # Pexels API key from www.pexels.com/api/
```
