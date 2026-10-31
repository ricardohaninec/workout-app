import { auth } from "@/lib/auth";
import type { ProposedFood } from "@/lib/types";

type Params = { params: Promise<{ code: string }> };

const OFF_URL = "https://world.openfoodfacts.org/api/v2/product";
const OFF_USER_AGENT = "WorkoutApp/1.0 (ricardo.haninec@hotmail.com)";
const OFF_TIMEOUT_MS = 5000;

type OffProduct = {
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

function num(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : undefined;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function GET(request: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  if (!/^\d{8,14}$/.test(code)) {
    return Response.json({ error: "code must be 8-14 digits" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(
      `${OFF_URL}/${code}?fields=product_name,brands,serving_quantity,nutriments`,
      {
        headers: { "User-Agent": OFF_USER_AGENT },
        signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
      }
    );
  } catch {
    return Response.json({ error: "Couldn't reach Open Food Facts" }, { status: 502 });
  }

  if (res.status === 503 || res.status === 429) {
    return Response.json(
      { error: "Barcode lookup is busy right now. Try again in a minute." },
      { status: 503 }
    );
  }
  if (res.status === 404) return Response.json({ error: "Product not found" }, { status: 404 });
  if (!res.ok) return Response.json({ error: "Open Food Facts error" }, { status: 502 });

  const data = (await res.json().catch(() => null)) as
    | { status?: number; product?: OffProduct }
    | null;
  if (!data) return Response.json({ error: "Invalid Open Food Facts response" }, { status: 502 });
  if (data.status !== 1 || !data.product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const product = data.product;
  const n = product.nutriments ?? {};
  const kj = num(n["energy-kj_100g"] ?? n["energy_100g"]);
  const calories = num(n["energy-kcal_100g"]) ?? (kj !== undefined ? kj / 4.184 : undefined);
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);

  if (calories === undefined) {
    return Response.json({ error: "No nutrition data for this product" }, { status: 404 });
  }

  const productName = product.product_name?.trim() || "Unknown product";
  const brand = product.brands?.split(",")[0]?.trim();
  const serving = num(product.serving_quantity);

  const food: ProposedFood = {
    name: brand ? `${productName} (${brand})` : productName,
    query: "",
    calories_per_100g: round1(calories),
    protein_per_100g: round1(protein ?? 0),
    carbs_per_100g: round1(carbs ?? 0),
    fat_per_100g: round1(fat ?? 0),
    estimated_grams: serving && serving > 0 ? serving : 100,
    preparation_note: `Barcode: ${code}`,
  };

  const suspicious =
    food.calories_per_100g > 900 ||
    food.protein_per_100g + food.carbs_per_100g + food.fat_per_100g > 100;
  if (suspicious) food.preparation_note += " (values look unusual, please check)";

  return Response.json(food);
}
