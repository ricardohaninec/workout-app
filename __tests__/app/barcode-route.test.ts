import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));

import { GET } from "@/app/api/foods/barcode/[code]/route";

const call = (code: string) =>
  GET(new Request("http://x"), { params: Promise.resolve({ code }) });

const offOk = (product: unknown, status = 1) =>
  new Response(JSON.stringify({ status, product }), { status: 200 });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  getSession.mockResolvedValue({ user: { id: "u1" } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("GET /api/foods/barcode/[code]", () => {
  it("401 when unauthenticated", async () => {
    getSession.mockResolvedValue(null);
    expect((await call("12345678")).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["1234567", "123456789012345", "abc12345678", "1234 5678", "1234567a", "../12345678"])(
    "400 for invalid code %s",
    async (code) => {
      expect((await call(code)).status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it.each(["12345678", "12345678901234"])("accepts boundary length %s", async (code) => {
    fetchMock.mockResolvedValue(offOk({ nutriments: { "energy-kcal_100g": 100 } }));
    expect((await call(code)).status).toBe(200);
  });

  it("maps OFF response, sends User-Agent, rounds to 1 decimal", async () => {
    fetchMock.mockResolvedValue(
      offOk({
        product_name: " Granola ",
        brands: "Acme, Other",
        serving_quantity: "40",
        nutriments: {
          "energy-kcal_100g": 412.46,
          proteins_100g: "10.04",
          carbohydrates_100g: 60.55,
          fat_100g: 15,
        },
      })
    );
    const res = await call("5000112637922");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      name: "Granola (Acme)",
      query: "",
      calories_per_100g: 412.5,
      protein_per_100g: 10,
      carbs_per_100g: 60.6,
      fat_per_100g: 15,
      estimated_grams: 40,
      preparation_note: "Barcode: 5000112637922",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("openfoodfacts.org/api/v2/product/5000112637922");
    expect(init.headers["User-Agent"]).toMatch(/\S+/);
    expect(init.signal).toBeDefined();
  });

  it("defaults grams to 100, name without brand, missing macros to 0", async () => {
    fetchMock.mockResolvedValue(offOk({ product_name: "Bar", nutriments: { "energy-kcal_100g": 200 } }));
    const body = await (await call("12345678")).json();
    expect(body).toMatchObject({ name: "Bar", estimated_grams: 100, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0 });
  });

  it("falls back to kJ / 4.184 for kcal", async () => {
    fetchMock.mockResolvedValue(offOk({ product_name: "X", nutriments: { energy_100g: 1046 } }));
    expect((await (await call("12345678")).json()).calories_per_100g).toBe(250);
  });

  it("flags suspicious values in preparation_note", async () => {
    fetchMock.mockResolvedValue(offOk({ product_name: "X", nutriments: { "energy-kcal_100g": 950 } }));
    expect((await (await call("12345678")).json()).preparation_note).toContain("unusual");
    fetchMock.mockResolvedValue(
      offOk({ product_name: "X", nutriments: { "energy-kcal_100g": 400, proteins_100g: 50, carbohydrates_100g: 50, fat_100g: 20 } })
    );
    expect((await (await call("12345678")).json()).preparation_note).toContain("unusual");
  });

  it("404 when OFF status is 0", async () => {
    fetchMock.mockResolvedValue(offOk(undefined, 0));
    expect((await call("12345678")).status).toBe(404);
  });

  it("404 when OFF returns HTTP 404", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));
    expect((await call("12345678")).status).toBe(404);
  });

  it("404 when nutrition data is missing", async () => {
    fetchMock.mockResolvedValue(offOk({ product_name: "X", nutriments: {} }));
    expect((await call("12345678")).status).toBe(404);
    fetchMock.mockResolvedValue(offOk({ product_name: "X" }));
    expect((await call("12345678")).status).toBe(404);
  });

  it("502 on network failure / timeout", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    expect((await call("12345678")).status).toBe(502);
    fetchMock.mockRejectedValue(new DOMException("t", "TimeoutError"));
    expect((await call("12345678")).status).toBe(502);
  });

  it("502 on OFF 500 and on invalid JSON", async () => {
    fetchMock.mockResolvedValue(new Response("x", { status: 500 }));
    expect((await call("12345678")).status).toBe(502);
    fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
    expect((await call("12345678")).status).toBe(502);
  });

  it("503 on OFF 429/503", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));
    expect((await call("12345678")).status).toBe(503);
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    expect((await call("12345678")).status).toBe(503);
  });
});
