"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Loader2, Dumbbell, Apple } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateWorkout, commitWorkout, refineWorkout, lookupFood, saveFood } from "@/lib/api/ai";
import { workoutKeys } from "@/lib/queryKeys";
import type { ProposedWorkout, ProposedFood } from "@/lib/types";
import AiWorkoutProposalModal from "@/components/ai-workout-proposal-modal";
import AiFoodProposal from "@/components/ai-food-proposal";

type Mode = "workout" | "food";
type Step = "input" | "loading" | "review" | "committing";

export default function AiWorkoutFloatingChat() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<Mode>("workout");
  const [step, setStep] = useState<Step>("input");
  const [goal, setGoal] = useState("");
  const [proposal, setProposal] = useState<ProposedWorkout | null>(null);
  const [foodProposal, setFoodProposal] = useState<ProposedFood | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Workout mutations
  const generateMutation = useMutation({
    mutationFn: (goal: string) => generateWorkout(goal, abortRef.current?.signal),
    onMutate: () => { setStep("loading"); setError(null); },
    onSuccess: (data) => { setProposal(data); setStep("review"); },
    onError: (err: Error) => { if (err.name === "AbortError") return; setError("Failed to generate workout. Please try again."); setStep("input"); },
  });

  const commitMutation = useMutation({
    mutationFn: commitWorkout,
    onMutate: () => { setStep("committing"); },
    onSuccess: ({ workoutId }) => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      setOpen(false);
      resetState();
      router.push(`/workout/${workoutId}`);
    },
    onError: () => { setError("Failed to create workout. Please try again."); setStep("review"); },
  });

  const refineMutation = useMutation({
    mutationFn: ({ feedback }: { feedback: string }) =>
      refineWorkout(proposal!, feedback),
    onSuccess: (data) => { setProposal(data); },
    onError: () => { setError("Failed to refine workout. Please try again."); },
  });

  // Food mutations
  const foodLookupMutation = useMutation({
    mutationFn: ({ query, previous }: { query: string; previous?: ProposedFood }) =>
      lookupFood(query, previous, abortRef.current?.signal),
    onMutate: () => { setStep("loading"); setError(null); },
    onSuccess: (data) => { setFoodProposal(data); setStep("review"); },
    onError: (err: Error) => { if (err.name === "AbortError") return; setError("Failed to look up food. Please try again."); setStep("input"); },
  });

  const foodSaveMutation = useMutation({
    mutationFn: ({ food, unit, gramsPerUnit }: { food: ProposedFood; unit: "g" | "unit" | "ml"; gramsPerUnit?: number }) =>
      saveFood(food, unit, gramsPerUnit),
    onMutate: () => { setStep("committing"); },
    onSuccess: () => {
      setOpen(false);
      resetState();
    },
    onError: () => { setError("Failed to save food. Please try again."); setStep("review"); },
  });

  function resetState() {
    setStep("input");
    setGoal("");
    setProposal(null);
    setFoodProposal(null);
    setError(null);
  }

  function handleModeSwitch(newMode: Mode) {
    if (newMode === mode) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setMode(newMode);
    resetState();
  }

  function handleClose() {
    setOpen(false);
    resetState();
  }

  function handleSubmit() {
    if (!goal.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (mode === "workout") {
      generateMutation.mutate(goal.trim());
    } else {
      foodLookupMutation.mutate({ query: goal.trim() });
    }
  }

  const isReviewLoading = foodLookupMutation.isPending;

  const placeholder =
    mode === "workout"
      ? 'Describe your fitness goal…\ne.g. "core training for lean abs"'
      : 'Ask about a food…\ne.g. "nutrients of a walnut"';

  const loadingText =
    mode === "workout" ? "Finding best exercises…" : "Looking up nutrition info…";

  const committingText =
    mode === "workout" ? "Creating your workout…" : "Saving to food library…";

  const panelHeight =
    step === "review"
      ? mode === "workout"
        ? "480px"
        : "560px"
      : "auto";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-80 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: panelHeight }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF6B35]" />
              <span className="text-sm font-semibold">AI Assistant</span>
            </div>
            <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => handleModeSwitch("workout")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                mode === "workout"
                  ? "text-[#FF6B35] border-b-2 border-[#FF6B35]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Dumbbell size={12} />
              Workout
            </button>
            <button
              onClick={() => handleModeSwitch("food")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                mode === "food"
                  ? "text-[#FF6B35] border-b-2 border-[#FF6B35]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Apple size={12} />
              Nutrition
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
                placeholder={placeholder}
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
                {mode === "workout" ? "Generate" : "Look Up"}
              </button>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
              <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
              <p className="text-sm text-white/60">{loadingText}</p>
            </div>
          )}

          {step === "review" && mode === "workout" && proposal && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {error && <p className="text-xs text-red-400 px-4 pt-2">{error}</p>}
              <AiWorkoutProposalModal
                proposal={proposal}
                onConfirm={() => commitMutation.mutate(proposal)}
                onReject={resetState}
                onRemove={(index) =>
                  setProposal((prev) =>
                    prev
                      ? { ...prev, exercises: prev.exercises.filter((_, i) => i !== index) }
                      : prev
                  )
                }
                onRefine={(feedback) => refineMutation.mutate({ feedback })}
                isRefining={refineMutation.isPending}
              />
            </div>
          )}

          {step === "review" && mode === "food" && foodProposal && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {error && <p className="text-xs text-red-400 px-4 pt-2">{error}</p>}
              <AiFoodProposal
                proposal={foodProposal}
                isLoading={isReviewLoading}
                onConfirm={(unit, gramsPerUnit) =>
                  foodSaveMutation.mutate({ food: foodProposal, unit, gramsPerUnit })
                }
                onReject={resetState}
                onFollowUp={(query) =>
                  foodLookupMutation.mutate({ query, previous: foodProposal })
                }
              />
            </div>
          )}

          {step === "committing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
              <Loader2 size={28} className="animate-spin text-[#FF6B35]" />
              <p className="text-sm text-white/60">{committingText}</p>
            </div>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-[#FF6B35] hover:bg-[#e85f2b] shadow-lg flex items-center justify-center transition-colors"
        aria-label="Open AI assistant"
      >
        <Sparkles size={22} className="text-white" />
      </button>
    </div>
  );
}
