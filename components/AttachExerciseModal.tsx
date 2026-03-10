"use client";

import { useEffect, useState } from "react";
import type { Exercise, PendingExercise } from "@/lib/types";
import Modal from "@/components/Modal";

type Tab = "new" | "existing";
type SetGroup = { sets: string; weight: string };

const DEFAULT_SET_GROUPS: SetGroup[] = [{ sets: "", weight: "" }];

export default function AttachExerciseModal({
  onAdd,
}: {
  onAdd: (exercise: PendingExercise) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("new");
  const [title, setTitle] = useState("");
  const [setGroups, setSetGroups] = useState<SetGroup[]>(DEFAULT_SET_GROUPS);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");

  function close() {
    setOpen(false);
    setTitle("");
    setSetGroups(DEFAULT_SET_GROUPS);
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

  function addSetGroup() {
    setSetGroups((prev) => [...prev, { sets: "", weight: "" }]);
  }

  function removeSetGroup(index: number) {
    setSetGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSetGroup(index: number, field: keyof SetGroup, value: string) {
    setSetGroups((prev) =>
      prev.map((sg, i) => (i === index ? { ...sg, [field]: value } : sg))
    );
  }

  function handleNew(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      type: "new",
      tempId: crypto.randomUUID(),
      title: title.trim() || "Untitled Exercise",
      setGroups: setGroups.map((sg) => ({
        sets: Number(sg.sets) || 1,
        weight: Number(sg.weight) || 0,
      })),
    });
    close();
  }

  function handleExisting(ex: Exercise) {
    onAdd({
      type: "existing",
      tempId: crypto.randomUUID(),
      exerciseId: ex.id,
      title: ex.title,
      setGroups: ex.setGroups,
    });
    close();
  }

  const filtered = exercises.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
      >
        + Add Exercise
      </button>

      <Modal open={open} onClose={close} title="Add Exercise">
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
          <form onSubmit={handleNew} className="flex flex-col gap-3">
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

            <div>
              <label className="mb-2 block text-sm font-medium">Sets</label>
              <div className="flex flex-col gap-2">
                {setGroups.map((sg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={sg.sets}
                      onChange={(e) => updateSetGroup(i, "sets", e.target.value)}
                      placeholder="Sets"
                      className="w-20 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <span className="text-sm text-neutral-400">×</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={sg.weight}
                      onChange={(e) => updateSetGroup(i, "weight", e.target.value)}
                      placeholder="kg"
                      className="w-24 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <span className="text-xs text-neutral-400">kg</span>
                    {setGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSetGroup(i)}
                        className="ml-auto text-neutral-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSetGroup}
                className="mt-2 text-sm text-neutral-500 hover:text-neutral-900"
              >
                + Add set group
              </button>
            </div>

            <button
              type="submit"
              className="rounded-md bg-neutral-900 py-2 text-sm text-white hover:bg-neutral-700"
            >
              Add
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
            <ul className="max-h-56 overflow-y-auto flex flex-col gap-1">
              {filtered.length === 0 && (
                <li className="py-4 text-center text-sm text-neutral-400">No exercises found.</li>
              )}
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <button
                    onClick={() => handleExisting(ex)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100"
                  >
                    <span className="font-medium">{ex.title}</span>
                    {ex.setGroups.length > 0 && (
                      <span className="ml-2 text-xs text-neutral-400">
                        {ex.setGroups.map((sg) => `${sg.sets}×${sg.weight}kg`).join(", ")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}
