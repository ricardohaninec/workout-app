"use client";

import { useState, useMemo } from "react";
import type { ProposedFood } from "@/lib/types";

type Unit = "g" | "unit" | "ml";

type Props = {
  proposal: ProposedFood;
  onConfirm: (unit: Unit, gramsPerUnit?: number) => void;
  onReject: () => void;
  onFollowUp: (query: string) => void;
  isLoading?: boolean;
};

function MacroRow({ label, value, unit = "g" }: { label: string; value: number; unit?: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-xs font-medium text-white">
        {value % 1 === 0 ? value : value.toFixed(1)}{unit}
      </span>
    </div>
  );
}

export default function AiFoodProposal({ proposal, onConfirm, onReject, onFollowUp, isLoading }: Props) {
  const [selectedUnit, setSelectedUnit] = useState<Unit>("g");
  const [gramsPerUnit, setGramsPerUnit] = useState("");
  const [amount, setAmount] = useState("");
  const [followUp, setFollowUp] = useState("");

  const gpuNum = parseFloat(gramsPerUnit) || 0;
  const amountNum = parseFloat(amount) || 0;

  const calculated = useMemo(() => {
    if (amountNum <= 0) return null;
    let grams = amountNum;
    if (selectedUnit === "unit") grams = amountNum * gpuNum;
    const factor = grams / 100;
    return {
      calories: proposal.calories_per_100g * factor,
      protein: proposal.protein_per_100g * factor,
      carbs: proposal.carbs_per_100g * factor,
      fat: proposal.fat_per_100g * factor,
    };
  }, [amountNum, selectedUnit, gpuNum, proposal]);

  const canSave = selectedUnit !== "unit" || gpuNum > 0;

  function handleFollowUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUp.trim()) return;
    onFollowUp(followUp.trim());
    setFollowUp("");
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 flex flex-col gap-4">
        {/* Food name */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Food Found</p>
          <h3 className="text-base font-semibold text-[#FF6B35]">{proposal.name}</h3>
        </div>

        {/* Per 100g macros */}
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Per 100g</p>
          <MacroRow label="Calories" value={proposal.calories_per_100g} unit=" kcal" />
          <MacroRow label="Protein" value={proposal.protein_per_100g} />
          <MacroRow label="Carbs" value={proposal.carbs_per_100g} />
          <MacroRow label="Fat" value={proposal.fat_per_100g} />
        </div>

        {/* Unit selector */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Save as</p>
          <div className="flex gap-2">
            {(["g", "unit", "ml"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setSelectedUnit(u)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedUnit === u
                    ? "bg-[#FF6B35] text-white"
                    : "bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                {u === "g" ? "per gram" : u === "unit" ? "per unit" : "per ml"}
              </button>
            ))}
          </div>
          {selectedUnit === "unit" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-white/50 whitespace-nowrap">1 unit =</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={gramsPerUnit}
                onChange={(e) => setGramsPerUnit(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B35]/50"
              />
              <span className="text-xs text-white/50">g</span>
            </div>
          )}
        </div>

        {/* Amount calculator */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Calculator</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B35]/50"
            />
            <span className="text-xs text-white/50 whitespace-nowrap">
              {selectedUnit === "unit" ? "units" : selectedUnit}
            </span>
          </div>
          {calculated && (
            <div className="mt-2 bg-white/5 rounded-xl p-3">
              <MacroRow label="Calories" value={calculated.calories} unit=" kcal" />
              <MacroRow label="Protein" value={calculated.protein} />
              <MacroRow label="Carbs" value={calculated.carbs} />
              <MacroRow label="Fat" value={calculated.fat} />
            </div>
          )}
        </div>

        {/* Follow-up input */}
        <form onSubmit={handleFollowUpSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a follow-up…"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B35]/50 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!followUp.trim() || isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            Ask
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 pt-0 flex gap-2">
        <button
          onClick={onReject}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
        >
          Start Over
        </button>
        <button
          onClick={() => onConfirm(selectedUnit, gpuNum > 0 ? gpuNum : undefined)}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#FF6B35] hover:bg-[#e85f2b] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Save to Library
        </button>
      </div>
    </div>
  );
}
