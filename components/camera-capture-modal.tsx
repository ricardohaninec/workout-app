"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";

const MAX_DIMENSION = 1024;

function captureFrame(video: HTMLVideoElement): string {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function CameraCaptureModal({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (imageBase64: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      stopStream();
      setPreview(null);
      setError(null);
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Couldn't access the camera. Check permissions, or upload a photo instead."));

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open]);

  function handleClose() {
    stopStream();
    setPreview(null);
    setError(null);
    onClose();
  }

  function handleCapture() {
    if (!videoRef.current) return;
    setPreview(captureFrame(videoRef.current));
  }

  function handleUsePhoto() {
    if (!preview) return;
    stopStream();
    onCapture(preview.replace(/^data:image\/jpeg;base64,/, ""));
    setPreview(null);
    onClose();
  }

  function handleFileFallback(e: React.ChangeEvent<HTMLInputElement>) {
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
        setError(null);
        setPreview(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Take a Photo">
      <div className="flex flex-col gap-3">
        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 p-6 text-center">
            <p className="text-[13px] text-neutral-400">{error}</p>
            <label className="cursor-pointer rounded-lg bg-white/5 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/10">
              Upload a photo
              <input type="file" accept="image/*" className="hidden" onChange={handleFileFallback} />
            </label>
          </div>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Captured food" className="w-full rounded-lg border border-white/10" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-lg border border-white/10 bg-black"
          />
        )}

        <div className="flex justify-end gap-2.5">
          {preview ? (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                <RotateCcw size={14} className="mr-1.5" /> Retake
              </Button>
              <Button className="bg-orange-500 font-semibold text-white hover:bg-orange-600" onClick={handleUsePhoto}>
                Use Photo
              </Button>
            </>
          ) : !error ? (
            <Button className="bg-orange-500 font-semibold text-white hover:bg-orange-600" onClick={handleCapture}>
              <Camera size={14} className="mr-1.5" /> Capture
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
