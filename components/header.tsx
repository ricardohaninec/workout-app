"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Dumbbell, LayoutDashboard, History } from "lucide-react";
import ProfileDropdown from "./profile-dropdown";
import Logo from "@/components/icons/logo";

type Props = { name: string; email: string };

const navLinks = [
  { href: "/dashboard", label: "My Workouts", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/exercises", label: "My Exercises", icon: Dumbbell },
];

export default function Header({ name, email }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-8">
          {/* Logo — always visible */}
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo />
            <span className="text-sm font-semibold">Workout App</span>
          </Link>

          <div className="flex items-center gap-3">
            <ProfileDropdown name={name} email={email} />
            <button
              className="flex items-center justify-center rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile side drawer */}
      <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />

        {/* Drawer panel */}
        <nav className={`absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="flex items-center justify-between border-b px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <Logo />
                <span className="text-sm font-semibold">Workout App</span>
              </Link>
              <button
                className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <ul className="flex flex-col gap-1 p-3">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-neutral-100 font-semibold text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
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
            <div className="mt-auto border-t px-4 py-4">
              <ProfileDropdown name={name} email={email} />
            </div>
          </nav>
      </div>
    </>
  );
}
