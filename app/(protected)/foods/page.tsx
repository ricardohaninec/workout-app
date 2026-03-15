import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import type { Food } from "@/lib/types";
import FoodsLibrary from "@/components/foods-library";

export default async function FoodsPage() {
  const session = await requireSession();

  const foods = await query<Food>(
    "SELECT * FROM foods WHERE user_id = $1 ORDER BY name ASC",
    [session.user.id]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <FoodsLibrary foods={foods} />
    </main>
  );
}
