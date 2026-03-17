"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Food } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "@/components/modal";
import { fetchFoods, createFood, updateFood, deleteFood as deleteFoodApi } from "@/lib/api/foods";
import { foodKeys } from "@/lib/queryKeys";

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
  const queryClient = useQueryClient();
  const { data: foods = [] } = useQuery({
    queryKey: foodKeys.all,
    queryFn: () => fetchFoods(),
    initialData: initial,
    initialDataUpdatedAt: () => Date.now(),
  });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editFood, setEditFood] = useState<Food | null>(null);
  const [deleteFood, setDeleteFood] = useState<Food | null>(null);
  const [form, setForm] = useState<FoodForm>(emptyForm);

  const invalidateFoods = () => queryClient.invalidateQueries({ queryKey: foodKeys.all });

  const createMutation = useMutation({
    mutationFn: createFood,
    onSuccess: () => { invalidateFoods(); setCreateOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: updateFood,
    onSuccess: () => { invalidateFoods(); setEditFood(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFoodApi,
    onSuccess: () => { invalidateFoods(); setDeleteFood(null); },
  });

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

  function handleCreate() {
    createMutation.mutate({
      name: form.name,
      caloriesPerG: Number(form.caloriesPerG),
      proteinPerG: Number(form.proteinPerG),
      carbsPerG: Number(form.carbsPerG),
      fatPerG: Number(form.fatPerG),
      unit: form.unit || "g",
    });
  }

  function handleEdit() {
    if (!editFood) return;
    updateMutation.mutate({
      id: editFood.id,
      name: form.name,
      caloriesPerG: Number(form.caloriesPerG),
      proteinPerG: Number(form.proteinPerG),
      carbsPerG: Number(form.carbsPerG),
      fatPerG: Number(form.fatPerG),
      unit: form.unit || "g",
    });
  }

  function handleDelete() {
    if (!deleteFood) return;
    deleteMutation.mutate(deleteFood.id);
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
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:table-cell">Carbs/g</th>
                <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:table-cell">Protein/g</th>
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
                    {Number(f.carbs_per_g).toFixed(3)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-[13px] text-neutral-300 sm:table-cell">
                    {Number(f.protein_per_g).toFixed(3)}
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
            disabled={!formValid || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving…" : editFood ? "Save" : "Add Food"}
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
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
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
          <Label>Calories per {form.unit || "g"}</Label>
          <Input type="number" min="0" step="0.001" placeholder="1.650" value={form.caloriesPerG} onChange={field("caloriesPerG")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Carbs per {form.unit || "g"}</Label>
          <Input type="number" min="0" step="0.001" placeholder="0.000" value={form.carbsPerG} onChange={field("carbsPerG")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Protein per {form.unit || "g"}</Label>
          <Input type="number" min="0" step="0.001" placeholder="0.310" value={form.proteinPerG} onChange={field("proteinPerG")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Fat per {form.unit || "g"}</Label>
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
