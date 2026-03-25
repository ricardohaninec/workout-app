# CHATAI.md — AI Assistant (Workout + Nutrition)

## 1. Overview & User Flow

A floating Sparkles button appears in the bottom-right corner of every authenticated page. The panel has two modes switchable via tabs: **Workout** and **Nutrition**.

> **Visibility rule:** The component returns `null` on any route starting with `/p/` (public shared workout pages). Unauthenticated visitors on public routes must not see or interact with the AI panel.

### Workout Mode
1. Clicks the button → panel expands, Workout tab active
2. Types a fitness goal in natural language (e.g. "core training for lean abs")
3. Clicks **Generate** → server calls Claude + Pexels, returns a proposal
4. Reviews the structured workout (title, exercise cards with images, sets/reps/rest)
5. Clicks **Create Workout** → server writes to DB → redirects to `/workout/[id]`
6. Or clicks **Start Over** to discard and try a new goal

### Nutrition Mode
1. Switches to **Nutrition** tab
2. Types a food query (e.g. "nutrients of a walnut")
3. Clicks **Look Up** → server calls Claude, returns per-100g nutrition data
4. Reviews the proposal card: macros, unit selector, live calculator, follow-up input
5. Optionally: type a follow-up (e.g. "roasted instead of raw") → Claude updates the proposal
6. Clicks **Save to Library** → food is saved to the `foods` table
7. Or clicks **Start Over** to discard

---

## 2. Architecture

```
app/layout.tsx
  └── <AiWorkoutFloatingChat />         (client component, fixed bottom-right)
        ├── POST /api/ai/generate       (server — Claude + Pexels, returns ProposedWorkout)
        ├── POST /api/ai/commit         (server — DB writes, returns workoutId)
        ├── POST /api/ai/food           (server — Claude nutrition lookup, returns ProposedFood)
        └── POST /api/foods             (server — saves food to foods table, reuses existing endpoint)
```

All API keys (`ANTHROPIC_API_KEY`, `PEXELS_API_KEY`) are only accessed via `process.env` inside server-side route handlers. They are **never** referenced in any `"use client"` file.

---

## 3. External Integrations

| Service | Usage | Where |
|---|---|---|
| Anthropic Claude (`claude-sonnet-4-6`) | Generate structured workout JSON from a goal string | `app/api/ai/generate/route.ts` |
| Anthropic Claude (`claude-sonnet-4-6`) | Look up per-100g nutrition data for a food query | `app/api/ai/food/route.ts` |
| Pexels API | Fetch one square exercise image per exercise name | `lib/image-sourcing.ts` |

---

## 4. API Design

### `POST /api/ai/food`

**Request:**
```json
{ "query": "string", "previous": ProposedFood | undefined }
```

**Response:** `ProposedFood`
```json
{
  "name": "Walnut",
  "query": "nutrients of a walnut",
  "calories_per_100g": 654,
  "protein_per_100g": 15.2,
  "carbs_per_100g": 13.7,
  "fat_per_100g": 65.2
}
```

`previous` is optional — when provided, Claude receives the prior food context so follow-up queries (e.g. "roasted instead") can update the proposal intelligently. Auth required. Returns `401`/`400`/`502` on failure.

---

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

Client component mounted in the root layout. Has two modes (`workout` | `food`) switchable via tabs.

Shared states: `step: "input" | "loading" | "review" | "committing"`, `mode`, `goal`, `error`

**Workout mutations:**
- `generateMutation` → `generateWorkout(goal)` → sets `proposal` + `step = "review"`
- `commitMutation` → `commitWorkout(proposal)` → invalidates `workoutKeys.all`, pushes `/workout/[id]`

**Food mutations:**
- `foodLookupMutation` → `lookupFood(query, previous?)` → sets `foodProposal` + `step = "review"`
- `foodSaveMutation` → `saveFood(food, unit, gramsPerUnit?)` → saves to food library, closes panel

Mode switching resets all state. The review panel renders `<AiWorkoutProposalModal>` in workout mode and `<AiFoodProposal>` in food mode.

### `components/ai-food-proposal.tsx`

Props: `proposal`, `onConfirm`, `onReject`, `onFollowUp`, `isLoading`

Renders:
- Food name (orange accent)
- Per-100g macro breakdown (calories, protein, carbs, fat)
- **Save as** unit selector: `per gram` | `per unit` | `per ml`
  - "per unit" reveals a "1 unit = __ g" input
- **Calculator**: amount input → live macro recalculation (no API call)
  - Unit → grams conversion: `grams = amount * gramsPerUnit` (if unit mode)
- **Follow-up** text input → calls `onFollowUp(query)` which re-runs `foodLookupMutation` with `previous` context
- Footer: "Start Over" (ghost) + "Save to Library" (orange, disabled if unit mode and no grams entered)

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

type ProposedFood = {
  name: string;
  query: string;           // original user query
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};
```

Defined in `lib/types.ts`.

### Storage normalization

When saving a `ProposedFood` to the `foods` table (via `saveFood()` in `lib/api/ai.ts`):
- `unit = "g"` or `"ml"` → `calories_per_g = calories_per_100g / 100` (and same for protein/carbs/fat)
- `unit = "unit"` → `calories_per_g = (calories_per_100g / 100) * gramsPerUnit` — stores macros **per unit**

The `unit` column on `foods` records the display unit (`g`, `unit`, `ml`).

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
