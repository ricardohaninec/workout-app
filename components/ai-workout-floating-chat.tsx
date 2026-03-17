"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateWorkout, commitWorkout } from "@/lib/api/ai";
import { workoutKeys } from "@/lib/queryKeys";
import type { ProposedWorkout } from "@/lib/types";
import AiWorkoutProposalModal from "@/components/ai-workout-proposal-modal";

type Step = "input" | "loading" | "review" | "committing";

export default function AiWorkoutFloatingChat() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [goal, setGoal] = useState("");
  const [proposal, setProposal] = useState<ProposedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: generateWorkout,
    onMutate: () => {
      setStep("loading");
      setError(null);
    },
    onSuccess: (data) => {
      setProposal(data);
      setStep("review");
    },
    onError: () => {
      setError("Failed to generate workout. Please try again.");
      setStep("input");
    },
  });

  const commitMutation = useMutation({
    mutationFn: commitWorkout,
    onMutate: () => {
      setStep("committing");
    },
    onSuccess: ({ workoutId }) => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      setOpen(false);
      resetState();
      router.push(`/workout/${workoutId}`);
    },
    onError: () => {
      setError("Failed to create workout. Please try again.");
      setStep("review");
    },
  });

  function resetState() {
    setStep("input");
    setGoal("");
    setProposal(null);
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    resetState();
  }

  function handleSubmit() {
    if (!goal.trim()) return;
    generateMutation.mutate(goal.trim());
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: step === "review" ? "480px" : "auto" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF6B35]" />
              <span className="text-sm font-semibold">AI Workout Generator</span>
            </div>
            <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          {step === "input" && (
            <div className="p-4 flex flex-col gap-3">
              {error && <p className="text-xs text-red-400">{error}</p>}
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#FF6B35]/50"
                rows={3}
                maxLength={500}
                placeholder="Describe your fitness goal…&#10;e.g. &quot;core training for lean abs&quot;"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!goal.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#FF6B35] hover:bg-[#e85f2b] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                Generate
              </button>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
              <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
              <p className="text-sm text-white/60">Finding best exercises…</p>
            </div>
          )}

          {step === "review" && proposal && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {error && <p className="text-xs text-red-400 px-4 pt-2">{error}</p>}
              <AiWorkoutProposalModal
                proposal={proposal}
                onConfirm={() => commitMutation.mutate(proposal)}
                onReject={resetState}
              />
            </div>
          )}

          {step === "committing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
              <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
              <p className="text-sm text-white/60">Creating your workout…</p>
            </div>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-[#FF6B35] hover:bg-[#e85f2b] shadow-lg flex items-center justify-center transition-colors"
        aria-label="Open AI workout generator"
      >
        <Sparkles size={22} className="text-white" />
      </button>
    </div>
  );
}
