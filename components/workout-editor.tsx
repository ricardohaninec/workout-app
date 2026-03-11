"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PendingWorkoutItem, Workout, WorkoutItem } from "@/lib/types";
import AddWorkoutItemModal from "@/components/add-workout-item-modal";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import WorkoutItemCard from "@/components/workout-item-card";

type SetRow = { reps: string; weight: string };

async function uploadWorkoutImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/workouts/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url as string;
}

export default function WorkoutEditor({
  workoutId,
  initialTitle,
  initialImageUrl,
  initialIsPublic,
  initialSlug,
  savedItems,
}: {
  workoutId: string;
  initialTitle: string;
  initialImageUrl: string | null;
  initialIsPublic: boolean;
  initialSlug: string | null;
  savedItems: WorkoutItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [imageUploading, setImageUploading] = useState(false);
  const [pending, setPending] = useState<PendingWorkoutItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [slug, setSlug] = useState(initialSlug);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  // Edit item state
  const [editItem, setEditItem] = useState<WorkoutItem | null>(null);
  const [editSets, setEditSets] = useState<SetRow[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // Remove item state
  const [removeItem, setRemoveItem] = useState<WorkoutItem | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const isDirty = title.trim() !== initialTitle || imageUrl !== initialImageUrl || pending.length > 0;

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const url = await uploadWorkoutImage(file);
      setImageUrl(url);
      await fetch(`/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url }),
      });
    } finally {
      setImageUploading(false);
    }
  }

  async function handleRemoveImage() {
    setImageUrl(null);
    await fetch(`/api/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: null }),
    });
  }

  function openEdit(item: WorkoutItem) {
    setEditItem(item);
    setEditSets(item.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditSaving(true);
    await fetch(`/api/workouts/${workoutId}/items/${editItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sets: editSets.map((s) => ({ reps: Number(s.reps) || 1, weight: Number(s.weight) || 0 })),
      }),
    });
    setEditSaving(false);
    setEditItem(null);
    router.refresh();
  }

  async function handleRemoveItem() {
    if (!removeItem) return;
    setRemoveLoading(true);
    await fetch(`/api/workouts/${workoutId}/items/${removeItem.id}`, { method: "DELETE" });
    setRemoveLoading(false);
    setRemoveItem(null);
    router.refresh();
  }

  async function save() {
    setSaving(true);

    if (title.trim() !== initialTitle) {
      await fetch(`/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
    }

    for (const item of pending) {
      let exerciseId: string;

      if (item.type === "new") {
        const res = await fetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: item.exerciseTitle }),
        });
        const created = await res.json();
        exerciseId = created.id;
      } else {
        exerciseId = item.exerciseId;
      }

      await fetch(`/api/workouts/${workoutId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, sets: item.sets }),
      });
    }

    setPending([]);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    await fetch(`/api/workouts/${workoutId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  async function handleShare() {
    setShareLoading(true);
    const next = !isPublic;
    const res = await fetch(`/api/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: next }),
    });
    const updated: Workout = await res.json();
    setIsPublic(next);
    setSlug(updated.public_slug);
    setShareLoading(false);
    if (!next) setCopied(false);
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold bg-transparent outline-none border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 transition-colors w-full max-w-sm"
        />
        <div className="flex gap-2">
          {isDirty && (
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={shareLoading}
            className={isPublic ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100" : ""}
          >
            {shareLoading ? "…" : isPublic ? "Shared ✓" : "Share"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Workout image */}
      <div className="mb-6">
        {imageUrl ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors">
            {imageUploading ? "Uploading…" : "+ Add workout image"}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} disabled={imageUploading} />
          </label>
        )}
      </div>

      {isPublic && slug && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
          <span className="text-xs text-green-600 font-medium shrink-0">Public link</span>
          <a
            href={`/p/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-sm text-green-700 underline underline-offset-2"
          >
            {origin ? `${origin}/p/${slug}` : `/p/${slug}`}
          </a>
          <Button
            variant="outline"
            size="xs"
            onClick={async () => {
              await navigator.clipboard.writeText(`${origin}/p/${slug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className="shrink-0 border-green-300 text-green-700 hover:bg-green-100"
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Exercises</h2>
          <AddWorkoutItemModal onAdd={(item) => setPending((prev) => [...prev, item])} />
        </div>

        {savedItems.length === 0 && pending.length === 0 ? (
          <p className="text-neutral-500">No exercises yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {savedItems.map((item) => (
              <li key={item.id}>
                <WorkoutItemCard item={item} onEdit={openEdit} onRemove={setRemoveItem} />
              </li>
            ))}

            {pending.map((item) => (
              <li key={item.tempId}>
                <Card className="pt-0 overflow-hidden border-dashed">
                  <div className="relative h-28 w-full">
                    {item.exerciseImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.exerciseImageUrl} alt={item.exerciseTitle} className="h-full w-full object-cover brightness-90" />
                    ) : (
                      <div className="h-full w-full bg-neutral-200" />
                    )}
                  </div>
                  <CardHeader>
                    <CardAction><Badge variant="secondary">unsaved</Badge></CardAction>
                    <CardTitle>{item.exerciseTitle}</CardTitle>
                    <CardDescription>
                      <ul className="flex flex-col gap-0.5">
                        {item.sets.map((s, i) => (
                          <li key={i}>Set {i + 1}: {s.reps} reps × {s.weight} lb</li>
                        ))}
                      </ul>
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setPending((prev) => prev.filter((p) => p.tempId !== item.tempId))}>
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Edit item modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Edit — ${editItem?.exercise.title}`}>
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 pt-1">
          <Label className="block">Sets</Label>
          <div className="flex flex-col gap-2">
            {editSets.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={s.reps}
                  onChange={(e) => setEditSets(editSets.map((r, j) => j === i ? { ...r, reps: e.target.value } : r))}
                  placeholder="Reps"
                  className="w-20"
                />
                <span className="text-sm text-neutral-400">×</span>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={s.weight}
                  onChange={(e) => setEditSets(editSets.map((r, j) => j === i ? { ...r, weight: e.target.value } : r))}
                  placeholder="kg"
                  className="w-24"
                />
                <span className="text-xs text-neutral-400">kg</span>
                {editSets.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditSets(editSets.filter((_, j) => j !== i))}
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
            onClick={() => setEditSets([...editSets, { reps: "", weight: "" }])}
            className="self-start text-neutral-500"
          >
            + Add set
          </Button>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button type="submit" disabled={editSaving}>{editSaving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>

      {/* Remove item confirmation */}
      <Modal open={!!removeItem} onClose={() => setRemoveItem(null)} title="Remove Exercise">
        <p className="mb-6 text-sm text-neutral-600">
          Remove <span className="font-medium">{removeItem?.exercise.title}</span> from this workout?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRemoveItem(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleRemoveItem} disabled={removeLoading}>
            {removeLoading ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Modal>

      {/* Delete workout modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Workout">
        <p className="mb-6 text-sm text-neutral-600">
          Are you sure you want to delete <span className="font-medium">&quot;{title}&quot;</span>? This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </main>
  );
}
