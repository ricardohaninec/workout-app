import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth } from "@/lib/auth";
import type { ProposedFood } from "@/lib/types";

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
Max 5 items. JSON only, no markdown, no prose.`;

const PREP_SYSTEM_PROMPT = `You are Agent 2 of a food analysis pipeline: Preparation & Hidden Fat Inference. For the specified food item in the image, infer its likely cooking method and any hidden fats/oils/butter/sauce/dressing that increase calorie density beyond the raw ingredient. Respond ONLY with JSON:
{ "preparation": "<short description, e.g. 'pan-fried in butter'>", "calories_per_100g": number, "protein_per_100g": number, "carbs_per_100g": number, "fat_per_100g": number }
Values must reflect the prepared dish, not the raw ingredient. JSON only, no markdown, no prose.`;

const PORTION_SYSTEM_PROMPT = `You are Agent 3 of a food analysis pipeline: Portion & Volume Estimator. For the specified food item in the image, estimate its total weight in grams using visual reference objects in frame (standard dinner plate ≈26cm diameter, fork ≈20cm, hand, packaging). Respond ONLY with JSON:
{ "estimated_grams": number, "reference_used": "<what you used to judge scale>" }
JSON only, no markdown, no prose.`;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function extractJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

async function callAgent<T extends z.ZodTypeAny>(
  client: Anthropic,
  schema: T,
  system: string,
  content: Anthropic.MessageParam["content"]
): Promise<z.infer<T>> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system,
    messages: [{ role: "user", content }],
  });
  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  return schema.parse(JSON.parse(extractJson(raw)));
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const userQuery = (body.query as string | undefined)?.trim();
  const image = body.image as string | undefined;
  const previous = body.previous as ProposedFood | undefined;

  if (!userQuery && !image) {
    return Response.json({ error: "query or image is required" }, { status: 400 });
  }
  if (userQuery && userQuery.length > 500) {
    return Response.json({ error: "query must be 500 characters or fewer" }, { status: 400 });
  }
  if (image && image.length * 0.75 > MAX_IMAGE_BYTES) {
    return Response.json({ error: "image is too large" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Fresh photo: 3-agent parallel pipeline (segment/identify -> per-item prep/hidden-fat + portion/volume, fanned out concurrently).
  if (image && !previous && !userQuery) {
    const imageBlock: Anthropic.ImageBlockParam = {
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: image },
    };

    let detected: z.infer<typeof DetectSchema>;
    try {
      detected = await callAgent(client, DetectSchema, DETECT_SYSTEM_PROMPT, [
        imageBlock,
        { type: "text", text: "Segment and identify each distinct food item visible." },
      ]);
    } catch {
      return Response.json({ error: "Couldn't identify foods in photo" }, { status: 502 });
    }

    const settled = await Promise.allSettled(
      detected.items.map(async (item): Promise<ProposedFood> => {
        const focus = `Focus only on: "${item.name}" (${item.location_hint}). Ignore other items in the image.`;
        const [prep, portion] = await Promise.all([
          callAgent(client, PrepFatSchema, PREP_SYSTEM_PROMPT, [imageBlock, { type: "text", text: focus }]),
          callAgent(client, PortionSchema, PORTION_SYSTEM_PROMPT, [imageBlock, { type: "text", text: focus }]),
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
      })
    );

    const items = settled
      .filter((r): r is PromiseFulfilledResult<ProposedFood> => r.status === "fulfilled")
      .map((r) => r.value);

    if (items.length === 0) {
      return Response.json({ error: "Couldn't analyze any food items" }, { status: 502 });
    }

    return Response.json({ items });
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
      model: "claude-sonnet-4-6",
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
