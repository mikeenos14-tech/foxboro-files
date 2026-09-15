"use client";

import type { NewsType } from "@/lib/data/types";

const types: NewsType[] = ["Injury", "Transaction", "Analysis", "Beat Report"];

export function NewsFilterBar({
  active,
  onChange,
}: {
  active: NewsType | "All";
  onChange: (type: NewsType | "All") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["All", ...types] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            active === t
              ? "bg-navy text-white"
              : "bg-surface text-muted ring-1 ring-inset ring-border hover:bg-silver-light"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
