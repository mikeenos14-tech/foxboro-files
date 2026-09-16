"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { BeaconMark } from "@/components/shared/BeaconMark";

const links = [
  { href: "/", label: "Home" },
  { href: "/recap", label: "Recap" },
  { href: "/next-game", label: "Next Game" },
  { href: "/schedule", label: "Schedule" },
  { href: "/news", label: "News" },
  { href: "/roster", label: "Roster & Stats" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b-4 border-red bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BeaconMark size={30} />
          <span className="font-display text-2xl font-semibold uppercase tracking-wide">
            The Foxboro Beacon
          </span>
        </Link>
        <nav className="hidden flex-1 gap-1 overflow-x-auto text-sm sm:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition ${
                  active
                    ? "bg-red text-white"
                    : "text-white/70 hover:bg-navy-light hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto sm:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
