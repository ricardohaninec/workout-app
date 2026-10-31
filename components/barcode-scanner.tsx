"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export default function BarcodeScanner({
  onDetect,
  onCancel,
}: {
  onDetect: (code: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }

        const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => Detector })
          .BarcodeDetector;
        let detector: Detector;
        if (Native) {
          detector = new Native({ formats: [...FORMATS] });
        } else {
          const { BarcodeDetector } = await import("barcode-detector/ponyfill");
          detector = new BarcodeDetector({ formats: [...FORMATS] });
        }
        if (cancelled) return;

        const tick = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2) {
            try {
              const codes = await detector.detect(v);
              if (cancelled) return;
              if (codes[0]?.rawValue) {
                onDetect(codes[0].rawValue);
                return;
              }
            } catch {
              // ignore frame errors, keep scanning
            }
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manualValid = /^\d{8,14}$/.test(manualCode.trim());

  return (
    <div className="flex flex-col gap-3">
      {!cameraError && (
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setCameraReady(true)}
            className="aspect-[4/3] w-full object-cover"
          />
          {!cameraReady && (
            <p className="absolute inset-0 flex items-center justify-center text-[13px] text-neutral-400">
              Starting camera…
            </p>
          )}
        </div>
      )}
      <p className="text-center text-[11px] text-neutral-500">
        {cameraError
          ? "Camera unavailable — enter the barcode number instead."
          : "Point the camera at the barcode, or enter the number below."}
      </p>
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          placeholder="Barcode number"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
          maxLength={14}
        />
        <Button
          className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
          disabled={!manualValid}
          onClick={() => onDetect(manualCode.trim())}
        >
          Look up
        </Button>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
