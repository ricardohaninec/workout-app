"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import type { MealFood } from "@/lib/types";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function updateMealFood(
  id: string,
  data: {
    quantityGrams?: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }
): Promise<MealFood> {
  const res = await fetch(`/api/meal-foods/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update food");
  return res.json();
}

export default function EditFoodModal({
  food,
  open,
  onClose,
  onUpdated,
}: {
  food: MealFood | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (food: MealFood) => void;
}) {
  const [qty, setQty] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  useEffect(() => {
    if (food) {
      setQty(String(food.quantity_grams));
      setCalories(String(food.calories));
      setProtein(String(food.protein));
      setCarbs(String(food.carbs));
      setFat(String(food.fat));
    }
  }, [food]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!food) throw new Error("No food");
      const payload: Parameters<typeof updateMealFood>[1] = {
        quantityGrams: Number(qty),
      };
      if (food.is_manual) {
        payload.calories = Number(calories);
        payload.protein = Number(protein);
        payload.carbs = Number(carbs);
        payload.fat = Number(fat);
      }
      return updateMealFood(food.id, payload);
    },
    onSuccess: (updated) => {
      onUpdated(updated);
      onClose();
    },
  });

  if (!food) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${food.food_name}`}>
      <div className="mb-4 h-px w-full bg-white/10" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Quantity (g)</Label>
          <Input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            autoFocus
          />
        </div>
        {food.is_manual && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Calories (kcal)</Label>
              <Input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Carbs (g)</Label>
              <Input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Protein (g)</Label>
              <Input type="number" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fat (g)</Label>
              <Input type="number" min="0" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
          onClick={() => mutation.mutate()}
          disabled={!qty || mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
