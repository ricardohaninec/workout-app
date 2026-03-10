"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Exercise } from "@/lib/types";

type Tab = "new" | "existing";

export default function AttachExerciseModal({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("new");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "new exercise" form state
  const [title, setTitle] = useState("");
  const [sets, setSets] = useState("");
  const [weights, setWeights] = useState("");

  // "existing exercise" state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    setTitle("");
    setSets("");
    setWeights("");
    setSearch("");
    setTab("new");
  }

  useEffect(() => {
    if (tab === "existing") {
      fetch("/api/exercises")
        .then((r) => r.json())
        .then(setExercises)
        .catch(() => setExercises([]));
    }
  }, [tab]);

  async function attach(exerciseId: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/workouts/${workoutId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId }),
    });
    setLoading(false);
    if (res.ok) {
      close();
      router.refresh();
    } else {
      setError("Failed to attach exercise.");
    }
  }

  async function handleCreateAndAttach(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || "Untitled Exercise",
        sets: Number(sets) || 0,
        weights: Number(weights) || 0,
      }),
    });

    if (!res.ok) {
      setError("Failed to create exercise.");
      setLoading(false);
      return;
    }

    const exercise: Exercise = await res.json();
    await attach(exercise.id);
  }

  const filtered = exercises.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        onClick={open}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
      >
        + Add Exercise
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl backdrop:bg-black/40"
        onClose={close}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Exercise</h2>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1">
          {(["new", "existing"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-white shadow" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {t === "new" ? "New exercise" : "Existing exercise"}
            </button>
          ))}
        </div>

        {tab === "new" && (
          <form onSubmit={handleCreateAndAttach} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bench Press"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Sets</label>
                <input
                  type="number"
                  min={0}
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  placeholder="4"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Weight (kg)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={weights}
                  onChange={(e) => setWeights(e.target.value)}
                  placeholder="80"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-neutral-900 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {loading ? "Adding…" : "Create & Add"}
            </button>
          </form>
        )}

        {tab === "existing" && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <ul className="max-h-56 overflow-y-auto flex flex-col gap-1">
              {filtered.length === 0 && (
                <li className="py-4 text-center text-sm text-neutral-400">No exercises found.</li>
              )}
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <button
                    onClick={() => attach(ex.id)}
                    disabled={loading}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 disabled:opacity-50"
                  >
                    <span className="font-medium">{ex.title}</span>
                    <span className="ml-2 text-xs text-neutral-400">
                      {ex.sets} sets · {ex.weights} kg
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </dialog>
    </>
  );
}
