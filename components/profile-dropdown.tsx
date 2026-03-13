"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProfileDropdown({ name, email }: { name: string; email: string }) {
  const router = useRouter();

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-orange-500 text-[13px] font-extrabold text-white hover:bg-orange-600 focus-visible:outline-none"
        aria-label="Profile menu"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-[10px] border border-white/10 bg-[#111111] p-0 shadow-xl"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1 px-4 pb-3 pt-4">
            <span className="truncate text-[14px] font-semibold text-white">{name}</span>
            <span className="truncate text-[13px] font-normal text-[#6B7280]">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="p-2">
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-[14px] font-medium text-orange-500 hover:bg-white/5 hover:text-orange-500 focus:bg-white/5 focus:text-orange-500"
          >
            <LogOut size={16} className="shrink-0 text-orange-500" />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
