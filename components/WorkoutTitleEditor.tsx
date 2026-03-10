"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WorkoutTitleEditor({
  workoutId,
  initialTitle,
}: {
  workoutId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  const isDirty = title.trim() !== initialTitle;

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    await fetch(`/api/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="text-2xl font-bold bg-transparent outline-none border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 transition-colors w-full max-w-sm"
      />
      {isDirty && (
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-3 py-1 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
