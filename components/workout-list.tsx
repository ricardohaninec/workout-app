"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";
import type { Workout } from "@/lib/types";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import PlaceholderImage from "@/components/icons/placeholder-image";
import CreateWorkoutButton from "@/components/create-workout-button";
import StartWorkoutButton from "@/components/start-workout-button";

export default function WorkoutList({ workouts: initial, activeWorkoutIds = [] }: { workouts: Workout[]; activeWorkoutIds?: string[] }) {
  const activeSet = new Set(activeWorkoutIds);
  const router = useRouter();
  const [workouts, setWorkouts] = useState(initial);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
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

  const allSelected = workouts.length > 0 && selected.size === workouts.length;

  return (
    <>
      {/* Top row: heading left, actions right */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">My Workouts</h1>
        <div className="flex items-center gap-2.5">
          {selecting ? (
            <>
              {selected.size > 0 && (
                <Button variant="destructive" className="px-[18px] py-[10px]" onClick={() => setBulkDeleteOpen(true)}>
                  Delete {selected.size}
                </Button>
              )}
              <Button variant="ghost" className="px-[18px] py-[10px] text-neutral-400" onClick={toggleSelectAll}>
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
              <Button variant="outline" className="px-[18px] py-[10px]" onClick={exitSelecting}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <CreateWorkoutButton />
              <Button variant="outline" className="px-[18px] py-[10px]" onClick={() => setSelecting(true)}>
                Select
              </Button>
            </>
          )}
        </div>
      </div>

      {workouts.length === 0 ? (
        <p className="text-neutral-500">No workouts yet. Create your first one!</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((w) => (
            <li
              key={w.id}
              onClick={selecting ? () => toggleSelect(w.id) : undefined}
              className={`flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111111] transition-colors ${
                selecting ? "cursor-pointer select-none" : ""
              } ${selecting && selected.has(w.id) ? "border-orange-500/60 ring-2 ring-orange-500/30" : ""}`}
            >
              {/* Cover image */}
              {w.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.image_url} alt={w.title} className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center bg-[#1A1A1A]">
                  <PlaceholderImage />
                </div>
              )}

              {/* Card body */}
              <div className="flex flex-1 flex-col gap-2.5 p-[14px]">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] font-semibold leading-tight text-white">{w.title}</span>
                  {selecting && (
                    <Checkbox
                      checked={selected.has(w.id)}
                      onCheckedChange={() => toggleSelect(w.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                  )}
                </div>

                {/* Meta row: badge + date */}
                <div className="flex items-center gap-2">
                  {w.is_public && (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
                      Public
                    </span>
                  )}
                  <span className="text-[11px] text-[#6B7280]">
                    Updated {new Date(w.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Buttons */}
                {!selecting && (
                  <div className="mt-auto flex flex-col gap-2 pt-1">
                    <StartWorkoutButton workoutId={w.id} hasActiveSession={activeSet.has(w.id)} />
                    <Link href={`/workout/${w.id}`}>
                      <Button className="w-full" variant="outline">Update Workout</Button>
                    </Link>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title={
          <span className="flex items-center gap-2.5">
            <Trash2 size={18} className="shrink-0 text-orange-500" />
            Delete Workout{selected.size !== 1 ? "s" : ""}
          </span>
        }
      >
        {/* Divider */}
        <div className="mb-4 h-px w-full bg-white/10" />

        {/* Description */}
        <p className="mb-4 text-[14px] leading-relaxed text-[#6B7280]">
          Are you sure you want to delete{" "}
          <span className="font-medium text-white">
            {selected.size} workout{selected.size !== 1 ? "s" : ""}
          </span>
          ? This action cannot be undone.
        </p>

        {/* Warning box */}
        <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-orange-500/[0.19] bg-orange-500/[0.063] px-[14px] py-3">
          <TriangleAlert size={16} className="shrink-0 text-orange-500" />
          <span className="text-[13px] font-semibold text-orange-500">
            {selected.size} workout{selected.size !== 1 ? "s" : ""} will be permanently deleted
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5">
          <Button
            variant="outline"
            className="h-10 px-5 text-[14px] font-medium"
            onClick={() => setBulkDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-10 gap-1.5 bg-orange-500 px-5 text-[14px] font-semibold text-white hover:bg-orange-600"
            onClick={handleBulkDelete}
            disabled={bulkDeleteLoading}
          >
            <Trash2 size={14} className="shrink-0" />
            {bulkDeleteLoading ? "Deleting…" : `Delete ${selected.size}`}
          </Button>
        </div>
      </Modal>
    </>
  );
}
