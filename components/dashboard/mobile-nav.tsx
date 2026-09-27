"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Cards,
  DotsThree,
  House,
  Stack,
  Waveform,
  GearSix,
  Lifebuoy,
} from "@phosphor-icons/react";

import { dashboardNavItems } from "@/components/dashboard/dashboard-nav-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/books", label: "Books", icon: Stack },
  { href: "/flip-flashcards", label: "Cards", icon: Cards },
  { href: "/review", label: "Review", icon: BookOpen },
];

const secondaryIcons = {
  shadowing: Waveform,
  support: Lifebuoy,
  settings: GearSix,
};

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function MobileNav() {
  const pathname = usePathname();
  const secondary = dashboardNavItems.filter((item) => item.icon in secondaryIcons);
  const moreIsCurrent = secondary.some((item) => isCurrent(pathname, item.href));

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-(--z-layout-topbar) border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-5 px-1">
        {primary.map(({ href, label, icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring",
                current && "text-primary"
              )}
            >
              <Icon icon={icon} className="size-5" weight={current ? "fill" : "regular"} />
              <span>{label}</span>
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More destinations"
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring",
              moreIsCurrent && "text-primary"
            )}
          >
            <Icon icon={DotsThree} className="size-5" weight="bold" />
            <span>More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-44 bg-card p-1">
            {secondary.map((item) => {
              const ItemIcon = secondaryIcons[item.icon as keyof typeof secondaryIcons];
              return (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} aria-current={isCurrent(pathname, item.href) ? "page" : undefined} />}
                  className="min-h-11 gap-2 px-3 text-sm"
                >
                  <Icon icon={ItemIcon} className="size-5" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
