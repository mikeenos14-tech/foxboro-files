"use client";

import { useState } from "react";
import type { PlayGroup, PlayRecord } from "@/lib/data/types";
import { PlaysDialog } from "./PlaysDialog";

// Makes a whole stat card open the plays behind it. The card stays as it
// was; a transparent button covers it, and a small "See the plays" hint
// says it's tappable.
export function SeePlays({
  title,
  groups,
  plays,
  children,
}: {
  title: string;
  groups: PlayGroup[];
  plays: Record<string, PlayRecord>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const count = groups.reduce((n, g) => n + g.entries.length, 0);
  if (count === 0) return <>{children}</>;
  return (
    <div className="relative">
      {children}
      <button
        onClick={() => setOpen(true)}
        aria-label={`See the plays: ${title}`}
        className="group absolute inset-0 flex items-end justify-end rounded-lg p-2 text-[11px] font-medium text-muted hover:bg-navy/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red"
      >
        <span className="underline decoration-dotted group-hover:text-foreground">See the plays →</span>
      </button>
      <PlaysDialog title={title} groups={groups} plays={plays} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
