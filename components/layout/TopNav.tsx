"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <header className="sticky top-0 z-10 border-b border-navy-light bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="inline-block h-3 w-3 rounded-sm bg-red" />
          <span className="font-bold tracking-tight text-lg">Foxboro Files</span>
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
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
                    : "text-silver-light hover:bg-navy-light hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
