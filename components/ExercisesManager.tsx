"use client";

import { useState } from "react";
import type { Exercise, ExerciseSet } from "@/lib/types";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type SetGroupInput = { sets: string; weight: string };

function toInputs(setGroups: ExerciseSet[]): SetGroupInput[] {
  return setGroups.length > 0
    ? setGroups.map((sg) => ({ sets: String(sg.sets), weight: String(sg.weight) }))
    : [{ sets: "", weight: "" }];
}

export default function ExercisesManager({ initial }: { initial: Exercise[] }) {
  const [exercises, setExercises] = useState(initial);

  // Create state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createSetGroups, setCreateSetGroups] = useState<SetGroupInput[]>([{ sets: "", weight: "" }]);
  const [createLoading, setCreateLoading] = useState(false);

  function closeCreate() {
    setCreateOpen(false);
    setCreateTitle("");
    setCreateSetGroups([{ sets: "", weight: "" }]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: createTitle.trim() || "Untitled Exercise",
        setGroups: createSetGroups.map((sg) => ({
          sets: Number(sg.sets) || 1,
          weight: Number(sg.weight) || 0,
        })),
      }),
    });
    const created: Exercise = await res.json();
    setExercises((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
    setCreateLoading(false);
    closeCreate();
  }

  // Selection state
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<Exercise | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSetGroups, setEditSetGroups] = useState<SetGroupInput[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Single delete state
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === exercises.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(exercises.map((e) => e.id)));
    }
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    setBulkDeleteLoading(true);
    await Promise.all(
      [...selected].map((id) => fetch(`/api/exercises/${id}`, { method: "DELETE" }))
    );
    setExercises((prev) => prev.filter((ex) => !selected.has(ex.id)));
    setSelected(new Set());
    setBulkDeleteLoading(false);
    setBulkDeleteOpen(false);
    setSelecting(false);
  }

  function openEdit(ex: Exercise) {
    setEditTarget(ex);
    setEditTitle(ex.title);
    setEditSetGroups(toInputs(ex.setGroups));
  }

  function closeEdit() {
    setEditTarget(null);
  }

  function addSetGroup() {
    setEditSetGroups((prev) => [...prev, { sets: "", weight: "" }]);
  }

  function removeSetGroup(i: number) {
    setEditSetGroups((prev) => prev.filter((_, j) => j !== i));
  }

  function updateSetGroup(i: number, field: keyof SetGroupInput, value: string) {
    setEditSetGroups((prev) => prev.map((sg, j) => (j === i ? { ...sg, [field]: value } : sg)));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    const res = await fetch(`/api/exercises/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim() || editTarget.title,
        setGroups: editSetGroups.map((sg) => ({
          sets: Number(sg.sets) || 1,
          weight: Number(sg.weight) || 0,
        })),
      }),
    });
    const updated: Exercise = await res.json();
    setExercises((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
    setEditLoading(false);
    closeEdit();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await fetch(`/api/exercises/${deleteTarget.id}`, { method: "DELETE" });
    setExercises((prev) => prev.filter((ex) => ex.id !== deleteTarget.id));
    setDeleteLoading(false);
    setDeleteTarget(null);
  }

  const allSelected = exercises.length > 0 && selected.size === exercises.length;

  return (
    <>
      {/* Toolbar */}
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
          {!selecting && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              + New Exercise
            </Button>
          )}
        </div>
      </div>

      {exercises.length === 0 ? (
        <p className="text-neutral-500">No exercises yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {exercises.map((ex) => (
            <li
              key={ex.id}
              onClick={selecting ? () => toggleSelect(ex.id) : undefined}
              className={`rounded-lg border p-4 transition-colors ${
                selecting ? "cursor-pointer select-none" : ""
              } ${selecting && selected.has(ex.id) ? "border-neutral-900 bg-neutral-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {selecting && (
                    <Checkbox
                      checked={selected.has(ex.id)}
                      onCheckedChange={() => toggleSelect(ex.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                  )}
                  <div>
                    <p className="font-medium">{ex.title}</p>
                    {ex.setGroups.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {ex.setGroups.map((sg) => (
                          <li key={sg.id} className="text-sm text-neutral-500">
                            <span className="font-medium text-neutral-700">{sg.sets}×</span>{" "}
                            {sg.weight} kg
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {!selecting && (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(ex)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(ex)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={closeCreate} title="New Exercise">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="e.g. Bench Press"
            />
          </div>

          <div>
            <Label className="mb-2 block">Sets</Label>
            <div className="flex flex-col gap-2">
              {createSetGroups.map((sg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={sg.sets}
                    onChange={(e) => setCreateSetGroups((prev) => prev.map((s, j) => j === i ? { ...s, sets: e.target.value } : s))}
                    placeholder="Sets"
                    className="w-20"
                  />
                  <span className="text-sm text-neutral-400">×</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={sg.weight}
                    onChange={(e) => setCreateSetGroups((prev) => prev.map((s, j) => j === i ? { ...s, weight: e.target.value } : s))}
                    placeholder="kg"
                    className="w-24"
                  />
                  <span className="text-xs text-neutral-400">kg</span>
                  {createSetGroups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setCreateSetGroups((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-auto text-neutral-400 hover:text-red-500"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateSetGroups((prev) => [...prev, { sets: "", weight: "" }])}
              className="mt-2 text-neutral-500"
            >
              + Add set group
            </Button>
          </div>

          <Button type="submit" disabled={createLoading}>
            {createLoading ? "Creating…" : "Create"}
          </Button>
        </form>
      </Modal>

      {/* Bulk delete modal */}
      <Modal open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Delete Exercises">
        <p className="mb-6 text-sm text-neutral-600">
          Are you sure you want to delete{" "}
          <span className="font-medium">{selected.size} exercise{selected.size !== 1 ? "s" : ""}</span>?
          They will also be removed from any workouts they belong to.
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

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={closeEdit} title="Edit Exercise">
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block">Sets</Label>
            <div className="flex flex-col gap-2">
              {editSetGroups.map((sg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={sg.sets}
                    onChange={(e) => updateSetGroup(i, "sets", e.target.value)}
                    placeholder="Sets"
                    className="w-20"
                  />
                  <span className="text-sm text-neutral-400">×</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={sg.weight}
                    onChange={(e) => updateSetGroup(i, "weight", e.target.value)}
                    placeholder="kg"
                    className="w-24"
                  />
                  <span className="text-xs text-neutral-400">kg</span>
                  {editSetGroups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeSetGroup(i)}
                      className="ml-auto text-neutral-400 hover:text-red-500"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addSetGroup}
              className="mt-2 text-neutral-500"
            >
              + Add set group
            </Button>
          </div>

          <Button type="submit" disabled={editLoading}>
            {editLoading ? "Saving…" : "Save"}
          </Button>
        </form>
      </Modal>

      {/* Single delete modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Exercise">
        <p className="mb-6 text-sm text-neutral-600">
          Are you sure you want to delete{" "}
          <span className="font-medium">"{deleteTarget?.title}"</span>? It will also be removed
          from any workouts it belongs to.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
