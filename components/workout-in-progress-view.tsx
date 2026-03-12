"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkoutItem, WorkoutInProgressSet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import Modal from "@/components/modal";
import PlaceholderImage from "@/components/icons/placeholder-image";

type SetRow = { workoutItemId: string; reps: string; weight: string; rest_seconds: string; position: number; isComplete: boolean };

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function buildInitialSets(workoutItems: WorkoutItem[], wipSets: WorkoutInProgressSet[]): SetRow[] {
  // Build a lookup for rest_seconds from the template: itemId+position -> rest_seconds
  const restLookup = new Map<string, number>();
  for (const item of workoutItems) {
    for (const s of item.sets) {
      restLookup.set(`${item.id}:${s.position}`, s.rest_seconds ?? 60);
    }
  }

  if (wipSets.length > 0) {
    return wipSets.map((s) => ({
      workoutItemId: s.workout_item_id,
      reps: String(s.reps),
      weight: String(s.weight),
      rest_seconds: String(restLookup.get(`${s.workout_item_id}:${s.position}`) ?? 60),
      position: s.position,
      isComplete: !!s.is_complete,
    }));
  }

  return workoutItems.flatMap((item) =>
    item.sets.map((s) => ({
      workoutItemId: item.id,
      reps: String(s.reps),
      weight: String(s.weight),
      rest_seconds: String(s.rest_seconds ?? 60),
      position: s.position,
      isComplete: false,
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
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  const [restDone, setRestDone] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const REST_STORAGE_KEY = `rest_end_${sessionId}`;

  function startRestTimer(seconds: number) {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    const endAt = Date.now() + seconds * 1000;
    sessionStorage.setItem(REST_STORAGE_KEY, String(endAt));
    setRestDone(false);
    runCountdown(endAt);
  }

  function runCountdown(endAt: number) {
    const remaining = Math.ceil((endAt - Date.now()) / 1000);
    if (remaining <= 0) { setRestCountdown(null); setRestDone(true); return; }
    setRestCountdown(remaining);
    restIntervalRef.current = setInterval(() => {
      const left = Math.ceil((endAt - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(restIntervalRef.current!);
        restIntervalRef.current = null;
        sessionStorage.removeItem(REST_STORAGE_KEY);
        setRestCountdown(null);
        setRestDone(true);
      } else {
        setRestCountdown(left);
      }
    }, 500);
  }

  // Restore timer on mount (survives refresh)
  useEffect(() => {
    const stored = sessionStorage.getItem(REST_STORAGE_KEY);
    if (stored) {
      const endAt = Number(stored);
      if (Date.now() < endAt) runCountdown(endAt);
      else { sessionStorage.removeItem(REST_STORAGE_KEY); setRestDone(true); }
    }
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [completing, setCompleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ itemId: string; position: number; setNumber: number } | null>(null);
  const startTime = new Date(startedAt).getTime();
  const startRef = useRef(startTime);
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startTime) / 1000));
  const isFirstRender = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save on change with 800ms debounce
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const snapshot = sets;
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      await fetch(`/api/workouts/${workoutId}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets: snapshot.map((s) => ({
            workoutItemId: s.workoutItemId,
            reps: Number(s.reps) || 1,
            weight: Number(s.weight) || 0,
            position: s.position,
            isComplete: s.isComplete,
          })),
        }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, 800);
    return () => clearTimeout(timer);
  }, [sets, workoutId, sessionId]);

  function updateSet(itemId: string, position: number, field: "reps" | "weight" | "rest_seconds", value: string) {
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
        rest_seconds: last?.rest_seconds ?? "60",
        position: itemSets.length,
        isComplete: false,
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

  function toggleSetComplete(itemId: string, position: number) {
    setSets((prev) => {
      const updated = prev.map((s) =>
        s.workoutItemId === itemId && s.position === position
          ? { ...s, isComplete: !s.isComplete }
          : s
      );
      const toggled = updated.find((s) => s.workoutItemId === itemId && s.position === position);
      if (toggled?.isComplete) startRestTimer(Number(toggled.rest_seconds) || 60);
      return updated;
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
          rest_seconds: Number(s.rest_seconds) || 60,
          position: s.position,
          isComplete: s.isComplete,
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
          <p className="mt-0.5 font-mono text-sm text-neutral-500" suppressHydrationWarning>{formatDuration(elapsed)}</p>
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
                  <span className="w-16">Rest (s)</span>
                  <span className="w-8 text-center">Done</span>
                </div>
                {itemSets.map((s, i) => (
                  <div
                    key={`${item.id}-${s.position}`}
                    className={`flex items-center gap-2 rounded-md px-1 transition-colors ${s.isComplete ? "bg-green-50" : ""}`}
                  >
                    <span className="w-8 text-sm text-neutral-400">{i + 1}</span>
                    <Input
                      type="number"
                      min={1}
                      value={s.reps}
                      onChange={(e) => updateSet(item.id, s.position, "reps", e.target.value)}
                      className={`w-20 ${s.isComplete ? "opacity-60" : ""}`}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={s.weight}
                      onChange={(e) => updateSet(item.id, s.position, "weight", e.target.value)}
                      className={`w-24 ${s.isComplete ? "opacity-60" : ""}`}
                    />
                    <span className={`w-16 text-sm text-neutral-500 ${s.isComplete ? "opacity-60" : ""}`}>
                      {s.rest_seconds}s
                    </span>
                    <div className="flex w-8 justify-center">
                      <Checkbox
                        checked={s.isComplete}
                        onCheckedChange={() => toggleSetComplete(item.id, s.position)}
                        aria-label={s.isComplete ? "Mark set incomplete" : "Mark set complete"}
                      />
                    </div>
                    {itemSets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPendingRemove({ itemId: item.id, position: s.position, setNumber: i + 1 })}
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
        <Button onClick={completeSession} disabled={completing || saveStatus === "saving"}>
          {completing ? "Completing…" : "Complete Session"}
        </Button>
      </div>

      {/* Floating rest countdown */}
      {restCountdown !== null && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-6 py-3 shadow-lg">
            <div>
              <p className="text-xs font-medium text-blue-600">Resting…</p>
              <p className="font-mono text-2xl font-bold leading-none text-blue-800">{formatDuration(restCountdown)}</p>
            </div>
            <button
              onClick={() => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); sessionStorage.removeItem(REST_STORAGE_KEY); setRestCountdown(null); }}
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Rest done — get ready modal */}
      <Modal open={restDone} onClose={() => setRestDone(false)} title="Get ready for your next set!">
        <div className="flex flex-col items-center gap-4 py-2">
          <svg viewBox="0 0 200 220" className="w-52 h-52" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head */}
            <ellipse cx="115" cy="38" rx="22" ry="24" fill="white" stroke="black" strokeWidth="3"/>
            {/* Hair */}
            <path d="M94 30 Q100 18 115 16 Q130 14 137 26" stroke="black" strokeWidth="4" strokeLinecap="round" fill="none"/>
            {/* Eyes */}
            <circle cx="108" cy="34" r="2.5" fill="black"/>
            <circle cx="121" cy="33" r="2.5" fill="black"/>
            {/* Smile */}
            <path d="M107 43 Q114 50 122 43" stroke="black" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            {/* Body — chubby torso */}
            <ellipse cx="100" cy="115" rx="38" ry="48" fill="white" stroke="black" strokeWidth="3"/>
            {/* Belt */}
            <path d="M63 130 Q100 136 137 128" stroke="black" strokeWidth="4" strokeLinecap="round"/>
            {/* Neck */}
            <line x1="110" y1="60" x2="108" y2="72" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            {/* Right arm — raised fist */}
            <path d="M137 88 Q158 68 165 52" stroke="black" strokeWidth="5" strokeLinecap="round" fill="none"/>
            {/* Fist */}
            <rect x="158" y="43" width="16" height="14" rx="6" fill="black"/>
            {/* Left arm — down/back */}
            <path d="M63 95 Q44 110 38 128" stroke="black" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <ellipse cx="37" cy="133" rx="7" ry="6" fill="white" stroke="black" strokeWidth="2.5"/>
            {/* Right leg — forward/up */}
            <path d="M110 160 Q108 178 95 192" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none"/>
            {/* Right shoe */}
            <ellipse cx="88" cy="196" rx="14" ry="7" fill="black"/>
            {/* Left leg — back */}
            <path d="M88 158 Q82 172 90 188" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none"/>
            {/* Left shoe */}
            <ellipse cx="95" cy="192" rx="13" ry="6" fill="black"/>
            {/* Shadow */}
            <ellipse cx="95" cy="210" rx="30" ry="5" fill="black" opacity="0.15"/>
          </svg>
          <p className="text-center text-base font-medium text-neutral-700">
            Rest over — time to crush the next set!
          </p>
          <Button className="w-full" onClick={() => setRestDone(false)}>
            Let&apos;s go!
          </Button>
        </div>
      </Modal>

      {/* Remove set confirmation modal */}
      <Modal open={!!pendingRemove} onClose={() => setPendingRemove(null)} title="Remove Set">
        <p className="text-sm text-neutral-600">
          Are you sure you want to remove Set {pendingRemove?.setNumber}?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPendingRemove(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (pendingRemove) removeSet(pendingRemove.itemId, pendingRemove.position);
              setPendingRemove(null);
            }}
          >
            Remove
          </Button>
        </div>
      </Modal>

      {/* Image preview modal */}
      <Modal open={!!previewImage} onClose={() => setPreviewImage(null)} title={previewImage?.title ?? ""} className="sm:max-w-2xl">
        {previewImage && (
          // eslint-disable-next-line @next/next/no-img-element
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
