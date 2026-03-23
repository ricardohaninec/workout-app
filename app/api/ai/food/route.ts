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
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const userQuery = (body.query as string | undefined)?.trim();
  if (!userQuery) return Response.json({ error: "query is required" }, { status: 400 });
  if (userQuery.length > 500) return Response.json({ error: "query must be 500 characters or fewer" }, { status: 400 });

  const previous = body.previous as ProposedFood | undefined;

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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userQuery }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Anthropic API error";
    return Response.json({ error: msg }, { status: 502 });
  }

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: z.infer<typeof ResponseSchema>;
  try {
    parsed = ResponseSchema.parse(JSON.parse(text));
  } catch {
    return Response.json({ error: "Invalid AI response", raw }, { status: 502 });
  }

  const proposal: ProposedFood = {
    name: parsed.name,
    query: userQuery,
    calories_per_100g: parsed.calories_per_100g,
    protein_per_100g: parsed.protein_per_100g,
    carbs_per_100g: parsed.carbs_per_100g,
    fat_per_100g: parsed.fat_per_100g,
  };

  return Response.json(proposal);
}
