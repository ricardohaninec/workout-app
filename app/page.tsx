import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Workout App</h1>
      <p className="text-neutral-500">Track your workouts and exercises.</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-neutral-900 px-4 py-2 hover:bg-neutral-100"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
