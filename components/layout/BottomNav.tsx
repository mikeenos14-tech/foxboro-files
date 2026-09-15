"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/",
    label: "Home",
    icon: (
      <path d="M3 11.5 12 4l9 7.5M5 10v10h14V10" />
    ),
  },
  {
    href: "/recap",
    label: "Recap",
    icon: <path d="M12 3v9l6 3M12 21a9 9 0 1 1 9-9" />,
  },
  {
    href: "/next-game",
    label: "Next",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
  },
  {
    href: "/schedule",
    label: "Sched",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </>
    ),
  },
  {
    href: "/news",
    label: "News",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </>
    ),
  },
  {
    href: "/roster",
    label: "Roster",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.2a3 3 0 0 1 0 5.6M21 20c0-2.6-1.7-4.8-4-5.6" />
      </>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface sm:hidden">
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              active ? "text-red" : "text-muted"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {link.icon}
            </svg>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
