"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Dumbbell, LayoutDashboard, History, Zap, Salad, BookOpen } from "lucide-react";
import ProfileDropdown from "./profile-dropdown";

type Props = { name: string; email: string };

const navLinks = [
  { href: "/dashboard", label: "My Workouts", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/exercises", label: "My Exercises", icon: Zap },
  { href: "/days", label: "Diet", icon: Salad },
  { href: "/foods", label: "My Foods", icon: BookOpen },
];

export default function Header({ name, email }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0D0D0D]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-0 sm:px-8">

          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 py-4 transition-opacity hover:opacity-80"
          >
            <Dumbbell className="h-5 w-5 text-orange-500" />
            <span className="text-[11px] font-black tracking-[0.25em] text-white">WORKOUT</span>
          </Link>

          {/* Desktop nav — center */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex flex-col items-center px-4 py-5 text-sm transition-colors ${
                    isActive ? "font-semibold text-white" : "font-medium text-neutral-500 hover:text-neutral-200"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ProfileDropdown name={name} email={email} />

            {/* Mobile menu button */}
            <button
              className="flex items-center justify-center rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />

        {/* Drawer */}
        <nav
          className={`absolute left-0 top-0 flex h-full w-60 flex-col border-r border-white/10 bg-[#0D0D0D] shadow-2xl transition-transform duration-300 ease-in-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-[18px]">
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <Dumbbell className="h-[18px] w-[18px] text-orange-500" />
              <span className="text-[10px] font-black tracking-[0.3em] text-white">WORKOUT</span>
            </Link>
            <button
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={14} />
            </button>
          </div>

          {/* Nav links */}
          <ul className="flex flex-col gap-1 p-3">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${
                      isActive
                        ? "bg-orange-500/[0.08] font-semibold text-orange-500"
                        : "font-medium text-neutral-500 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* User info at bottom */}
          <div className="flex items-center gap-2.5 border-t border-white/[0.05] px-4 py-[15px]">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-orange-500 text-[13px] font-extrabold text-white">
              {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold text-white">{name}</span>
              <span className="truncate text-[11px] text-[#6B7280]">{email}</span>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
