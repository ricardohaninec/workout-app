"use client";

import type { ProposedWorkout } from "@/lib/types";
import PlaceholderImage from "@/components/icons/placeholder-image";

type Props = {
  proposal: ProposedWorkout;
  onConfirm: () => void;
  onReject: () => void;
};

export default function AiWorkoutProposalModal({ proposal, onConfirm, onReject }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <h3 className="font-semibold text-[#FF6B35] text-base leading-tight">{proposal.title}</h3>
        <p className="text-xs text-white/50 mt-0.5 truncate">Goal: {proposal.goal}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {proposal.exercises.map((ex, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
              {ex.image_url ? (
                <img src={ex.image_url} alt={ex.name} className="w-full h-full object-cover" />
              ) : (
                <PlaceholderImage size={24} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm leading-tight truncate">{ex.name}</p>
              <p className="text-xs text-white/50 mt-0.5">
                {ex.sets} sets × {ex.reps} reps · {ex.rest_seconds}s rest
              </p>
              {ex.note && <p className="text-xs text-white/40 italic truncate">{ex.note}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-white/10 flex gap-2">
        <button
          onClick={onReject}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
        >
          Start Over
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-[#FF6B35] hover:bg-[#e85f2b] text-white transition-colors"
        >
          Create Workout
        </button>
      </div>
    </div>
  );
}
