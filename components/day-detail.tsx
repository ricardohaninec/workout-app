"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Flame, Beef, Wheat, Droplet, Trash2, TriangleAlert } from "lucide-react";
import type { Day, Meal, MealFood } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Modal from "@/components/modal";
import MealCard from "@/components/meal-card";
import AddFoodToMealModal from "@/components/add-food-to-meal-modal";

export type Totals = { calories: number; protein: number; carbs: number; fat: number };
export type MealWithFoods = Meal & { foods: MealFood[]; totals: Totals };

export function sumMacros(foods: MealFood[]): Totals {
  return foods.reduce(
    (acc, f) => ({
      calories: acc.calories + Number(f.calories),
      protein: acc.protein + Number(f.protein),
      carbs: acc.carbs + Number(f.carbs),
      fat: acc.fat + Number(f.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-Workout", "Post-Workout"];

export default function DayDetail({
  day,
  initialMeals,
}: {
  day: Day;
  initialMeals: MealWithFoods[];
  initialDayTotals: Totals;
}) {
  const router = useRouter();
  const [meals, setMeals] = useState(initialMeals);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [mealType, setMealType] = useState("Breakfast");
  const [addMealLoading, setAddMealLoading] = useState(false);
  const [addFoodMealId, setAddFoodMealId] = useState<string | null>(null);

  const dayTotals = sumMacros(meals.flatMap((m) => m.foods));

  async function handleAddMeal() {
    setAddMealLoading(true);
    const res = await fetch(`/api/days/${day.id}/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealType }),
    });
    setAddMealLoading(false);
    if (!res.ok) return;
    const meal = await res.json();
    setMeals((prev) => [
      ...prev,
      { ...meal, foods: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
    ]);
    setAddMealOpen(false);
    setMealType("Breakfast");
  }

  async function handleDeleteMeal(mealId: string) {
    await fetch(`/api/meals/${mealId}`, { method: "DELETE" });
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
  }

  function handleFoodAdded(mealId: string, food: MealFood) {
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id !== mealId) return m;
        const foods = [...m.foods, { ...food, calories: Number(food.calories), protein: Number(food.protein), carbs: Number(food.carbs), fat: Number(food.fat), quantity_grams: Number(food.quantity_grams) }];
        return { ...m, foods, totals: sumMacros(foods) };
      })
    );
  }

  async function handleDeleteFood(mealId: string, foodId: string) {
    await fetch(`/api/meal-foods/${foodId}`, { method: "DELETE" });
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id !== mealId) return m;
        const foods = m.foods.filter((f) => f.id !== foodId);
        return { ...m, foods, totals: sumMacros(foods) };
      })
    );
  }

  async function handleDeleteDay() {
    setDeleteLoading(true);
    await fetch(`/api/days/${day.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    router.push("/days");
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/days"
          className="mb-4 flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-white"
        >
          <ArrowLeft size={14} /> All Days
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {new Date(day.date).toLocaleDateString(undefined, { timeZone: "UTC",
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h1>
            {day.notes && (
              <p className="mt-1 text-[13px] text-neutral-400">{day.notes}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/5 hover:text-red-400"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={15} />
            </button>
            <Button
              className="gap-2 bg-orange-500 text-[13px] font-semibold text-white hover:bg-orange-600"
              onClick={() => setAddMealOpen(true)}
            >
              <Plus size={14} /> Add Meal
            </Button>
          </div>
        </div>
      </div>

      {meals.length === 0 ? (
        <p className="text-neutral-500">No meals yet. Add your first meal!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onDelete={() => handleDeleteMeal(meal.id)}
              onAddFood={() => setAddFoodMealId(meal.id)}
              onDeleteFood={(foodId) => handleDeleteFood(meal.id, foodId)}
            />
          ))}

          <div className="rounded-xl border border-white/10 bg-[#111111] p-5">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
              Daily Total
            </h3>
            <MacroRow totals={dayTotals} />
          </div>
        </div>
      )}

      <Modal open={addMealOpen} onClose={() => setAddMealOpen(false)} title="Add Meal">
        <div className="mb-4 h-px w-full bg-white/10" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-white">Meal Type</label>
            <Select value={mealType} onValueChange={(v) => { if (v) setMealType(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setAddMealOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
            onClick={handleAddMeal}
            disabled={addMealLoading}
          >
            {addMealLoading ? "Adding…" : "Add Meal"}
          </Button>
        </div>
      </Modal>

      <AddFoodToMealModal
        mealId={addFoodMealId}
        open={addFoodMealId !== null}
        onClose={() => setAddFoodMealId(null)}
        onAdded={(food) => {
          handleFoodAdded(addFoodMealId!, food);
          setAddFoodMealId(null);
        }}
      />

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Day">
        <div className="mb-4 h-px w-full bg-white/10" />
        <p className="mb-4 text-[14px] leading-relaxed text-[#6B7280]">
          Are you sure you want to delete{" "}
          <span className="font-medium text-white">
            {new Date(day.date).toLocaleDateString(undefined, { timeZone: "UTC",
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          ? All meals and food entries will be permanently deleted.
        </p>
        <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-orange-500/[0.19] bg-orange-500/[0.063] px-[14px] py-3">
          <TriangleAlert size={16} className="shrink-0 text-orange-500" />
          <span className="text-[13px] font-semibold text-orange-500">This action cannot be undone</span>
        </div>
        <div className="flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            className="gap-1.5 bg-orange-500 font-semibold text-white hover:bg-orange-600"
            onClick={handleDeleteDay}
            disabled={deleteLoading}
          >
            <Trash2 size={14} />
            {deleteLoading ? "Deleting…" : "Delete Day"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function MacroRow({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MacroStat
        icon={<Flame size={13} className="text-orange-500" />}
        label="Calories"
        value={`${Math.round(totals.calories)} kcal`}
      />
      <MacroStat
        icon={<Wheat size={13} className="text-yellow-400" />}
        label="Carbs"
        value={`${totals.carbs.toFixed(1)}g`}
      />
      <MacroStat
        icon={<Beef size={13} className="text-blue-400" />}
        label="Protein"
        value={`${totals.protein.toFixed(1)}g`}
      />
      <MacroStat
        icon={<Droplet size={13} className="text-purple-400" />}
        label="Fat"
        value={`${totals.fat.toFixed(1)}g`}
      />
    </div>
  );
}

function MacroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
        {icon}
        {label}
      </div>
      <span className="text-[15px] font-semibold text-white">{value}</span>
    </div>
  );
}
