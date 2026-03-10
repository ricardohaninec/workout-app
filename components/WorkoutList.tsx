"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Workout } from "@/lib/types";
import Modal from "@/components/Modal";

export default function WorkoutList({ workouts: initial }: { workouts: Workout[] }) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState(initial);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(
      selected.size === workouts.length ? new Set() : new Set(workouts.map((w) => w.id))
    );
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    setBulkDeleteLoading(true);
    await Promise.all(
      [...selected].map((id) => fetch(`/api/workouts/${id}`, { method: "DELETE" }))
    );
    setWorkouts((prev) => prev.filter((w) => !selected.has(w.id)));
    setSelected(new Set());
    setBulkDeleteLoading(false);
    setBulkDeleteOpen(false);
    setSelecting(false);
    router.refresh();
  }

  if (workouts.length === 0) {
    return <p className="text-neutral-500">No workouts yet. Create your first one!</p>;
  }

  const allSelected = workouts.length > 0 && selected.size === workouts.length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        {selecting ? (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <span className="text-sm text-neutral-400">{selected.size} selected</span>
          </div>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          {selecting && selected.size > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
            >
              Delete {selected.size}
            </button>
          )}
          <button
            onClick={selecting ? exitSelecting : () => setSelecting(true)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            {selecting ? "Cancel" : "Select"}
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {workouts.map((w) => (
          <li
            key={w.id}
            onClick={selecting ? () => toggleSelect(w.id) : undefined}
            className={`rounded-lg border p-4 transition-colors ${
              selecting ? "cursor-pointer select-none" : ""
            } ${selecting && selected.has(w.id) ? "border-neutral-900 bg-neutral-50" : ""}`}
          >
            {selecting ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(w.id)}
                    onChange={() => toggleSelect(w.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 cursor-pointer accent-neutral-900"
                  />
                  <span className="font-medium">{w.title}</span>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(w.updated_at).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <Link
                href={`/workout/${w.id}`}
                className="flex items-center justify-between hover:bg-neutral-50"
              >
                <span className="font-medium">{w.title}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(w.updated_at).toLocaleDateString()}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      <Modal open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Delete Workouts">
        <p className="mb-6 text-sm text-neutral-600">
          Are you sure you want to delete{" "}
          <span className="font-medium">
            {selected.size} workout{selected.size !== 1 ? "s" : ""}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setBulkDeleteOpen(false)}
            className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleteLoading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleteLoading ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        </div>
      </Modal>
    </>
  );
}
