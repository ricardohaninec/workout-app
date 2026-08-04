"use client";

import { useState } from "react";
import { Camera, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Food, MealFood, ProposedFood } from "@/lib/types";
import Modal from "@/components/modal";
import CameraCaptureModal from "@/components/camera-capture-modal";
import AiFoodPhotoReview from "@/components/ai-food-photo-review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchFoods, addFoodToMeal } from "@/lib/api/foods";
import { analyzeFoodPhoto, lookupFood } from "@/lib/api/ai";
import { foodKeys } from "@/lib/queryKeys";

export default function AddFoodToMealModal({
  mealId,
  open,
  onClose,
  onAdded,
}: {
  mealId: string | null;
  open: boolean;
  onClose: () => void;
  onAdded: (food: MealFood) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [qty, setQty] = useState("");

  const [foodName, setFoodName] = useState("");
  const [manualQty, setManualQty] = useState("");
  const [manualCal, setManualCal] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualUnit, setManualUnit] = useState("g");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoItems, setPhotoItems] = useState<ProposedFood[] | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const { data: allFoods = [], isLoading: foodsLoading } = useQuery({
    queryKey: foodKeys.list(""),
    queryFn: () => fetchFoods(""),
    enabled: open,
  });

  const foods = allFoods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const addFoodMutation = useMutation({
    mutationFn: (data: Parameters<typeof addFoodToMeal>[1]) =>
      addFoodToMeal(mealId!, data),
    onSuccess: (food) => {
      onAdded(food);
      reset();
    },
  });

  const analyzePhotoMutation = useMutation({
    mutationFn: (imageBase64: string) => analyzeFoodPhoto(imageBase64),
    onSuccess: (result) => setPhotoItems(result.items),
    onError: () => setPhotoError("Couldn't analyze that photo. Try again."),
  });

  const photoFeedbackMutation = useMutation({
    mutationFn: ({ index, feedback }: { index: number; feedback: string }) =>
      lookupFood(feedback, photoItems![index]).then((proposal) => ({ index, proposal })),
    onSuccess: ({ index, proposal }) =>
      setPhotoItems((items) => items!.map((item, i) => (i === index ? proposal : item))),
    onError: () => setPhotoError("Couldn't process that feedback. Try again."),
  });

  const addPhotoItemsMutation = useMutation({
    mutationFn: async (items: Parameters<typeof addFoodToMeal>[1][]) => {
      const results = [];
      for (const item of items) {
        results.push(await addFoodToMeal(mealId!, item));
      }
      return results;
    },
    onSuccess: (foods) => {
      foods.forEach(onAdded);
      reset();
    },
  });

  function reset() {
    setSearch("");
    setSelectedFood(null);
    setQty("");
    setFoodName("");
    setManualQty("");
    setManualCal("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setManualUnit("g");
    setPhotoItems(null);
    setPhotoError(null);
    setCameraOpen(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAddLibrary() {
    if (!selectedFood || !qty || !mealId) return;
    addFoodMutation.mutate({ foodId: selectedFood.id, quantityGrams: Number(qty) });
  }

  function handleAddManual() {
    if (!foodName || !manualQty || !manualCal || !mealId) return;
    addFoodMutation.mutate({
      foodName,
      quantityGrams: Number(manualQty),
      calories: Number(manualCal),
      protein: Number(manualProtein || 0),
      carbs: Number(manualCarbs || 0),
      fat: Number(manualFat || 0),
    });
  }

  function handlePhotoCapture(imageBase64: string) {
    setPhotoItems(null);
    setPhotoError(null);
    analyzePhotoMutation.mutate(imageBase64);
  }

  function handleAddPhotoItems(data: Parameters<typeof addFoodToMeal>[1][]) {
    if (!mealId) return;
    addPhotoItemsMutation.mutate(data);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Food">
      <div className="mb-4 h-px w-full bg-white/10" />
      <Tabs defaultValue="library">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="library" className="flex-1">Library</TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
          <TabsTrigger value="photo" className="flex-1">Photo</TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <Input
              className="pl-8"
              placeholder="Search foods…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedFood(null); }}
            />
          </div>

          <div className="mb-4 h-52 overflow-y-auto rounded-lg border border-white/10">
            {foodsLoading ? (
              <p className="p-4 text-center text-[13px] text-neutral-500">Loading…</p>
            ) : foods.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1.5">
                <span className="text-2xl">🔍</span>
                <p className="text-[13px] font-medium text-neutral-400">
                  {search ? "No results." : "No foods in library yet."}
                </p>
                {search && (
                  <p className="text-[12px] text-neutral-600">Try a different search term</p>
                )}
              </div>
            ) : (
              foods.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFood(f)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-white/5 ${
                    selectedFood?.id === f.id ? "bg-orange-500/10 text-orange-400" : "text-white"
                  }`}
                >
                  <span className="font-medium">{f.name}</span>
                  <span className="text-[12px] text-neutral-500">
                    {Number(f.calories_per_g).toFixed(3)} kcal/{f.unit}
                  </span>
                </button>
              ))
            )}
          </div>

          {selectedFood && (
            <div className="mb-4 flex flex-col gap-1.5">
              <Label>Quantity ({selectedFood.unit})</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 150"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                autoFocus
              />
              {qty && Number(qty) > 0 && (
                <p className="text-[12px] text-neutral-500">
                  ≈ {Math.round(Number(qty) * Number(selectedFood.calories_per_g))} kcal ·{" "}
                  {(Number(qty) * Number(selectedFood.carbs_per_g)).toFixed(1)}c ·{" "}
                  {(Number(qty) * Number(selectedFood.protein_per_g)).toFixed(1)}p ·{" "}
                  {(Number(qty) * Number(selectedFood.fat_per_g)).toFixed(1)}f
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
              onClick={handleAddLibrary}
              disabled={!selectedFood || !qty || addFoodMutation.isPending}
            >
              {addFoodMutation.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Food Name</Label>
              <Input
                placeholder="e.g. Grandma's Lasagna"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit</Label>
              <Input placeholder="g" value={manualUnit} onChange={(e) => setManualUnit(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Quantity ({manualUnit || "g"})</Label>
                <Input type="number" min="0" placeholder="300" value={manualQty} onChange={(e) => setManualQty(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Calories (kcal)</Label>
                <Input type="number" min="0" placeholder="650" value={manualCal} onChange={(e) => setManualCal(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Carbs (g)</Label>
                <Input type="number" min="0" placeholder="70" value={manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Protein (g)</Label>
                <Input type="number" min="0" placeholder="38" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fat (g)</Label>
                <Input type="number" min="0" placeholder="22" value={manualFat} onChange={(e) => setManualFat(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2.5">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
              onClick={handleAddManual}
              disabled={!foodName || !manualQty || !manualCal || addFoodMutation.isPending}
            >
              {addFoodMutation.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="photo">
          {photoItems ? (
            <AiFoodPhotoReview
              items={photoItems}
              isLoading={photoFeedbackMutation.isPending || addPhotoItemsMutation.isPending}
              onItemFeedback={(index, feedback) => photoFeedbackMutation.mutate({ index, feedback })}
              onRetake={() => { setPhotoItems(null); setCameraOpen(true); }}
              onConfirmAll={handleAddPhotoItems}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 py-10">
              {analyzePhotoMutation.isPending ? (
                <p className="text-[13px] text-neutral-400">Analyzing photo…</p>
              ) : (
                <>
                  <Camera size={28} className="text-neutral-600" />
                  {photoError && <p className="text-[13px] text-red-400">{photoError}</p>}
                  <Button
                    className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
                    onClick={() => setCameraOpen(true)}
                  >
                    Take Photo
                  </Button>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoCapture}
      />
    </Modal>
  );
}
