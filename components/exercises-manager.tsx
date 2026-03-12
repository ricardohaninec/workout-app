"use client";

import { useState } from "react";
import PlaceholderImage from "@/components/icons/placeholder-image";
import type { Exercise } from "@/lib/types";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/exercises/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url as string;
}

function ImageUpload({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Exercise" className="h-32 w-32 rounded-md object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-[10px] text-white hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className="flex h-20 w-32 cursor-pointer items-center justify-center rounded-md border border-dashed border-neutral-300 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-600">
          {uploading ? "Uploading…" : "+ Image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

export default function ExercisesManager({ initial }: { initial: Exercise[] }) {
  const [exercises, setExercises] = useState(initial);
  const [search, setSearch] = useState("");

  // Create state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  function closeCreate() {
    setCreateOpen(false);
    setCreateTitle("");
    setCreateImageUrl(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle.trim() || "Untitled Exercise", image_url: createImageUrl }),
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
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
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
    setEditImageUrl(ex.image_url);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    const res = await fetch(`/api/exercises/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim() || editTarget.title, image_url: editImageUrl }),
    });
    const updated: Exercise = await res.json();
    setExercises((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
    setEditLoading(false);
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await fetch(`/api/exercises/${deleteTarget.id}`, { method: "DELETE" });
    setExercises((prev) => prev.filter((ex) => ex.id !== deleteTarget.id));
    setDeleteLoading(false);
    setDeleteTarget(null);
  }

  const filtered = search.trim()
    ? exercises.filter((ex) => ex.title.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  const allSelected = exercises.length > 0 && selected.size === exercises.length;

  return (
    <>
      {/* Search */}
      {!selecting && (
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

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

      {filtered.length === 0 ? (
        <p className="text-neutral-500">{search.trim() ? "No exercises match your search." : "No exercises yet."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((ex) => (
            <li
              key={ex.id}
              onClick={selecting ? () => toggleSelect(ex.id) : undefined}
              className={`rounded-lg border p-4 transition-colors ${
                selecting ? "cursor-pointer select-none" : ""
              } ${selecting && selected.has(ex.id) ? "border-neutral-900 bg-neutral-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {selecting && (
                    <Checkbox
                      checked={selected.has(ex.id)}
                      onCheckedChange={() => toggleSelect(ex.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {ex.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ex.image_url} alt={ex.title} className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-md bg-neutral-100 flex items-center justify-center">
                      <PlaceholderImage size={20} />
                    </div>
                  )}
                  <p className="font-medium truncate min-w-0">{ex.title}</p>
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
          <div className="flex flex-col gap-1.5">
            <Label>Image <span className="text-neutral-400">(optional)</span></Label>
            <ImageUpload value={createImageUrl} onChange={setCreateImageUrl} />
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
          Workout items referencing these exercises will not be automatically deleted.
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
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Exercise">
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Image <span className="text-neutral-400">(optional)</span></Label>
            <ImageUpload value={editImageUrl} onChange={setEditImageUrl} />
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
          <span className="font-medium">&quot;{deleteTarget?.title}&quot;</span>?
          Workout items referencing this exercise will not be automatically deleted.
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
