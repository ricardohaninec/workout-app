"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Workout } from "@/lib/types";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import PlaceholderImage from "@/components/icons/placeholder-image";

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

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workouts.map((w) => (
          <li
            key={w.id}
            onClick={selecting ? () => toggleSelect(w.id) : undefined}
            className={`overflow-hidden rounded-xl border bg-white transition-colors ${
              selecting ? "cursor-pointer select-none" : ""
            } ${selecting && selected.has(w.id) ? "border-neutral-900 ring-2 ring-neutral-900" : ""}`}
          >
            {/* Cover image */}
            {w.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={w.image_url} alt={w.title} className="h-44 w-full object-cover" />
            ) : (
              <div className="flex h-44 items-center justify-center bg-neutral-100">
                <PlaceholderImage />
              </div>
            )}

            <div className="p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="font-semibold leading-tight">{w.title}</span>
                {w.is_public ? (
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-neutral-500">
                    Public
                  </span>
                ) : null}
                {selecting && (
                  <Checkbox
                    checked={selected.has(w.id)}
                    onCheckedChange={() => toggleSelect(w.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                )}
              </div>
              <p className="mb-4 text-xs text-neutral-400">
                Updated {new Date(w.updated_at).toLocaleDateString()}
              </p>
              {!selecting && (
                <Link href={`/workout/${w.id}`}>
                  <Button className="w-full">Open Workout</Button>
                </Link>
              )}
            </div>
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
