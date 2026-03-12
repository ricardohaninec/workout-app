"use client";

import { useEffect, useState } from "react";
import type { Exercise, PendingWorkoutItem } from "@/lib/types";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Tab = "new" | "existing";
type SetRow = { reps: string; weight: string };

const DEFAULT_SETS: SetRow[] = [{ reps: "", weight: "" }];

export default function AddWorkoutItemModal({
  onAdd,
}: {
  onAdd: (item: PendingWorkoutItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("new");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sets, setSets] = useState<SetRow[]>(DEFAULT_SETS);
  const [note, setNote] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  function close() {
    setOpen(false);
    setTitle("");
    setImageUrl(null);
    setSets(DEFAULT_SETS);
    setNote("");
    setSearch("");
    setTab("new");
    setSelectedExercise(null);
  }

  useEffect(() => {
    if (tab === "existing") {
      fetch("/api/exercises")
        .then((r) => r.json())
        .then(setExercises)
        .catch(() => setExercises([]));
    }
  }, [tab]);

  function parsedSets() {
    return sets.map((s) => ({ reps: Number(s.reps) || 1, weight: Number(s.weight) || 0 }));
  }

  function handleNew(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      type: "new",
      tempId: crypto.randomUUID(),
      exerciseTitle: title.trim() || "Untitled Exercise",
      exerciseImageUrl: imageUrl,
      sets: parsedSets(),
      note: note.trim() || null,
    });
    close();
  }

  function handleExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExercise) return;
    onAdd({
      type: "existing",
      tempId: crypto.randomUUID(),
      exerciseId: selectedExercise.id,
      exerciseTitle: selectedExercise.title,
      exerciseImageUrl: selectedExercise.image_url,
      sets: parsedSets(),
      note: note.trim() || null,
    });
    close();
  }

  const filtered = exercises.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Exercise</Button>

      <Modal open={open} onClose={close} title="Add Workout Item">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelectedExercise(null); setSets(DEFAULT_SETS); }}>
          <TabsList className="w-full">
            <TabsTrigger value="new" className="flex-1">New exercise</TabsTrigger>
            <TabsTrigger value="existing" className="flex-1">Existing exercise</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <form onSubmit={handleNew} className="flex flex-col gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bench Press"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Image <span className="text-neutral-400">(optional)</span></Label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} />
              </div>

              <SetsEditor sets={sets} onChange={setSets} />

              <div className="flex flex-col gap-1.5">
                <Label>Note <span className="text-neutral-400">(optional)</span></Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. keep elbows tucked, slow on the way down…"
                  rows={2}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <Button type="submit">Add</Button>
            </form>
          </TabsContent>

          <TabsContent value="existing">
            <div className="flex flex-col gap-3 pt-3">
              {!selectedExercise ? (
                <>
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exercises…"
                  />
                  <ul className="max-h-56 overflow-y-auto flex flex-col gap-1">
                    {filtered.length === 0 && (
                      <li className="py-4 text-center text-sm text-neutral-400">No exercises found.</li>
                    )}
                    {filtered.map((ex) => (
                      <li key={ex.id}>
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedExercise(ex)}
                          className="w-full justify-start"
                        >
                          {ex.title}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <form onSubmit={handleExisting} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedExercise(null)}>
                      ← Back
                    </Button>
                    <span className="font-medium">{selectedExercise.title}</span>
                  </div>

                  <SetsEditor sets={sets} onChange={setSets} />

                  <div className="flex flex-col gap-1.5">
                    <Label>Note <span className="text-neutral-400">(optional)</span></Label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. keep elbows tucked, slow on the way down…"
                      rows={2}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>

                  <Button type="submit">Add</Button>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Modal>
    </>
  );
}

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

function SetsEditor({ sets, onChange }: { sets: { reps: string; weight: string }[]; onChange: (s: { reps: string; weight: string }[]) => void }) {
  return (
    <div>
      <Label className="mb-2 block">Sets</Label>
      <div className="flex flex-col gap-2">
        {sets.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={s.reps}
              onChange={(e) => onChange(sets.map((r, j) => j === i ? { ...r, reps: e.target.value } : r))}
              placeholder="Reps"
              className="w-20"
            />
            <span className="text-sm text-neutral-400">×</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={s.weight}
              onChange={(e) => onChange(sets.map((r, j) => j === i ? { ...r, weight: e.target.value } : r))}
              placeholder="lb"
              className="w-24"
            />
            <span className="text-xs text-neutral-400">lb</span>
            {sets.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange(sets.filter((_, j) => j !== i))}
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
        onClick={() => onChange([...sets, { reps: "", weight: "" }])}
        className="mt-2 text-neutral-500"
      >
        + Add set
      </Button>
    </div>
  );
}
