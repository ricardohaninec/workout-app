"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { Food } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "@/components/modal";

type FoodForm = {
  name: string;
  caloriesPerG: string;
  proteinPerG: string;
  carbsPerG: string;
  fatPerG: string;
  unit: string;
};

const emptyForm: FoodForm = {
  name: "",
  caloriesPerG: "",
  proteinPerG: "",
  carbsPerG: "",
  fatPerG: "",
  unit: "g",
};

export default function FoodsLibrary({ foods: initial }: { foods: Food[] }) {
  const [foods, setFoods] = useState(initial);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editFood, setEditFood] = useState<Food | null>(null);
  const [deleteFood, setDeleteFood] = useState<Food | null>(null);
  const [form, setForm] = useState<FoodForm>(emptyForm);
  const [loading, setLoading] = useState(false);

  const filtered = foods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm(emptyForm);
    setCreateOpen(true);
  }

  function openEdit(f: Food) {
    setEditFood(f);
    setForm({
      name: f.name,
      caloriesPerG: String(f.calories_per_g),
      proteinPerG: String(f.protein_per_g),
      carbsPerG: String(f.carbs_per_g),
      fatPerG: String(f.fat_per_g),
      unit: f.unit,
    });
  }

  function closeModal() {
    setCreateOpen(false);
    setEditFood(null);
  }

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        caloriesPerG: Number(form.caloriesPerG),
        proteinPerG: Number(form.proteinPerG),
        carbsPerG: Number(form.carbsPerG),
        fatPerG: Number(form.fatPerG),
        unit: form.unit || "g",
      }),
    });
    setLoading(false);
    if (!res.ok) return;
    const food = await res.json();
    setFoods((prev) => [...prev, food].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateOpen(false);
  }

  async function handleEdit() {
    if (!editFood) return;
    setLoading(true);
    const res = await fetch(`/api/foods/${editFood.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        caloriesPerG: Number(form.caloriesPerG),
        proteinPerG: Number(form.proteinPerG),
        carbsPerG: Number(form.carbsPerG),
        fatPerG: Number(form.fatPerG),
        unit: form.unit || "g",
      }),
    });
    setLoading(false);
    if (!res.ok) return;
    const updated = await res.json();
    setFoods((prev) =>
      prev.map((f) => (f.id === updated.id ? updated : f)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditFood(null);
  }

  async function handleDelete() {
    if (!deleteFood) return;
    setLoading(true);
    await fetch(`/api/foods/${deleteFood.id}`, { method: "DELETE" });
    setLoading(false);
    setFoods((prev) => prev.filter((f) => f.id !== deleteFood.id));
    setDeleteFood(null);
  }

  const formValid =
    form.name &&
    form.caloriesPerG !== "" &&
    form.proteinPerG !== "" &&
    form.carbsPerG !== "" &&
    form.fatPerG !== "";

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Food Library</h1>
        <Button
          className="gap-2 bg-orange-500 text-[14px] font-semibold text-white hover:bg-orange-600"
          onClick={openCreate}
        >
          <Plus size={15} /> Add Food
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <Input
          className="pl-8"
          placeholder="Search foods…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-neutral-500">
          {foods.length === 0 ? "No foods yet. Add your first food!" : "No results."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Name</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Cal/g</th>
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:table-cell">Protein/g</th>
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:table-cell">Carbs/g</th>
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:table-cell">Fat/g</th>
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:table-cell">Unit</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr
                  key={f.id}
                  className={i !== filtered.length - 1 ? "border-b border-white/[0.05]" : ""}
                >
                  <td className="px-4 py-3 text-[14px] font-medium text-white">{f.name}</td>
                  <td className="px-4 py-3 text-right text-[13px] text-neutral-300">
                    {Number(f.calories_per_g).toFixed(3)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-[13px] text-neutral-300 sm:table-cell">
                    {Number(f.protein_per_g).toFixed(3)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-[13px] text-neutral-300 sm:table-cell">
                    {Number(f.carbs_per_g).toFixed(3)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-[13px] text-neutral-300 sm:table-cell">
                    {Number(f.fat_per_g).toFixed(3)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-[13px] text-neutral-500 sm:table-cell">
                    {f.unit}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-white/5 hover:text-white"
                        onClick={() => openEdit(f)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-white/5 hover:text-red-400"
                        onClick={() => setDeleteFood(f)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={createOpen || editFood !== null}
        onClose={closeModal}
        title={editFood ? "Edit Food" : "Add Food"}
      >
        <div className="mb-4 h-px w-full bg-white/10" />
        <FoodFormFields form={form} onChange={setForm} />
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button
            className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
            onClick={editFood ? handleEdit : handleCreate}
            disabled={!formValid || loading}
          >
            {loading ? "Saving…" : editFood ? "Save" : "Add Food"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={deleteFood !== null} onClose={() => setDeleteFood(null)} title="Delete Food">
        <div className="mb-4 h-px w-full bg-white/10" />
        <p className="mb-6 text-[14px] leading-relaxed text-neutral-400">
          Delete <span className="font-semibold text-white">{deleteFood?.name}</span>?{" "}
          Historical meal logs won&apos;t be affected.
        </p>
        <div className="flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setDeleteFood(null)}>Cancel</Button>
          <Button
            className="bg-red-500 font-semibold text-white hover:bg-red-600"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function FoodFormFields({
  form,
  onChange,
}: {
  form: FoodForm;
  onChange: (f: FoodForm) => void;
}) {
  const field =
    (key: keyof FoodForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...form, [key]: e.target.value });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Name</Label>
        <Input placeholder="e.g. Chicken Breast" value={form.name} onChange={field("name")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Calories per g</Label>
          <Input type="number" min="0" step="0.001" placeholder="1.650" value={form.caloriesPerG} onChange={field("caloriesPerG")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Protein per g</Label>
          <Input type="number" min="0" step="0.001" placeholder="0.310" value={form.proteinPerG} onChange={field("proteinPerG")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Carbs per g</Label>
          <Input type="number" min="0" step="0.001" placeholder="0.000" value={form.carbsPerG} onChange={field("carbsPerG")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Fat per g</Label>
          <Input type="number" min="0" step="0.001" placeholder="0.036" value={form.fatPerG} onChange={field("fatPerG")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Default Unit</Label>
        <Input placeholder="g" value={form.unit} onChange={field("unit")} />
      </div>
    </div>
  );
}
