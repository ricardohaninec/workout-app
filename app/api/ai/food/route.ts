import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAUDE_MODEL } from "@/lib/ai-model";
import { auth } from "@/lib/auth";
import { get } from "@/lib/db";
import type { HandReference, ProposedFood } from "@/lib/types";

export const maxDuration = 120;

const MAX_CONCURRENT_CALLS = 4;

const ResponseSchema = z.object({
  name: z.string(),
  calories_per_100g: z.number().nonnegative(),
  protein_per_100g: z.number().nonnegative(),
  carbs_per_100g: z.number().nonnegative(),
  fat_per_100g: z.number().nonnegative(),
  estimated_grams: z.number().positive().optional(),
});

const DetectSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        location_hint: z.string(),
      })
    )
    .min(1)
    .max(5),
});

const PrepFatSchema = z.object({
  preparation: z.string(),
  calories_per_100g: z.number().nonnegative(),
  protein_per_100g: z.number().nonnegative(),
  carbs_per_100g: z.number().nonnegative(),
  fat_per_100g: z.number().nonnegative(),
});

const PortionSchema = z.object({
  estimated_grams: z.number().positive(),
  reference_used: z.string(),
});

const DETECT_SYSTEM_PROMPT = `You are Agent 1 of a food analysis pipeline: Food Segmentation & Identification. Look at the image and identify each visually distinct food item (ignore plates, utensils, garnish sprigs). Respond ONLY with JSON:
{ "items": [{ "name": "<food name, Title Case>", "location_hint": "<brief position in image, e.g. 'top-left of plate'>" }] }
List each distinct food separately; do not merge a food with its container or husk/peel (e.g. corn kernels and corn on the cob are two items). Keep location_hint under 8 words. Max 5 items. JSON only, no markdown, no prose.`;

const PREP_SYSTEM_PROMPT = `You are Agent 2 of a food analysis pipeline: Preparation & Hidden Fat Inference. For the specified food item in the image, infer its likely cooking method and any hidden fats/oils/butter/sauce/dressing that increase calorie density beyond the raw ingredient. Respond ONLY with JSON:
{ "preparation": "<short description, e.g. 'pan-fried in butter'>", "calories_per_100g": number, "protein_per_100g": number, "carbs_per_100g": number, "fat_per_100g": number }
Values must reflect the prepared dish, not the raw ingredient. JSON only, no markdown, no prose.`;

function buildPortionPrompt(handLengthCm?: number): string {
  const base = `You are Agent 3 of a food analysis pipeline: Portion & Volume Estimator. For the specified food item in the image, estimate its total weight in grams using visual reference objects in frame (standard dinner plate ≈26cm diameter, fork ≈20cm, hand, packaging).`;
  const handNote = handLengthCm
    ? ` The user's hand length has been precisely measured at ${handLengthCm}cm. If a hand is visible in this image, use it as the primary scale reference — it is far more accurate than estimating a generic object — and set "reference_used" to describe it as the logged hand (e.g. "hand (${handLengthCm}cm, logged)"). If no hand is visible, fall back to other reference objects as usual.`
    : "";
  return `${base}${handNote} Respond ONLY with JSON:
{ "estimated_grams": number, "reference_used": "<what you used to judge scale>" }
JSON only, no markdown, no prose.`;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_HINT_LENGTH = 200;

// Hint is untrusted user text: quoted, and the image wins on conflict.
function hintLine(hint?: string): string {
  return hint
    ? ` The user gave this hint about the meal contents (may be wrong; the image takes precedence if they conflict): ${JSON.stringify(hint)}.`
    : "";
}

function extractJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

let inFlight = 0;
const waiters: (() => void)[] = [];

// Simple per-process limiter so one request can't fan out into a burst of calls.
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  while (inFlight >= MAX_CONCURRENT_CALLS) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    waiters.shift()?.();
  }
}

async function callAgent<T extends z.ZodTypeAny>(
  client: Anthropic,
  agent: string,
  schema: T,
  system: string,
  content: Anthropic.MessageParam["content"]
): Promise<z.infer<T>> {
  try {
    const message = await limited(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content }],
      })
    );
    if (message.stop_reason === "max_tokens") {
      throw new Error("response truncated (max_tokens)");
    }
    const raw = message.content[0]?.type === "text" ? message.content[0].text : "";
    return schema.parse(JSON.parse(extractJson(raw)));
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    console.error(`[ai/food] ${agent} failed`, status, err instanceof Error ? err.message : err);
    throw err;
  }
}

