"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
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
    <Button className="gap-1.5 bg-orange-500 px-[18px] py-[10px] text-[14px] font-semibold text-white hover:bg-orange-600" onClick={handleClick} disabled={loading}>
      {loading ? "Creating…" : <><Plus size={16} className="shrink-0" />New Workout</>}
    </Button>
  );
}
