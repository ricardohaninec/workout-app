"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function StartSessionButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/sessions`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start session");
      router.push(`/workout-in-progress/${workoutId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleStart} disabled={loading} size="sm" variant="outline">
      {loading ? "Starting…" : "▶ Start Session"}
    </Button>
  );
}
