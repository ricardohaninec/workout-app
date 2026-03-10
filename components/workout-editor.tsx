"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PendingWorkoutItem, Workout, WorkoutItem } from "@/lib/types";
import AddWorkoutItemModal from "@/components/add-workout-item-modal";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkoutEditor({
  workoutId,
  initialTitle,
  initialIsPublic,
  initialSlug,
  savedItems,
}: {
  workoutId: string;
  initialTitle: string;
  initialIsPublic: boolean;
  initialSlug: string | null;
  savedItems: WorkoutItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [pending, setPending] = useState<PendingWorkoutItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [slug, setSlug] = useState(initialSlug);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const isDirty = title.trim() !== initialTitle || pending.length > 0;

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
          <ul className="flex flex-col gap-3">
            {savedItems.map((item) => (
              <li key={item.id}>
                <Card className="flex flex-row justify-between py-0 gap-0 min-h-36">
                  <div className="flex flex-col justify-center h-full py-2">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">{item.exercise.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1">
                        {item.sets.map((s, i) => (
                          <li key={s.id} className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Set {i + 1}:</span>{" "}
                            {s.reps} reps × {s.weight} kg
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>
                  {item.exercise.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.exercise.image_url} alt={item.exercise.title} className="w-48 shrink-0 rounded-r-xl object-cover" />
                  )}
                </Card>
              </li>
            ))}

            {pending.map((item) => (
              <li key={item.tempId}>
                <Card className="flex flex-row justify-between py-0 gap-0 border-dashed min-h-36">
                  <div className="flex flex-col justify-between flex-1 py-2">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold flex items-center justify-between">
                        <span>{item.exerciseTitle}</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            unsaved
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setPending((prev) => prev.filter((p) => p.tempId !== item.tempId))}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            ✕
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1">
                        {item.sets.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Set {i + 1}:</span>{" "}
                            {s.reps} reps × {s.weight} kg
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>
                  {item.exerciseImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.exerciseImageUrl} alt={item.exerciseTitle} className="w-48 shrink-0 rounded-r-xl object-cover" />
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Workout">
        <p className="mb-6 text-sm text-neutral-600">
          Are you sure you want to delete <span className="font-medium">&quot;{title}&quot;</span>? This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </main>
  );
}
