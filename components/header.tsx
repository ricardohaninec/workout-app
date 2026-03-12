"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileDropdown from "./profile-dropdown";
import Logo from "@/components/icons/logo";

type Props = { name: string; email: string };

export default function Header({ name, email }: Props) {
  const pathname = usePathname();

  function navClass(href: string) {
    const isActive = pathname === href;
    return isActive
      ? "text-sm font-semibold text-neutral-900 underline underline-offset-4 decoration-2"
      : "text-sm text-neutral-500 hover:text-neutral-900";
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-8">
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo />
            <span className="text-sm font-semibold">Workout App</span>
          </Link>
          <Link href="/dashboard" className={navClass("/dashboard")}>
            My Workouts
          </Link>
          <Link href="/exercises" className={navClass("/exercises")}>
            My Exercises
          </Link>
        </nav>
        <ProfileDropdown name={name} email={email} />
      </div>
    </header>
  );
}
