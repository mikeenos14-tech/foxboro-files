"use client";

import { useEffect, useRef } from "react";
import type { PlayGroup, PlayRecord } from "@/lib/data/types";

// The list of plays behind a stat. A native <dialog>, so Escape, focus
// and screen-reader behaviour come from the browser; a bottom sheet on a
// phone, a centred panel on desktop.
export function PlaysDialog({
  title,
  groups,
  plays,
  open,
  onClose,
  showWeek = false,
}: {
  title: string;
  groups: PlayGroup[] | null;
  plays: Record<string, PlayRecord> | null;
  open: boolean;
  onClose: () => void;
  /** Season-long lists span games; label each play with its week. */
  showWeek?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50 sm:m-auto sm:max-h-[80vh] sm:max-w-2xl sm:rounded-2xl"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface px-4 py-3">
        <div>
          {open && <h2 className="font-semibold">{title}</h2>}
          <p className="text-[11px] text-muted">
            EPA is from New England&apos;s side: positive helped New England. Play text is the NFL&apos;s own.
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md px-2 py-1 text-sm text-muted hover:bg-navy/10 hover:text-foreground"
          aria-label="Close"
        >
          Close
        </button>
      </div>

      <div className="overflow-y-auto px-4 pb-6">
        {!groups || !plays ? (
          <p className="py-6 text-sm text-muted">Loading plays…</p>
        ) : groups.every((g) => g.entries.length === 0) ? (
          <p className="py-6 text-sm text-muted">No plays for this one.</p>
        ) : (
          groups.map((group) => (
            <section key={group.heading} className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{group.heading}</h3>
              {group.entries.length === 0 ? (
                <p className="mt-2 text-sm text-muted">None.</p>
              ) : (
                <ol className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {group.entries.map((entry) => {
                    const play = plays[entry.key];
                    if (!play) return null;
                    return <PlayRow key={entry.key} play={play} badge={entry.badge} tone={entry.tone} showWeek={showWeek} />;
                  })}
                </ol>
              )}
            </section>
          ))
        )}
      </div>
    </dialog>
  );
}

const toneClass = {
  good: "bg-rank-good/15 text-rank-good",
  bad: "bg-rank-bad/15 text-rank-bad",
  neutral: "bg-navy/10 text-muted",
};

function PlayRow({
  play,
  badge,
  tone,
  showWeek,
}: {
  play: PlayRecord;
  badge?: string;
  tone?: "good" | "bad";
  showWeek: boolean;
}) {
  const meta = [
    showWeek ? `Wk ${play.week} vs ${play.opponent}` : null,
    `Q${play.quarter} ${play.clock}`,
    play.situation || null,
  ].filter(Boolean);
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] tabular-nums text-muted">{meta.join(" · ")}</span>
        <span className="flex shrink-0 items-center gap-2">
          {play.neEpa !== null && (
            <span className={`text-[11px] tabular-nums ${play.neEpa >= 0 ? "text-rank-good" : "text-rank-bad"}`}>
              EPA {play.neEpa > 0 ? "+" : ""}
              {play.neEpa.toFixed(2)}
            </span>
          )}
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass[tone ?? "neutral"]}`}>
              {badge}
            </span>
          )}
        </span>
      </div>
      {/* The clock is already in the line above; nflverse's text repeats it,
          as "(9:20)" or, inside the final minute, "(:32)". */}
      <p className="mt-1 text-sm leading-snug">{play.description.replace(/^\(\d{0,2}:\d{2}\)\s*/, "")}</p>
    </li>
  );
}
