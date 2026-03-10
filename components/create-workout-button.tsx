"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CreateWorkoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/workouts", { method: "POST" });
    if (res.ok) {
      const workout = await res.json();
      router.push(`/workout/${workout.id}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? "Creating…" : "+ New Workout"}
    </Button>
  );
}
