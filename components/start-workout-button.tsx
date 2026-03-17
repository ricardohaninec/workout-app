"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, ActivitySquare, Dumbbell } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Modal from "@/components/modal";
import type { WorkoutItem } from "@/lib/types";

export default function StartWorkoutButton({
  workoutId,
  hasActiveSession = false,
}: {
  workoutId: string;
  hasActiveSession?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [exercises, setExercises] = useState<WorkoutItem[]>([]);

  async function handleClick() {
    // If resuming an active session, no confirmation needed
    if (hasActiveSession) {
      router.push(`/workout-in-progress/${workoutId}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}`);
      if (res.ok) {
        const data = await res.json();
        setExercises(data.workoutItems ?? []);
      }
    } finally {
      setLoading(false);
    }
    setModalOpen(true);
  }

  async function handleConfirm() {
    setStarting(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/sessions`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start session");
      router.push(`/workout-in-progress/${workoutId}`);
    } catch {
      setStarting(false);
    }
  }

  return (
    <>
      <Button
        className={`w-full gap-1.5 text-[13px] font-semibold ${
          hasActiveSession
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-orange-500 hover:bg-orange-600 text-white"
        }`}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Loading…" : hasActiveSession ? (
          <><ActivitySquare size={14} className="shrink-0" /> View Workout Progress</>
        ) : (
          <><Play size={14} className="shrink-0" /> Start Workout</>
        )}
      </Button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Start Workout">
        <p className="mb-4 text-sm text-neutral-400">
          {exercises.length === 0
            ? "This workout has no exercises yet."
            : `${exercises.length} exercise${exercises.length !== 1 ? "s" : ""} in this workout:`}
        </p>

        {exercises.length > 0 && (
          <ul className="mb-6 space-y-2">
            {exercises.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                {item.exercise.image_url ? (
                  <Image
                    src={item.exercise.image_url}
                    alt={item.exercise.title}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                    <Dumbbell size={15} className="text-neutral-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.exercise.title}</p>
                  <p className="text-xs text-neutral-400">
                    {item.sets.length} set{item.sets.length !== 1 ? "s" : ""}
                    {item.sets.length > 0 && ` · ${item.sets[0].weight}kg × ${item.sets[0].reps} reps`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <Button
            className="border border-white/10 bg-[#111111] text-white hover:bg-white/5"
            onClick={() => setModalOpen(false)}
            disabled={starting}
          >
            Cancel
          </Button>
          <Button
            className="bg-orange-500 text-white hover:bg-orange-600"
            onClick={handleConfirm}
            disabled={starting || exercises.length === 0}
          >
            {starting ? "Starting…" : "Start Workout"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
