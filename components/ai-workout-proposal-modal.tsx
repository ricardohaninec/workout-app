"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ProposedWorkout } from "@/lib/types";
import PlaceholderImage from "@/components/icons/placeholder-image";

type Props = {
  proposal: ProposedWorkout;
  onConfirm: () => void;
  onReject: () => void;
  onRemove: (index: number) => void;
  onRefine: (feedback: string) => void;
  isRefining?: boolean;
};

export default function AiWorkoutProposalModal({
  proposal,
  onConfirm,
  onReject,
  onRemove,
  onRefine,
  isRefining,
}: Props) {
  const [feedback, setFeedback] = useState("");

  function handleRefineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    onRefine(feedback.trim());
    setFeedback("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <h3 className="font-semibold text-[#FF6B35] text-base leading-tight">{proposal.title}</h3>
        <p className="text-xs text-white/50 mt-0.5 truncate">Goal: {proposal.goal}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {proposal.exercises.map((ex, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 group">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
              {ex.image_url ? (
                <img src={ex.image_url} alt={ex.name} className="w-full h-full object-cover" />
              ) : (
                <PlaceholderImage size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm leading-tight truncate">{ex.name}</p>
              <p className="text-xs text-white/50 mt-0.5">
                {ex.sets} sets × {ex.reps} reps · {ex.rest_seconds}s rest
              </p>
              {ex.note && <p className="text-xs text-white/40 italic truncate">{ex.note}</p>}
            </div>
            <button
              onClick={() => onRemove(i)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
              aria-label={`Remove ${ex.name}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Feedback input */}
      <form onSubmit={handleRefineSubmit} className="px-3 py-2 border-t border-white/10 flex gap-2">
        <input
          type="text"
          placeholder='e.g. "replace planks with leg raises"'
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={isRefining}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF6B35]/50 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!feedback.trim() || isRefining}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap"
        >
          {isRefining ? "…" : "Refine"}
        </button>
      </form>

      <div className="px-3 py-3 border-t border-white/10 flex gap-2">
        <button
          onClick={onReject}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
        >
          Start Over
        </button>
        <button
          onClick={onConfirm}
          disabled={proposal.exercises.length === 0}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-[#FF6B35] hover:bg-[#e85f2b] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Create Workout
        </button>
      </div>
    </div>
  );
}
