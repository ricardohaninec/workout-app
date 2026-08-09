"use client";

import { useState } from "react";
import { Hand } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HandReference } from "@/lib/types";
import CameraCapture from "@/components/camera-capture";
import { Button } from "@/components/ui/button";
import { fetchHandReference, saveHandReference, deleteHandReference } from "@/lib/api/hand-reference";
import { handReferenceKeys } from "@/lib/queryKeys";

export default function HandReferenceCard({ initialData }: { initialData: HandReference | null }) {
  const queryClient = useQueryClient();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: handReference } = useQuery({
    queryKey: handReferenceKeys.detail(),
    queryFn: fetchHandReference,
    initialData,
    initialDataUpdatedAt: () => Date.now(),
  });

  const saveMutation = useMutation({
    mutationFn: saveHandReference,
    onSuccess: (data) => {
      queryClient.setQueryData(handReferenceKeys.detail(), data);
      setCameraOpen(false);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHandReference,
    onSuccess: () => queryClient.setQueryData(handReferenceKeys.detail(), null),
  });

  function handleCapture(imageBase64: string) {
    setError(null);
    saveMutation.mutate(imageBase64);
  }

  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Hand size={16} className="text-orange-400" />
        <h2 className="text-sm font-semibold text-white">Hand Reference</h2>
      </div>

      {cameraOpen ? (
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setCameraOpen(false)}
          tip="Place a ruler flat next to your open hand, both fully visible"
        />
      ) : handReference ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{Number(handReference.hand_length_cm).toFixed(1)} cm</p>
            <p className="text-[12px] text-neutral-500">Used to improve food photo portion estimates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCameraOpen(true)} disabled={saveMutation.isPending}>
              Retake
            </Button>
            <Button
              variant="outline"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-neutral-400">
            Log your hand size for more accurate food photo portion estimates.
          </p>
          <Button
            className="shrink-0 bg-orange-500 font-semibold text-white hover:bg-orange-600"
            onClick={() => setCameraOpen(true)}
          >
            Measure My Hand
          </Button>
        </div>
      )}

      {saveMutation.isPending && <p className="mt-2 text-[12px] text-neutral-500">Measuring…</p>}
      {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
