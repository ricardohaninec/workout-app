import { get, query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Food, HandReference } from "@/lib/types";
import FoodsLibrary from "@/components/foods-library";
import HandReferenceCard from "@/components/hand-reference-card";

export default async function FoodsPage() {
  const session = await requireSession();

  const [foods, handReference] = await Promise.all([
    query<Food>("SELECT * FROM foods WHERE user_id = $1 ORDER BY name ASC", [session.user.id]),
    get<HandReference>("SELECT * FROM hand_references WHERE user_id = $1", [session.user.id]),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <HandReferenceCard initialData={handReference ?? null} />
      <FoodsLibrary foods={foods} />
    </main>
  );
}
