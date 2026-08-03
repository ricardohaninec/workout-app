"use client";

import { useState } from "react";
import { RotateCcw, Upload } from "lucide-react";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";

const MAX_DIMENSION = 1024;

export default function CameraCaptureModal({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (imageBase64: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  function handleClose() {
    setPreview(null);
    onClose();
  }

  function handleUsePhoto() {
    if (!preview) return;
    onCapture(preview.replace(/^data:image\/jpeg;base64,/, ""));
    setPreview(null);
    onClose();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPreview(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add a Photo">
      <div className="flex flex-col gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected food" className="w-full rounded-lg border border-white/10" />
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-12 text-neutral-400 transition-colors hover:border-white/25 hover:text-white">
            <Upload size={24} />
            <span className="text-[13px] font-medium">Take or upload a photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        )}

        {preview && (
          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setPreview(null)}>
              <RotateCcw size={14} className="mr-1.5" /> Retake
            </Button>
            <Button className="bg-orange-500 font-semibold text-white hover:bg-orange-600" onClick={handleUsePhoto}>
              Use Photo
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
