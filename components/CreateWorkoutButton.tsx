"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
    >
      {loading ? "Creating…" : "+ New Workout"}
    </button>
  );
}
