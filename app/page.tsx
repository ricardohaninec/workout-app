import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { getSession } from "@/lib/auth-server";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0D0D0D]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-orange-600/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-orange-500/5 blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <Dumbbell className="h-8 w-8 text-orange-500" />
          <span className="text-sm font-black tracking-[0.3em] text-white">
            WORKOUT
          </span>
        </div>

        {/* Hero title */}
        <h1 className="max-w-2xl text-6xl font-black leading-[1.05] tracking-tight text-white md:text-7xl">
          Train Harder.
          <br />
          Live Better.
        </h1>

        {/* Orange accent */}
        <div className="h-1 w-16 rounded-full bg-orange-500" />

        {/* Subtitle */}
        <p className="max-w-md text-lg leading-relaxed text-neutral-400">
          Track your workouts, crush your goals, and transform your life.
        </p>

        {/* CTAs */}
        <div className="mt-2 flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-orange-500 px-8 py-3 text-base font-bold text-white transition-colors hover:bg-orange-600"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
