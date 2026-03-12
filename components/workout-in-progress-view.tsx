"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkoutItem, WorkoutInProgressSet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/modal";
import { Skeleton } from "@/components/ui/skeleton";
import PlaceholderImage from "@/components/icons/placeholder-image";

type SetRow = { workoutItemId: string; reps: string; weight: string; position: number };

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function buildInitialSets(workoutItems: WorkoutItem[], wipSets: WorkoutInProgressSet[]): SetRow[] {
  if (wipSets.length > 0) {
    return wipSets.map((s) => ({
      workoutItemId: s.workout_item_id,
      reps: String(s.reps),
      weight: String(s.weight),
      position: s.position,
    }));
  }
  // Pre-populate from template sets
  return workoutItems.flatMap((item) =>
    item.sets.map((s) => ({
      workoutItemId: item.id,
      reps: String(s.reps),
      weight: String(s.weight),
      position: s.position,
    }))
  );
}

export default function WorkoutInProgressView({
  workoutId,
  sessionId,
  startedAt,
  workoutItems,
  sets: initialSets,
}: {
  workoutId: string;
  sessionId: string;
  startedAt: string;
  workoutItems: WorkoutItem[];
  sets: WorkoutInProgressSet[];
}) {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>(() => buildInitialSets(workoutItems, initialSets));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [completing, setCompleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(new Date(startedAt).getTime());
  const isFirstRender = useRef(true);

  useEffect(() => {
    setMounted(true);
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save on change with 800ms debounce
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSaveStatus("saving");
    const snapshot = sets;
    const timer = setTimeout(async () => {
      await fetch(`/api/workouts/${workoutId}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets: snapshot.map((s) => ({
            workoutItemId: s.workoutItemId,
            reps: Number(s.reps) || 1,
            weight: Number(s.weight) || 0,
            position: s.position,
          })),
        }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, 800);
    return () => clearTimeout(timer);
  }, [sets, workoutId, sessionId]);

  function updateSet(itemId: string, position: number, field: "reps" | "weight", value: string) {
    setSets((prev) =>
      prev.map((s) =>
        s.workoutItemId === itemId && s.position === position ? { ...s, [field]: value } : s
      )
    );
  }

  function getSetsForItem(itemId: string) {
    return sets.filter((s) => s.workoutItemId === itemId).sort((a, b) => a.position - b.position);
  }

  function addSet(item: WorkoutItem) {
    const itemSets = getSetsForItem(item.id);
    const last = itemSets[itemSets.length - 1];
    setSets((prev) => [
      ...prev,
      {
        workoutItemId: item.id,
        reps: last?.reps ?? "1",
        weight: last?.weight ?? "0",
        position: itemSets.length,
      },
    ]);
  }

  function removeSet(itemId: string, position: number) {
    setSets((prev) =>
      prev
        .filter((s) => !(s.workoutItemId === itemId && s.position === position))
        .map((s) =>
          s.workoutItemId === itemId && s.position > position
            ? { ...s, position: s.position - 1 }
            : s
        )
    );
  }

  async function saveProgress() {
    await fetch(`/api/workouts/${workoutId}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sets: sets.map((s) => ({
          workoutItemId: s.workoutItemId,
          reps: Number(s.reps) || 1,
          weight: Number(s.weight) || 0,
          position: s.position,
        })),
      }),
    });
  }

  async function completeSession() {
    setCompleting(true);
    const durationSeconds = Math.floor((Date.now() - startRef.current) / 1000);
    await fetch(`/api/workouts/${workoutId}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isActive: false,
        completedAt: new Date().toISOString(),
        durationSeconds,
        sets: sets.map((s) => ({
          workoutItemId: s.workoutItemId,
          reps: Number(s.reps) || 1,
          weight: Number(s.weight) || 0,
          position: s.position,
        })),
      }),
    });
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Session in Progress</h1>
          {mounted
            ? <p className="mt-0.5 font-mono text-sm text-neutral-500">{formatDuration(elapsed)}</p>
            : <Skeleton className="mt-1 h-4 w-16" />
          }
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && <span className="text-xs text-neutral-400">Saving…</span>}
          {saveStatus === "saved" && <span className="text-xs text-neutral-400">Saved ✓</span>}
        </div>
      </div>

      {/* Items */}
      <ul className="flex flex-col gap-6">
        {workoutItems.map((item) => {
          const itemSets = getSetsForItem(item.id);
          return (
            <li key={item.id} className="rounded-lg border p-4">
              {/* Exercise header */}
              <div className="mb-3 flex items-center gap-3">
                {item.exercise.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.exercise.image_url}
                    alt={item.exercise.title}
                    className="h-20 w-20 shrink-0 cursor-pointer rounded-lg object-cover transition-opacity hover:opacity-80"
                    onClick={() => setPreviewImage({ url: item.exercise.image_url!, title: item.exercise.title })}
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                    <PlaceholderImage size={24} />
                  </div>
                )}
                <span className="font-semibold">{item.exercise.title}</span>
              </div>

              {/* Set rows */}
              <div className="mb-2 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                  <span className="w-8">Set</span>
                  <span className="w-20">Reps</span>
                  <span className="w-24">Weight (lb)</span>
                </div>
                {itemSets.map((s, i) => (
                  <div key={`${item.id}-${s.position}`} className="flex items-center gap-2">
                    <span className="w-8 text-sm text-neutral-400">{i + 1}</span>
                    <Input
                      type="number"
                      min={1}
                      value={s.reps}
                      onChange={(e) => updateSet(item.id, s.position, "reps", e.target.value)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={s.weight}
                      onChange={(e) => updateSet(item.id, s.position, "weight", e.target.value)}
                      className="w-24"
                    />
                    {itemSets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(item.id, s.position)}
                        className="ml-1 text-xs text-neutral-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addSet(item)}
                className="text-neutral-500"
              >
                + Add set
              </Button>
            </li>
          );
        })}
      </ul>

      {/* Bottom actions */}
      <div className="mt-8 flex justify-end">
        <Button onClick={completeSession} disabled={completing}>
          {completing ? "Completing…" : "Complete Session"}
        </Button>
      </div>

      {/* Image preview modal */}
      <Modal open={!!previewImage} onClose={() => setPreviewImage(null)} title={previewImage?.title ?? ""} className="sm:max-w-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {previewImage && (
          <img
            src={previewImage.url}
            alt={previewImage.title}
            className="w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </main>
  );
}
