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
        className="inline-flex h-9 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-1.5 text-foreground transition-colors hover:bg-brand-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
        <Icon icon={ChevronDown} className="text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <Text as="span" className="block truncate" size="sm" weight="semibold">
              {user.name}
            </Text>
            {user.email ? (
              <Text as="span" className="mt-0.5 block truncate" size="xs" tone="muted">
                {user.email}
              </Text>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/dashboard/profile" />}
          className="cursor-pointer"
        >
          <Icon icon={User} />
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
          <Icon icon={LogOut} />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
