"use client";

import { useEffect, useState } from "react";
import type { Exercise, PendingExercise } from "@/lib/types";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Tab = "new" | "existing";
type SetGroup = { sets: string; weight: string };

const DEFAULT_SET_GROUPS: SetGroup[] = [{ sets: "", weight: "" }];

export default function AttachExerciseModal({
  onAdd,
}: {
  onAdd: (exercise: PendingExercise) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("new");
  const [title, setTitle] = useState("");
  const [setGroups, setSetGroups] = useState<SetGroup[]>(DEFAULT_SET_GROUPS);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");

  function close() {
    setOpen(false);
    setTitle("");
    setSetGroups(DEFAULT_SET_GROUPS);
    setSearch("");
    setTab("new");
  }

  useEffect(() => {
    if (tab === "existing") {
      fetch("/api/exercises")
        .then((r) => r.json())
        .then(setExercises)
        .catch(() => setExercises([]));
    }
  }, [tab]);

  function addSetGroup() {
    setSetGroups((prev) => [...prev, { sets: "", weight: "" }]);
  }

  function removeSetGroup(index: number) {
    setSetGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSetGroup(index: number, field: keyof SetGroup, value: string) {
    setSetGroups((prev) =>
      prev.map((sg, i) => (i === index ? { ...sg, [field]: value } : sg))
    );
  }

  function handleNew(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      type: "new",
      tempId: crypto.randomUUID(),
      title: title.trim() || "Untitled Exercise",
      setGroups: setGroups.map((sg) => ({
        sets: Number(sg.sets) || 1,
        weight: Number(sg.weight) || 0,
      })),
    });
    close();
  }

  function handleExisting(ex: Exercise) {
    onAdd({
      type: "existing",
      tempId: crypto.randomUUID(),
      exerciseId: ex.id,
      title: ex.title,
      setGroups: ex.setGroups,
    });
    close();
  }

  const filtered = exercises.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Exercise</Button>

      <Modal open={open} onClose={close} title="Add Exercise">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
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

              <div>
                <Label className="mb-2 block">Sets</Label>
                <div className="flex flex-col gap-2">
                  {setGroups.map((sg, i) => (
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
                      {setGroups.length > 1 && (
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

              <Button type="submit">Add</Button>
            </form>
          </TabsContent>

          <TabsContent value="existing">
            <div className="flex flex-col gap-3 pt-3">
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
                      onClick={() => handleExisting(ex)}
                      className="w-full justify-start"
                    >
                      <span className="font-medium">{ex.title}</span>
                      {ex.setGroups.length > 0 && (
                        <span className="ml-2 text-xs text-neutral-400">
                          {ex.setGroups.map((sg) => `${sg.sets}×${sg.weight}kg`).join(", ")}
                        </span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </Modal>
    </>
  );
}
