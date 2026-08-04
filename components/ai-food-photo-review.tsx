"use client";

import { useMemo, useState } from "react";
import type { ProposedFood } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function MacroRow({ label, value, unit = "g" }: { label: string; value: number; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-xs font-medium text-white">
        {value % 1 === 0 ? value : value.toFixed(1)}
        {unit}
      </span>
    </div>
  );
}

function FoodItemCard({
  item,
  grams,
  included,
  isLoading,
  onGramsChange,
  onIncludedChange,
  onFeedback,
}: {
  item: ProposedFood;
  grams: string;
  included: boolean;
  isLoading?: boolean;
  onGramsChange: (value: string) => void;
  onIncludedChange: (value: boolean) => void;
  onFeedback: (feedback: string) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const gramsNum = Number(grams) || 0;
  const macros = useMemo(() => {
    const factor = gramsNum / 100;
    return {
      calories: item.calories_per_100g * factor,
      protein: item.protein_per_100g * factor,
      carbs: item.carbs_per_100g * factor,
      fat: item.fat_per_100g * factor,
    };
  }, [gramsNum, item]);

  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    onFeedback(feedback.trim());
    setFeedback("");
  }

  return (
    <div className={`rounded-xl border p-3 transition-opacity ${included ? "border-white/10 bg-white/5" : "border-white/5 opacity-50"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={included}
            onChange={(e) => onIncludedChange(e.target.checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <div>
            <h3 className="text-sm font-semibold text-orange-400">{item.name}</h3>
            {item.preparation_note && <p className="text-[11px] text-white/40">{item.preparation_note}</p>}
          </div>
        </label>
      </div>

      <div className="mb-2 flex flex-col gap-1.5">
        <Label>Quantity (g)</Label>
        <Input
          type="number"
          min="0"
          value={grams}
          onChange={(e) => onGramsChange(e.target.value)}
          disabled={isLoading || !included}
        />
        {item.portion_reference && (
          <p className="text-[11px] text-white/30">Scale reference: {item.portion_reference}</p>
        )}
      </div>

      <div className="rounded-lg bg-black/20 p-2.5">
        <MacroRow label="Calories" value={macros.calories} unit=" kcal" />
        <MacroRow label="Protein" value={macros.protein} />
        <MacroRow label="Carbs" value={macros.carbs} />
        <MacroRow label="Fat" value={macros.fat} />
      </div>

      <form onSubmit={handleFeedbackSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          placeholder="Not quite right? e.g. 'it also has cheese'"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!feedback.trim() || isLoading}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function AiFoodPhotoReview({
  items,
  onConfirmAll,
  onItemFeedback,
  onRetake,
  isLoading,
}: {
  items: ProposedFood[];
  onConfirmAll: (data: { foodName: string; quantityGrams: number; calories: number; protein: number; carbs: number; fat: number }[]) => void;
  onItemFeedback: (index: number, feedback: string) => void;
  onRetake: () => void;
  isLoading?: boolean;
}) {
  const [grams, setGrams] = useState<Record<number, string>>({});
  const [included, setIncluded] = useState<Record<number, boolean>>({});

  function gramsFor(index: number, item: ProposedFood) {
    return grams[index] ?? String(Math.round(item.estimated_grams ?? 100));
  }
  function isIncluded(index: number) {
    return included[index] ?? true;
  }

  const totals = items.reduce(
    (acc, item, i) => {
      if (!isIncluded(i)) return acc;
      const factor = (Number(gramsFor(i, item)) || 0) / 100;
      acc.calories += item.calories_per_100g * factor;
      acc.protein += item.protein_per_100g * factor;
      acc.carbs += item.carbs_per_100g * factor;
      acc.fat += item.fat_per_100g * factor;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const includedCount = items.filter((_, i) => isIncluded(i)).length;

  function handleConfirm() {
    const data = items
      .map((item, i) => ({ item, i }))
      .filter(({ i }) => isIncluded(i))
      .map(({ item, i }) => {
        const gramsNum = Number(gramsFor(i, item)) || 0;
        const factor = gramsNum / 100;
        return {
          foodName: item.name,
          quantityGrams: gramsNum,
          calories: item.calories_per_100g * factor,
          protein: item.protein_per_100g * factor,
          carbs: item.carbs_per_100g * factor,
          fat: item.fat_per_100g * factor,
        };
      });
    onConfirmAll(data);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] uppercase tracking-wide text-white/40">
        {items.length} Food{items.length !== 1 ? "s" : ""} Found
      </p>

      {items.map((item, i) => (
        <FoodItemCard
          key={i}
          item={item}
          grams={gramsFor(i, item)}
          included={isIncluded(i)}
          isLoading={isLoading}
          onGramsChange={(value) => setGrams((prev) => ({ ...prev, [i]: value }))}
          onIncludedChange={(value) => setIncluded((prev) => ({ ...prev, [i]: value }))}
          onFeedback={(feedback) => {
            setGrams((prev) => (i in prev ? prev : { ...prev, [i]: gramsFor(i, item) }));
            onItemFeedback(i, feedback);
          }}
        />
      ))}

      <div className="rounded-xl bg-white/5 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Meal Total</p>
        <MacroRow label="Calories" value={totals.calories} unit=" kcal" />
        <MacroRow label="Protein" value={totals.protein} />
        <MacroRow label="Carbs" value={totals.carbs} />
        <MacroRow label="Fat" value={totals.fat} />
      </div>

      <div className="flex justify-end gap-2.5">
        <Button variant="outline" onClick={onRetake} disabled={isLoading}>
          Retake Photo
        </Button>
        <Button
          className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
          onClick={handleConfirm}
          disabled={isLoading || includedCount === 0}
        >
          Add {includedCount} to Meal
        </Button>
      </div>
    </div>
  );
}
