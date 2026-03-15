"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Utensils, Flame, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { Day } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Modal from "@/components/modal";

export default function DaysList({ days: initial }: { days: Day[] }) {
  const router = useRouter();
  const [days] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: format(date, "yyyy-MM-dd"), notes: notes || null }),
    });
    setLoading(false);
    if (res.status === 409) {
      setError("A day entry already exists for this date.");
      return;
    }
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    const day = await res.json();
    setCreateOpen(false);
    setNotes("");
    router.push(`/days/${day.id}`);
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Daily Diet</h1>
        <Button
          className="gap-2 bg-orange-500 px-[18px] py-[10px] text-[14px] font-semibold text-white hover:bg-orange-600"
          onClick={() => { setCreateOpen(true); setError(null); }}
        >
          <Plus size={15} />
          Log Day
        </Button>
      </div>

      {days.length === 0 ? (
        <p className="text-neutral-500">No days logged yet. Start tracking your diet!</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {days.map((d) => (
            <li key={d.id}>
              <Link
                href={`/days/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111111] px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Calendar size={17} className="text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white">
                      {new Date(d.date).toLocaleDateString(undefined, { timeZone: "UTC",
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {d.notes && (
                      <p className="mt-0.5 truncate text-[12px] text-neutral-500">{d.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[13px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Utensils size={13} className="text-neutral-500" />
                    {d.meal_count}
                    <span className="hidden sm:inline"> meal{d.meal_count !== 1 ? "s" : ""}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Flame size={13} className="text-orange-500" />
                    {Math.round(d.total_calories)}
                    <span className="hidden sm:inline"> kcal</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Log a Day">
        <div className="mb-4 h-px w-full bg-white/10" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger render={<Button variant="outline" className="w-full justify-start gap-2 font-normal" />}>
                <CalendarIcon className="size-4 text-neutral-400" />
                {format(date, "PPP")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setCalendarOpen(false); } }}
                  disabled={{ after: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="day-notes">Notes <span className="text-neutral-500">(optional)</span></Label>
            <Input
              id="day-notes"
              placeholder="e.g. Cheat day"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-[13px] text-red-400">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 font-semibold text-white hover:bg-orange-600"
            onClick={handleCreate}
            disabled={loading || !date}
          >
            {loading ? "Saving…" : "Log Day"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
