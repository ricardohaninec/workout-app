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

export default function AiFoodPhotoReview({
  proposal,
  onConfirm,
  onFeedback,
  onRetake,
  isLoading,
}: {
  proposal: ProposedFood;
  onConfirm: (data: { foodName: string; quantityGrams: number; calories: number; protein: number; carbs: number; fat: number }) => void;
  onFeedback: (feedback: string) => void;
  onRetake: () => void;
  isLoading?: boolean;
}) {
  const [grams, setGrams] = useState(String(Math.round(proposal.estimated_grams ?? 100)));
  const [feedback, setFeedback] = useState("");

  const gramsNum = Number(grams) || 0;
  const macros = useMemo(() => {
    const factor = gramsNum / 100;
    return {
      calories: proposal.calories_per_100g * factor,
      protein: proposal.protein_per_100g * factor,
      carbs: proposal.carbs_per_100g * factor,
      fat: proposal.fat_per_100g * factor,
    };
  }, [gramsNum, proposal]);

  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    onFeedback(feedback.trim());
    setFeedback("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Food Found</p>
        <h3 className="text-base font-semibold text-orange-400">{proposal.name}</h3>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Quantity (g)</Label>
        <Input type="number" min="0" value={grams} onChange={(e) => setGrams(e.target.value)} disabled={isLoading} />
      </div>

      <div className="rounded-xl bg-white/5 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Nutrients</p>
        <MacroRow label="Calories" value={macros.calories} unit=" kcal" />
        <MacroRow label="Protein" value={macros.protein} />
        <MacroRow label="Carbs" value={macros.carbs} />
        <MacroRow label="Fat" value={macros.fat} />
      </div>

      <form onSubmit={handleFeedbackSubmit} className="flex gap-2">
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

      <div className="flex justify-end gap-2.5">
        <Button variant="outline" onClick={onRetake} disabled={isLoading}>
          Retake Photo
        </Button>
        <Button
          className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
          onClick={() =>
            onConfirm({
              foodName: proposal.name,
              quantityGrams: gramsNum,
              calories: macros.calories,
              protein: macros.protein,
              carbs: macros.carbs,
              fat: macros.fat,
            })
          }
          disabled={isLoading || gramsNum <= 0}
        >
          Add to Meal
        </Button>
      </div>
    </div>
  );
}
