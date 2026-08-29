"use client";

import {
  CaretDown as ChevronDown,
  SignOut as LogOut,
  User,
} from "@phosphor-icons/react";
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
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

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
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-1.5 text-foreground transition-colors hover:bg-brand-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {user.avatar ? (
          <span
            className="size-7 rounded-full bg-cover bg-center bg-secondary"
            style={{ backgroundImage: `url(${user.avatar})` }}
            aria-hidden="true"
          />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user.initials}
          </span>
        )}
        <Icon icon={ChevronDown} className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-xl p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-4 py-3">
            <Text as="span" className="block truncate text-base" weight="bold">
              {user.name}
            </Text>
            {user.email ? (
              <Text as="span" className="mt-1 block truncate text-sm" tone="muted">
                {user.email}
              </Text>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0 my-0 bg-brand-100" />
        <DropdownMenuItem
          render={<Link href="/dashboard/profile" />}
          className="h-11 cursor-pointer rounded-none px-4 text-base font-medium"
        >
          <Icon icon={User} className="size-5" />
          User profile
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-0 my-0 bg-brand-100" />
        <DropdownMenuItem
          render={<button type="button" />}
          nativeButton
          variant="destructive"
          className="h-11 w-full cursor-pointer rounded-none px-4 text-base font-medium"
          onClick={handleLogout}
        >
          <Icon icon={LogOut} className="size-5" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