function isBusy(err: unknown): boolean {
  return err instanceof Anthropic.APIError && (err.status === 429 || err.status === 529);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const userQuery = (body.query as string | undefined)?.trim();
  const image = body.image as string | undefined;
  const previous = body.previous as ProposedFood | undefined;
  const rawHint = body.hint;

  if (!userQuery && !image) {
    return Response.json({ error: "query or image is required" }, { status: 400 });
  }
  if (userQuery && userQuery.length > 500) {
    return Response.json({ error: "query must be 500 characters or fewer" }, { status: 400 });
  }
  if (image && image.length * 0.75 > MAX_IMAGE_BYTES) {
    return Response.json({ error: "image is too large" }, { status: 400 });
  }

  if (rawHint !== undefined && typeof rawHint !== "string") {
    return Response.json({ error: "hint must be a string" }, { status: 400 });
  }
  const hint = (rawHint as string | undefined)?.trim() || undefined;
  if (hint && hint.length > MAX_HINT_LENGTH) {
    return Response.json({ error: "hint must be 200 characters or fewer" }, { status: 400 });
  }
  // Hint only applies to fresh photo analysis; ignored otherwise.
  const photoHint = image ? hint : undefined;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 30_000 });

  // Fresh photo: 3-agent parallel pipeline (segment/identify -> per-item prep/hidden-fat + portion/volume, fanned out concurrently).
  if (image && !previous && !userQuery) {
    const imageBlock: Anthropic.ImageBlockParam = {
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: image },
    };

    let detected: z.infer<typeof DetectSchema>;
    try {
      detected = await callAgent(client, "detect", DetectSchema, DETECT_SYSTEM_PROMPT, [
        imageBlock,
        { type: "text", text: `Segment and identify each distinct food item visible.${hintLine(photoHint)}` },
      ]);
    } catch (err) {
      if (isBusy(err)) {
        return Response.json({ error: "AI service is busy, please try again in a moment" }, { status: 503 });
      }
      return Response.json({ error: "Couldn't identify foods in photo" }, { status: 502 });
    }

    const handReference = await get<HandReference>(
      "SELECT hand_length_cm FROM hand_references WHERE user_id = $1",
      [session.user.id]
    );
    const portionPrompt = buildPortionPrompt(handReference?.hand_length_cm);

    const analyzeItem = async (item: (typeof detected.items)[number]): Promise<ProposedFood> => {
        const focus = `Focus only on: "${item.name}" (${item.location_hint}). Ignore other items in the image.${hintLine(photoHint)}`;
        const [prep, portion] = await Promise.all([
          callAgent(client, "prep", PrepFatSchema, PREP_SYSTEM_PROMPT, [imageBlock, { type: "text", text: focus }]),
          callAgent(client, "portion", PortionSchema, portionPrompt, [imageBlock, { type: "text", text: focus }]),
        ]);
        return {
          name: item.name,
          query: "",
          calories_per_100g: prep.calories_per_100g,
          protein_per_100g: prep.protein_per_100g,
          carbs_per_100g: prep.carbs_per_100g,
          fat_per_100g: prep.fat_per_100g,
          estimated_grams: portion.estimated_grams,
          preparation_note: prep.preparation,
          portion_reference: portion.reference_used,
        };
    };

    const settled = await Promise.allSettled(
      detected.items.map(async (item) => {
        try {
          return await analyzeItem(item);
        } catch {
          return await analyzeItem(item); // retry once
        }
      })
    );

    const items: ProposedFood[] = [];
    const failedItems: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") items.push(r.value);
      else {
        failedItems.push(detected.items[i].name);
        console.error("[ai/food] item failed", detected.items[i].name, r.reason);
      }
    });

    if (items.length === 0) {
      const busy = settled.some((r) => r.status === "rejected" && isBusy(r.reason));
      return busy
        ? Response.json({ error: "AI service is busy, please try again in a moment" }, { status: 503 })
        : Response.json({ error: "Couldn't analyze any food items" }, { status: 502 });
    }

    return Response.json(failedItems.length ? { items, failed_items: failedItems } : { items });
  }

  // Text lookup or feedback follow-up on a single previously proposed food.
  const systemPrompt = previous
    ? `You are a nutrition database assistant. Previous food data:
Food: ${previous.name}
Per 100g: ${previous.calories_per_100g} kcal, ${previous.protein_per_100g}g protein, ${previous.carbs_per_100g}g carbs, ${previous.fat_per_100g}g fat

The user has a follow-up request. Update and return the nutritional info per 100g as JSON only:
{ "name": string, "calories_per_100g": number, "protein_per_100g": number, "carbs_per_100g": number, "fat_per_100g": number }
JSON only, no markdown, no prose.`
    : `You are a nutrition database assistant. Given a food query, respond ONLY with a valid JSON object with standard nutritional values per 100g (or per 100ml for liquids):
{ "name": "<food name, Title Case>", "calories_per_100g": number, "protein_per_100g": number, "carbs_per_100g": number, "fat_per_100g": number }
JSON only, no markdown, no prose.`;

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userQuery! }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Anthropic API error";
    return Response.json({ error: msg }, { status: 502 });
  }

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: z.infer<typeof ResponseSchema>;
  try {
    parsed = ResponseSchema.parse(JSON.parse(extractJson(raw)));
  } catch {
    return Response.json({ error: "Invalid AI response", raw }, { status: 502 });
  }

  const proposal: ProposedFood = {
    name: parsed.name,
    query: userQuery ?? "",
    calories_per_100g: parsed.calories_per_100g,
    protein_per_100g: parsed.protein_per_100g,
    carbs_per_100g: parsed.carbs_per_100g,
    fat_per_100g: parsed.fat_per_100g,
    estimated_grams: parsed.estimated_grams,
  };

  return Response.json(proposal);
}
