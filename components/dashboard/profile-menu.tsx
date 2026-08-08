"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProfileMenuProps = {
  user: {
    name: string;
    email: string;
    avatar: string | null;
    initials: string;
  };
};

export function ProfileMenu({ user }: ProfileMenuProps) {
  function clearBrowserTokens() {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.sessionStorage.removeItem("accessToken");
    window.sessionStorage.removeItem("refreshToken");
  }

  async function handleLogout() {
    clearBrowserTokens();

    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
    }).catch(() => null);

    clearBrowserTokens();
    window.location.replace("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-background px-1.5 text-foreground transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {user.avatar ? (
          <span
            className="size-8 rounded-xl bg-cover bg-center bg-secondary"
            style={{ backgroundImage: `url(${user.avatar})` }}
            aria-hidden="true"
          />
        ) : (
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
            {user.initials}
          </span>
        )}
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-semibold text-foreground">
              {user.name}
            </span>
            {user.email ? (
              <span className="mt-0.5 block truncate font-normal">
                {user.email}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/dashboard/profile" />}
          className="cursor-pointer"
        >
          <User className="size-4" />
          User profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<button type="button" />}
          nativeButton
          variant="destructive"
          className="w-full cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
