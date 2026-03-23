"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 80;

export default function PullToRefresh() {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        pullingRef.current = true;
        setPullDistance(Math.min(delta, THRESHOLD * 1.5));
        if (delta > 10) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        router.refresh();
        await new Promise((r) => setTimeout(r, 1000));
        setRefreshing(false);
      }
      startYRef.current = null;
      setPullDistance(0);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing, router]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const visible = pullDistance > 0 || refreshing;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-end justify-center overflow-hidden transition-all duration-200"
      style={{ height: visible ? Math.max(pullDistance, refreshing ? 56 : 0) : 0 }}
    >
      <div
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 shadow-lg"
        style={{ opacity: refreshing ? 1 : progress }}
      >
        <RefreshCw
          size={16}
          className={`text-white ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}
