"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Workout } from "@/lib/types";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
            <span className="text-sm text-neutral-400">{selected.size} selected</span>
          </div>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          {selecting && selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              Delete {selected.size}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={selecting ? exitSelecting : () => setSelecting(true)}
          >
            {selecting ? "Cancel" : "Select"}
          </Button>
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
                  <Checkbox
                    checked={selected.has(w.id)}
                    onCheckedChange={() => toggleSelect(w.id)}
                    onClick={(e) => e.stopPropagation()}
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
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteLoading}>
            {bulkDeleteLoading ? "Deleting…" : `Delete ${selected.size}`}
          </Button>
        </div>
      </Modal>
    </>
  );
}
