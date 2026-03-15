"use client";

import { useState } from "react";
import { Trash2, Plus, X } from "lucide-react";
import type { MealFood } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MacroRow, type MealWithFoods } from "@/components/day-detail";

export default function MealCard({
  meal,
  onDelete,
  onAddFood,
  onDeleteFood,
}: {
  meal: MealWithFoods;
  onDelete: () => void;
  onAddFood: () => void;
  onDeleteFood: (foodId: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-[#111111] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold text-white">{meal.meal_type}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-7 gap-1 border border-white/10 bg-transparent px-2.5 text-[12px] font-medium text-neutral-300 hover:bg-white/5 hover:text-white"
            onClick={onAddFood}
          >
            <Plus size={12} /> Add Food
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-neutral-400">Delete?</span>
              <Button
                className="h-7 bg-red-500/80 px-2.5 text-[12px] text-white hover:bg-red-600"
                onClick={onDelete}
              >
                Yes
              </Button>
              <Button
                className="h-7 border border-white/10 bg-transparent px-2.5 text-[12px] text-neutral-400 hover:bg-white/5"
                onClick={() => setConfirmDelete(false)}
              >
                No
              </Button>
            </div>
          ) : (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-white/5 hover:text-red-400"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Food items */}
      {meal.foods.length > 0 ? (
        <div className="mb-4 flex flex-col gap-0.5">
          {meal.foods.map((food: MealFood) => (
            <div
              key={food.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.02]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13px] font-medium text-white">{food.food_name}</span>
                <span className="shrink-0 text-[12px] text-neutral-500">{Number(food.quantity_grams)}g</span>
                {food.is_manual && (
                  <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-500">
                    manual
                  </span>
                )}
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-neutral-400">{Math.round(Number(food.calories))} kcal</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-blue-400/80">{Number(food.protein).toFixed(1)}g P</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-yellow-400/80">{Number(food.carbs).toFixed(1)}g C</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-purple-400/80">{Number(food.fat).toFixed(1)}g F</span>
                </div>
                <button
                  className="flex h-5 w-5 items-center justify-center rounded text-neutral-600 hover:text-red-400"
                  onClick={() => onDeleteFood(food.id)}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-[13px] text-neutral-600">No foods logged yet.</p>
      )}

      {/* Meal totals */}
      <MacroRow totals={meal.totals} />
    </div>
  );
}
