"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Exercise, PendingExercise, Workout } from "@/lib/types";
import AttachExerciseModal from "@/components/AttachExerciseModal";
import Modal from "@/components/Modal";

export default function WorkoutEditor({
  workoutId,
  initialTitle,
  initialIsPublic,
  initialSlug,
  savedExercises,
}: {
  workoutId: string;
  initialTitle: string;
  initialIsPublic: boolean;
  initialSlug: string | null;
  savedExercises: Exercise[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [pending, setPending] = useState<PendingExercise[]>([]);
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

    for (const ex of pending) {
      let exerciseId: string;

      if (ex.type === "new") {
        const res = await fetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: ex.title, setGroups: ex.setGroups }),
        });
        const created = await res.json();
        exerciseId = created.id;
      } else {
        exerciseId = ex.exerciseId;
      }

      await fetch(`/api/workouts/${workoutId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId }),
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
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-3 py-1 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          )}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className={`rounded-md border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
              isPublic
                ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                : "hover:bg-neutral-100"
            }`}
          >
            {shareLoading ? "…" : isPublic ? "Shared ✓" : "Share"}
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
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
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(`${origin}/p/${slug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className="shrink-0 rounded-md border border-green-300 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Exercises</h2>
          <AttachExerciseModal onAdd={(ex) => setPending((prev) => [...prev, ex])} />
        </div>

        {savedExercises.length === 0 && pending.length === 0 ? (
          <p className="text-neutral-500">No exercises yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {savedExercises.map((ex) => (
              <li key={ex.id} className="rounded-lg border p-4">
                <p className="mb-2 font-medium">{ex.title}</p>
                <ul className="flex flex-col gap-1">
                  {ex.setGroups.map((sg) => (
                    <li key={sg.id} className="text-sm text-neutral-500">
                      <span className="font-medium text-neutral-700">{sg.sets}×</span>{" "}
                      {sg.weight} kg
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            {pending.map((ex) => (
              <li key={ex.tempId} className="rounded-lg border border-dashed border-neutral-300 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-neutral-600">{ex.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      unsaved
                    </span>
                    <button
                      onClick={() => setPending((prev) => prev.filter((p) => p.tempId !== ex.tempId))}
                      className="text-neutral-400 hover:text-red-500 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <ul className="flex flex-col gap-1">
                  {ex.setGroups.map((sg, i) => (
                    <li key={i} className="text-sm text-neutral-500">
                      <span className="font-medium text-neutral-700">{sg.sets}×</span>{" "}
                      {sg.weight} kg
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Workout">
        <p className="mb-6 text-sm text-neutral-600">
          Are you sure you want to delete <span className="font-medium">"{title}"</span>? This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeleteOpen(false)}
            className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </main>
  );
}
