"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play, ActivitySquare } from "lucide-react";

export default function StartWorkoutButton({
  workoutId,
  hasActiveSession = false,
}: {
  workoutId: string;
  hasActiveSession?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      if (hasActiveSession) {
        router.push(`/workout-in-progress/${workoutId}`);
        return;
      }
      const res = await fetch(`/api/workouts/${workoutId}/sessions`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start session");
      router.push(`/workout-in-progress/${workoutId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className={`w-full ${hasActiveSession ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Loading…" : hasActiveSession ? (
        <><ActivitySquare size={15} className="shrink-0" /> View Workout Progress</>
      ) : (
        <><Play size={15} className="shrink-0" /> Start Workout</>
      )}
    </Button>
  );
}
