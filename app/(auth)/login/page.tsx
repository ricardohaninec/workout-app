"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });

    if (error) {
      setError(error.message ?? "Invalid credentials.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      {/* Left hero panel */}
      <div className="relative hidden flex-col justify-end overflow-hidden p-14 lg:flex lg:w-[55%]">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D0D0D] via-[#111111] to-[#1a1a1a]" />
        {/* Orange glow */}
        <div className="absolute left-1/3 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/15 blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        {/* Decorative orange line */}
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-orange-500/60 to-transparent" />

        {/* Brand top-left */}
        <div className="absolute left-14 top-12 flex items-center gap-2.5">
          <Dumbbell className="h-6 w-6 text-orange-500" />
          <span className="text-xs font-black tracking-[0.3em] text-white">
            WORKOUT
          </span>
        </div>

        {/* Quote bottom-left */}
        <div className="relative z-10 max-w-md">
          <p className="text-3xl font-bold leading-snug text-white">
            &ldquo;Every rep counts.
            <br />
            Every session matters.&rdquo;
          </p>
          <p className="mt-3 text-sm text-orange-500">
            — Stay consistent, stay strong
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-[#111111] px-8 py-12 lg:w-[45%]">
        {/* Mobile brand */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <Dumbbell className="h-6 w-6 text-orange-500" />
          <span className="text-xs font-black tracking-[0.3em] text-white">
            WORKOUT
          </span>
        </div>

        <div className="w-full max-w-sm">
          {/* Desktop brand */}
          <div className="mb-8 hidden items-center gap-2 lg:flex">
            <Dumbbell className="h-5 w-5 text-orange-500" />
            <span className="text-xs font-black tracking-[0.25em] text-orange-500">
              WORKOUT
            </span>
          </div>

          <h1 className="mb-2 text-3xl font-black text-white">Welcome back</h1>
          <p className="mb-8 text-sm text-neutral-500">
            Sign in to continue your fitness journey.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="border-[#2D2D2D] bg-[#1C1C1C] text-white placeholder:text-neutral-600 focus-visible:ring-orange-500/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="border-[#2D2D2D] bg-[#1C1C1C] text-white placeholder:text-neutral-600 focus-visible:ring-orange-500/50"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-orange-500 text-base font-bold text-white hover:bg-orange-600"
            >
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
