"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export default function ProfileDropdown({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/");
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-700"
        aria-label="Profile menu"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-lg border bg-white py-1 shadow-lg z-50">
          <div className="border-b px-4 py-2">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-neutral-400 truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-neutral-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
