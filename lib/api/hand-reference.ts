import type { HandReference } from "@/lib/types";

export async function fetchHandReference(): Promise<HandReference | null> {
  const res = await fetch("/api/hand-reference");
  if (!res.ok) throw new Error("Failed to fetch hand reference");
  const data = await res.json();
  return data.handReference ?? null;
}

export async function saveHandReference(imageBase64: string): Promise<HandReference> {
  const res = await fetch("/api/hand-reference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to save hand reference");
  }
  const data = await res.json();
  return data.handReference;
}

export async function deleteHandReference(): Promise<void> {
  const res = await fetch("/api/hand-reference", { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete hand reference");
}
