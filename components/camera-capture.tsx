"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_DIMENSION = 1568;

function drawToJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (imageBase64: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 4032 },
          height: { ideal: 3024 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError(true));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [preview]);

  function handleShutter() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setPreview(drawToJpeg(video, video.videoWidth, video.videoHeight));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setPreview(drawToJpeg(img, img.width, img.height));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleUsePhoto() {
    if (!preview) return;
    onCapture(preview.replace(/^data:image\/jpeg;base64,/, ""));
    setPreview(null);
  }

  if (preview) {
    return (
      <div className="flex flex-col gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Captured food" className="w-full rounded-lg border border-white/10" />
        <div className="flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setPreview(null)}>
            <RotateCcw size={14} className="mr-1.5" /> Retake
          </Button>
          <Button className="bg-orange-500 font-semibold text-white hover:bg-orange-600" onClick={handleUsePhoto}>
            Use Photo
          </Button>
        </div>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-12 text-neutral-400 transition-colors hover:border-white/25 hover:text-white">
          <Upload size={24} />
          <span className="text-[13px] font-medium">Take or upload a photo</span>
          <span className="px-6 text-center text-[11px] text-neutral-500">
            Camera access unavailable — choose a photo instead.
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </label>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => setCameraReady(true)}
          className="aspect-[3/4] w-full object-cover"
        />
        {!cameraReady && (
          <p className="absolute inset-0 flex items-center justify-center text-[13px] text-neutral-400">
            Starting camera…
          </p>
        )}
      </div>
      <p className="text-center text-[11px] text-neutral-500">
        Tip: include a fork, hand, or standard plate in frame — helps estimate portion size accurately
      </p>
      <div className="flex items-center justify-between gap-2.5">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <button
          type="button"
          onClick={handleShutter}
          disabled={!cameraReady}
          aria-label="Take photo"
          className="h-14 w-14 rounded-full border-4 border-white/80 bg-orange-500 transition-transform active:scale-95 disabled:opacity-40"
        />
        <label className="cursor-pointer text-[12px] text-neutral-400 underline underline-offset-2 hover:text-white">
          Upload instead
          <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </label>
      </div>
    </div>
  );
}
